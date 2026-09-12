import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { Prisma, SubscriptionStatus, type Plan, type Subscription } from '@prisma/client';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';

export const UNLIMITED = -1;

/**
 * Estados de `Subscription` que cuentan como "vigente" para resolver límites
 * y datos de plan — no solo ACTIVE (docs/14 §4.1). Un trial en curso
 * (PENDING_TRIAL/TRIALING) y un pago vencido en gracia (PAST_DUE) también
 * deben poder operar sobre su plan. Único punto de verdad: cualquier
 * consulta directa a `subscription.findFirst`/`findMany` que necesite "la
 * suscripción vigente" del tenant debe usar esta lista, no `status: 'ACTIVE'`
 * a mano, para no repetir el hueco que dejó fuera a los tenants en trial.
 */
export const CURRENT_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.PENDING_TRIAL,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAST_DUE,
];

/** La forma real de `Plan.limits` (columna `Json`) — ver `prisma/seed.ts`. */
export type PlanLimits = {
  wallets?: number;
  devices?: number;
  transactions_per_month?: number;
  transactions_per_period?: number;
  transactions_per_day?: number;
  trial_duration_hours?: number;
  users?: number;
  webhooks?: number;
  websocket_api?: boolean;
  retention_days?: number;
  rate_limit_per_minute?: number;
  support?: string;
};

export type ActiveSubscription = Subscription & { plan: Plan; pendingPlan: Plan | null };

const REQUIRED_NUMERIC_LIMITS = [
  'wallets',
  'devices',
  'transactions_per_month',
  'users',
  'webhooks',
  'retention_days',
  'rate_limit_per_minute',
] as const satisfies ReadonlyArray<keyof PlanLimits>;

const TRIAL_NUMERIC_LIMITS = [
  'transactions_per_period',
  'transactions_per_day',
  'trial_duration_hours',
] as const satisfies ReadonlyArray<keyof PlanLimits>;

/**
 * Punto único de verificación de límites de plan (docs/10, Sprint 7:
 * "servicio de verificación de límites"). Antes de este servicio, seis
 * lugares distintos (`ApiKeysService`, `DevicesService`, `MembersService`,
 * `WalletsService`, `WebhooksService`, `IngestNotificationsUseCase`)
 * repetían la misma consulta de suscripción activa + comparación de límite.
 *
 * Dos formas de uso:
 * - `assertWithinLimit`: el caso común, resuelve la suscripción por su cuenta.
 * - `assertWithin`: variante pura (recibe los límites ya cargados) para los
 *   dos únicos lugares (`DevicesService`, `WalletsService`) que necesitan
 *   contar y verificar dentro de la MISMA transacción que la escritura
 *   subsiguiente, por atomicidad.
 */
@Injectable()
export class PlanLimitsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PlanLimitsService.name);

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    const plans = await this.prisma.withoutTenantScope((tx) => tx.plan.findMany());
    if (plans.length === 0) {
      throw invalidPlanConfiguration('CATALOG', 'El catálogo de planes está vacío.');
    }
    for (const plan of plans) validatePlanLimits(plan.code, plan.limits);
    this.logger.log(`Validated limits for ${plans.length} plan(s).`);
  }

  async getActiveSubscription(tenantId: string): Promise<ActiveSubscription | null> {
    return this.prisma.withoutTenantScope((tx) =>
      tx.subscription.findFirst({
        where: { tenantId, status: { in: CURRENT_SUBSCRIPTION_STATUSES } },
        orderBy: { periodStart: 'desc' },
        include: { plan: true, pendingPlan: true },
      }),
    );
  }

  async getLimits(tenantId: string): Promise<PlanLimits> {
    const subscription = await this.getActiveSubscription(tenantId);
    if (!subscription) {
      throw invalidPlanConfiguration('SUBSCRIPTION', 'El negocio no tiene una suscripción activa.');
    }
    return validatePlanLimits(subscription.plan.code, subscription.plan.limits);
  }

  async assertWithinLimit(
    tenantId: string,
    field: keyof PlanLimits,
    current: number,
    message: string,
    extraDetails?: Record<string, unknown>,
  ): Promise<void> {
    const limits = await this.getLimits(tenantId);
    this.assertWithin(limits, field, current, message, extraDetails);
  }

  assertWithin(
    limits: PlanLimits,
    field: keyof PlanLimits,
    current: number,
    message: string,
    extraDetails?: Record<string, unknown>,
  ): void {
    const value = limits[field];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < UNLIMITED) {
      throw new ApiHttpException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'SERVICE_UNAVAILABLE',
        'La configuración del plan no está disponible temporalmente.',
        { field },
      );
    }
    const limit = value;
    if (limit !== UNLIMITED && current >= limit) {
      throw new ApiHttpException(HttpStatus.UNPROCESSABLE_ENTITY, 'PLAN_LIMIT_EXCEEDED', message, {
        limit,
        current,
        ...extraDetails,
      });
    }
  }
}

export function validatePlanLimits(planCode: string, raw: Prisma.JsonValue): PlanLimits {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw invalidPlanConfiguration(planCode, 'Los límites no son un objeto JSON válido.');
  }
  const limits = raw as PlanLimits;
  const required =
    planCode === 'TRIAL'
      ? [...REQUIRED_NUMERIC_LIMITS, ...TRIAL_NUMERIC_LIMITS]
      : REQUIRED_NUMERIC_LIMITS;
  for (const field of required) {
    const value = limits[field];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < UNLIMITED) {
      throw invalidPlanConfiguration(planCode, `El límite ${field} no es válido.`, field);
    }
  }
  if (typeof limits.websocket_api !== 'boolean' || typeof limits.support !== 'string') {
    throw invalidPlanConfiguration(planCode, 'Las capacidades del plan no son válidas.');
  }
  if (
    planCode === 'TRIAL' &&
    ((limits.transactions_per_period ?? 0) <= 0 ||
      (limits.transactions_per_day ?? 0) <= 0 ||
      (limits.trial_duration_hours ?? 0) <= 0)
  ) {
    throw invalidPlanConfiguration(planCode, 'Las cuotas del trial deben ser mayores que cero.');
  }
  return limits;
}

function invalidPlanConfiguration(planCode: string, message: string, field?: string) {
  return new ApiHttpException(
    HttpStatus.SERVICE_UNAVAILABLE,
    'SERVICE_UNAVAILABLE',
    'La configuración del plan no está disponible temporalmente.',
    { plan_code: planCode, reason: message, ...(field ? { field } : {}) },
  );
}
