-- La identidad antifraude contiene tenant_id y debe conservar la misma
-- defensa en profundidad que el resto de tablas multi-tenant.
ALTER TABLE "trial_identity_claims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trial_identity_claims" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "trial_identity_claims" FOR ALL
  USING (app_is_unscoped() OR tenant_id = app_current_tenant())
  WITH CHECK (app_is_unscoped() OR tenant_id = app_current_tenant());

-- Las métricas administrativas consultan eventos por acción y ventana sin
-- restringirse a un tenant concreto.
CREATE INDEX "audit_events_action_created_at_idx"
  ON "audit_events"("action", "created_at" DESC);
