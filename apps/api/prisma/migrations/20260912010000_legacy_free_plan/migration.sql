-- Los tenants existentes conservan exactamente sus límites gratuitos, pero
-- quedan separados del flujo de altas nuevas que ahora nace en TRIAL.
INSERT INTO "plans" (
  "code",
  "display_name",
  "description",
  "price_monthly",
  "price_semiannual",
  "price_annual",
  "currency",
  "limits",
  "is_public",
  "sort_order"
)
SELECT
  'LEGACY_FREE',
  'Free heredado',
  'Plan no público conservado para tenants creados antes del rollout del trial.',
  "price_monthly",
  "price_semiannual",
  "price_annual",
  "currency",
  "limits",
  false,
  "sort_order"
FROM "plans"
WHERE "code" = 'FREE'
ON CONFLICT ("code") DO NOTHING;

UPDATE "subscriptions"
SET
  "plan_id" = (SELECT "id" FROM "plans" WHERE "code" = 'LEGACY_FREE'),
  "updated_at" = CURRENT_TIMESTAMP
WHERE "plan_id" = (SELECT "id" FROM "plans" WHERE "code" = 'FREE');
