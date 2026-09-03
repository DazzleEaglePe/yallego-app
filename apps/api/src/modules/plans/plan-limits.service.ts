import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { SubscriptionStatus, type Plan, type Subscription } from '@prisma/client';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';

export const UNLIMITED = -1;

/** La forma real de `Plan.limits` (columna `Json`) — ver `prisma/seed.ts`. */
export type PlanLimits = {
  wallets?: number;
  devices?: number;
  transactions_per_month?: number;
  users?: number;
  webhooks?: number;
  websocket_api?: boolean;
  retention_days?: number;
  rate_limit_per_minute?: number;
  support?: string;
};

export type ActiveSubscription = Subscription & { plan: Plan; pendingPlan: Plan | null };

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
export class PlanLimitsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getActiveSubscription(tenantId: string): Promise<ActiveSubscription | null> {
    return this.prisma.withoutTenantScope((tx) =>
      tx.subscription.findFirst({
        where: { tenantId, status: SubscriptionStatus.ACTIVE },
        orderBy: { periodStart: 'desc' },
        include: { plan: true, pendingPlan: true },
      }),
    );
  }

  async getLimits(tenantId: string): Promise<PlanLimits> {
    const subscription = await this.getActiveSubscription(tenantId);
    return (subscription?.plan.limits as PlanLimits | undefined) ?? {};
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
    const limit = typeof value === 'number' ? value : UNLIMITED;
    if (limit !== UNLIMITED && current >= limit) {
      throw new ApiHttpException(HttpStatus.UNPROCESSABLE_ENTITY, 'PLAN_LIMIT_EXCEEDED', message, {
        limit,
        current,
        ...extraDetails,
      });
    }
  }
}
