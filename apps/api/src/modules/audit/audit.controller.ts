import {
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import { listAuditEventsQuerySchema, type ListAuditEventsQuery } from '@yallego/contracts';
import type { Response } from 'express';

import { CurrentTenant } from '../../shared/decorators/current-tenant.decorator';
import { TenantScoped } from '../../shared/decorators/tenant-scoped.decorator';
import type { TenantContext } from '../../shared/guards/tenant.guard';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  @Get()
  @TenantScoped(MembershipRole.ADMIN)
  list(
    @CurrentTenant() tenant: TenantContext,
    @Query(new ZodValidationPipe(listAuditEventsQuerySchema)) query: ListAuditEventsQuery,
  ) {
    return this.audit.list(tenant, query);
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @TenantScoped(MembershipRole.ADMIN)
  async export(
    @CurrentTenant() tenant: TenantContext,
    @Query(new ZodValidationPipe(listAuditEventsQuerySchema)) query: ListAuditEventsQuery,
    @Res({ passthrough: true }) response: Response,
  ) {
    const csv = await this.audit.exportCsv(tenant, query);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="auditoria-${tenant.slug}.csv"`,
    );
    return csv;
  }
}
