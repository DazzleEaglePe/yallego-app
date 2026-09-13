#!/usr/bin/env sh
# Comprueba el dashboard provisionado y que Grafana pueda consultar tanto
# Prometheus como Loki. No imprime las credenciales ni expone nuevos puertos.
#
# Uso:
#   GRAFANA_ADMIN_PASSWORD=... ./check-observability.sh [URL_GRAFANA]

set -eu

grafana_url="${1:-http://127.0.0.1:${GRAFANA_PORT:-3002}}"
grafana_user="${GRAFANA_ADMIN_USER:-admin}"
: "${GRAFANA_ADMIN_PASSWORD:?Define GRAFANA_ADMIN_PASSWORD}"

for dependency in curl jq; do
  command -v "$dependency" >/dev/null 2>&1 || {
    echo "Falta la dependencia local: $dependency" >&2
    exit 1
  }
done

grafana_get() {
  path="$1"
  shift
  curl --fail --silent --show-error \
    --user "$grafana_user:$GRAFANA_ADMIN_PASSWORD" \
    "$@" "$grafana_url$path"
}

grafana_get /api/health | jq -e '.database == "ok"' >/dev/null

dashboard="$(grafana_get /api/dashboards/uid/yallego-operations)"
printf '%s' "$dashboard" | jq -e '
  .dashboard.title == "Yallegó · Operación segura" and
  (.dashboard.panels | length) == 9
' >/dev/null

prometheus="$(grafana_get /api/datasources/proxy/uid/yallego-prometheus/api/v1/query \
  --get --data-urlencode 'query=up{job="yallego-api"}')"
printf '%s' "$prometheus" | jq -e '
  .status == "success" and
  any(.data.result[]; .value[1] == "1")
' >/dev/null

# Alloy también recolecta sus propios registros, por lo que un stack recién
# iniciado debe producir al menos un stream sin generar tráfico artificial.
loki="$(grafana_get /api/datasources/proxy/uid/yallego-loki/loki/api/v1/query_range \
  --get \
  --data-urlencode 'query={compose_project=~"yallego-.*"}' \
  --data-urlencode 'limit=1')"
printf '%s' "$loki" | jq -e '
  .status == "success" and
  (.data.result | length) > 0
' >/dev/null

echo "Observabilidad correcta: Grafana, dashboard, Prometheus/API y Loki/logs."
