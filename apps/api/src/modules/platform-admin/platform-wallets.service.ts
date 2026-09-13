import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Wallet } from '@prisma/client';
import type { CreateWalletCatalogEntryInput, WalletCatalogAdminEntry } from '@yallego/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';

/** RF-WAL-001/008 (docs/02 §5): catálogo global de billeteras, extensible sin tocar el código del núcleo de parsing. */
@Injectable()
export class PlatformWalletsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(): Promise<WalletCatalogAdminEntry[]> {
    const wallets = await this.prisma.wallet.findMany({ orderBy: { displayName: 'asc' } });
    return wallets.map(toEntry);
  }

  async create(
    platformAdminId: string,
    input: CreateWalletCatalogEntryInput,
  ): Promise<WalletCatalogAdminEntry> {
    const existing = await this.prisma.wallet.findUnique({ where: { code: input.code } });
    if (existing) {
      throw new ApiHttpException(
        HttpStatus.CONFLICT,
        'DUPLICATE_RESOURCE',
        'Ya existe una billetera con ese código.',
      );
    }

    const created = await this.prisma.wallet.create({
      data: {
        code: input.code,
        displayName: input.display_name,
        provider: input.provider,
        issuer: input.issuer ?? null,
        androidPackage: input.android_package,
        iconUrl: input.icon_url ?? null,
      },
    });

    await this.prisma.withoutTenantScope((tx) =>
      tx.auditEvent.create({
        data: {
          action: 'platform.wallet_created',
          actorType: 'PLATFORM_ADMIN',
          actorPlatformAdminId: platformAdminId,
          resourceType: 'wallet',
          resourceId: created.id,
          metadata: { code: input.code, android_package: input.android_package },
        },
      }),
    );

    return toEntry(created);
  }
}

function toEntry(wallet: Wallet): WalletCatalogAdminEntry {
  return {
    id: wallet.id,
    code: wallet.code,
    display_name: wallet.displayName,
    provider: wallet.provider,
    issuer: wallet.issuer,
    android_package: wallet.androidPackage,
    icon_url: wallet.iconUrl,
    is_active: wallet.isActive,
    created_at: wallet.createdAt.toISOString(),
  };
}
