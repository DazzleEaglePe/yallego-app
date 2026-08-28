import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { BillingCycle } from '@prisma/client';
import type { ManualPaymentSummary } from '@yallego/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { MailerService } from '../../infrastructure/mailer/mailer.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import { addBillingCycle } from './billing-cycle.util';

export interface ManualPaymentInput {
  amount: number;
  currency?: string;
  method?: string;
  reference?: string;
}

export interface SubscriptionChangeApplicationResult {
  tenantId: string;
  fromPlan: string | null;
  toPlan: string;
  effectiveAt: Date;
  immediate: boolean;
}

/**
 * Aplica un cambio de plan (`POST /platform/v1/tenants/{id}/subscription`),
 * registra pagos manuales (`POST /platform/v1/payments`) y otorga planes de
 * cortesía (RF-ADM-004/010).
 *
 * "Aplicación inmediata al mejorar de plan / diferida al reducir" se decide
 * comparando `sortOrder` (docs/05_MODELO_DATOS.md — es el mismo campo que
 * ordena el catálogo público, un proxy razonable de nivel de plan ya que no
 * existe un campo de rango dedicado).
 */
@Injectable()
export class PlanChangeApplicationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MailerService) private readonly mailer: MailerService,
  ) {}

  async applyConfirmedChange(
    tenantId: string,
    toPlanCode: string,
    toBillingCycle: BillingCycle,
    performedBy: string | null,
    reason?: string,
    payment?: ManualPaymentInput,
  ): Promise<SubscriptionChangeApplicationResult> {
    const notification = await this.prisma.withoutTenantScope(async (tx) => {
      const [subscription, toPlan] = await Promise.all([
        tx.subscription.findFirst({
          where: { tenantId, status: 'ACTIVE' },
          orderBy: { periodStart: 'desc' },
          include: { plan: true },
        }),
        tx.plan.findUnique({ where: { code: toPlanCode } }),
      ]);
      if (!subscription)
        throw new ApiHttpException(
          HttpStatus.NOT_FOUND,
          'NOT_FOUND',
          'El negocio no tiene una suscripción activa.',
        );
      if (!toPlan)
        throw new ApiHttpException(
          HttpStatus.NOT_FOUND,
          'NOT_FOUND',
          'El plan solicitado no existe.',
        );

      const isUpgrade = toPlan.sortOrder > subscription.plan.sortOrder;
      const effectiveAt = isUpgrade ? new Date() : subscription.periodEnd;

      await tx.subscription.update({
        where: { id: subscription.id },
        data: isUpgrade
          ? {
              planId: toPlan.id,
              billingCycle: toBillingCycle,
              pendingPlanId: null,
              pendingBillingCycle: null,
            }
          : { pendingPlanId: toPlan.id, pendingBillingCycle: toBillingCycle },
      });

      await tx.subscriptionChange.create({
        data: {
          tenantId,
          fromPlanId: subscription.planId,
          toPlanId: toPlan.id,
          fromCycle: subscription.billingCycle,
          toCycle: toBillingCycle,
          effectiveAt,
          performedByPlatformAdminId: performedBy,
          reason,
        },
      });

      if (performedBy) {
        await tx.auditEvent.create({
          data: {
            tenantId,
            action: 'platform.subscription_changed',
            actorType: 'PLATFORM_ADMIN',
            actorPlatformAdminId: performedBy,
            resourceType: 'subscription',
            resourceId: subscription.id,
            metadata: {
              from_plan: subscription.plan.code,
              to_plan: toPlan.code,
              immediate: isUpgrade,
              reason,
            },
          },
        });
      }

      if (payment) {
        await tx.manualPayment.create({
          data: {
            tenantId,
            subscriptionId: subscription.id,
            amount: payment.amount,
            currency: payment.currency ?? toPlan.currency,
            method: payment.method ?? 'TRANSFER',
            reference: payment.reference,
            coversFrom: new Date(),
            coversTo: isUpgrade
              ? subscription.periodEnd
              : addBillingCycle(subscription.periodEnd, toBillingCycle),
            confirmedBy: performedBy,
          },
        });
      }

      const [tenant, recipients] = await Promise.all([
        tx.tenant.findUnique({ where: { id: tenantId } }),
        tx.membership.findMany({
          where: { tenantId, role: { in: ['OWNER', 'ADMIN'] } },
          include: { user: true },
        }),
      ]);

      return {
        businessName: tenant?.businessName ?? '',
        recipients,
        toPlanName: toPlan.displayName,
        toPlanCode: toPlan.code,
        fromPlanCode: subscription.plan.code,
        isUpgrade,
        effectiveAt,
      };
    });

    await Promise.all(
      notification.recipients.map((membership) =>
        this.mailer.sendPlanChangeEmail({
          email: membership.user.email,
          fullName: membership.user.fullName,
          businessName: notification.businessName,
          toPlan: notification.toPlanName,
          effectiveAt: notification.effectiveAt.toISOString().slice(0, 10),
          immediate: notification.isUpgrade,
        }),
      ),
    );

    return {
      tenantId,
      fromPlan: notification.fromPlanCode,
      toPlan: notification.toPlanCode,
      effectiveAt: notification.effectiveAt,
      immediate: notification.isUpgrade,
    };
  }

  /**
   * Registro de pago independiente de un cambio de plan (RF-ADM-004): cubre
   * la renovación del mismo plan, no solo un cambio. `applyConfirmedChange`
   * también puede adjuntar un pago (`payment`) cuando ambas acciones ocurren
   * en el mismo momento — aquí es para cuando no.
   */
  async registerManualPayment(
    input: {
      tenantId: string;
      amount: number;
      currency?: string;
      method?: string;
      reference?: string;
      coversFrom: Date;
      coversTo: Date;
      notes?: string;
    },
    platformAdminId: string,
  ): Promise<ManualPaymentSummary> {
    return this.prisma.withoutTenantScope(async (tx) => {
      const subscription = await tx.subscription.findFirst({
        where: { tenantId: input.tenantId, status: 'ACTIVE' },
      });
      if (!subscription) {
        throw new ApiHttpException(
          HttpStatus.NOT_FOUND,
          'NOT_FOUND',
          'El negocio no tiene una suscripción activa.',
        );
      }

      const payment = await tx.manualPayment.create({
        data: {
          tenantId: input.tenantId,
          subscriptionId: subscription.id,
          amount: input.amount,
          currency: input.currency ?? 'PEN',
          method: input.method ?? 'TRANSFER',
          reference: input.reference,
          coversFrom: input.coversFrom,
          coversTo: input.coversTo,
          confirmedBy: platformAdminId,
          notes: input.notes,
        },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: input.tenantId,
          action: 'platform.payment_registered',
          actorType: 'PLATFORM_ADMIN',
          actorPlatformAdminId: platformAdminId,
          resourceType: 'manual_payment',
          resourceId: payment.id,
          metadata: {
            amount: input.amount,
            currency: payment.currency,
            reference: input.reference ?? null,
          },
        },
      });

      return toPaymentSummary(payment);
    });
  }

  /** RF-ADM-010 (SHOULD): otorga un plan sin pago asociado. El motivo queda marcado en el historial para distinguirlo de un cambio pagado. */
  async grantCourtesyPlan(
    tenantId: string,
    toPlanCode: string,
    toBillingCycle: BillingCycle,
    platformAdminId: string,
    reason: string,
  ) {
    return this.applyConfirmedChange(
      tenantId,
      toPlanCode,
      toBillingCycle,
      platformAdminId,
      `Cortesía: ${reason}`,
    );
  }
}

function toPaymentSummary(payment: {
  id: string;
  tenantId: string;
  amount: { toFixed: (digits: number) => string };
  currency: string;
  method: string | null;
  reference: string | null;
  coversFrom: Date;
  coversTo: Date;
  confirmedAt: Date;
}): ManualPaymentSummary {
  return {
    id: payment.id,
    tenant_id: payment.tenantId,
    amount: payment.amount.toFixed(2),
    currency: payment.currency,
    method: payment.method,
    reference: payment.reference,
    covers_from: payment.coversFrom.toISOString().slice(0, 10),
    covers_to: payment.coversTo.toISOString().slice(0, 10),
    confirmed_at: payment.confirmedAt.toISOString(),
  };
}
