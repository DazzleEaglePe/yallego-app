# 06 — Contrato de API

> **Versión de la API:** `v1`
> **Base pública:** `https://api.yallego.app/v1`
> **Base interna (dispositivos):** `https://api.yallego.app/internal/v1`
> **Formato:** JSON · UTF-8

---

## 1. Convenciones generales

### 1.1. Superficies de la API

| Superficie     | Base           | Consumidor             | Autenticación        |
| -------------- | -------------- | ---------------------- | -------------------- |
| **Pública**    | `/v1`          | Integradores externos  | API key              |
| **Panel**      | `/v1`          | Panel administrativo   | JWT                  |
| **Interna**    | `/internal/v1` | App Android            | Token de dispositivo |
| **Plataforma** | `/platform/v1` | Administración Yallegó | JWT de administrador |

### 1.2. Cabeceras estándar

**Solicitud:**

```
Content-Type: application/json
Authorization: Bearer <token | api_key>
X-Request-Id: <uuid>            (opcional, se genera si se omite)
Idempotency-Key: <uuid>         (obligatorio en operaciones de escritura no idempotentes)
```

**Respuesta:**

```
Content-Type: application/json
X-Request-Id: <uuid>
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 287
X-RateLimit-Reset: 1747051200
```

### 1.3. Formato de error

```json
{
  "error": {
    "code": "PLAN_LIMIT_EXCEEDED",
    "message": "Se alcanzó el límite de transacciones del plan para el período actual.",
    "details": {
      "limit": 2000,
      "current": 2000,
      "resets_at": "2026-06-01T00:00:00Z"
    },
    "request_id": "b7f3a2e1-..."
  }
}
```

### 1.4. Catálogo de códigos de error

| Código HTTP | Código interno             | Significado                            |
| ----------- | -------------------------- | -------------------------------------- |
| 400         | `VALIDATION_ERROR`         | Cuerpo o parámetros inválidos          |
| 401         | `UNAUTHENTICATED`          | Credencial ausente o inválida          |
| 401         | `TOKEN_EXPIRED`            | Token vencido                          |
| 403         | `FORBIDDEN`                | Sin permiso para el recurso            |
| 403         | `PLAN_FEATURE_UNAVAILABLE` | Funcionalidad no incluida en el plan   |
| 404         | `NOT_FOUND`                | Recurso inexistente o fuera del tenant |
| 409         | `CONFLICT`                 | Estado incompatible con la operación   |
| 409         | `DUPLICATE_RESOURCE`       | El recurso ya existe                   |
| 422         | `PLAN_LIMIT_EXCEEDED`      | Límite del plan alcanzado              |
| 429         | `RATE_LIMIT_EXCEEDED`      | Demasiadas solicitudes                 |
| 500         | `INTERNAL_ERROR`           | Error no controlado                    |
| 503         | `SERVICE_UNAVAILABLE`      | Dependencia no disponible              |

### 1.5. Paginación por cursor

**Solicitud:** `?limit=50&cursor=eyJpZCI6...`

**Respuesta:**

```json
{
  "data": [ ... ],
  "pagination": {
    "has_more": true,
    "next_cursor": "eyJpZCI6...",
    "limit": 50
  }
}
```

| Parámetro | Rango   | Por defecto |
| --------- | ------- | ----------- |
| `limit`   | 1 – 100 | 50          |

### 1.6. Formatos

| Tipo          | Formato        | Ejemplo                    |
| ------------- | -------------- | -------------------------- |
| Fecha y hora  | ISO 8601 UTC   | `2026-05-14T18:32:07.412Z` |
| Monto         | String decimal | `"35.50"`                  |
| Moneda        | ISO 4217       | `"PEN"`                    |
| Identificador | UUID v4        | `"9f8c2a1e-..."`           |

---

## 2. Autenticación (panel)

### `POST /v1/auth/register`

```json
// Solicitud
{
  "email": "dueno@negocio.pe",
  "password": "********",
  "full_name": "María Quispe",
  "business_name": "Bodega Santa Rosa"
}

// 201 Created
{
  "user": { "id": "...", "email": "dueno@negocio.pe", "full_name": "María Quispe" },
  "tenant": { "id": "...", "slug": "bodega-santa-rosa", "business_name": "Bodega Santa Rosa" },
  "message": "Se envió un enlace de verificación al correo indicado."
}
```

### `POST /v1/auth/login`

```json
// Solicitud
{ "email": "dueno@negocio.pe", "password": "********" }

// 200 OK
{
  "access_token": "eyJhbGciOi...",
  "active_tenant_id": "9f8c2a1e-...",
  "expires_in": 900,
  "user": { "id": "...", "email": "...", "full_name": "..." },
  "tenants": [
    { "id": "...", "slug": "bodega-santa-rosa", "business_name": "...", "role": "OWNER" }
  ]
}
```

### `POST /v1/auth/refresh`

```json
// Solicitud
{ "tenant_id": "9f8c2a1e-..." }

// 200 OK
{
  "access_token": "...",
  "active_tenant_id": "9f8c2a1e-...",
  "expires_in": 900,
  "user": { "id": "...", "email": "...", "full_name": "..." },
  "tenants": []
}
```

El refresh token rota mediante una cookie `HttpOnly`; el cuerpo puede incluir `tenant_id` para
conservar el negocio activo durante la renovación.

### Endpoints complementarios

| Método | Ruta                       | Descripción                            |
| ------ | -------------------------- | -------------------------------------- |
| `POST` | `/v1/auth/logout`          | Invalida el refresh token vigente      |
| `POST` | `/v1/auth/verify-email`    | Confirma el correo mediante token      |
| `POST` | `/v1/auth/forgot-password` | Solicita enlace de recuperación        |
| `POST` | `/v1/auth/reset-password`  | Establece nueva contraseña con token   |
| `POST` | `/v1/auth/change-password` | Cambia contraseña con sesión activa    |
| `POST` | `/v1/auth/switch-tenant`   | Cambia el negocio activo de la sesión  |
| `GET`  | `/v1/auth/me`              | Perfil del usuario y tenants asociados |

---

## 3. Tenants

| Método   | Ruta                | Rol mínimo | Descripción                                |
| -------- | ------------------- | ---------- | ------------------------------------------ |
| `GET`    | `/v1/tenant`        | VIEWER     | Datos del tenant activo                    |
| `PATCH`  | `/v1/tenant`        | ADMIN      | Actualiza datos del tenant                 |
| `GET`    | `/v1/tenant/usage`  | VIEWER     | Consumo del período actual                 |
| `POST`   | `/v1/tenant/export` | OWNER      | Solicita exportación completa              |
| `DELETE` | `/v1/tenant`        | OWNER      | Solicita eliminación con período de gracia |

### `GET /v1/tenant/usage`

```json
{
  "period": { "start": "2026-05-01", "end": "2026-05-31" },
  "plan": { "code": "NEGOCIO", "display_name": "Negocio" },
  "usage": {
    "transactions": { "used": 1247, "limit": 2000, "percentage": 62.35 },
    "devices": { "used": 1, "limit": 2 },
    "users": { "used": 2, "limit": 3 },
    "wallets": { "used": 2, "limit": 3 },
    "webhooks": { "used": 1, "limit": 1 }
  }
}
```

---

## 4. Miembros

| Método   | Ruta                             | Rol mínimo | Descripción                      |
| -------- | -------------------------------- | ---------- | -------------------------------- |
| `GET`    | `/v1/members`                    | ADMIN      | Lista miembros del tenant        |
| `POST`   | `/v1/members/invitations`        | ADMIN      | Envía invitación                 |
| `GET`    | `/v1/members/invitations`        | ADMIN      | Lista invitaciones pendientes    |
| `DELETE` | `/v1/members/invitations/{id}`   | ADMIN      | Revoca invitación                |
| `PATCH`  | `/v1/members/{id}`               | OWNER      | Cambia el rol de un miembro      |
| `DELETE` | `/v1/members/{id}`               | ADMIN      | Remueve un miembro               |
| `POST`   | `/v1/members/transfer-ownership` | OWNER      | Transfiere la propiedad          |
| `POST`   | `/v1/invitations/accept`         | —          | Acepta invitación mediante token |

### `POST /v1/members/invitations`

```json
// Solicitud
{ "email": "cajero@negocio.pe", "role": "OPERATOR" }

// 201 Created
{
  "id": "...",
  "email": "cajero@negocio.pe",
  "role": "OPERATOR",
  "expires_at": "2026-05-21T18:00:00Z",
  "status": "PENDING"
}
```

---

## 5. Dispositivos

| Método   | Ruta                        | Rol mínimo | Descripción                  |
| -------- | --------------------------- | ---------- | ---------------------------- |
| `GET`    | `/v1/devices`               | VIEWER     | Lista dispositivos           |
| `GET`    | `/v1/devices/{id}`          | VIEWER     | Detalle de un dispositivo    |
| `POST`   | `/v1/devices/pairing-codes` | ADMIN      | Genera código de vinculación |
| `PATCH`  | `/v1/devices/{id}`          | ADMIN      | Actualiza etiqueta o estado  |
| `DELETE` | `/v1/devices/{id}`          | ADMIN      | Revoca el dispositivo        |

### `POST /v1/devices/pairing-codes`

```json
// Solicitud
{ "label": "Celular caja principal" }

// 201 Created
{
  "code": "K7M2-9XQP",
  "qr_payload": "yallego://pair?code=K7M2-9XQP",
  "expires_at": "2026-05-14T18:42:00Z"
}
```

### `GET /v1/devices`

```json
{
  "data": [
    {
      "id": "...",
      "label": "Celular caja principal",
      "manufacturer": "Xiaomi",
      "model": "Redmi Note 12",
      "os_version": "13",
      "app_version": "1.0.4",
      "status": "ACTIVE",
      "connectivity": "ONLINE",
      "last_seen_at": "2026-05-14T18:37:12Z",
      "paired_at": "2026-04-02T10:15:00Z"
    }
  ]
}
```

> `connectivity` se deriva de `last_seen_at`: `ONLINE` si el último heartbeat ocurrió hace menos de 15 minutos; `OFFLINE` en caso contrario.

---

## 6. Billeteras

| Método   | Ruta                  | Rol mínimo | Descripción                   |
| -------- | --------------------- | ---------- | ----------------------------- |
| `GET`    | `/v1/wallets/catalog` | VIEWER     | Catálogo global disponible    |
| `GET`    | `/v1/wallets`         | VIEWER     | Billeteras activas del tenant |
| `POST`   | `/v1/wallets`         | ADMIN      | Activa una billetera          |
| `PATCH`  | `/v1/wallets/{id}`    | ADMIN      | Habilita o deshabilita        |
| `DELETE` | `/v1/wallets/{id}`    | ADMIN      | Desactiva la billetera        |

### `GET /v1/wallets`

```json
{
  "data": [
    {
      "id": "...",
      "wallet": {
        "code": "YAPE",
        "display_name": "Yape",
        "provider": "YAPE",
        "issuer": "BCP"
      },
      "is_enabled": true,
      "account_reference": "***4821",
      "enabled_at": "2026-04-02T10:20:00Z"
    }
  ]
}
```

---

## 7. Transacciones

### `GET /v1/transactions`

**Parámetros de consulta:**

| Parámetro     | Tipo     | Descripción                         |
| ------------- | -------- | ----------------------------------- |
| `from`        | ISO 8601 | Inicio del rango                    |
| `to`          | ISO 8601 | Fin del rango                       |
| `wallet_code` | string   | Filtra por billetera                |
| `device_id`   | uuid     | Filtra por dispositivo              |
| `status`      | enum     | `CAPTURED`, `CONFIRMED`, `DISPUTED` |
| `min_amount`  | decimal  | Monto mínimo                        |
| `max_amount`  | decimal  | Monto máximo                        |
| `search`      | string   | Búsqueda en nombre del emisor       |
| `limit`       | int      | 1–100                               |
| `cursor`      | string   | Cursor de paginación                |

```json
// 200 OK
{
  "data": [
    {
      "id": "...",
      "wallet": { "code": "YAPE", "display_name": "Yape" },
      "sender_name": "JUAN CARLOS PEREZ R.",
      "amount": "35.50",
      "currency": "PEN",
      "security_code": "247",
      "approval_code": null,
      "status": "CAPTURED",
      "occurred_at": "2026-05-14T18:32:07.412Z",
      "confirmed_at": null,
      "confirmed_by": null,
      "device": { "id": "...", "label": "Celular caja principal" }
    }
  ],
  "pagination": { "has_more": true, "next_cursor": "...", "limit": 50 }
}
```

### Endpoints complementarios

| Método | Ruta                            | Rol mínimo | Descripción                      |
| ------ | ------------------------------- | ---------- | -------------------------------- |
| `GET`  | `/v1/transactions/{id}`         | VIEWER     | Detalle de una transacción       |
| `POST` | `/v1/transactions/{id}/confirm` | OPERATOR   | Marca como confirmada            |
| `POST` | `/v1/transactions/{id}/dispute` | OPERATOR   | Marca como disputada             |
| `GET`  | `/v1/transactions/summary`      | VIEWER     | Totales agregados por período    |
| `POST` | `/v1/transactions/export`       | VIEWER     | Genera exportación CSV asíncrona |

### `GET /v1/transactions/summary`

```json
{
  "period": { "from": "2026-05-01T00:00:00Z", "to": "2026-05-14T23:59:59Z" },
  "totals": {
    "count": 1247,
    "amount": "42817.50",
    "currency": "PEN",
    "average": "34.34"
  },
  "by_wallet": [
    { "wallet_code": "YAPE", "count": 981, "amount": "33420.00" },
    { "wallet_code": "PLIN_BBVA", "count": 266, "amount": "9397.50" }
  ],
  "by_day": [{ "date": "2026-05-14", "count": 87, "amount": "2984.00" }]
}
```

---

## 8. API keys

| Método   | Ruta                | Rol mínimo | Descripción                   |
| -------- | ------------------- | ---------- | ----------------------------- |
| `GET`    | `/v1/api-keys`      | ADMIN      | Lista claves (sin el secreto) |
| `POST`   | `/v1/api-keys`      | ADMIN      | Crea una clave                |
| `DELETE` | `/v1/api-keys/{id}` | ADMIN      | Revoca una clave              |

### `POST /v1/api-keys`

```json
// Solicitud
{
  "label": "Integración POS",
  "scopes": ["transactions:read", "webhooks:write"],
  "expires_at": null
}

// 201 Created — el campo `key` se muestra una única vez
{
  "id": "...",
  "label": "Integración POS",
  "key": "yk_live_9f8c2a1e4b7d3f6a8c2e1b5d7f9a3c6e",
  "key_prefix": "yk_live_9f8c2a1e",
  "scopes": ["transactions:read", "webhooks:write"],
  "created_at": "2026-05-14T18:45:00Z"
}
```

### Alcances disponibles

| Alcance              | Permite                              |
| -------------------- | ------------------------------------ |
| `transactions:read`  | Consultar transacciones              |
| `transactions:write` | Confirmar o disputar transacciones   |
| `devices:read`       | Consultar estado de dispositivos     |
| `webhooks:read`      | Consultar webhooks y entregas        |
| `webhooks:write`     | Crear, modificar y eliminar webhooks |
| `realtime:subscribe` | Conectarse al WebSocket              |

---

## 9. Webhooks

| Método   | Ruta                                              | Rol mínimo | Descripción               |
| -------- | ------------------------------------------------- | ---------- | ------------------------- |
| `GET`    | `/v1/webhooks`                                    | ADMIN      | Lista endpoints           |
| `POST`   | `/v1/webhooks`                                    | ADMIN      | Registra un endpoint      |
| `GET`    | `/v1/webhooks/{id}`                               | ADMIN      | Detalle del endpoint      |
| `PATCH`  | `/v1/webhooks/{id}`                               | ADMIN      | Actualiza el endpoint     |
| `DELETE` | `/v1/webhooks/{id}`                               | ADMIN      | Elimina el endpoint       |
| `POST`   | `/v1/webhooks/{id}/test`                          | ADMIN      | Envía un evento de prueba |
| `POST`   | `/v1/webhooks/{id}/rotate-secret`                 | ADMIN      | Rota el secreto de firma  |
| `GET`    | `/v1/webhooks/{id}/deliveries`                    | ADMIN      | Historial de entregas     |
| `POST`   | `/v1/webhooks/{id}/deliveries/{deliveryId}/retry` | ADMIN      | Reintenta una entrega     |

### `POST /v1/webhooks`

```json
// Solicitud
{
  "url": "https://mi-sistema.pe/hooks/yallego",
  "subscribed_events": ["transaction.created", "device.offline"],
  "description": "Integración con sistema de ventas"
}

// 201 Created — `secret` se muestra una única vez
{
  "id": "...",
  "url": "https://mi-sistema.pe/hooks/yallego",
  "secret": "whsec_3f6a8c2e1b5d7f9a3c6e9f8c2a1e4b7d",
  "subscribed_events": ["transaction.created", "device.offline"],
  "is_enabled": true,
  "created_at": "2026-05-14T18:50:00Z"
}
```

### 9.1. Estructura del evento entregado

**Cabeceras:**

```
Content-Type: application/json
User-Agent: Yallego-Webhooks/1.0
X-Yallego-Event-Id: 3f6a8c2e-1b5d-4f9a-8c6e-9f8c2a1e4b7d
X-Yallego-Event-Type: transaction.created
X-Yallego-Delivery-Id: 8c2e1b5d-7f9a-4c6e-9f8c-2a1e4b7d3f6a
X-Yallego-Timestamp: 1747250400
X-Yallego-Signature: sha256=a3f5b8c2e1d4f7a9b6c8e2d5f1a4b7c9e3d6f8a2b5c7e9d1f4a6b8c2e5d7f9a1
```

**Cuerpo:**

```json
{
  "id": "3f6a8c2e-1b5d-4f9a-8c6e-9f8c2a1e4b7d",
  "type": "transaction.created",
  "api_version": "v1",
  "created_at": "2026-05-14T18:32:09.104Z",
  "data": {
    "transaction": {
      "id": "...",
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
}
```

### 9.2. Verificación de firma

```
firma_esperada = HMAC_SHA256(
  clave  = secreto_del_endpoint,
  mensaje = "{X-Yallego-Timestamp}.{cuerpo_crudo}"
)
```

Se compara con comparación de tiempo constante. Se recomienda rechazar eventos con marca temporal de más de 5 minutos de antigüedad para prevenir repetición.

### 9.3. Catálogo de eventos

| Evento                   | Disparador                                      |
| ------------------------ | ----------------------------------------------- |
| `transaction.created`    | Nueva transacción parseada correctamente        |
| `transaction.confirmed`  | Un usuario marca la transacción como confirmada |
| `transaction.disputed`   | Un usuario marca la transacción como disputada  |
| `device.offline`         | Un dispositivo supera el umbral sin heartbeat   |
| `device.online`          | Un dispositivo restablece comunicación          |
| `notification.unmatched` | Notificación recibida sin parser coincidente    |

---

## 10. WebSocket

**Endpoint:** `wss://api.yallego.app/v1/realtime`
**Requiere:** plan Comercio o superior · alcance `realtime:subscribe`

### 10.1. Handshake

```javascript
const socket = io('wss://api.yallego.app/v1/realtime', {
  transports: ['websocket'],
  auth: { token: 'yk_live_...' },
});
```

### 10.2. Eventos emitidos por el servidor

| Evento                  | Payload                                          |
| ----------------------- | ------------------------------------------------ |
| `connected`             | `{ tenant_id, session_id }`                      |
| `transaction.created`   | Objeto transacción completo                      |
| `transaction.confirmed` | `{ transaction_id, confirmed_by, confirmed_at }` |
| `device.status_changed` | `{ device_id, connectivity, changed_at }`        |
| `error`                 | `{ code, message }`                              |

### 10.3. Comportamiento

| Aspecto              | Definición                                                    |
| -------------------- | ------------------------------------------------------------- |
| Alcance              | Cada conexión recibe únicamente eventos de su tenant          |
| Reconexión           | El cliente reintenta con backoff exponencial                  |
| Latencia objetivo    | < 500 ms desde la creación de la transacción                  |
| Límite de conexiones | Según plan; se rechaza con `RATE_LIMIT_EXCEEDED` al excederse |
| Heartbeat            | Ping/pong cada 25 segundos                                    |

---

## 11. Membresías y facturación

| Método | Ruta                       | Rol mínimo | Descripción                |
| ------ | -------------------------- | ---------- | -------------------------- |
| `GET`  | `/v1/plans`                | —          | Catálogo público de planes |
| `GET`  | `/v1/subscription`         | OWNER      | Suscripción vigente        |
| `POST` | `/v1/subscription/change`  | OWNER      | Solicita cambio de plan    |
| `GET`  | `/v1/subscription/history` | OWNER      | Historial de cambios       |

### `POST /v1/subscription/change`

```json
// Solicitud
{ "plan_code": "COMERCIO", "billing_cycle": "ANNUAL" }

// 202 Accepted
{
  "status": "PENDING_PAYMENT",
  "requested_plan": "COMERCIO",
  "billing_cycle": "ANNUAL",
  "amount_due": "790.00",
  "currency": "PEN",
  "payment_instructions": {
    "method": "TRANSFER",
    "reference": "YLG-2026-000841"
  },
  "message": "El cambio se aplicará una vez confirmado el pago."
}
```

---

## 12. Auditoría

| Método | Ruta               | Rol mínimo | Descripción                       |
| ------ | ------------------ | ---------- | --------------------------------- |
| `GET`  | `/v1/audit`        | ADMIN      | Consulta el registro de auditoría |
| `POST` | `/v1/audit/export` | ADMIN      | Exporta el registro               |

**Parámetros de consulta:** `from`, `to`, `action`, `actor_user_id`, `resource_type`, `limit`, `cursor`

---

## 13. API interna (dispositivos Android)

### `POST /internal/v1/devices/pair`

```json
// Solicitud (sin autenticación previa)
{
  "code": "K7M2-9XQP",
  "device": {
    "manufacturer": "Xiaomi",
    "model": "Redmi Note 12",
    "os_version": "13",
    "app_version": "1.0.4"
  }
}

// 201 Created
{
  "device_id": "...",
  "device_token": "dvt_9f8c2a1e4b7d3f6a8c2e1b5d7f9a3c6e",
  "tenant": { "id": "...", "business_name": "Bodega Santa Rosa" },
  "monitored_packages": [
    "com.bcp.innovacxion.yapeapp",
    "com.bbva.nxtapp"
  ]
}
```

### `POST /internal/v1/ingest`

```json
// Solicitud — Authorization: Bearer dvt_...
{
  "notifications": [
    {
      "client_ref": "local-uuid-1",
      "package_name": "com.bcp.innovacxion.yapeapp",
      "title": "Yape!",
      "body": "Te Yapearon S/ 35.50 de JUAN CARLOS PEREZ R. Código de seguridad: 247",
      "posted_at": "2026-05-14T18:32:07.412Z"
    }
  ]
}

// 202 Accepted
{
  "accepted": [
    { "client_ref": "local-uuid-1", "notification_id": "...", "status": "QUEUED" }
  ],
  "rejected": []
}
```

**Comportamiento:**

- Acepta lotes de hasta 50 notificaciones por solicitud
- Responde `202` inmediatamente; el parsing ocurre de forma asíncrona
- Duplicados se responden con `status: "DUPLICATE"` dentro de `accepted` (la app puede eliminarlos de su cola)
- Si el plan agotó su límite, responde `422` y la app conserva los elementos en cola

### `POST /internal/v1/heartbeat`

```json
// Solicitud
{
  "app_version": "1.0.4",
  "queue_size": 0,
  "permissions": {
    "notification_access": true,
    "battery_optimization_disabled": true
  }
}

// 200 OK
{
  "server_time": "2026-05-14T18:37:12Z",
  "monitored_packages": ["com.bcp.innovacxion.yapeapp", "com.bbva.nxtapp"],
  "config_version": 7
}
```

### `GET /internal/v1/config`

Devuelve la configuración vigente: paquetes a monitorear, intervalo de heartbeat, tamaño de lote. Permite ajustar comportamiento sin actualizar la aplicación.

---

## 14. API de plataforma (administración interna)

| Método  | Ruta                                          | Descripción                           |
| ------- | --------------------------------------------- | ------------------------------------- |
| `POST`  | `/platform/v1/auth/login`                     | Autenticación de administrador        |
| `GET`   | `/platform/v1/tenants`                        | Lista y busca tenants                 |
| `GET`   | `/platform/v1/tenants/{id}`                   | Detalle de un tenant                  |
| `PATCH` | `/platform/v1/tenants/{id}/status`            | Activa o suspende                     |
| `POST`  | `/platform/v1/tenants/{id}/subscription`      | Aplica cambio de plan                 |
| `POST`  | `/platform/v1/payments`                       | Registra un pago manual               |
| `GET`   | `/platform/v1/wallets`                        | Gestiona el catálogo de billeteras    |
| `POST`  | `/platform/v1/wallets`                        | Registra una billetera                |
| `GET`   | `/platform/v1/parsers/{walletId}/versions`    | Lista versiones de parser             |
| `POST`  | `/platform/v1/parsers/{walletId}/versions`    | Crea una versión                      |
| `POST`  | `/platform/v1/parsers/versions/{id}/test`     | Prueba contra muestras                |
| `POST`  | `/platform/v1/parsers/versions/{id}/activate` | Activa una versión                    |
| `GET`   | `/platform/v1/notifications/unmatched`        | Notificaciones sin parser coincidente |
| `POST`  | `/platform/v1/notifications/reprocess`        | Reprocesa un conjunto histórico       |
| `GET`   | `/platform/v1/metrics`                        | Métricas globales de la plataforma    |

---

## 15. Limitación de tasa

| Superficie                 | Límite          | Ventana                  |
| -------------------------- | --------------- | ------------------------ |
| `/v1/auth/login`           | 5 intentos      | 15 min por IP + email    |
| `/v1/auth/forgot-password` | 3 solicitudes   | 1 hora por email         |
| API pública                | Según plan      | 1 minuto por API key     |
| `/internal/v1/ingest`      | 120 solicitudes | 1 minuto por dispositivo |
| `/internal/v1/heartbeat`   | 20 solicitudes  | 1 minuto por dispositivo |

**Respuesta al exceder:**

```json
// 429 Too Many Requests — Retry-After: 43
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Se superó el límite de solicitudes.",
    "details": { "limit": 300, "window_seconds": 60, "retry_after": 43 }
  }
}
```

---

## 16. Versionado

| Regla                                                                                |
| ------------------------------------------------------------------------------------ |
| La versión se expresa en el prefijo de ruta (`/v1`)                                  |
| Dentro de una versión mayor solo se realizan cambios compatibles hacia atrás         |
| Agregar campos a una respuesta se considera compatible                               |
| Eliminar o renombrar campos requiere una nueva versión mayor                         |
| Los payloads de webhook incluyen `api_version` para permitir evolución independiente |
| Al publicar `v2`, `v1` se mantiene operativa por un mínimo de 12 meses               |
