-- Rol con el que se conecta la aplicación. Deliberadamente no es el propietario
-- de las tablas ni tiene BYPASSRLS: un superusuario omite Row Level Security
-- siempre, lo que anularía la segunda capa de aislamiento entre tenants.
--
-- Las migraciones y la semilla siguen ejecutándose con el rol propietario
-- (DIRECT_DATABASE_URL); la aplicación usa este (DATABASE_URL).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'yallego_app') THEN
    CREATE ROLE yallego_app LOGIN PASSWORD 'yallego_app_dev';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE yallego TO yallego_app;
GRANT USAGE ON SCHEMA public TO yallego_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO yallego_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO yallego_app;

-- Las tablas que creen las migraciones futuras quedan accesibles sin repetir el GRANT.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO yallego_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO yallego_app;
