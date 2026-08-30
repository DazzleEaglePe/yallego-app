#!/usr/bin/env sh
# Respaldo de PostgreSQL para el stack de despliegue
# (tools/docker/deploy/compose.yml). Vive en formato "custom" de pg_dump
# (ya comprimido, restaurable con pg_restore de forma parcial o completa),
# no un volcado SQL plano.
#
# Uso:
#   ./backup-database.sh <archivo.env> [directorio_de_salida]
#
# El proyecto de Compose se deriva de DEPLOY_ENV en el archivo .env, igual
# que compose.yml (`name: yallego-${DEPLOY_ENV:-staging}`) — necesario para
# apuntar al contenedor correcto cuando hay varios ambientes en el mismo host.

set -eu

env_file="${1:?Uso: backup-database.sh <archivo.env> [directorio_de_salida]}"
output_dir="${2:-./backups}"
compose_file="$(dirname "$0")/../compose.yml"

[ -f "$env_file" ] || { echo "No existe el archivo de entorno: $env_file" >&2; exit 1; }

mkdir -p "$output_dir"

# shellcheck disable=SC1090
. "$env_file"
: "${POSTGRES_SUPERUSER:?Falta POSTGRES_SUPERUSER en $env_file}"
: "${POSTGRES_DB:=yallego}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
deploy_env="${DEPLOY_ENV:-staging}"
output_path="$output_dir/yallego-${deploy_env}-${timestamp}.dump"
partial_path="$(mktemp "${output_path}.partial.XXXXXX")"

cleanup_partial() {
  [ ! -f "$partial_path" ] || rm -f "$partial_path"
}
trap cleanup_partial EXIT HUP INT TERM

echo "Respaldando ${POSTGRES_DB} (proyecto yallego-${deploy_env}) -> ${output_path}"

if ! docker compose --env-file "$env_file" -f "$compose_file" exec -T postgres \
  pg_dump --username "$POSTGRES_SUPERUSER" --dbname "$POSTGRES_DB" --format=custom \
  > "$partial_path"; then
  echo "pg_dump falló; no se publicará un respaldo parcial." >&2
  exit 1
fi

size="$(wc -c < "$partial_path" | tr -d ' ')"
if [ "$size" -eq 0 ]; then
  echo "El respaldo quedó vacío — algo falló en pg_dump. Revisar antes de confiar en él." >&2
  exit 1
fi

# `pg_restore --list` valida la cabecera y el catálogo antes de volver visible
# el archivo final. El movimiento en el mismo directorio es atómico.
if ! docker compose --env-file "$env_file" -f "$compose_file" exec -T postgres \
  pg_restore --list < "$partial_path" >/dev/null; then
  echo "El archivo generado no es un dump custom válido; se descartará." >&2
  exit 1
fi

mv "$partial_path" "$output_path"
trap - EXIT HUP INT TERM

echo "Respaldo completo: ${output_path} (${size} bytes)"
