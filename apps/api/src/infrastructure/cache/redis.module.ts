import { Global, Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

import type { Environment } from '../../config/env.schema';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/** Cierra la conexión al apagar la aplicación; BullMQ abre su propia conexión aparte. */
class RedisLifecycle implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'ready') {
      await this.client.quit();
      return;
    }

    // `quit()` sólo es válido con una sesión abierta. Durante un apagado con
    // Redis caído, forzamos el cierre local para no bloquear el proceso.
    this.client.disconnect();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) =>
        new Redis(config.get('REDIS_URL', { infer: true }), { maxRetriesPerRequest: null }),
    },
    RedisLifecycle,
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
