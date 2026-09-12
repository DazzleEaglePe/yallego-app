#!/usr/bin/env sh
# Actualiza API y dashboard en hosts que publican esos servicios en
# 127.0.0.1 mediante compose.host-nginx.yml, detrás de un Nginx del propio
# host (no el proxy dockerizado de compose.yml) — ver tools/docker/deploy/
# nginx-host.conf y docs/12_DESPLIEGUE.md.
#
# NO usar deploy-zero-downtime.sh en estos hosts: ese script arranca un
# candidato con --no-deps mientras el contenedor canónico sigue corriendo,
# lo cual funciona porque el proxy dockerizado los distingue por alias de
# red (DNS interno de Docker). Aquí api/dashboard publican un puerto FIJO
# en el host (127.0.0.1:${API_HOST_PORT}, ...): solo un contenedor puede
# tenerlo enlazado a la vez, así que un candidato de calentamiento fallaría
# al intentar tomar el mismo puerto. Además, si se recrean api/dashboard
# usando solo compose.yml (sin compose.host-nginx.yml), el contenedor nuevo
# pierde esa publicación de puerto: queda "healthy" puertas adentro pero el
# Nginx del host no encuentra a quién conectarse (502) — así se cayó
# producción el 2026-09-11 al usar el script equivocado aquí.
#
# Consecuencia real: esto NO es zero-downtime. Hay una ventana breve (el
# tiempo entre que se detiene el contenedor viejo y el nuevo queda healthy,
# normalmente unos segundos) en la que ese puerto no responde. Es un
# recreate simple y directo, no un blue/green — se documenta así en vez de
# simular una garantía que la topología de este host no puede cumplir.
#
# Uso:
#   ./deploy-host-nginx.sh <archivo.env>

set -eu

env_file="${1:?Uso: deploy-host-nginx.sh <archivo.env>}"
deploy_dir="$(dirname "$0")/.."
compose_file="$deploy_dir/compose.yml"
host_nginx_file="$deploy_dir/compose.host-nginx.yml"

[ -f "$env_file" ] || { echo "No existe el archivo de entorno: $env_file" >&2; exit 1; }
[ -f "$host_nginx_file" ] || { echo "No existe $host_nginx_file" >&2; exit 1; }

# shellcheck disable=SC1090
. "$env_file"
: "${DEPLOY_ENV:?Falta DEPLOY_ENV en $env_file}"

project="yallego-${DEPLOY_ENV}"

compose() {
  docker compose --env-file "$env_file" -f "$compose_file" -f "$host_nginx_file" "$@"
}

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

if [ "${DEPLOY_SKIP_PULL:-false}" != true ]; then
  echo "Descargando imágenes declaradas para ${DEPLOY_ENV}..."
  compose pull api dashboard migrate
fi

echo "Aplicando migraciones compatibles hacia adelante..."
compose run --rm --no-deps migrate

echo "Recreando api y dashboard (con los puertos de compose.host-nginx.yml)..."
compose up -d --no-deps --force-recreate api dashboard
wait_healthy "${project}-api-1"
wait_healthy "${project}-dashboard-1"

echo "Despliegue completado. Verificar el sitio real antes de dar por cerrado (docs/12 §7)."
