import type { ParserRuleInput } from './platform-parsers.schemas.js';

export interface ParserVersionSummary {
  id: string;
  wallet_code: string;
  version: number;
  rules: ParserRuleInput[];
  notes: string | null;
  is_active: boolean;
  matched_count: number;
  created_at: string;
  activated_at: string | null;
}

export interface ParserTestResult {
  source: 'raw_notification' | 'custom_sample';
  raw_notification_id: string | null;
  matched: boolean;
  sender_name: string | null;
  amount: string | null;
  security_code: string | null;
  approval_code: string | null;
}

export interface UnmatchedNotificationSummary {
  id: string;
  package_name: string;
  title: string | null;
  body: string | null;
  posted_at: string;
  parse_error: string | null;
}

export interface WalletCatalogAdminEntry {
  id: string;
  code: string;
  display_name: string;
  provider: string;
  issuer: string | null;
  android_package: string;
  icon_url: string | null;
  is_active: boolean;
  created_at: string;
}
