import { randomInt } from 'node:crypto';

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Plan } from '@prisma/client';
import type {
  ChangeSubscriptionInput,
  PlanSummary,
  SubscriptionChangeHistoryItem,
  SubscriptionChangeRequestResponse,
  SubscriptionSummary,
} from '@yallego/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import type { TenantResourceContext } from '../../shared/guards/tenant.guard';
import { PlanLimitsService } from './plan-limits.service';

@Injectable()
export class PlansService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PlanLimitsService) private readonly planLimits: PlanLimitsService,
  ) {}

  async listPlans(): Promise<PlanSummary[]> {
    const plans = await this.prisma.plan.findMany({
      where: { isPublic: true },
      orderBy: { sortOrder: 'asc' },
    });
    return plans.map(toPlanSummary);
  }

  async getCurrentSubscription(tenant: TenantResourceContext): Promise<SubscriptionSummary> {
    const subscription = await this.planLimits.getActiveSubscription(tenant.id);
    if (!subscription) {
      throw new ApiHttpException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        'El negocio no tiene una suscripción activa.',
      );
    }

    const usage = await this.prisma.withoutTenantScope((tx) =>
      tx.usagePeriod.findUnique({
        where: {
          tenantId_periodStart: { tenantId: tenant.id, periodStart: subscription.periodStart },
        },
      }),
    );

    return {
      plan: toPlanSummary(subscription.plan),
      billing_cycle: subscription.billingCycle,
      status: subscription.status,
      period_start: subscription.periodStart.toISOString(),
      period_end: subscription.periodEnd.toISOString(),
      pending_plan: subscription.pendingPlan ? toPlanSummary(subscription.pendingPlan) : null,
      usage: {
        transactions_count: usage?.transactionsCount ?? 0,
        api_calls_count: usage?.apiCallsCount ?? 0,
        webhook_calls_count: usage?.webhookCallsCount ?? 0,
      },
    };
  }

  async listHistory(tenant: TenantResourceContext): Promise<SubscriptionChangeHistoryItem[]> {
    const changes = await this.prisma.withTenant(tenant.id, (tx) =>
      tx.subscriptionChange.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: 'desc' },
        include: { fromPlan: true, toPlan: true },
      }),
    );

    return changes.map((change) => ({
      id: change.id,
      from_plan: change.fromPlan?.code ?? null,
      to_plan: change.toPlan.code,
      from_cycle: change.fromCycle,
      to_cycle: change.toCycle,
      effective_at: change.effectiveAt.toISOString(),
      performed_by: change.performedByPlatformAdminId ?? change.performedBy,
      reason: change.reason,
      created_at: change.createdAt.toISOString(),
    }));
  }

  /**
   * docs/06_API_CONTRACT.md §11: solo calcula el monto e informa cómo pagar.
   * No modifica la suscripción — eso ocurre recién cuando un administrador de
   * plataforma confirma el pago manual (`PlanChangeApplicationService`, sin
   * ruta HTTP todavía: la autenticación de plataforma no existe aún, ver
   * docs/10_PLAN_DESARROLLO.md, Sprint 2 "Administración de plataforma").
   */
  async requestChange(input: ChangeSubscriptionInput): Promise<SubscriptionChangeRequestResponse> {
    const targetPlan = await this.prisma.plan.findUnique({ where: { code: input.plan_code } });
    if (!targetPlan || !targetPlan.isPublic) {
      throw new ApiHttpException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        'El plan solicitado no existe.',
      );
    }

    const price = priceForCycle(targetPlan, input.billing_cycle);
    if (price === null) {
      throw new ApiHttpException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'El plan no admite ese ciclo de facturación.',
      );
    }

    return {
      status: 'PENDING_PAYMENT',
      requested_plan: targetPlan.code,
      billing_cycle: input.billing_cycle,
      amount_due: price.toFixed(2),
      currency: targetPlan.currency,
      payment_instructions: { method: 'TRANSFER', reference: generatePaymentReference() },
      message: 'El cambio se aplicará una vez confirmado el pago.',
    };
  }
}

function priceForCycle(plan: Plan, cycle: ChangeSubscriptionInput['billing_cycle']): number | null {
  if (cycle === 'MONTHLY') return plan.priceMonthly.toNumber();
  if (cycle === 'SEMIANNUAL') return plan.priceSemiannual?.toNumber() ?? null;
  return plan.priceAnnual?.toNumber() ?? null;
}

function generatePaymentReference(): string {
  const year = new Date().getUTCFullYear();
  const sequence = randomInt(0, 999_999).toString().padStart(6, '0');
  return `YLG-${year}-${sequence}`;
}

function toPlanSummary(plan: Plan): PlanSummary {
  return {
    code: plan.code,
    display_name: plan.displayName,
    description: plan.description,
    price_monthly: plan.priceMonthly.toFixed(2),
    price_semiannual: plan.priceSemiannual?.toFixed(2) ?? null,
    price_annual: plan.priceAnnual?.toFixed(2) ?? null,
    currency: plan.currency,
    limits: plan.limits as unknown as PlanSummary['limits'],
  };
}
