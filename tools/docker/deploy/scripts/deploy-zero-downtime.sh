#!/usr/bin/env sh
# Reemplaza API y dashboard manteniendo candidatos temporales saludables bajo
# los mismos alias DNS que consumen los upstreams dinámicos de Nginx.
#
# Uso:
#   ./deploy-zero-downtime.sh <archivo.env>

set -eu

env_file="${1:?Uso: deploy-zero-downtime.sh <archivo.env>}"
compose_file="$(dirname "$0")/../compose.yml"

[ -f "$env_file" ] || { echo "No existe el archivo de entorno: $env_file" >&2; exit 1; }

# shellcheck disable=SC1090
. "$env_file"
: "${DEPLOY_ENV:?Falta DEPLOY_ENV en $env_file}"

project="yallego-${DEPLOY_ENV}"
api_candidate="${project}-api-candidate"
dashboard_candidate="${project}-dashboard-candidate"
canonical_replacement_started=false

compose() {
  docker compose --env-file "$env_file" -f "$compose_file" "$@"
}

remove_candidate() {
  name="$1"
  docker stop --time 10 "$name" >/dev/null 2>&1 || true
  docker rm "$name" >/dev/null 2>&1 || true
}

cleanup_on_exit() {
  exit_code="$?"
  [ "$exit_code" -ne 0 ] || return 0

  if [ "$canonical_replacement_started" = true ]; then
    echo "El reemplazo canónico no terminó. Se conservan los candidatos saludables" >&2
    echo "para mantener el servicio; revisar y completar o revertir manualmente." >&2
  else
    remove_candidate "$api_candidate"
    remove_candidate "$dashboard_candidate"
  fi
  exit "$exit_code"
}
trap cleanup_on_exit EXIT

wait_healthy() {
  container="$1"
  max_attempts="${2:-90}"
  attempt=1

  while [ "$attempt" -le "$max_attempts" ]; do
    state="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || true)"
    [ "$state" = healthy ] && return 0
    if [ "$state" = unhealthy ] || [ "$state" = exited ] || [ "$state" = dead ]; then
      echo "El contenedor $container terminó en estado $state." >&2
      docker logs --tail 100 "$container" >&2 || true
      return 1
    fi
    sleep 1
    attempt=$((attempt + 1))
  done

  echo "Timeout esperando que $container quede healthy." >&2
  return 1
}

if docker inspect "$api_candidate" >/dev/null 2>&1 || docker inspect "$dashboard_candidate" >/dev/null 2>&1; then
  echo "Ya existe un candidato de un despliegue anterior. Resolverlo antes de continuar." >&2
  exit 1
fi

if [ "${DEPLOY_SKIP_PULL:-false}" != true ]; then
  echo "Descargando imágenes declaradas para ${DEPLOY_ENV}..."
  compose pull api dashboard migrate proxy
fi

echo "Aplicando migraciones compatibles hacia adelante..."
compose run --rm --no-deps migrate

echo "Iniciando candidatos blue/green..."
compose run -d --no-deps --use-aliases --name "$api_candidate" api >/dev/null
compose run -d --no-deps --use-aliases --name "$dashboard_candidate" dashboard >/dev/null
wait_healthy "$api_candidate"
wait_healthy "$dashboard_candidate"

# El resolver del proxy usa un TTL de 5 s; dos ventanas completas garantizan
# que vea los candidatos antes de detener las instancias canónicas.
sleep "${EDGE_DNS_WARMUP_SECONDS:-10}"

canonical_replacement_started=true
echo "Reemplazando instancias canónicas mientras los candidatos sirven tráfico..."
compose up -d --no-deps --force-recreate api dashboard
wait_healthy "${project}-api-1"
wait_healthy "${project}-dashboard-1"
sleep "${EDGE_DNS_WARMUP_SECONDS:-10}"

remove_candidate "$api_candidate"
remove_candidate "$dashboard_candidate"
canonical_replacement_started=false
trap - EXIT

echo "Despliegue completado sin retirar simultáneamente todos los upstreams."
