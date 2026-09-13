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

const ACTIVE_TENANT_STORAGE_KEY = 'yallego.activeTenantId';

export interface AuthSession {
  accessToken: string;
  activeTenantId: string;
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
  active_tenant_id: string;
  expires_in: number;
  tenants: AuthSession['tenants'];
  user: AuthSession['user'];
}

interface AuthSessionContextValue {
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  session: AuthSession | null;
  status: 'authenticated' | 'loading' | 'unauthenticated';
  switchTenant: (tenantId: string) => Promise<void>;
}

interface SwitchTenantResponse {
  access_token: string;
  active_tenant_id: string;
  expires_in: number;
}

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);
let initialRefreshRequest: Promise<SessionResponse> | undefined;

export function AuthSessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthSessionContextValue['status']>('loading');

  const applySession = useCallback((response: SessionResponse) => {
    setSession(toSession(response));
    rememberTenantId(response.active_tenant_id);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    setSession(null);
    setStatus('unauthenticated');
  }, []);

  const refresh = useCallback(async () => {
    const response = await apiRequest<SessionResponse>('/auth/refresh', {
      body: JSON.stringify({ tenant_id: session?.activeTenantId ?? readStoredTenantId() }),
      method: 'POST',
    });
    applySession(response);
  }, [applySession, session?.activeTenantId]);

  useEffect(() => {
    let active = true;
    initialRefreshRequest ??= apiRequest<SessionResponse>('/auth/refresh', {
      body: JSON.stringify({ tenant_id: readStoredTenantId() }),
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
      forgetTenantId();
      initialRefreshRequest = undefined;
    }
  }, [clearSession]);

  const switchTenant = useCallback(
    async (tenantId: string) => {
      if (!session || tenantId === session.activeTenantId) return;

      const response = await apiRequest<SwitchTenantResponse>('/auth/switch-tenant', {
        body: JSON.stringify({ tenant_id: tenantId }),
        headers: { authorization: `Bearer ${session.accessToken}` },
        method: 'POST',
      });

      setSession((current) =>
        current
          ? {
              ...current,
              accessToken: response.access_token,
              activeTenantId: response.active_tenant_id,
              expiresAt: Date.now() + response.expires_in * 1_000,
            }
          : current,
      );
      rememberTenantId(response.active_tenant_id);
    },
    [session],
  );

  const value = useMemo(
    () => ({ login, logout, refreshSession: refresh, session, status, switchTenant }),
    [login, logout, refresh, session, status, switchTenant],
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
    activeTenantId: response.active_tenant_id,
    expiresAt: Date.now() + response.expires_in * 1_000,
    tenants: response.tenants,
    user: response.user,
  };
}

export function getActiveTenant(session: AuthSession | null) {
  return session?.tenants.find(({ id }) => id === session.activeTenantId);
}

function readStoredTenantId(): string | undefined {
  try {
    return window.localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function rememberTenantId(tenantId: string): void {
  try {
    window.localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, tenantId);
  } catch {
    // El almacenamiento puede estar deshabilitado; la sesión actual sigue siendo válida.
  }
}

function forgetTenantId(): void {
  try {
    window.localStorage.removeItem(ACTIVE_TENANT_STORAGE_KEY);
  } catch {
    // No hay estado local que limpiar cuando el navegador bloquea el almacenamiento.
  }
}
