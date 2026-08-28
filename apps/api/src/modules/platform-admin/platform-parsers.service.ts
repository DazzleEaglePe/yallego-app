import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { ParserPattern, Prisma } from '@prisma/client';
import type { ParserRules } from '@yallego/parsers';
import type {
  CreateParserVersionInput,
  ParserTestResult,
  ParserVersionSummary,
  TestParserVersionInput,
} from '@yallego/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ApiHttpException } from '../../shared/errors/api-http.exception';
import { PARSER_CONSTRUCTORS } from '../parsing/parser-constructors';
import {
  PARSER_PATTERN_REPOSITORY_PORT,
  type ParserPatternRepositoryPort,
} from '../parsing/ports/parser-pattern-repository.port';

/**
 * RF-ADM-006/007 (docs/02 §12): crear, probar y activar versiones de parser
 * sin redespliegue (RF-WAL-006) — los patrones viven en `parser_patterns`,
 * el código solo sabe qué clase de `Parser` corresponde a cada billetera
 * (`PARSER_CONSTRUCTORS`), nunca el patrón en sí.
 */
@Injectable()
export class PlatformParsersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PARSER_PATTERN_REPOSITORY_PORT)
    private readonly patternRepository: ParserPatternRepositoryPort,
  ) {}

  async listVersions(walletId: string): Promise<ParserVersionSummary[]> {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet)
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'La billetera no existe.');

    const versions = await this.prisma.parserPattern.findMany({
      where: { walletId },
      orderBy: { version: 'desc' },
    });
    const versionIds = versions.map((version) => version.id);

    const matchedCounts =
      versionIds.length === 0
        ? []
        : await this.prisma.withoutTenantScope((tx) =>
            tx.rawNotification.groupBy({
              by: ['parserPatternId'],
              where: { parserPatternId: { in: versionIds }, parseStatus: 'PARSED' },
              _count: true,
            }),
          );

    const matchedByPatternId = new Map(
      matchedCounts.map((row) => [row.parserPatternId, row._count]),
    );
    return versions.map((version) =>
      toSummary(version, wallet.code, matchedByPatternId.get(version.id) ?? 0),
    );
  }

  async createVersion(
    walletId: string,
    platformAdminId: string,
    input: CreateParserVersionInput,
  ): Promise<ParserVersionSummary> {
    const wallet = await this.prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet)
      throw new ApiHttpException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'La billetera no existe.');

    const latest = await this.prisma.parserPattern.findFirst({
      where: { walletId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const created = await this.prisma.parserPattern.create({
      data: {
        walletId,
        version: nextVersion,
        rules: input.rules,
        notes: input.notes ?? null,
        createdBy: platformAdminId,
      },
    });

    await this.writeAuditEvent('platform.parser_version_created', platformAdminId, created.id, {
      wallet_code: wallet.code,
      version: nextVersion,
    });

    return toSummary(created, wallet.code, 0);
  }

  /**
   * Pura respecto a la base: no persiste nada, solo corre el mismo `Parser`
   * que correría en producción para esa billetera contra muestras reales
   * (`raw_notification_ids`, típicamente `UNMATCHED`) y/o de prueba manual.
   */
  async testVersion(versionId: string, input: TestParserVersionInput): Promise<ParserTestResult[]> {
    const version = await this.prisma.parserPattern.findUnique({
      where: { id: versionId },
      include: { wallet: true },
    });
    if (!version)
      throw new ApiHttpException(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        'La versión de parser no existe.',
      );

    const ParserCtor = PARSER_CONSTRUCTORS[version.wallet.code];
    if (!ParserCtor) {
      throw new ApiHttpException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        'VALIDATION_ERROR',
        `Todavía no existe un parser para "${version.wallet.code}".`,
      );
    }
    const parser = new ParserCtor(version.rules as unknown as ParserRules[]);

    const results: ParserTestResult[] = [];

    if (input.raw_notification_ids?.length) {
      const notifications = await this.prisma.withoutTenantScope((tx) =>
        tx.rawNotification.findMany({ where: { id: { in: input.raw_notification_ids } } }),
      );
      for (const notification of notifications) {
        const parsed = parser.parse({
          packageName: notification.packageName,
          title: notification.title,
          text: notification.body,
          postedAt: notification.postedAt,
        });
        results.push({
          source: 'raw_notification',
          raw_notification_id: notification.id,
          matched: parsed !== null,
          sender_name: parsed?.senderName ?? null,
          amount: parsed ? parsed.amount.value.toFixed(2) : null,
          security_code: parsed?.securityCode ?? null,
          approval_code: parsed?.approvalCode ?? null,
        });
      }
    }

    for (const sample of input.custom_samples ?? []) {
      const parsed = parser.parse({
        packageName: version.wallet.androidPackage,
        title: sample.title ?? null,
        text: sample.text ?? null,
        postedAt: new Date(),
      });
      results.push({
        source: 'custom_sample',
        raw_notification_id: null,
        matched: parsed !== null,
        sender_name: parsed?.senderName ?? null,
        amount: parsed ? parsed.amount.value.toFixed(2) : null,
        security_code: parsed?.securityCode ?? null,
        approval_code: parsed?.approvalCode ?? null,
      });
    }

    return results;
  }

  /** RF-WAL-004: "exactamente una activa" — desactiva las demás en la misma transacción. */
  async activateVersion(versionId: string, platformAdminId: string): Promise<ParserVersionSummary> {
    const activated = await this.prisma.$transaction(async (tx) => {
      const version = await tx.parserPattern.findUnique({
        where: { id: versionId },
        include: { wallet: true },
      });
      if (!version)
        throw new ApiHttpException(
          HttpStatus.NOT_FOUND,
          'NOT_FOUND',
          'La versión de parser no existe.',
        );

      await tx.parserPattern.updateMany({
        where: { walletId: version.walletId, isActive: true },
        data: { isActive: false },
      });
      const updated = await tx.parserPattern.update({
        where: { id: versionId },
        data: { isActive: true, activatedAt: new Date() },
      });

      return { updated, walletCode: version.wallet.code };
    });

    // Sin esto, el caché de 60s de `PrismaParserPatternRepository` seguiría
    // sirviendo la versión anterior hasta que expire (RF-WAL-006: sin
    // redespliegue, pero tampoco debería haber que esperar).
    await this.patternRepository.invalidate(activated.walletCode);

    await this.writeAuditEvent('platform.parser_version_activated', platformAdminId, versionId, {
      wallet_code: activated.walletCode,
      version: activated.updated.version,
    });

    const matchedCount = await this.prisma.withoutTenantScope((tx) =>
      tx.rawNotification.count({ where: { parserPatternId: versionId, parseStatus: 'PARSED' } }),
    );
    return toSummary(activated.updated, activated.walletCode, matchedCount);
  }

  private async writeAuditEvent(
    action: string,
    platformAdminId: string,
    resourceId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.withoutTenantScope((tx) =>
      tx.auditEvent.create({
        data: {
          action,
          actorType: 'PLATFORM_ADMIN',
          actorPlatformAdminId: platformAdminId,
          resourceType: 'parser_pattern',
          resourceId,
          metadata: metadata as Prisma.InputJsonValue,
        },
      }),
    );
  }
}

function toSummary(
  pattern: ParserPattern,
  walletCode: string,
  matchedCount: number,
): ParserVersionSummary {
  return {
    id: pattern.id,
    wallet_code: walletCode,
    version: pattern.version,
    rules: pattern.rules as unknown as ParserVersionSummary['rules'],
    notes: pattern.notes,
    is_active: pattern.isActive,
    matched_count: matchedCount,
    created_at: pattern.createdAt.toISOString(),
    activated_at: pattern.activatedAt?.toISOString() ?? null,
  };
}
