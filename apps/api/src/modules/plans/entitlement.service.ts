import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Prisma, SubscriptionStatus, TrialEndReason, UsageWindowType } from '@prisma/client';

import type { ScopedClient } from '../../infrastructure/database/prisma.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MetricsService } from '../../infrastructure/observability/metrics.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import type { PlanLimits } from './plan-limits.service';

export type SubscriptionEntitlement = Prisma.SubscriptionGetPayload<{
  include: { plan: true; pendingPlan: true };
}>;

type SubscriptionWithTenant = Prisma.SubscriptionGetPayload<{
  include: { plan: true; tenant: true };
}>;

export interface EntitlementDecision {
  accessState: SubscriptionStatus | 'MISSING';
  canRead: boolean;
  canOperate: boolean;
  canConfigure: boolean;
  reason: 'NONE' | 'PAYMENT_REQUIRED' | 'TRIAL_EXPIRED' | 'INVALID_CONFIGURATION';
}

export type QuotaReservationResult = {
  reservedCount: number;
  blockedReason: 'DAILY_LIMIT_EXCEEDED' | 'PLAN_LIMIT_EXCEEDED' | null;
  dailyWindowStart: Date | null;
};

const TRIAL_PLAN_CODE = 'TRIAL';
const DAY_MS = 24 * 60 * 60 * 1_000;
// Techo informativo, no normativo: el corte real de un trial lo imponen
// trial_ends_at/trial_ended_at (evaluate()), no el fin de esta ventana.
const TOTAL_WINDOW_CEILING_MS = 30 * DAY_MS;

/**
 * Autoridad del ciclo de acceso y de las cuotas de una suscripción
 * (docs/14, §6: "única autoridad para resolver estado efectivo... y
 * reservar/liberar/consumir cuota total y diaria").
 */
@Injectable()
export class EntitlementService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  async getCurrentSubscription(tenantId: string): Promise<SubscriptionEntitlement | null> {
    return this.prisma.withoutTenantScope((tx) =>
      tx.subscription.findFirst({
        where: { tenantId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { plan: true, pendingPlan: true },
      }),
    );
  }

  evaluate(subscription: SubscriptionEntitlement | null, now = new Date()): EntitlementDecision {
    if (!subscription) {
      return readOnlyDecision('MISSING', 'PAYMENT_REQUIRED', false);
    }

    switch (subscription.status) {
      case SubscriptionStatus.PENDING_TRIAL:
        return fullAccessDecision(subscription.status);
      case SubscriptionStatus.TRIALING:
        if (!subscription.trialStartedAt || !subscription.trialEndsAt) {
          return readOnlyDecision(subscription.status, 'INVALID_CONFIGURATION');
        }
        // trialEndedAt es la única fuente de verdad para "ya terminó",
        // fijada tanto por expiración de tiempo (scheduler) como por
        // agotar el total (commitQuota) — evita que evaluate() tenga que
        // conocer el consumo para decidir el corte por total.
        return !subscription.trialEndedAt && subscription.trialEndsAt > now
          ? fullAccessDecision(subscription.status)
          : readOnlyDecision(subscription.status, 'TRIAL_EXPIRED');
      case SubscriptionStatus.ACTIVE:
        return fullAccessDecision(subscription.status);
      case SubscriptionStatus.PAST_DUE:
      case SubscriptionStatus.CANCELED:
      case SubscriptionStatus.EXPIRED:
        return readOnlyDecision(subscription.status, 'PAYMENT_REQUIRED');
    }
  }

  assertCanOperate(decision: EntitlementDecision): void {
    if (decision.reason === 'INVALID_CONFIGURATION') {
      throw new ApiHttpException(
        HttpStatus.SERVICE_UNAVAILABLE,
        'SERVICE_UNAVAILABLE',
        'La configuración de la suscripción no está disponible temporalmente.',
      );
    }
    if (!decision.canOperate) {
      throw new ApiHttpException(
        HttpStatus.PAYMENT_REQUIRED,
        'SUBSCRIPTION_REQUIRED',
        decision.reason === 'TRIAL_EXPIRED'
          ? 'La prueba gratuita terminó. Elige un plan para continuar procesando cobros.'
          : 'Se necesita una suscripción activa para continuar procesando cobros.',
      );
    }
  }

  /** Límites del día calendario del tenant, en UTC, correctos ante cualquier huso y transición de horario. */
  resolveDayWindow(timeZone: string, now: Date): { start: Date; end: Date } {
    const start = zonedMidnight(timeZone, now);
    // Sondear 25h adelante en vez de sumar 24h garantiza aterrizar en el
    // día local siguiente incluso si el día actual dura 23 o 25h por DST.
    const end = zonedMidnight(timeZone, new Date(start.getTime() + 25 * 60 * 60 * 1_000));
    return { start, end };
  }

  /**
   * Reserva hasta `count` unidades de cuota (día + total) para un tenant en
   * plan TRIAL, dentro de la MISMA transacción SQL que inserta las
   * `raw_notifications` correspondientes (docs/14 §4.3). No-op para
   * cualquier otro plan: esos siguen con `PlanLimitsService`/conteo en vivo.
   */
  async reserveQuota(
    tx: ScopedClient,
    tenantId: string,
    count: number,
  ): Promise<QuotaReservationResult> {
    if (count <= 0) return { reservedCount: 0, blockedReason: null, dailyWindowStart: null };

    const subscription = await this.findSubscriptionWithTenant(tx, tenantId);
    if (!subscription || subscription.plan.code !== TRIAL_PLAN_CODE) {
      return { reservedCount: count, blockedReason: null, dailyWindowStart: null };
    }

    const limits = subscription.plan.limits as PlanLimits;
    const dailyLimit = limits.transactions_per_day ?? 0;
    const totalLimit = limits.transactions_per_period ?? 0;
    const dayWindow = this.resolveDayWindow(subscription.tenant.timezone, new Date());
    const periodWindow = resolvePeriodWindow(subscription.createdAt);

    await ensureBucket(tx, tenantId, UsageWindowType.DAY, dayWindow.start, dayWindow.end);
    await ensureBucket(
      tx,
      tenantId,
      UsageWindowType.SUBSCRIPTION_PERIOD,
      periodWindow.start,
      periodWindow.end,
    );

    let reservedCount = 0;
    let blockedReason: QuotaReservationResult['blockedReason'] = null;

    for (let i = 0; i < count; i += 1) {
      const gotDay = await tryReserveOne(
        tx,
        tenantId,
        UsageWindowType.DAY,
        dayWindow.start,
        dailyLimit,
      );
      if (!gotDay) {
        blockedReason = 'DAILY_LIMIT_EXCEEDED';
        break;
      }
      const gotTotal = await tryReserveOne(
        tx,
        tenantId,
        UsageWindowType.SUBSCRIPTION_PERIOD,
        periodWindow.start,
        totalLimit,
      );
      if (!gotTotal) {
        await releaseOne(tx, tenantId, UsageWindowType.DAY, dayWindow.start);
        blockedReason = 'PLAN_LIMIT_EXCEEDED';
        break;
      }
      reservedCount += 1;
    }

    return { reservedCount, blockedReason, dailyWindowStart: dayWindow.start };
  }

  /**
   * Confirma 1 unidad reservada como consumida, dentro de la MISMA
   * transacción que crea la `Transaction` real. Si es el primer cobro
   * válido, arranca el reloj del trial; si el total se agota, lo cierra.
   */
  async commitQuota(
    tx: ScopedClient,
    tenantId: string,
    reservationDayWindowStart: Date | null,
  ): Promise<void> {
    const subscription = await this.findSubscriptionWithTenant(tx, tenantId);
    if (!subscription || subscription.plan.code !== TRIAL_PLAN_CODE) return;

    const now = new Date();
    const periodWindow = resolvePeriodWindow(subscription.createdAt);

    // A notification belongs to the local day in which it was reserved, not
    // necessarily to the day in which its asynchronous parser completes.
    // Null is retained only as a compatibility fallback for rows received
    // before the additive migration was applied.
    const dayWindowStart =
      reservationDayWindowStart ?? this.resolveDayWindow(subscription.tenant.timezone, now).start;
    await commitOne(tx, tenantId, UsageWindowType.DAY, dayWindowStart);
    const periodUsed = await commitOne(
      tx,
      tenantId,
      UsageWindowType.SUBSCRIPTION_PERIOD,
      periodWindow.start,
    );

    const limits = subscription.plan.limits as PlanLimits;
    const totalLimit = limits.transactions_per_period ?? 0;
    const trialDurationHours = limits.trial_duration_hours ?? 0;

    const data: Prisma.SubscriptionUpdateInput = {};
    if (subscription.status === SubscriptionStatus.PENDING_TRIAL) {
      data.status = SubscriptionStatus.TRIALING;
      data.trialStartedAt = now;
      data.trialEndsAt = new Date(now.getTime() + trialDurationHours * 60 * 60 * 1_000);
    }
    if (!subscription.trialEndedAt && totalLimit > 0 && periodUsed >= totalLimit) {
      data.trialEndedAt = now;
      data.trialEndReason = TrialEndReason.TOTAL_LIMIT;
    }

    if (Object.keys(data).length > 0) {
      await tx.subscription.update({ where: { id: subscription.id }, data });
      if (data.status === SubscriptionStatus.TRIALING) {
        this.metrics.trialStartedTotal.inc();
      }
      if (data.trialEndReason === TrialEndReason.TOTAL_LIMIT) {
        this.metrics.trialExpiredTotal.inc({ reason: 'TOTAL_LIMIT' });
      }
    }
  }

  /** Libera 1 unidad reservada que no llegó a confirmarse (notificación UNMATCHED). */
  async releaseQuota(
    tenantId: string,
    count: number,
    reservationDayWindowStart: Date | null,
  ): Promise<void> {
    if (count <= 0) return;

    await this.prisma.withoutTenantScope(async (tx) => {
      const subscription = await tx.subscription.findFirst({
        where: { tenantId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { plan: true, tenant: true },
      });
      if (!subscription || subscription.plan.code !== TRIAL_PLAN_CODE) return;

      const periodWindow = resolvePeriodWindow(subscription.createdAt);
      const dayWindowStart =
        reservationDayWindowStart ??
        this.resolveDayWindow(subscription.tenant.timezone, new Date()).start;

      for (let i = 0; i < count; i += 1) {
        await releaseOne(tx, tenantId, UsageWindowType.DAY, dayWindowStart);
        await releaseOne(tx, tenantId, UsageWindowType.SUBSCRIPTION_PERIOD, periodWindow.start);
      }
    });
  }

  private async findSubscriptionWithTenant(
    tx: ScopedClient,
    tenantId: string,
  ): Promise<SubscriptionWithTenant | null> {
    return tx.subscription.findFirst({
      where: { tenantId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { plan: true, tenant: true },
    });
  }
}

function fullAccessDecision(accessState: SubscriptionStatus): EntitlementDecision {
  return {
    accessState,
    canRead: true,
    canOperate: true,
    canConfigure: true,
    reason: 'NONE',
  };
}

function readOnlyDecision(
  accessState: SubscriptionStatus | 'MISSING',
  reason: EntitlementDecision['reason'],
  canRead = true,
): EntitlementDecision {
  return {
    accessState,
    canRead,
    canOperate: false,
    canConfigure: false,
    reason,
  };
}

function resolvePeriodWindow(subscriptionCreatedAt: Date): { start: Date; end: Date } {
  return {
    start: subscriptionCreatedAt,
    end: new Date(subscriptionCreatedAt.getTime() + TOTAL_WINDOW_CEILING_MS),
  };
}

/** Desplazamiento (ms) de `timeZone` respecto a UTC en el instante exacto `instant`. */
function offsetMsAt(timeZone: string, instant: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  const wallClockAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  // El formateador solo da resolución de segundo: comparar contra el
  // instante con milisegundos dejaría ese resto filtrarse al resultado y
  // dos llamadas en el mismo segundo, pero con milisegundo distinto,
  // calcularían un `windowStart` distinto — rompe la ventana compartida
  // que necesita `ensureBucket`/`tryReserveOne` para contender por la misma fila.
  const instantWholeSeconds = Math.floor(instant.getTime() / 1_000) * 1_000;
  return wallClockAsUtc - instantWholeSeconds;
}

/**
 * Instante UTC de la medianoche local de `instant` en `timeZone` (sin
 * dependencia nueva). Dos pasadas: el desplazamiento puede cambiar dentro
 * del mismo día local (transición de horario de verano), así que un cálculo
 * con el desplazamiento vigente en `instant` puede errar por una hora si
 * `instant` cae después de la transición pero la medianoche fue antes.
 * Recalcular el desplazamiento sobre el propio candidato lo corrige.
 */
function zonedMidnight(timeZone: string, instant: Date): Date {
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    dateFormatter.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  const localMidnightAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
  );

  const initialGuess = new Date(localMidnightAsUtc - offsetMsAt(timeZone, instant));
  return new Date(localMidnightAsUtc - offsetMsAt(timeZone, initialGuess));
}

async function ensureBucket(
  tx: ScopedClient,
  tenantId: string,
  windowType: UsageWindowType,
  windowStart: Date,
  windowEnd: Date,
): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO usage_buckets (tenant_id, metric, window_type, window_start, window_end)
    VALUES (${tenantId}::uuid, 'TRANSACTIONS'::usage_metric, ${windowType}::usage_window_type, ${windowStart}::timestamptz, ${windowEnd}::timestamptz)
    ON CONFLICT (tenant_id, metric, window_type, window_start) DO NOTHING
  `;
}

/** Incremento condicional atómico: el UPDATE solo afecta la fila si todavía hay cupo. */
async function tryReserveOne(
  tx: ScopedClient,
  tenantId: string,
  windowType: UsageWindowType,
  windowStart: Date,
  limit: number,
): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    UPDATE usage_buckets
    SET reserved = reserved + 1, updated_at = now()
    WHERE tenant_id = ${tenantId}::uuid
      AND metric = 'TRANSACTIONS'::usage_metric
      AND window_type = ${windowType}::usage_window_type
      AND window_start = ${windowStart}::timestamptz
      AND used + reserved < ${limit}
    RETURNING id
  `;
  return rows.length > 0;
}

async function releaseOne(
  tx: ScopedClient,
  tenantId: string,
  windowType: UsageWindowType,
  windowStart: Date,
): Promise<void> {
  await tx.$executeRaw`
    UPDATE usage_buckets
    SET reserved = GREATEST(reserved - 1, 0), updated_at = now()
    WHERE tenant_id = ${tenantId}::uuid
      AND metric = 'TRANSACTIONS'::usage_metric
      AND window_type = ${windowType}::usage_window_type
      AND window_start = ${windowStart}::timestamptz
  `;
}

/** Mueve 1 unidad de reservada a consumida y devuelve el `used` resultante. */
async function commitOne(
  tx: ScopedClient,
  tenantId: string,
  windowType: UsageWindowType,
  windowStart: Date,
): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ used: number }>>`
    UPDATE usage_buckets
    SET reserved = GREATEST(reserved - 1, 0), used = used + 1, updated_at = now()
    WHERE tenant_id = ${tenantId}::uuid
      AND metric = 'TRANSACTIONS'::usage_metric
      AND window_type = ${windowType}::usage_window_type
      AND window_start = ${windowStart}::timestamptz
    RETURNING used
  `;
  return rows[0]?.used ?? 0;
}
