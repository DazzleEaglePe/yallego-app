export type DeviceStatus = 'ACTIVE' | 'PAUSED' | 'REVOKED';
export type DeviceConnectivity = 'ONLINE' | 'DEGRADED' | 'OFFLINE';

export interface DeviceSummary {
  id: string;
  label: string;
  manufacturer: string | null;
  model: string | null;
  os_version: string | null;
  app_version: string | null;
  status: DeviceStatus;
  connectivity: DeviceConnectivity;
  last_seen_at: string | null;
  paired_at: string;
}

export interface PairingCodeResponse {
  code: string;
  qr_payload: string;
  expires_at: string;
}

export interface PairDeviceResponse {
  device_id: string;
  device_token: string;
  tenant: { id: string; business_name: string };
  monitored_packages: string[];
}

export interface HeartbeatResponse {
  server_time: string;
  monitored_packages: string[];
  config_version: number;
}

export interface DeviceConfigResponse {
  monitored_packages: string[];
  heartbeat_interval_seconds: number;
  ingest_batch_size: number;
  config_version: number;
}

export interface DeviceMobileActivityItem {
  id: string;
  wallet: { code: string; display_name: string };
  sender_name: string | null;
  amount: string;
  currency: string;
  status: 'CAPTURED' | 'CONFIRMED' | 'DISPUTED' | 'VOIDED';
  occurred_at: string;
}

export interface DeviceMobileOverviewResponse {
  tenant: { id: string; business_name: string };
  device: { id: string; label: string };
  wallets: Array<{ code: string; display_name: string }>;
  subscription: {
    plan_code: string;
    plan_name: string;
    status: string;
    period_end: string;
    transactions_used: number;
    transactions_limit: number;
  } | null;
  recent_activity: DeviceMobileActivityItem[];
}
