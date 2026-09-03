import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { MembershipRole } from '@prisma/client';
import {
  listTransactionsQuerySchema,
  transactionActionSchema,
  transactionsSummaryQuerySchema,
  type ListTransactionsQuery,
  type TransactionActionInput,
  type TransactionsSummaryQuery,
} from '@yallego/contracts';
import type { Response } from 'express';

import { CurrentAccess } from '../../shared/decorators/current-access.decorator';
import { CurrentPublicTenant } from '../../shared/decorators/current-public-tenant.decorator';
import { PublicScoped } from '../../shared/decorators/public-scoped.decorator';
import type { AccessContext } from '../../shared/guards/public-api-auth.guard';
import type { TenantResourceContext } from '../../shared/guards/tenant.guard';
import { ZodValidationPipe } from '../../shared/pipes/zod-validation.pipe';
import type { TransactionActor } from './transactions.service';
import { TransactionsService } from './transactions.service';

/** Traduce quién hizo la solicitud (sesión de panel o clave de API) al actor que registran el modelo y la auditoría. */
function toActor(access: AccessContext): TransactionActor {
  return access.type === 'user'
    ? { type: 'user', userId: access.userId }
    : { type: 'api_key', apiKeyId: access.apiKeyId };
}

@Controller('transactions')
export class TransactionsController {
  constructor(@Inject(TransactionsService) private readonly transactions: TransactionsService) {}

  @Get()
  @PublicScoped({ role: MembershipRole.VIEWER, scope: 'transactions:read' })
  list(
    @CurrentPublicTenant() tenant: TenantResourceContext,
    @Query(new ZodValidationPipe(listTransactionsQuerySchema)) query: ListTransactionsQuery,
  ) {
    return this.transactions.list(tenant, query);
  }

  @Get('summary')
  @PublicScoped({ role: MembershipRole.VIEWER, scope: 'transactions:read' })
  summary(
    @CurrentPublicTenant() tenant: TenantResourceContext,
    @Query(new ZodValidationPipe(transactionsSummaryQuerySchema)) query: TransactionsSummaryQuery,
  ) {
    return this.transactions.summary(tenant, query);
  }

  @Post('export')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @PublicScoped({ role: MembershipRole.VIEWER, scope: 'transactions:read' })
  async export(
    @CurrentPublicTenant() tenant: TenantResourceContext,
    @Query(new ZodValidationPipe(listTransactionsQuerySchema)) query: ListTransactionsQuery,
    @Res({ passthrough: true }) response: Response,
  ) {
    const csv = await this.transactions.exportCsv(tenant, query);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="transacciones-${tenant.slug}.csv"`,
    );
    return csv;
  }

  @Get(':id')
  @PublicScoped({ role: MembershipRole.VIEWER, scope: 'transactions:read' })
  getById(
    @CurrentPublicTenant() tenant: TenantResourceContext,
    @Param('id') transactionId: string,
  ) {
    return this.transactions.getById(tenant, transactionId);
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @PublicScoped({ role: MembershipRole.OPERATOR, scope: 'transactions:write' })
  confirm(
    @CurrentPublicTenant() tenant: TenantResourceContext,
    @CurrentAccess() access: AccessContext,
    @Param('id') transactionId: string,
    @Body(new ZodValidationPipe(transactionActionSchema)) input: TransactionActionInput,
  ) {
    return this.transactions.confirm(tenant, toActor(access), transactionId, input);
  }

  @Post(':id/dispute')
  @HttpCode(HttpStatus.OK)
  @PublicScoped({ role: MembershipRole.OPERATOR, scope: 'transactions:write' })
  dispute(
    @CurrentPublicTenant() tenant: TenantResourceContext,
    @CurrentAccess() access: AccessContext,
    @Param('id') transactionId: string,
    @Body(new ZodValidationPipe(transactionActionSchema)) input: TransactionActionInput,
  ) {
    return this.transactions.dispute(tenant, toActor(access), transactionId, input);
  }
}
