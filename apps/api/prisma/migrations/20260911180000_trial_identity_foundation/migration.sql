CREATE TYPE "trial_identity_kind" AS ENUM ('ANDROID_ID', 'INSTALLATION_KEY', 'PLAY_RECALL', 'PHONE', 'TAX_ID');
CREATE TYPE "trial_identity_claim_status" AS ENUM ('CLAIMED', 'CONSUMED', 'DENIED', 'OVERRIDDEN');

ALTER TABLE "devices"
  ADD COLUMN "installation_id_hash" VARCHAR(128),
  ADD COLUMN "android_id_hash" VARCHAR(128),
  ADD COLUMN "public_key_thumbprint" VARCHAR(128),
  ADD COLUMN "integrity_level" VARCHAR(64),
  ADD COLUMN "integrity_checked_at" TIMESTAMPTZ(6);

CREATE TABLE "trial_identity_claims" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "kind" "trial_identity_kind" NOT NULL,
  "value_hash" VARCHAR(128) NOT NULL,
  "tenant_id" UUID NOT NULL,
  "status" "trial_identity_claim_status" NOT NULL DEFAULT 'CLAIMED',
  "claimed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6),
  "metadata" JSONB,
  CONSTRAINT "trial_identity_claims_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trial_identity_claims_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "trial_identity_claims_kind_value_hash_key" ON "trial_identity_claims"("kind", "value_hash");
CREATE INDEX "trial_identity_claims_tenant_id_idx" ON "trial_identity_claims"("tenant_id");
