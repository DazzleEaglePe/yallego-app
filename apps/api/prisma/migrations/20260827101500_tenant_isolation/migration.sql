-- Aislamiento entre tenants a nivel de motor (docs/05_MODELO_DATOS.md §4)
-- e invariante de propietario único (docs/07_SEGURIDAD_AUTH.md §5.3).

-- ---------------------------------------------------------------------------
-- 1. Contexto de tenant
-- ---------------------------------------------------------------------------

-- Tenant activo de la transacción en curso. Devuelve NULL si no se estableció,
-- de modo que las políticas niegan el acceso por omisión.
CREATE OR REPLACE FUNCTION app_current_tenant() RETURNS uuid
  LANGUAGE sql
  STABLE
  AS $$ SELECT nullif(current_setting('app.tenant_id', true), '')::uuid $$;

-- Marca de operación sin tenant. La usan exclusivamente los flujos que son
-- legítimamente transversales: registro, ingreso, renovación de sesión y
-- aceptación de invitación. Se establece con `SET LOCAL`, por lo que nunca
-- sobrevive a la transacción que la define.
CREATE OR REPLACE FUNCTION app_is_unscoped() RETURNS boolean
  LANGUAGE sql
  STABLE
  AS $$ SELECT coalesce(nullif(current_setting('app.unscoped', true), ''), 'off') = 'on' $$;

-- ---------------------------------------------------------------------------
-- 2. Activación de Row Level Security
-- ---------------------------------------------------------------------------
-- Se incluyen `subscription_changes` y `manual_payments`, ausentes de la lista
-- del documento pero portadoras de `tenant_id`: dejarlas fuera abriría un hueco
-- en la segunda capa de aislamiento.

DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'memberships',
    'invitations',
    'devices',
    'pairing_codes',
    'tenant_wallets',
    'raw_notifications',
    'transactions',
    'api_keys',
    'webhook_endpoints',
    'webhook_deliveries',
    'subscriptions',
    'subscription_changes',
    'usage_periods',
    'manual_payments',
    'audit_events'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target);
    -- FORCE es indispensable: en desarrollo la aplicación se conecta con el
    -- mismo rol que creó las tablas y sin esto las políticas no se evaluarían.
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', target);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', target);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I FOR ALL'
      || ' USING (app_is_unscoped() OR tenant_id = app_current_tenant())'
      || ' WITH CHECK (app_is_unscoped() OR tenant_id = app_current_tenant())',
      target
    );
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 3. Invariante: todo negocio tiene exactamente un propietario
-- ---------------------------------------------------------------------------
-- Se implementa con un disparador de restricción diferido, no con un índice
-- único parcial, para que la transferencia de propiedad pueda degradar y
-- promover en la misma transacción sin violación transitoria.

CREATE OR REPLACE FUNCTION enforce_single_tenant_owner() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
DECLARE
  target_tenant uuid := coalesce(NEW.tenant_id, OLD.tenant_id);
  owner_count integer;
BEGIN
  -- El negocio ya no existe: la eliminación en cascada retiró sus membresías.
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = target_tenant) THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO owner_count
  FROM memberships
  WHERE tenant_id = target_tenant AND role = 'OWNER';

  IF owner_count <> 1 THEN
    RAISE EXCEPTION
      'El negocio % debe tener exactamente un propietario (se encontraron %).',
      target_tenant, owner_count
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END
$$;

DROP TRIGGER IF EXISTS memberships_single_owner ON memberships;

CREATE CONSTRAINT TRIGGER memberships_single_owner
  AFTER INSERT OR UPDATE OR DELETE ON memberships
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION enforce_single_tenant_owner();
