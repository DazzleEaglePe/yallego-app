import type {
  ActivateWalletInput,
  TenantWalletSummary,
  UpdateWalletInput,
  WalletCatalogEntry,
} from '@yallego/contracts';

import { authenticatedRequest } from '@/shared/lib/api-client';

export function fetchWalletCatalog(accessToken: string): Promise<WalletCatalogEntry[]> {
  return authenticatedRequest<WalletCatalogEntry[]>('/wallets/catalog', accessToken);
}

export function fetchTenantWallets(accessToken: string): Promise<TenantWalletSummary[]> {
  return authenticatedRequest<TenantWalletSummary[]>('/wallets', accessToken);
}

export function activateWallet(
  accessToken: string,
  input: ActivateWalletInput,
): Promise<TenantWalletSummary> {
  return authenticatedRequest<TenantWalletSummary>('/wallets', accessToken, {
    body: JSON.stringify(input),
    method: 'POST',
  });
}

export function updateWallet(
  accessToken: string,
  walletId: string,
  input: UpdateWalletInput,
): Promise<TenantWalletSummary> {
  return authenticatedRequest<TenantWalletSummary>(`/wallets/${walletId}`, accessToken, {
    body: JSON.stringify(input),
    method: 'PATCH',
  });
}

export function deactivateWallet(accessToken: string, walletId: string): Promise<void> {
  return authenticatedRequest<void>(`/wallets/${walletId}`, accessToken, { method: 'DELETE' });
}
