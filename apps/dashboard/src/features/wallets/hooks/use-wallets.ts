'use client';

import type { ActivateWalletInput, UpdateWalletInput } from '@yallego/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuthSession } from '@/features/auth/auth-session';

import {
  activateWallet,
  deactivateWallet,
  fetchTenantWallets,
  fetchWalletCatalog,
  updateWallet,
} from '../api/wallets';

export const walletCatalogQueryKey = ['wallet-catalog'] as const;
export const tenantWalletsQueryKey = ['tenant-wallets'] as const;

export function useWallets(enabled = true) {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? null;

  const catalog = useQuery({
    queryKey: walletCatalogQueryKey,
    queryFn: () => fetchWalletCatalog(accessToken!),
    enabled: enabled && Boolean(accessToken),
    staleTime: 5 * 60_000,
  });
  const tenantWallets = useQuery({
    queryKey: tenantWalletsQueryKey,
    queryFn: () => fetchTenantWallets(accessToken!),
    enabled: enabled && Boolean(accessToken),
  });

  return { catalog, tenantWallets };
}

export function useWalletActions() {
  const { session } = useAuthSession();
  const accessToken = session?.accessToken ?? '';
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: tenantWalletsQueryKey });

  const activate = useMutation({
    mutationFn: (input: ActivateWalletInput) => activateWallet(accessToken, input),
    onSuccess: refresh,
  });
  const update = useMutation({
    mutationFn: ({ walletId, input }: { walletId: string; input: UpdateWalletInput }) =>
      updateWallet(accessToken, walletId, input),
    onSuccess: refresh,
  });
  const deactivate = useMutation({
    mutationFn: (walletId: string) => deactivateWallet(accessToken, walletId),
    onSuccess: refresh,
  });

  return { activate, deactivate, update };
}
