-- AlterTable
ALTER TABLE "webhook_endpoints" ADD COLUMN     "previous_secret_encrypted" BYTEA,
ADD COLUMN     "previous_secret_expires_at" TIMESTAMPTZ(6);
