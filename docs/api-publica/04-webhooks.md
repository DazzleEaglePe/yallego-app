# 04 — Webhooks

Los webhooks son la forma recomendada de enterarte de un cobro en cuanto
ocurre, sin hacer _polling_ a `GET /v1/transactions`. Requiere `webhooks:read`
para consultar y `webhooks:write` para crear, modificar, probar o rotar.

## `POST /v1/webhooks`

```bash
curl -X POST https://api.yallego.app/v1/webhooks \
  -H "Authorization: Bearer yk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mi-sistema.pe/hooks/yallego",
    "subscribed_events": ["transaction.created", "device.offline"],
    "description": "Integración con sistema de ventas"
  }'
```

```json
{
  "id": "...",
  "url": "https://mi-sistema.pe/hooks/yallego",
  "secret": "whsec_3f6a8c2e1b5d7f9a3c6e9f8c2a1e4b7d",
  "subscribed_events": ["transaction.created", "device.offline"],
  "is_enabled": true,
  "created_at": "2026-05-14T18:50:00Z"
}
```

Requisitos de la URL:

- Debe ser `https://` — se rechaza `http://` con `400 VALIDATION_ERROR`.
- No puede resolver a una red privada, de enlace local, o loopback (SSRF).
  La validación ocurre al crear el endpoint **y en cada intento de entrega**
  — si tu DNS empieza a resolver a una IP privada después de creado, las
  entregas futuras fallarán aunque la creación haya sido válida.
- El número de endpoints está limitado por plan (`webhooks` en los límites
  del plan); superarlo responde `422 PLAN_LIMIT_EXCEEDED`.

`secret` se muestra **una única vez** en esta respuesta. Guárdalo — lo
necesitas para [verificar la firma](./07-verificacion-firma.md) de cada
evento entrante.

## Gestión del endpoint

| Método   | Ruta                     | Descripción                                                         |
| -------- | ------------------------ | ------------------------------------------------------------------- |
| `GET`    | `/v1/webhooks`           | Lista todos los endpoints del tenant                                |
| `GET`    | `/v1/webhooks/{id}`      | Detalle de un endpoint                                              |
| `PATCH`  | `/v1/webhooks/{id}`      | Actualiza `subscribed_events`, `description` o `is_enabled`         |
| `DELETE` | `/v1/webhooks/{id}`      | Elimina el endpoint permanentemente                                 |
| `POST`   | `/v1/webhooks/{id}/test` | Envía un evento `transaction.created` de prueba con datos ficticios |

```bash
# Deshabilitar temporalmente sin borrar la configuración
curl -X PATCH https://api.yallego.app/v1/webhooks/{id} \
  -H "Authorization: Bearer yk_live_..." \
  -H "Content-Type: application/json" \
  -d '{"is_enabled": false}'
```

## `POST /v1/webhooks/{id}/rotate-secret`

Genera un secreto nuevo sin cambiar el `id` ni la URL del endpoint. Durante
las **24 horas siguientes**, cada entrega se firma con AMBOS secretos:

```
X-Yallego-Signature: sha256=<firmado con el secreto NUEVO>
X-Yallego-Signature-Previous: sha256=<firmado con el secreto ANTERIOR>
```

Esto te da una ventana para actualizar tu verificación en producción sin
perder entregas en el camino — verifica contra `X-Yallego-Signature`
primero y, si no tienes el secreto nuevo desplegado aún, cae a
`X-Yallego-Signature-Previous`. Pasadas las 24 horas, solo se envía la
firma nueva. Esta cabecera adicional es una extensión propia de Yallegó
(no forma parte del contrato base de firma, ver guía 07).

```bash
curl -X POST https://api.yallego.app/v1/webhooks/{id}/rotate-secret \
  -H "Authorization: Bearer yk_live_..."
# Respuesta: mismo shape que POST /v1/webhooks, con el nuevo `secret`
```

## Historial de entregas

```bash
curl "https://api.yallego.app/v1/webhooks/{id}/deliveries?status=FAILED&limit=20" \
  -H "Authorization: Bearer yk_live_..."
```

```json
{
  "data": [
    {
      "id": "...",
      "event_id": "3f6a8c2e-...",
      "event_type": "transaction.created",
      "status": "ABANDONED",
      "attempts": 8,
      "max_attempts": 8,
      "last_attempt_at": "2026-05-14T19:32:07Z",
      "last_status_code": 503,
      "last_error": "HTTP 503",
      "delivered_at": null,
      "created_at": "2026-05-14T18:32:09Z"
    }
  ]
}
```

Estados posibles: `PENDING` (en espera de su próximo intento), `IN_PROGRESS`,
`DELIVERED`, `FAILED` (intermedio, con reintento programado), `ABANDONED`
(agotó los 8 intentos — ver [08 — Política de reintentos](./08-reintentos.md)).

## `POST /v1/webhooks/{id}/deliveries/{deliveryId}/retry`

Reintenta manualmente una entrega `FAILED` o `ABANDONED`, por ejemplo después
de arreglar un bug en tu endpoint. Encola un intento nuevo inmediato,
independiente del calendario automático.

```bash
curl -X POST https://api.yallego.app/v1/webhooks/{id}/deliveries/{deliveryId}/retry \
  -H "Authorization: Bearer yk_live_..."
```

Solo funciona sobre entregas en un estado terminal-o-en-espera; reintentar
una `DELIVERED` responde `409 CONFLICT`.
