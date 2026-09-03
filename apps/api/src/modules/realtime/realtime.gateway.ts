import { randomUUID } from 'node:crypto';

import { Inject, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { ApiKeyVerifier } from '../api-keys/api-key-verifier';
import { TokenService } from '../auth/token.service';
import {
  TRANSACTION_CONFIRMED_EVENT,
  TransactionConfirmedEvent,
} from '../../shared/events/transaction-confirmed.event';
import {
  TRANSACTION_CREATED_EVENT,
  TransactionCreatedEvent,
} from '../../shared/events/transaction-created.event';

interface AuthenticatedSocketData {
  tenantId: string;
  sessionId: string;
}

/**
 * docs/06_API_CONTRACT.md §10. El contrato público documenta el handshake
 * con API key (integradores, Sprint 6, restringido por plan); el panel se
 * conecta con su propio access token JWT — misma verificación que el resto
 * de `/v1`, sin depender de que existan claves de API todavía.
 *
 * La distribución entre instancias de `api` corre por cuenta del adaptador
 * Redis de Socket.IO (ver `bootstrap/redis-io-adapter.ts`), no de este
 * archivo: cualquier instancia puede emitir a una sala y todas la reciben.
 */
@WebSocketGateway({
  path: '/v1/realtime',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() private readonly server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    @Inject(TokenService) private readonly tokenService: TokenService,
    @Inject(ApiKeyVerifier) private readonly apiKeyVerifier: ApiKeyVerifier,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    const token = this.extractToken(socket);
    if (!token) {
      this.reject(socket, 'UNAUTHENTICATED', 'Falta el token de autenticación.');
      return;
    }

    if (token.startsWith('yk_')) {
      await this.connectWithApiKey(socket, token);
      return;
    }

    try {
      const payload = this.tokenService.verifyAccessToken(token);
      await this.join(socket, payload.tid);
    } catch {
      this.reject(socket, 'UNAUTHENTICATED', 'La sesión no es válida o expiró.');
    }
  }

  /** RF-API-013 (docs/06_API_CONTRACT.md §10): solo Comercio/Cadena y el alcance `realtime:subscribe`. El panel (JWT) no pasa por aquí — siempre tiene acceso. */
  private async connectWithApiKey(socket: Socket, apiKey: string): Promise<void> {
    const verified = await this.apiKeyVerifier.verify(apiKey);
    if (!verified) {
      this.reject(socket, 'UNAUTHENTICATED', 'La clave de API no es válida.');
      return;
    }
    if (!verified.websocketApiEnabled) {
      this.reject(socket, 'FORBIDDEN', 'El plan actual no incluye acceso al canal de tiempo real.');
      return;
    }
    if (!verified.scopes.includes('realtime:subscribe')) {
      this.reject(socket, 'FORBIDDEN', 'Esta clave no tiene el alcance "realtime:subscribe".');
      return;
    }
    await this.join(socket, verified.tenantId);
  }

  private async join(socket: Socket, tenantId: string): Promise<void> {
    const sessionId = randomUUID();
    const data: AuthenticatedSocketData = { tenantId, sessionId };
    socket.data = data;

    // El evento `connected` confirma que la suscripción ya está activa. Esto
    // evita perder el primer cobro con adaptadores asíncronos (por ejemplo,
    // Redis) cuando muchas conexiones se abren al mismo tiempo.
    await socket.join(tenantRoom(tenantId));
    socket.emit('connected', { tenant_id: tenantId, session_id: sessionId });
  }

  handleDisconnect(_socket: Socket): void {
    // Socket.IO limpia la membresía de la sala automáticamente al desconectar.
  }

  @OnEvent(TRANSACTION_CREATED_EVENT)
  handleTransactionCreated(event: TransactionCreatedEvent): void {
    this.server.to(tenantRoom(event.tenantId)).emit('transaction.created', {
      id: event.transactionId,
      wallet_code: event.walletCode,
      device_id: event.deviceId,
      amount: event.amount.toFixed(2),
      currency: event.currency,
      occurred_at: event.occurredAt.toISOString(),
    });
  }

  @OnEvent(TRANSACTION_CONFIRMED_EVENT)
  handleTransactionConfirmed(event: TransactionConfirmedEvent): void {
    this.server.to(tenantRoom(event.tenantId)).emit('transaction.confirmed', {
      transaction_id: event.transactionId,
      confirmed_by: event.confirmedBy,
      confirmed_at: event.confirmedAt.toISOString(),
    });
  }

  private extractToken(socket: Socket): string | null {
    const fromAuth = socket.handshake.auth?.['token'];
    if (typeof fromAuth === 'string' && fromAuth.length > 0) return fromAuth;

    const header = socket.handshake.headers.authorization;
    const [scheme, value] = header?.split(' ') ?? [];
    return scheme === 'Bearer' && value ? value : null;
  }

  private reject(socket: Socket, code: string, message: string): void {
    this.logger.warn(`Rejecting socket ${socket.id}: ${code}`);
    socket.emit('error', { code, message });
    socket.disconnect(true);
  }
}

function tenantRoom(tenantId: string): string {
  return `tenant:${tenantId}`;
}
