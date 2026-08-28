export type DeviceStatus = 'ACTIVE' | 'PAUSED' | 'REVOKED';
export type DeviceConnectivity = 'ONLINE' | 'OFFLINE';

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
