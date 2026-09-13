-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "pending_billing_cycle" "billing_cycle",
ADD COLUMN     "pending_plan_id" UUID;

-- AlterTable
ALTER TABLE "usage_periods" ADD COLUMN     "notified_at_100" TIMESTAMP(3),
ADD COLUMN     "notified_at_80" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_pending_plan_id_fkey" FOREIGN KEY ("pending_plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
