'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuthSession } from '@/features/auth/auth-session';
import {
  useRealtimeSocket,
  type RealtimeConnectionStatus,
} from '@/shared/hooks/use-realtime-socket';

/**
 * Un cobro nuevo o confirmado invalida la caché en vez de fusionarse a mano:
 * es más simple y, tras una reconexión, converge igual sin lógica aparte
 * (docs/04_ARQUITECTURA_SOFTWARE.md §8.3).
 */
export function useRealtimeTransactions(): { status: RealtimeConnectionStatus } {
  const { session } = useAuthSession();
  const { socket, status } = useRealtimeSocket(session?.accessToken ?? null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions-summary'] });
    };

    socket.on('transaction.created', invalidate);
    socket.on('transaction.confirmed', invalidate);
    // Al reconectar tras un corte, se resincroniza todo por si hubo eventos perdidos.
    socket.on('connected', invalidate);

    return () => {
      socket.off('transaction.created', invalidate);
      socket.off('transaction.confirmed', invalidate);
      socket.off('connected', invalidate);
    };
  }, [socket, queryClient]);

  return { status };
}
