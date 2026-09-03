/** RF-ADM-009: tenants activos, volumen de transacciones, tasa de parsing, salud de webhooks. */
export interface PlatformMetrics {
  tenants: {
    total: number;
    active: number;
    suspended: number;
  };
  transactions: {
    last_30_days: number;
    amount_last_30_days: string;
  };
  parsing: {
    parsed_last_30_days: number;
    unmatched_last_30_days: number;
    /** 0–100, dos decimales. `null` si no hubo notificaciones en la ventana. */
    success_rate_last_30_days: number | null;
  };
  webhooks: {
    active_endpoints: number;
    disabled_endpoints: number;
    deliveries_last_30_days: number;
    failed_deliveries_last_30_days: number;
  };
}
