# 06 — Catálogo de eventos

Todo evento entregado por webhook comparte el mismo sobre:

```json
{
  "id": "3f6a8c2e-1b5d-4f9a-8c6e-9f8c2a1e4b7d",
  "type": "transaction.created",
  "api_version": "v1",
  "created_at": "2026-05-14T18:32:09.104Z",
  "data": { "...": "específico de cada evento, ver abajo" }
}
```

`api_version` viaja en cada evento (no solo en la URL de la API) para que
puedas evolucionar tu manejo de payloads de forma independiente a cuándo
actualizas la integración REST.

## `transaction.created`

Se dispara cuando un cobro se parsea correctamente desde una notificación
capturada — el evento con mayor volumen, es el que mueve la mayoría de
integraciones (conciliación, punto de venta, contabilidad).

```json
{
  "transaction": {
    "id": "9f8c2a1e-...",
    "wallet": { "code": "YAPE", "display_name": "Yape" },
    "sender_name": "JUAN CARLOS PEREZ R.",
    "amount": "35.50",
    "currency": "PEN",
    "security_code": "247",
    "status": "CAPTURED",
    "occurred_at": "2026-05-14T18:32:07.412Z",
    "device": { "id": "...", "label": "Celular caja principal" }
  }
}
```

## `transaction.confirmed`

Se dispara al llamar `POST /v1/transactions/{id}/confirm`, sea desde el
panel o desde tu propia integración con `transactions:write`.

```json
{
  "transaction_id": "9f8c2a1e-...",
  "confirmed_by": "a1b2c3d4-...",
  "confirmed_at": "2026-05-14T18:40:00Z"
}
```

## `transaction.disputed`

Análogo a `transaction.confirmed`, disparado por `POST /v1/transactions/{id}/dispute`.

```json
{
  "transaction_id": "9f8c2a1e-...",
  "disputed_by": "a1b2c3d4-...",
  "disputed_at": "2026-05-14T18:41:00Z"
}
```

## `device.offline`

Se dispara cuando un dispositivo supera el umbral de 15 minutos sin
heartbeat. Útil para alertar operativamente antes de perder cobros.

```json
{ "device_id": "...", "label": "Celular caja principal", "last_seen_at": "2026-05-14T18:37:12Z" }
```

## `device.online`

Se dispara cuando un dispositivo previamente `OFFLINE` vuelve a enviar un
heartbeat.

```json
{ "device_id": "...", "label": "Celular caja principal", "recovered_at": "2026-05-14T19:05:00Z" }
```

## `notification.unmatched`

Se dispara cuando llega una notificación de una app monitoreada pero **ningún
parser reconoce su formato** — por ejemplo, la billetera cambió el texto de
su notificación, o llegó una notificación de una billetera aún no soportada.
No representa un cobro (no hay `transaction` asociado), es una señal de que
algo necesita atención manual del lado de Yallegó.

```json
{
  "notification_id": "...",
  "package_name": "com.bcp.innovacxion.yapeapp",
  "device_id": "...",
  "received_at": "2026-05-14T18:32:07Z"
}
```

Si tu negocio depende de un flujo de cobro específico, suscribir este evento
te permite detectar una regresión de parser antes de notar la ausencia de
transacciones esperadas.

## Suscripción selectiva

Al crear o actualizar un webhook, `subscribed_events` acepta cualquier
subconjunto de esta lista — un endpoint solo recibe los eventos que
suscribió explícitamente, nunca todos por defecto.
