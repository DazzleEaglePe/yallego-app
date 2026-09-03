# Runbook — Procedimientos operativos ante incidentes comunes

Guía de diagnóstico y resolución para quien esté de guardia. Cubre las
señales que el propio sistema ya emite (alertas por correo, `/metrics`,
`/health/ready`, registros estructurados) y qué hacer ante cada una.

> El stack de despliegue ya provisiona Prometheus, Loki, Alloy y Grafana; ver
> [`13_OBSERVABILIDAD.md`](./13_OBSERVABILIDAD.md). Las señales llegan por
> correo (alertas de aplicación), reglas de Prometheus visibles en Grafana y
> registros JSON consultables en Loki. El enrutamiento externo de reglas de
> infraestructura mediante Alertmanager queda ligado al proveedor del VPS.

## Antes de diagnosticar cualquier cosa

1. `GET /v1/health/ready` — confirma si el problema es Postgres, Redis, o
   ninguno de los dos (`{"info": {"database": {...}, "redis": {...}}}`).
   Un `503` con `status: down` en cualquiera de los dos apunta a
   infraestructura, no a la aplicación.
2. `GET /metrics` — snapshot de contadores y gauges en tiempo real
   (`yallego_http_requests_total`, `yallego_parsing_results_total`,
   `yallego_webhook_deliveries_total`, `yallego_webhook_queue_depth`,
   `yallego_parsing_success_rate`).
3. Registros: abrir Grafana Explore y filtrar en Loki por `service="api"`;
   cada línea trae `req.id` (correlación), y cuando aplica
   `tenantId`/`actorType`/`actorUserId`/`apiKeyId`/`deviceId`/
   `platformAdminId` — filtrar por esos campos aísla el incidente a un
   tenant o actor específico sin tener que leer todo el flujo.

---

## Un endpoint de webhook se deshabilitó automáticamente

**Señal:** correo "Un webhook de {negocio} se deshabilitó automáticamente"
(`MailerService.sendWebhookDisabledEmail`, a OWNER/ADMIN del tenant).

**Causa:** 5 entregas `ABANDONED` consecutivas (cada una agotó sus 8
intentos, ver `docs/api-publica/08-reintentos.md`) o una respuesta `410
Gone` — código real: `webhook-delivery.worker.ts`,
`AUTO_DISABLE_AFTER_CONSECUTIVE_FAILURES = 5`.

**Diagnóstico:**
```
GET /v1/webhooks/{id}/deliveries?status=ABANDONED
```
Revisar `last_status_code`/`last_error` de las últimas entregas — casi
siempre es el destino del integrador (timeout, 5xx, certificado vencido,
endpoint movido), no un bug de Yallegó.

**Resolución:** una vez el integrador confirma que su endpoint volvió a
responder, `PATCH /v1/webhooks/{id}` con `{"is_enabled": true}`. No hay
reactivación automática por diseño — evita reintentar contra un endpoint
que sigue roto.

---

## La cola de entrega de webhooks acumuló un backlog

**Señal:** correo a administradores de plataforma "La cola de entrega de
webhooks acumuló un backlog" (`WebhookQueueDepthAlertScheduler`, revisa
`getWaitingCount()` cada 5 minutos, umbral `WEBHOOK_QUEUE_DEPTH_ALERT_THRESHOLD`,
200 por defecto). También visible en vivo vía el gauge
`yallego_webhook_queue_depth` en `/metrics`.

**Causas típicas, en orden de probabilidad:**
1. `WebhookDeliveryWorker` no está corriendo (proceso caído, o el proceso
   de la API se reinició y el worker BullMQ no se levantó con él —
   corren en el mismo proceso Nest, así que si la API está `healthy` el
   worker también debería estarlo).
2. Redis con latencia alta o memoria llena (BullMQ vive ahí).
3. Un pico real de tráfico legítimo que supera el umbral configurado —
   revisar `yallego_webhook_deliveries_total{result="delivered"}` para
   confirmar que SÍ se está procesando, solo que más lento de lo normal.

**Diagnóstico:** los registros del worker (`WebhookDeliveryWorker`) deben
mostrar actividad continua. Si no hay ninguna línea reciente con ese
contexto, el worker dejó de consumir la cola.

**Resolución:** reiniciar el proceso de la API resuelve el caso (1). Para
(3), si es tráfico legítimo sostenido, subir `WEBHOOK_QUEUE_DEPTH_ALERT_THRESHOLD`
es solo silenciar la alerta, no resolver la causa — evaluar si el volumen
justifica escalar el número de workers (hoy es uno solo, dentro del mismo
proceso de la API).

---

## La tasa de parsing de una billetera cayó por debajo del umbral

**Señal:** correo a administradores de plataforma "Tasa de parsing de
{BILLETERA} por debajo del umbral" (`ParsingSuccessAlertScheduler`, corre
cada 15 min sobre la última hora, umbral
`PARSING_SUCCESS_RATE_ALERT_THRESHOLD` = 95% por defecto, solo alerta con
al menos `PARSING_ALERT_MIN_SAMPLE_SIZE` = 20 notificaciones en la
ventana).

**Causa casi segura:** la app de la billetera actualizó su formato de
notificación (texto, layout) y los patrones activos dejaron de coincidir.
Es exactamente el escenario que motivó construir la administración de
parsers sin necesitar redespliegue.

**Diagnóstico:**
```
GET /platform/v1/notifications/unmatched?wallet_code={CODIGO}
```
Leer el `body` de las notificaciones sin coincidencia recientes — ahí se
ve el texto real que el parser activo ya no reconoce.

**Resolución:**
1. Ajustar el patrón (`POST /platform/v1/parsers/{walletId}/versions`, nueva versión).
2. `POST /platform/v1/parsers/versions/{id}/test` contra las
   `raw_notification_ids` sin coincidencia recolectadas en el paso anterior
   — confirma que la versión nueva SÍ las reconoce antes de activarla.
3. `POST /platform/v1/parsers/versions/{id}/activate` — el caché de
   patrones se invalida de inmediato, sin redespliegue.
4. Opcional: `POST /platform/v1/notifications/reprocess` con los
   `raw_notification_ids` que quedaron `UNMATCHED`, para recuperar las
   transacciones perdidas durante la ventana del incidente.

---

## Un dispositivo dejó de reportar

**Señal:** correo al negocio "{dispositivo} dejó de reportar en
{negocio}" (`DeviceOfflineScheduler`, umbral 15 minutos sin heartbeat,
revisa cada minuto).

**Esto no es un incidente de plataforma** — es una notificación operativa
para el propio negocio (revisar que el celular tenga batería, conexión,
la app abierta y el permiso de notificaciones activo). No requiere acción
de guardia salvo que ocurra en muchos tenants a la vez simultáneamente,
lo que sí apuntaría a un problema del lado de Yallegó (p. ej. el endpoint
`/internal/v1/heartbeat` caído) — confirmar con `/health/ready` y los
registros de ese endpoint.

---

## `PLAN_LIMIT_EXCEEDED` — un tenant alcanzó el límite de su plan

**Señal:** el propio tenant ve `422 PLAN_LIMIT_EXCEEDED` al intentar crear
un recurso (dispositivo, webhook, transacción vía ingesta, etc.). También
dispara internamente el correo de aviso al 80%/100% de transacciones
(`UsageCounterService`, vía `sendUsageThresholdEmail`).

**No es un bug.** Es el comportamiento esperado. Si el negocio necesita
más capacidad, la resolución es un cambio de plan
(`POST /platform/v1/tenants/{id}/subscription` desde plataforma, o
`POST /v1/subscription/change` desde el propio panel del tenant, que
queda en `PENDING_PAYMENT` hasta que un administrador confirme el pago
con `POST /platform/v1/payments`).

**Única situación que sí amerita revisión:** si el conteo parece
incorrecto (p. ej. el tenant jura que tiene menos dispositivos activos de
los que el límite reporta) — ahí sí comparar el conteo real
(`GET /v1/devices`, filtrando `status != REVOKED`) contra
`plan.limits.devices`.

---

## Una cuenta quedó bloqueada por intentos fallidos

**Señal:** `401` con `código: UNAUTHENTICATED` y `locked_until` en
`details` al intentar iniciar sesión — 5 intentos fallidos en 15 minutos
(igual para `User` del panel y para `PlatformAdmin`).

**Resolución — panel (`User`):** el bloqueo se limpia automáticamente al
expirar `locked_until` (15 minutos desde el último intento fallido), o de
inmediato si el usuario completa el flujo de recuperación de contraseña
(`POST /v1/auth/forgot-password` → `POST /v1/auth/reset-password`) — ese
flujo resetea `failed_attempts`/`locked_until` como efecto secundario.

**Resolución — plataforma (`PlatformAdmin`):** **no existe un flujo de
autoservicio** (ninguna ruta pública de registro/recuperación para
`/platform/v1`, por diseño — ver `docs/07_SEGURIDAD_AUTH.md`). Solo queda
esperar los 15 minutos, o —si es urgente— limpiar el bloqueo directamente
en base de datos (`UPDATE platform_admins SET failed_attempts = 0,
failed_attempts_started_at = NULL, locked_until = NULL WHERE email =
'...'`), con el mismo cuidado operativo que usa
`scripts/create-platform-admin.ts` para tocar esa tabla fuera de banda.

---

## `/platform/v1` responde `403` incluso con credenciales correctas

**Causa:** `PlatformIpAllowlistGuard` — `PLATFORM_ALLOWED_IPS` vacía o sin
la IP de origen bloquea TODO el acceso a `/platform/v1`, incluido el login
(falla cerrado a propósito: es la superficie de mayor privilegio).

**Resolución:** agregar la IP/CIDR de origen a `PLATFORM_ALLOWED_IPS` y
reiniciar el proceso (la lista se lee al arrancar, vía `ConfigService`, no
hay recarga en caliente). Si nadie tiene acceso al servidor para editar la
variable, este es un caso genuino de "quedamos afuera" — revisar el
mecanismo de despliegue para actualizar variables de entorno sin acceso
directo a la máquina.

---

## Un webhook legítimo se rechaza con "no resuelve a una red pública"

**Causa:** `SsrfHostnameValidator` — rechaza cualquier URL cuyo DNS
resuelva a un rango privado, de enlace local o loopback, tanto al crear el
endpoint como en cada intento de entrega (ver
`docs/api-publica/04-webhooks.md`). Un falso positivo real (no solo un
integrador probando `http://localhost` por error) ocurre cuando el
integrador usa un balanceador/CDN cuyo DNS a veces resuelve a una IP
interna del lado del integrador, o cuando cambia de proveedor de hosting.

**Diagnóstico:** confirmar con `dig`/`nslookup` qué resuelve la URL en
este momento — la resolución puede cambiar entre el momento en que el
integrador la registró y el momento del intento de entrega.

**Resolución:** es responsabilidad del integrador exponer un endpoint que
resuelva a una IP pública de forma consistente. No hay lista blanca de
excepciones por diseño (ver `ssrf-guard.spec.ts`) — relajar esto caso por
caso reintroduciría el riesgo que el guard existe para prevenir.

---

## `/health/ready` reporta `database` o `redis` como `down`

**`database: down`:** Postgres no acepta conexiones — verificar que el
contenedor/instancia esté arriba y que `DATABASE_URL` sea correcta. Si
Postgres está arriba pero el pool de conexiones de Prisma está agotado
(tráfico alto sostenido), revisar cuántas conexiones concurrentes permite
la instancia vs. cuántas réplicas de la API están corriendo.

**`redis: down`:** afecta a TODA la API pública autenticada por clave —
`ApiKeyRateLimitGuard` no tiene manejo de error alrededor de la llamada a
Redis, así que una caída de Redis se traduce en `500 INTERNAL_ERROR` para
cada solicitud con clave de API, no en un límite mal calculado (no falla
"abierto"; la sesión de panel sí sigue funcionando, esa usa el
`ThrottlerModule` en memoria, no Redis). También detiene las colas BullMQ
(ingesta/parsing/webhooks se quedan encoladas sin procesar hasta que
Redis vuelva) y el adaptador de WebSocket (tiempo real deja de propagar
entre réplicas).

**En ambos casos:** el proceso de la API sigue vivo (`/health` liviana
sigue en `200`) a propósito — un `/health/ready` en `503` no debe disparar
un reinicio del contenedor por sí solo (ver el comentario en
`health.controller.ts`), solo debe sacarlo del balanceador hasta que se
recupere.
