'use client';

import type { LoginInput, MembershipRole } from '@yallego/contracts';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { apiRequest } from './api';

export interface AuthSession {
  accessToken: string;
  expiresAt: number;
  tenants: Array<{
    business_name: string;
    id: string;
    role: MembershipRole;
    slug: string;
  }>;
  user: {
    email: string;
    full_name: string;
    id: string;
  };
}

interface SessionResponse {
  access_token: string;
  expires_in: number;
  tenants: AuthSession['tenants'];
  user: AuthSession['user'];
}

interface AuthSessionContextValue {
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  session: AuthSession | null;
  status: 'authenticated' | 'loading' | 'unauthenticated';
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);
let initialRefreshRequest: Promise<SessionResponse> | undefined;

export function AuthSessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthSessionContextValue['status']>('loading');

  const applySession = useCallback((response: SessionResponse) => {
    setSession(toSession(response));
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    setStatus('unauthenticated');
  }, []);

  const refresh = useCallback(async () => {
    const response = await apiRequest<SessionResponse>('/auth/refresh', {
      body: '{}',
      method: 'POST',
    });
    applySession(response);
  }, [applySession]);

  useEffect(() => {
    let active = true;
    initialRefreshRequest ??= apiRequest<SessionResponse>('/auth/refresh', {
      body: '{}',
      method: 'POST',
    });

    void initialRefreshRequest
      .then((response) => {
        if (active) applySession(response);
      })
      .catch(() => {
        if (active) clearSession();
      });

    return () => {
      active = false;
    };
  }, [applySession, clearSession]);

  useEffect(() => {
    if (!session) return;

    const refreshIn = Math.max(session.expiresAt - Date.now() - 60_000, 1_000);
    const timer = window.setTimeout(() => {
      void refresh().catch(clearSession);
    }, refreshIn);

    return () => window.clearTimeout(timer);
  }, [clearSession, refresh, session]);

  const login = useCallback(
    async (input: LoginInput) => {
      const response = await apiRequest<SessionResponse>('/auth/login', {
        body: JSON.stringify(input),
        method: 'POST',
      });
      applySession(response);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest<void>('/auth/logout', { body: '{}', method: 'POST' });
    } catch {
      // La sesión local debe cerrarse incluso si el servidor no está disponible.
    } finally {
      clearSession();
      initialRefreshRequest = undefined;
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ login, logout, session, status }),
    [login, logout, session, status],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession(): AuthSessionContextValue {
  const context = useContext(AuthSessionContext);
  if (!context) throw new Error('useAuthSession debe usarse dentro de AuthSessionProvider.');
  return context;
}

function toSession(response: SessionResponse): AuthSession {
  return {
    accessToken: response.access_token,
    expiresAt: Date.now() + response.expires_in * 1_000,
    tenants: response.tenants,
    user: response.user,
  };
}
