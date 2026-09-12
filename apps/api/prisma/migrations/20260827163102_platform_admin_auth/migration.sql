-- AlterTable
ALTER TABLE "audit_events" ADD COLUMN     "actor_platform_admin_id" UUID;

-- AlterTable
ALTER TABLE "platform_admins" ADD COLUMN     "failed_attempts" SMALLINT NOT NULL DEFAULT 0,
ADD COLUMN     "failed_attempts_started_at" TIMESTAMPTZ(6),
ADD COLUMN     "locked_until" TIMESTAMPTZ(6);

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_platform_admin_id_fkey" FOREIGN KEY ("actor_platform_admin_id") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
