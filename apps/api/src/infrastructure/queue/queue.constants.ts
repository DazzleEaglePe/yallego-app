export const PARSING_QUEUE = 'parsing';

export interface ParseNotificationJob {
  rawNotificationId: string;
}

export const WEBHOOK_QUEUE = 'webhooks';

export interface WebhookDeliveryJob {
  deliveryId: string;
  /** Se pasa junto al id para que el worker pueda usar `withTenant` sin una consulta previa sin alcance. */
  tenantId: string;
}
