# 01 — Inicio rápido

Esta guía te lleva de cero a recibir tu primer evento de webhook, en cuatro pasos.

## 1. Crea una clave de API

Desde el panel administrativo (**Configuración → Claves de API**, requiere
rol ADMIN o superior), o vía la propia API si ya tienes una sesión de panel:

```bash
curl -X POST https://api.yallego.app/v1/api-keys \
  -H "Authorization: Bearer <tu_token_de_panel>" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Integración POS",
    "scopes": ["transactions:read", "webhooks:write"]
  }'
```

```json
{
  "id": "9f8c2a1e-4b7d-3f6a-8c2e-1b5d7f9a3c6e",
  "label": "Integración POS",
  "key": "yk_live_9f8c2a1e4b7d3f6a8c2e1b5d7f9a3c6e",
  "key_prefix": "yk_live_9f8c2a1e",
  "scopes": ["transactions:read", "webhooks:write"],
  "created_at": "2026-05-14T18:45:00Z"
}
```

> **El campo `key` se muestra una única vez.** Guárdalo en un gestor de
> secretos — Yallegó solo conserva el `key_prefix` para que puedas
> identificar la clave en el listado. Si la pierdes, revócala y crea otra.

El plan **Free** no incluye acceso a la API pública (`rate_limit_per_minute: 0`
en ese plan) — necesitas plan Negocio o superior para crear claves de API.

## 2. Haz tu primera solicitud

```bash
curl https://api.yallego.app/v1/transactions?limit=5 \
  -H "Authorization: Bearer yk_live_9f8c2a1e4b7d3f6a8c2e1b5d7f9a3c6e"
```

```json
{
  "data": [
    {
      "id": "...",
      "wallet": { "code": "YAPE", "display_name": "Yape" },
      "sender_name": "JUAN CARLOS PEREZ R.",
      "amount": "35.50",
      "currency": "PEN",
      "status": "CAPTURED",
      "occurred_at": "2026-05-14T18:32:07.412Z"
    }
  ],
  "pagination": { "has_more": false, "next_cursor": null, "limit": 5 }
}
```

Revisa las cabeceras de la respuesta — `X-RateLimit-Remaining` te dice
cuántas solicitudes te quedan en la ventana actual (ver
[09 — Límites de tasa](./09-limites-tasa.md)).

## 3. Registra un webhook

Para recibir cobros en tiempo real sin hacer _polling_, registra un endpoint:

```bash
curl -X POST https://api.yallego.app/v1/webhooks \
  -H "Authorization: Bearer yk_live_9f8c2a1e4b7d3f6a8c2e1b5d7f9a3c6e" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://mi-sistema.pe/hooks/yallego",
    "subscribed_events": ["transaction.created"],
    "description": "Integración con sistema de ventas"
  }'
```

```json
{
  "id": "...",
  "url": "https://mi-sistema.pe/hooks/yallego",
  "secret": "whsec_3f6a8c2e1b5d7f9a3c6e9f8c2a1e4b7d",
  "subscribed_events": ["transaction.created"],
  "is_enabled": true,
  "created_at": "2026-05-14T18:50:00Z"
}
```

> Igual que la clave de API, el `secret` se muestra **una única vez**.
> Lo necesitas para verificar la firma de cada evento entrante — ver
> [07 — Verificación de firma](./07-verificacion-firma.md).

La URL debe ser `https://` y no puede apuntar a una red privada o interna
(localhost, rangos `10.x`/`172.16-31.x`/`192.168.x`, etc.) — la validación
ocurre tanto al crear el endpoint como en cada intento de entrega.

## 4. Envía un evento de prueba

Antes de esperar un cobro real, confirma que tu endpoint responde correctamente:

```bash
curl -X POST https://api.yallego.app/v1/webhooks/{id}/test \
  -H "Authorization: Bearer yk_live_9f8c2a1e4b7d3f6a8c2e1b5d7f9a3c6e"
```

Esto envía un evento `transaction.created` con datos ficticios, firmado
exactamente igual que un evento real. Verifica en tu servidor que:

1. Recibiste la solicitud `POST`.
2. La firma en `X-Yallego-Signature` es válida (ver guía 07).
3. Respondiste `2xx` dentro de los 10 segundos de timeout.

Listo — ya puedes recibir cobros de Yape, Plin y BIM en tiempo real. Sigue
con [02 — Autenticación](./02-autenticacion.md) para entender los alcances
disponibles, o con [06 — Catálogo de eventos](./06-eventos.md) para ver qué
otros eventos puedes suscribir.
