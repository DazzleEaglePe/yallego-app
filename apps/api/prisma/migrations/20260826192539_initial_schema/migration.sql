-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "membership_role" AS ENUM ('OWNER', 'ADMIN', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "tenant_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_DELETION');

-- CreateEnum
CREATE TYPE "device_status" AS ENUM ('ACTIVE', 'PAUSED', 'REVOKED');

-- CreateEnum
CREATE TYPE "parse_status" AS ENUM ('PENDING', 'PARSED', 'UNMATCHED', 'ERROR');

-- CreateEnum
CREATE TYPE "transaction_status" AS ENUM ('CAPTURED', 'CONFIRMED', 'DISPUTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "delivery_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'DELIVERED', 'FAILED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "billing_cycle" AS ENUM ('MONTHLY', 'SEMIANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "one_time_token_purpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(64) NOT NULL,
    "business_name" VARCHAR(200) NOT NULL,
    "legal_name" VARCHAR(200),
    "tax_id" VARCHAR(20),
    "industry" VARCHAR(64),
    "country" CHAR(2) NOT NULL DEFAULT 'PE',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'America/Lima',
    "status" "tenant_status" NOT NULL DEFAULT 'ACTIVE',
    "deletion_requested_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(20),
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "failed_attempts" SMALLINT NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "membership_role" NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "email" CITEXT NOT NULL,
    "role" "membership_role" NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "invited_by" UUID,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by" UUID,
    "user_agent" TEXT,
    "ip_address" INET,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_time_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "purpose" "one_time_token_purpose" NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "manufacturer" VARCHAR(64),
    "model" VARCHAR(120),
    "os_version" VARCHAR(32),
    "app_version" VARCHAR(32),
    "last_seen_at" TIMESTAMPTZ(6),
    "last_ingest_at" TIMESTAMPTZ(6),
    "status" "device_status" NOT NULL DEFAULT 'ACTIVE',
    "paired_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pairing_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "label" VARCHAR(120),
    "created_by" UUID,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "device_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pairing_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(64) NOT NULL,
    "display_name" VARCHAR(120) NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "issuer" VARCHAR(64),
    "android_package" VARCHAR(255) NOT NULL,
    "icon_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "account_reference" VARCHAR(120),
    "enabled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parser_patterns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "wallet_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "rules" JSONB NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "activated_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parser_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "package_name" VARCHAR(255) NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "dedupe_hash" VARCHAR(64) NOT NULL,
    "posted_at" TIMESTAMPTZ(6) NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parse_status" "parse_status" NOT NULL DEFAULT 'PENDING',
    "parse_error" TEXT,
    "parser_pattern_id" UUID,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "raw_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "wallet_id" UUID NOT NULL,
    "raw_notification_id" UUID NOT NULL,
    "sender_name_encrypted" BYTEA,
    "sender_name_search" VARCHAR(200),
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PEN',
    "security_code" VARCHAR(16),
    "approval_code" VARCHAR(64),
    "status" "transaction_status" NOT NULL DEFAULT 'CAPTURED',
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "confirmed_at" TIMESTAMPTZ(6),
    "confirmed_by" UUID,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "key_prefix" VARCHAR(24) NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY['transactions:read']::TEXT[],
    "last_used_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "secret_encrypted" BYTEA NOT NULL,
    "subscribed_events" TEXT[],
    "description" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "last_success_at" TIMESTAMPTZ(6),
    "last_failure_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "endpoint_id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "event_type" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "delivery_status" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 8,
    "next_attempt_at" TIMESTAMPTZ(6),
    "last_attempt_at" TIMESTAMPTZ(6),
    "last_status_code" INTEGER,
    "last_error" TEXT,
    "delivered_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(32) NOT NULL,
    "display_name" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "price_monthly" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "price_semiannual" DECIMAL(10,2),
    "price_annual" DECIMAL(10,2),
    "currency" CHAR(3) NOT NULL DEFAULT 'PEN',
    "limits" JSONB NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "billing_cycle" "billing_cycle" NOT NULL DEFAULT 'MONTHLY',
    "status" "subscription_status" NOT NULL DEFAULT 'ACTIVE',
    "period_start" TIMESTAMPTZ(6) NOT NULL,
    "period_end" TIMESTAMPTZ(6) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_changes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "from_plan_id" UUID,
    "to_plan_id" UUID NOT NULL,
    "from_cycle" "billing_cycle",
    "to_cycle" "billing_cycle" NOT NULL,
    "effective_at" TIMESTAMPTZ(6) NOT NULL,
    "performed_by" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "transactions_count" INTEGER NOT NULL DEFAULT 0,
    "api_calls_count" INTEGER NOT NULL DEFAULT 0,
    "webhook_calls_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "subscription_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'PEN',
    "method" VARCHAR(64),
    "reference" VARCHAR(120),
    "covers_from" DATE NOT NULL,
    "covers_to" DATE NOT NULL,
    "confirmed_by" UUID,
    "confirmed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manual_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID,
    "actor_user_id" UUID,
    "actor_api_key_id" UUID,
    "actor_type" VARCHAR(24) NOT NULL,
    "action" VARCHAR(128) NOT NULL,
    "resource_type" VARCHAR(64),
    "resource_id" UUID,
    "metadata" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" CITEXT NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "totp_secret" BYTEA,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- CreateIndex
CREATE INDEX "memberships_tenant_id_idx" ON "memberships"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_tenant_id_user_id_key" ON "memberships"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- CreateIndex
CREATE INDEX "invitations_tenant_id_email_idx" ON "invitations"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");

-- CreateIndex
CREATE UNIQUE INDEX "one_time_tokens_token_hash_key" ON "one_time_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "one_time_tokens_user_id_purpose_idx" ON "one_time_tokens"("user_id", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "devices_token_hash_key" ON "devices"("token_hash");

-- CreateIndex
CREATE INDEX "devices_tenant_id_idx" ON "devices"("tenant_id");

-- CreateIndex
CREATE INDEX "devices_last_seen_at_idx" ON "devices"("last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "pairing_codes_code_hash_key" ON "pairing_codes"("code_hash");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_code_key" ON "wallets"("code");

-- CreateIndex
CREATE INDEX "wallets_android_package_idx" ON "wallets"("android_package");

-- CreateIndex
CREATE INDEX "tenant_wallets_tenant_id_idx" ON "tenant_wallets"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_wallets_tenant_id_wallet_id_key" ON "tenant_wallets"("tenant_id", "wallet_id");

-- CreateIndex
CREATE INDEX "parser_patterns_wallet_id_idx" ON "parser_patterns"("wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "parser_patterns_wallet_id_version_key" ON "parser_patterns"("wallet_id", "version");

-- CreateIndex
CREATE INDEX "raw_notifications_tenant_id_received_at_idx" ON "raw_notifications"("tenant_id", "received_at" DESC);

-- CreateIndex
CREATE INDEX "raw_notifications_parse_status_received_at_idx" ON "raw_notifications"("parse_status", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "raw_notifications_device_id_dedupe_hash_key" ON "raw_notifications"("device_id", "dedupe_hash");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_raw_notification_id_key" ON "transactions"("raw_notification_id");

-- CreateIndex
CREATE INDEX "transactions_tenant_id_occurred_at_idx" ON "transactions"("tenant_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_tenant_id_wallet_id_occurred_at_idx" ON "transactions"("tenant_id", "wallet_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_tenant_id_amount_idx" ON "transactions"("tenant_id", "amount");

-- CreateIndex
CREATE INDEX "transactions_tenant_id_status_idx" ON "transactions"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_tenant_id_idx" ON "api_keys"("tenant_id");

-- CreateIndex
CREATE INDEX "webhook_endpoints_tenant_id_idx" ON "webhook_endpoints"("tenant_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_status_next_attempt_at_idx" ON "webhook_deliveries"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "webhook_deliveries_endpoint_id_created_at_idx" ON "webhook_deliveries"("endpoint_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_deliveries_endpoint_id_event_id_key" ON "webhook_deliveries"("endpoint_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE INDEX "subscriptions_tenant_id_idx" ON "subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "subscription_changes_tenant_id_idx" ON "subscription_changes"("tenant_id");

-- CreateIndex
CREATE INDEX "usage_periods_tenant_id_period_start_idx" ON "usage_periods"("tenant_id", "period_start" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "usage_periods_tenant_id_period_start_key" ON "usage_periods"("tenant_id", "period_start");

-- CreateIndex
CREATE INDEX "manual_payments_tenant_id_idx" ON "manual_payments"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_events_tenant_id_created_at_idx" ON "audit_events"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_events_action_created_at_idx" ON "audit_events"("action", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_replaced_by_fkey" FOREIGN KEY ("replaced_by") REFERENCES "refresh_tokens"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "one_time_tokens" ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pairing_codes" ADD CONSTRAINT "pairing_codes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pairing_codes" ADD CONSTRAINT "pairing_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pairing_codes" ADD CONSTRAINT "pairing_codes_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_wallets" ADD CONSTRAINT "tenant_wallets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_wallets" ADD CONSTRAINT "tenant_wallets_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parser_patterns" ADD CONSTRAINT "parser_patterns_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_notifications" ADD CONSTRAINT "raw_notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_notifications" ADD CONSTRAINT "raw_notifications_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_notifications" ADD CONSTRAINT "raw_notifications_parser_pattern_id_fkey" FOREIGN KEY ("parser_pattern_id") REFERENCES "parser_patterns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_raw_notification_id_fkey" FOREIGN KEY ("raw_notification_id") REFERENCES "raw_notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_changes" ADD CONSTRAINT "subscription_changes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_changes" ADD CONSTRAINT "subscription_changes_from_plan_id_fkey" FOREIGN KEY ("from_plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_changes" ADD CONSTRAINT "subscription_changes_to_plan_id_fkey" FOREIGN KEY ("to_plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_changes" ADD CONSTRAINT "subscription_changes_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_periods" ADD CONSTRAINT "usage_periods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payments" ADD CONSTRAINT "manual_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payments" ADD CONSTRAINT "manual_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_api_key_id_fkey" FOREIGN KEY ("actor_api_key_id") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Domain constraints and partial indexes that Prisma cannot express.
ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_amount_positive" CHECK ("amount" > 0);

CREATE UNIQUE INDEX "memberships_single_owner_idx"
  ON "memberships"("tenant_id") WHERE "role" = 'OWNER';
CREATE INDEX "invitations_pending_idx"
  ON "invitations"("tenant_id", "email")
  WHERE "accepted_at" IS NULL AND "revoked_at" IS NULL;
CREATE INDEX "refresh_tokens_active_idx"
  ON "refresh_tokens"("user_id") WHERE "revoked_at" IS NULL;
CREATE INDEX "devices_alive_idx"
  ON "devices"("last_seen_at") WHERE "status" = 'ACTIVE';
CREATE INDEX "wallets_active_package_idx"
  ON "wallets"("android_package") WHERE "is_active";
CREATE INDEX "tenant_wallets_enabled_idx"
  ON "tenant_wallets"("tenant_id") WHERE "is_enabled";
CREATE UNIQUE INDEX "parser_patterns_single_active_idx"
  ON "parser_patterns"("wallet_id") WHERE "is_active";
CREATE INDEX "raw_notifications_unmatched_idx"
  ON "raw_notifications"("parse_status", "received_at")
  WHERE "parse_status" IN ('UNMATCHED', 'ERROR');
CREATE INDEX "transactions_non_captured_status_idx"
  ON "transactions"("tenant_id", "status") WHERE "status" <> 'CAPTURED';
CREATE INDEX "transactions_sender_search_idx"
  ON "transactions" USING GIN ("sender_name_search" gin_trgm_ops);
CREATE INDEX "api_keys_active_tenant_idx"
  ON "api_keys"("tenant_id") WHERE "revoked_at" IS NULL;
CREATE INDEX "webhook_endpoints_active_tenant_idx"
  ON "webhook_endpoints"("tenant_id") WHERE "deleted_at" IS NULL;
CREATE INDEX "webhook_endpoints_events_idx"
  ON "webhook_endpoints" USING GIN ("subscribed_events")
  WHERE "is_enabled" AND "deleted_at" IS NULL;
CREATE INDEX "webhook_deliveries_queue_idx"
  ON "webhook_deliveries"("status", "next_attempt_at")
  WHERE "status" IN ('PENDING', 'IN_PROGRESS');
CREATE UNIQUE INDEX "subscriptions_active_tenant_idx"
  ON "subscriptions"("tenant_id") WHERE "status" = 'ACTIVE';

-- Keep timestamps correct for writes made outside Prisma.
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "tenants_touch_updated_at" BEFORE UPDATE ON "tenants"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER "users_touch_updated_at" BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER "memberships_touch_updated_at" BEFORE UPDATE ON "memberships"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER "devices_touch_updated_at" BEFORE UPDATE ON "devices"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER "wallets_touch_updated_at" BEFORE UPDATE ON "wallets"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER "tenant_wallets_touch_updated_at" BEFORE UPDATE ON "tenant_wallets"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER "transactions_touch_updated_at" BEFORE UPDATE ON "transactions"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER "webhook_endpoints_touch_updated_at" BEFORE UPDATE ON "webhook_endpoints"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER "webhook_deliveries_touch_updated_at" BEFORE UPDATE ON "webhook_deliveries"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER "plans_touch_updated_at" BEFORE UPDATE ON "plans"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER "subscriptions_touch_updated_at" BEFORE UPDATE ON "subscriptions"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER "usage_periods_touch_updated_at" BEFORE UPDATE ON "usage_periods"
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Audit records are append-only by design.
REVOKE UPDATE, DELETE ON "audit_events" FROM PUBLIC;
