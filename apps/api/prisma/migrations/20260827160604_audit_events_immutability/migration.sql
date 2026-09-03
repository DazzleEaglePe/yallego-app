-- Inmutabilidad del registro de auditoría a nivel de motor (docs/10_PLAN_DESARROLLO.md,
-- Sprint 7: "El registro de auditoría no admite modificación por ninguna vía").
--
-- No basta con que el código de la aplicación nunca llame a UPDATE/DELETE
-- sobre `audit_events`: un bug o un proceso comprometido con el rol de
-- aplicación (`yallego_app`) podría hacerlo igual. Se revoca el privilegio en
-- la base de datos, la misma capa que ya hace cumplir el aislamiento entre
-- tenants (RLS, migración `tenant_isolation`) — la aplicación conserva
-- SELECT e INSERT, que son los únicos que usa.
REVOKE UPDATE, DELETE ON TABLE audit_events FROM yallego_app;
