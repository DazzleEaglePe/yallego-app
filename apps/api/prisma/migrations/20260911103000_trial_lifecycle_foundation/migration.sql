-- Fundamentos aditivos para trial y cuotas atómicas. Esta migración no cambia
-- todavía la asignación del plan FREE ni el comportamiento de tenants existentes.

ALTER TYPE "subscription_status" ADD VALUE IF NOT EXISTS 'PENDING_TRIAL' BEFORE 'ACTIVE';
ALTER TYPE "subscription_status" ADD VALUE IF NOT EXISTS 'TRIALING' BEFORE 'ACTIVE';

CREATE TYPE "trial_end_reason" AS ENUM ('TIME_LIMIT', 'TOTAL_LIMIT', 'ADMINISTRATIVE');
CREATE TYPE "usage_metric" AS ENUM ('TRANSACTIONS');
CREATE TYPE "usage_window_type" AS ENUM ('SUBSCRIPTION_PERIOD', 'DAY');

ALTER TABLE "subscriptions"
  ADD COLUMN "trial_started_at" TIMESTAMPTZ(6),
  ADD COLUMN "trial_ends_at" TIMESTAMPTZ(6),
  ADD COLUMN "trial_ended_at" TIMESTAMPTZ(6),
  ADD COLUMN "trial_end_reason" "trial_end_reason",
  ADD COLUMN "paid_through" TIMESTAMPTZ(6);

CREATE TABLE "usage_buckets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "metric" "usage_metric" NOT NULL,
  "window_type" "usage_window_type" NOT NULL,
  "window_start" TIMESTAMPTZ(6) NOT NULL,
  "window_end" TIMESTAMPTZ(6) NOT NULL,
  "used" INTEGER NOT NULL DEFAULT 0,
  "reserved" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "usage_buckets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "usage_buckets_nonnegative_check" CHECK ("used" >= 0 AND "reserved" >= 0),
  CONSTRAINT "usage_buckets_window_check" CHECK ("window_end" > "window_start")
);

CREATE UNIQUE INDEX "usage_buckets_tenant_id_metric_window_type_window_start_key"
  ON "usage_buckets"("tenant_id", "metric", "window_type", "window_start");
CREATE INDEX "usage_buckets_tenant_id_metric_window_end_idx"
  ON "usage_buckets"("tenant_id", "metric", "window_end");

ALTER TABLE "usage_buckets"
  ADD CONSTRAINT "usage_buckets_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TRIGGER "usage_buckets_touch_updated_at" BEFORE UPDATE ON "usage_buckets"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE "usage_buckets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_buckets" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "usage_buckets" FOR ALL
  USING (app_is_unscoped() OR tenant_id = app_current_tenant())
  WITH CHECK (app_is_unscoped() OR tenant_id = app_current_tenant());
