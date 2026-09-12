-- Replace the date-only indexes with indexes that cover the deterministic
-- cursor order used by the transactions and audit endpoints.
DROP INDEX "transactions_tenant_id_occurred_at_idx";
CREATE INDEX "transactions_tenant_id_occurred_at_id_idx"
  ON "transactions"("tenant_id", "occurred_at" DESC, "id" DESC);

DROP INDEX "audit_events_tenant_id_created_at_idx";
CREATE INDEX "audit_events_tenant_id_created_at_id_idx"
  ON "audit_events"("tenant_id", "created_at" DESC, "id" DESC);

-- Audit queries are always tenant-scoped. Leading with tenant_id avoids
-- scanning events from other tenants when filtering by action.
DROP INDEX "audit_events_action_created_at_idx";
CREATE INDEX "audit_events_tenant_id_action_created_at_id_idx"
  ON "audit_events"("tenant_id", "action", "created_at" DESC, "id" DESC);
