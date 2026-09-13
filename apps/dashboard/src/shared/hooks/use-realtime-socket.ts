'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

import { publicEnvironment } from '@/shared/lib/env';

export type RealtimeConnectionStatus = 'connecting' | 'connected' | 'disconnected';

/**
 * Conexión de bajo nivel al canal de tiempo real (docs/06_API_CONTRACT.md §10).
 * Reintenta con backoff exponencial (comportamiento por defecto de Socket.IO)
 * y, al reconectar, `features/transactions` invalida la caché para
 * resincronizar en vez de confiar en los eventos perdidos durante el corte.
 */
export function useRealtimeSocket(accessToken: string | null): {
  socket: Socket | null;
  status: RealtimeConnectionStatus;
} {
  const [status, setStatus] = useState<RealtimeConnectionStatus>('connecting');
  const socketRef = useRef<Socket | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!accessToken) {
      setStatus('disconnected');
      return;
    }

    const socket = io(publicEnvironment.NEXT_PUBLIC_WS_URL, {
      path: '/v1/realtime',
      transports: ['websocket'],
      auth: { token: accessToken },
    });
    socketRef.current = socket;
    forceRender((n) => n + 1);
    setStatus('connecting');

    socket.on('connected', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('connect_error', () => setStatus('disconnected'));
    socket.on('error', () => setStatus('disconnected'));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken]);

  return { socket: socketRef.current, status };
}
