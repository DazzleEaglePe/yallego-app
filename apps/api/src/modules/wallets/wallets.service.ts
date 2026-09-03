import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import type {
  ActivateWalletInput,
  TenantWalletSummary,
  UpdateWalletInput,
  WalletCatalogEntry,
} from '@yallego/contracts';

import { PrismaService, type ScopedClient } from '../../infrastructure/database/prisma.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import type { TenantContext } from '../../shared/guards/tenant.guard';
import { PlanLimitsService } from '../plans/plan-limits.service';

@Injectable()
export class WalletsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PlanLimitsService) private readonly planLimits: PlanLimitsService,
  ) {}

  async listCatalog(): Promise<WalletCatalogEntry[]> {
    const wallets = await this.prisma.wallet.findMany({
      where: {
        isActive: true,
        parserPatterns: { some: { isActive: true } },
      },
      orderBy: { displayName: 'asc' },
    });

    return wallets.map((wallet) => ({
      id: wallet.id,
      code: wallet.code,
      display_name: wallet.displayName,
      provider: wallet.provider,
      issuer: wallet.issuer,
      icon_url: wallet.iconUrl,
    }));
  }

  async listTenantWallets(tenant: TenantContext): Promise<TenantWalletSummary[]> {
    const tenantWallets = await this.prisma.withTenant(tenant.id, (tx) =>
      tx.tenantWallet.findMany({
        where: { tenantId: tenant.id },
        include: { wallet: true },
        orderBy: { enabledAt: 'asc' },
      }),
    );

    return tenantWallets.map(mapTenantWallet);
  }

  async activateWallet(
    tenant: TenantContext,
    input: ActivateWalletInput,
  ): Promise<TenantWalletSummary> {
    const wallet = await this.prisma.wallet.findFirst({
      where: {
        code: input.wallet_code,
        isActive: true,
        parserPatterns: { some: { isActive: true } },
      },
    });
    if (!wallet) {
      throw new ApiHttpException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        'Esa billetera no está disponible o todavía no cuenta con un parser operativo.',
      );
    }

    return this.prisma.withTenant(tenant.id, async (tx) => {
      const existing = await tx.tenantWallet.findUnique({
        where: { tenantId_walletId: { tenantId: tenant.id, walletId: wallet.id } },
      });
      if (existing) {
        if (existing.isEnabled) {
          throw new ApiHttpException(
            HttpStatus.CONFLICT,
            'DUPLICATE_RESOURCE',
            'Esta billetera ya está activa.',
          );
        }
        await this.assertWithinWalletLimit(tx, tenant.id);
        const reactivated = await tx.tenantWallet.update({
          where: { id: existing.id },
          data: {
            isEnabled: true,
            enabledAt: new Date(),
            accountReference: input.account_reference,
          },
          include: { wallet: true },
        });
        await tx.auditEvent.create({
          data: {
            tenantId: tenant.id,
            action: 'wallets.activated',
            actorType: 'USER',
            resourceType: 'tenant_wallet',
            resourceId: reactivated.id,
            metadata: { wallet_code: wallet.code, reactivated: true },
          },
        });
        return mapTenantWallet(reactivated);
      }

      await this.assertWithinWalletLimit(tx, tenant.id);

      const created = await tx.tenantWallet.create({
        data: {
          tenantId: tenant.id,
          walletId: wallet.id,
          accountReference: input.account_reference,
        },
        include: { wallet: true },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: tenant.id,
          action: 'wallets.activated',
          actorType: 'USER',
          resourceType: 'tenant_wallet',
          resourceId: created.id,
          metadata: { wallet_code: wallet.code },
        },
      });

      return mapTenantWallet(created);
    });
  }

  async updateWallet(
    tenant: TenantContext,
    tenantWalletId: string,
    input: UpdateWalletInput,
  ): Promise<TenantWalletSummary> {
    return this.prisma.withTenant(tenant.id, async (tx) => {
      const existing = await tx.tenantWallet.findUnique({ where: { id: tenantWalletId } });
      if (!existing || existing.tenantId !== tenant.id) {
        throw new ApiHttpException(
          HttpStatus.NOT_FOUND,
          'NOT_FOUND',
          'Esta billetera no está activa en tu negocio.',
        );
      }

      if (input.is_enabled && !existing.isEnabled) {
        await this.assertWithinWalletLimit(tx, tenant.id);
      }

      const updated = await tx.tenantWallet.update({
        where: { id: tenantWalletId },
        data: {
          ...(input.is_enabled !== undefined ? { isEnabled: input.is_enabled } : {}),
          ...(input.account_reference !== undefined
            ? { accountReference: input.account_reference }
            : {}),
        },
        include: { wallet: true },
      });

      await tx.auditEvent.create({
        data: {
          tenantId: tenant.id,
          action:
            input.is_enabled === false
              ? 'wallets.deactivated'
              : input.is_enabled === true && !existing.isEnabled
                ? 'wallets.activated'
                : 'wallets.updated',
          actorType: 'USER',
          resourceType: 'tenant_wallet',
          resourceId: updated.id,
          metadata: {
            wallet_code: updated.wallet.code,
            changed_fields: Object.keys(input),
          },
        },
      });

      return mapTenantWallet(updated);
    });
  }

  async deactivateWallet(tenant: TenantContext, tenantWalletId: string): Promise<void> {
    await this.prisma.withTenant(tenant.id, async (tx) => {
      const existing = await tx.tenantWallet.findUnique({ where: { id: tenantWalletId } });
      if (!existing || existing.tenantId !== tenant.id) {
        throw new ApiHttpException(
          HttpStatus.NOT_FOUND,
          'NOT_FOUND',
          'Esta billetera no está activa en tu negocio.',
        );
      }

      await tx.tenantWallet.update({ where: { id: tenantWalletId }, data: { isEnabled: false } });
      await tx.auditEvent.create({
        data: {
          tenantId: tenant.id,
          action: 'wallets.deactivated',
          actorType: 'USER',
          resourceType: 'tenant_wallet',
          resourceId: tenantWalletId,
        },
      });
    });
  }

  private async assertWithinWalletLimit(tx: ScopedClient, tenantId: string): Promise<void> {
    const [subscription, enabledCount] = await Promise.all([
      tx.subscription.findFirst({
        where: { tenantId, status: SubscriptionStatus.ACTIVE },
        orderBy: { periodStart: 'desc' },
        include: { plan: true },
      }),
      tx.tenantWallet.count({ where: { tenantId, isEnabled: true } }),
    ]);

    const limits = (subscription?.plan.limits as { wallets?: number } | undefined) ?? {};
    this.planLimits.assertWithin(
      limits,
      'wallets',
      enabledCount,
      'Se alcanzó el límite de billeteras del plan actual.',
    );
  }
}

function mapTenantWallet(tenantWallet: {
  id: string;
  wallet: { code: string; displayName: string; provider: string; issuer: string | null };
  isEnabled: boolean;
  accountReference: string | null;
  enabledAt: Date;
}): TenantWalletSummary {
  return {
    id: tenantWallet.id,
    wallet: {
      code: tenantWallet.wallet.code,
      display_name: tenantWallet.wallet.displayName,
      provider: tenantWallet.wallet.provider,
      issuer: tenantWallet.wallet.issuer,
    },
    is_enabled: tenantWallet.isEnabled,
    account_reference: maskReference(tenantWallet.accountReference),
    enabled_at: tenantWallet.enabledAt.toISOString(),
  };
}

function maskReference(value: string | null): string | null {
  if (!value) return value;
  const visible = value.slice(-4);
  return `***${visible}`;
}
