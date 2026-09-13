export type IngestItemStatus = 'QUEUED' | 'DUPLICATE';

export interface IngestItemResult {
  client_ref: string;
  notification_id: string;
  status: IngestItemStatus;
}

export interface IngestResponse {
  accepted: IngestItemResult[];
  rejected: Array<{ client_ref: string; reason: string }>;
}
