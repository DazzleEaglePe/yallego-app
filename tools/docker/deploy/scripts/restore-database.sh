#!/usr/bin/env sh
# Restaura un respaldo generado por backup-database.sh.
#
# Uso:
#   ./restore-database.sh <archivo.env> <archivo.dump> [--force]
#
# Por seguridad, se niega a restaurar sobre una base con datos existentes
# (se comprueba contando filas en `tenants`) salvo que se pase --force —
# un restore accidental sobre un ambiente con tráfico real es irreversible
# sin un respaldo previo de ESE estado.

set -eu

env_file="${1:?Uso: restore-database.sh <archivo.env> <archivo.dump> [--force]}"
dump_file="${2:?Uso: restore-database.sh <archivo.env> <archivo.dump> [--force]}"
force="${3:-}"
compose_file="$(dirname "$0")/../compose.yml"

[ -f "$env_file" ] || { echo "No existe el archivo de entorno: $env_file" >&2; exit 1; }
[ -f "$dump_file" ] || { echo "No existe el archivo de respaldo: $dump_file" >&2; exit 1; }

# shellcheck disable=SC1090
. "$env_file"
: "${POSTGRES_SUPERUSER:?Falta POSTGRES_SUPERUSER en $env_file}"
: "${POSTGRES_DB:=yallego}"

compose() {
  docker compose --env-file "$env_file" -f "$compose_file" "$@"
}

# Falla antes de inspeccionar o modificar la base si el archivo está truncado,
# no es formato custom o no contiene un catálogo legible.
if ! compose exec -T postgres pg_restore --list < "$dump_file" >/dev/null; then
  echo "El archivo no es un respaldo PostgreSQL custom válido: $dump_file" >&2
  exit 1
fi

if [ "$force" != "--force" ]; then
  existing="$(compose exec -T postgres psql --username "$POSTGRES_SUPERUSER" --dbname "$POSTGRES_DB" \
    --tuples-only --no-align --command "SELECT count(*) FROM tenants;" 2>/dev/null || echo "0")"
  existing="$(echo "$existing" | tr -d '[:space:]')"
  if [ "${existing:-0}" != "0" ] && [ "${existing:-0}" != "" ]; then
    echo "La base '${POSTGRES_DB}' ya tiene ${existing} tenant(s). Restaurar sobre" >&2
    echo "ella descarta ese estado sin posibilidad de deshacerlo. Si es intencional," >&2
    echo "respalda el estado actual primero y vuelve a correr con --force." >&2
    exit 1
  fi
fi

echo "Restaurando ${dump_file} -> ${POSTGRES_DB}"

# --clean --if-exists: deja la base en el estado exacto del respaldo, no una
# unión con lo que hubiera antes. --single-transaction: todo o nada.
compose exec -T postgres \
  pg_restore --username "$POSTGRES_SUPERUSER" --dbname "$POSTGRES_DB" \
  --clean --if-exists --single-transaction --no-owner \
  < "$dump_file"

echo "Restauración completa."
