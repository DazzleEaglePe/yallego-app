# Observabilidad y operación segura

Este documento describe la capa operativa desplegable de Yallegó. Complementa
el [runbook de incidentes](./runbook-incidentes.md), que explica qué hacer con
cada señal, y el procedimiento de
[respaldos y restauración](../tools/docker/deploy/BACKUPS.md).

## Topología y frontera de seguridad

El archivo [`compose.yml`](../tools/docker/deploy/compose.yml) incorpora:

- **Prometheus**: consulta `api:3001/metrics` cada 15 segundos y conserva 15
  días por defecto.
- **Loki**: conserva siete días de registros estructurados en almacenamiento
  local.
- **Proxy de socket Docker**: expone a Alloy únicamente descubrimiento,
  eventos y lectura de logs; deniega operaciones mutables y la exportación o
  archivado de sistemas de archivos.
- **Grafana Alloy**: descubre los contenedores mediante ese proxy y envía a
  Loki solo los registros de proyectos Compose cuyo nombre comienza con
  `yallego-`.
- **Grafana**: provisiona automáticamente las fuentes Prometheus/Loki y el
  dashboard `Yallegó · Operación segura`.

Prometheus, Loki y Alloy viven en la red interna `observability` y no publican
puertos. Grafana escucha por defecto únicamente en `127.0.0.1:3002`; no debe
abrirse ese puerto en el firewall. Para operarlo remotamente se usa un túnel:

```bash
ssh -L 3002:127.0.0.1:3002 operador@servidor
```

Después se abre `http://127.0.0.1:3002`. La contraseña de administrador se
define en `GRAFANA_ADMIN_PASSWORD` dentro del gestor de secretos del ambiente.
No se habilitan registro de usuarios, acceso anónimo ni telemetría de Grafana.

Solo el proxy monta `/var/run/docker.sock`; Alloy no tiene acceso directo. El
proxy y Alloy comparten una red interna exclusiva, sin puertos publicados. El
proxy usa una lista positiva por método y ruta: permite únicamente ping,
versión, listado/inspección, redes, eventos y logs; `archive`, `export`, `exec`
y todas las operaciones de escritura quedan fuera de la expresión permitida.
Aun así, los logs pueden contener datos sensibles, por lo que ninguno de ambos
servicios debe recibir plugins ni configuraciones de terceros.

## Modelo de señales

| Señal | Fuente | Grano/ventana | Uso |
| --- | --- | --- | --- |
| Disponibilidad de API | `up{job="yallego-api"}` | scrape cada 15 s; panel de 5 min | Detectar caída o inaccesibilidad |
| Tasa HTTP 5xx | `yallego_http_requests_total` | tasa de 5 min | Detectar regresiones del backend |
| Latencia HTTP p95 | `yallego_http_request_duration_seconds_bucket` | histograma, 5 min | Detectar degradación |
| Profundidad de webhooks | `yallego_webhook_queue_depth` | gauge actual | Detectar acumulación |
| Parsing por billetera | `yallego_parsing_success_rate` | gauge por `wallet_code` | Detectar cambios de formato |
| Ingesta y entregas | contadores de ingesta/webhook | tasa según rango del panel | Entender volumen y resultados |
| Registros | JSON de contenedores vía Alloy/Loki | evento individual, retención 7 d | Diagnóstico por servicio/correlación |

Las etiquetas de Loki se limitan a ambiente, proyecto, servicio y contenedor.
Identificadores de solicitud, tenant, actor o dispositivo permanecen dentro del
JSON y se filtran al consultar; convertirlos en etiquetas produciría cardinalidad
alta y un costo operativo innecesario.

## Dashboard y alertas

El dashboard provisionado tiene nueve paneles: disponibilidad, 5xx, p95,
profundidad de cola, tráfico por estado, tasa de parsing por billetera,
resultados de ingesta/webhooks, registros recientes y reglas Prometheus activas.

Prometheus evalúa cinco reglas versionadas en
[`yallego.yml`](../tools/docker/deploy/observability/prometheus/rules/yallego.yml):
API no disponible, tasa 5xx elevada, p95 elevada, parsing por debajo de 95% y
cola de webhooks superior a 200. Estas reglas aparecen en Grafana. Los correos
de negocio ya implementados por la aplicación continúan siendo el canal de
notificación. El envío externo de reglas de infraestructura requiere añadir
Alertmanager o el canal gestionado elegido al aprovisionar el VPS.

## Arranque y comprobación

Configurar las variables de
[`deploy.env.example`](../tools/docker/deploy/deploy.env.example) y levantar el
stack habitual:

```bash
docker compose \
  --env-file .env.staging \
  -f tools/docker/deploy/compose.yml \
  up -d
```

Comprobar que el dashboard y las dos fuentes están operativos sin imprimir la
contraseña en la línea de comandos:

```bash
set -a
. ./.env.staging
set +a
./tools/docker/deploy/scripts/check-observability.sh
unset GRAFANA_ADMIN_PASSWORD
```

Para correlacionar una solicitud concreta en Grafana Explore se puede consultar:

```logql
{compose_project="yallego-staging", service="api"} | json | req_id="ID"
```

Si la consulta no devuelve registros, verificar primero que el nombre del
proyecto sea `yallego-${DEPLOY_ENV}`, luego el estado de Alloy y finalmente la
conectividad interna con Loki. Nunca resolverlo publicando Loki en Internet.

## Retención, capacidad y recuperación

Prometheus conserva 15 días (`PROMETHEUS_RETENTION`) y Loki siete días. Son
valores iniciales para un único VPS; deben revisarse con el crecimiento del
tráfico y el espacio de disco. Los volúmenes de observabilidad no sustituyen
los respaldos de PostgreSQL.

El mecanismo de backup y restore ya fue validado localmente de extremo a
extremo. Para completar la operación del ambiente real aún se debe copiar cada
dump a almacenamiento externo con retención y ejecutar periódicamente una
restauración aislada usando el VPS/volúmenes reales, tal como detalla
[`BACKUPS.md`](../tools/docker/deploy/BACKUPS.md).
