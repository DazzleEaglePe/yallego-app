export interface WalletCatalogEntry {
  id: string;
  code: string;
  display_name: string;
  provider: string;
  issuer: string | null;
  icon_url: string | null;
}

export interface TenantWalletSummary {
  id: string;
  wallet: {
    code: string;
    display_name: string;
    provider: string;
    issuer: string | null;
  };
  is_enabled: boolean;
  account_reference: string | null;
  enabled_at: string;
}
