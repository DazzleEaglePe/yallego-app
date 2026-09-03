import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient, type Prisma } from '@prisma/client';

/** Cliente restringido a la transacción que estableció el contexto de tenant. */
export type ScopedClient = Prisma.TransactionClient;

const TRANSACTION_OPTIONS = { maxWait: 5_000, timeout: 15_000 } as const;

/**
 * Acceso a la base de datos con contexto de tenant explícito.
 *
 * Las tablas con `tenant_id` tienen Row Level Security activo y la política
 * niega por omisión: una consulta lanzada fuera de `withTenant` o de
 * `withoutTenantScope` no devuelve filas. El contexto se establece con
 * `set_config(..., true)`, de modo que vive exactamente lo que dura la
 * transacción y nunca contamina la siguiente solicitud que reutilice la conexión.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Ejecuta la operación con el tenant indicado como único visible.
   * El identificador procede siempre de la credencial autenticada, nunca del cliente.
   */
  withTenant<T>(tenantId: string, operation: (tx: ScopedClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return operation(tx);
    }, TRANSACTION_OPTIONS);
  }

  /**
   * Ejecuta la operación sin restricción de tenant.
   *
   * Reservado a los flujos que son legítimamente transversales y no pueden
   * conocer el tenant de antemano: registro, ingreso, renovación de sesión,
   * cambio de tenant activo y aceptación de invitación. Cualquier otro uso
   * debilita el aislamiento.
   */
  withoutTenantScope<T>(operation: (tx: ScopedClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.unscoped', 'on', true)`;
      return operation(tx);
    }, TRANSACTION_OPTIONS);
  }
}
