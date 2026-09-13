import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Redis } from 'ioredis';
import type { ServerOptions } from 'socket.io';

/**
 * Sprint 5: "adaptador de distribución entre instancias". Sin esto, un
 * evento emitido desde la instancia de `api` que procesó el job de parsing
 * solo llegaría a los clientes de Socket.IO conectados a *esa* instancia.
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private readonly pubClient: Redis,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const subClient = this.pubClient.duplicate();
    this.adapterConstructor = createAdapter(this.pubClient, subClient);
  }

  override createIOServer(port: number, options?: ServerOptions): unknown {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
