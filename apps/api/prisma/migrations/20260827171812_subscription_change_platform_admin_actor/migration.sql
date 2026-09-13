-- AlterTable
ALTER TABLE "subscription_changes" ADD COLUMN     "performed_by_platform_admin_id" UUID;

-- AddForeignKey
ALTER TABLE "subscription_changes" ADD CONSTRAINT "subscription_changes_performed_by_platform_admin_id_fkey" FOREIGN KEY ("performed_by_platform_admin_id") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
