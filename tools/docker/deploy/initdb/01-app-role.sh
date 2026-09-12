#!/bin/sh
set -eu

# El rol de aplicación nunca es propietario ni tiene BYPASSRLS. La contraseña
# llega desde el gestor de secretos del entorno, no desde el repositorio.
psql --set ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set app_password="$APP_DATABASE_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE yallego_app LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'yallego_app') \gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO yallego_app', current_database()) \gexec
GRANT USAGE ON SCHEMA public TO yallego_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO yallego_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO yallego_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO yallego_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO yallego_app;
SQL
