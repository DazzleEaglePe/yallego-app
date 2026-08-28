# 05 — Dispositivos

Consulta de solo lectura sobre los celulares vinculados que capturan
notificaciones de pago. La vinculación, pausa, reanudación y revocación de
dispositivos son operaciones exclusivas del panel administrativo (requieren
rol ADMIN con sesión de usuario) — una clave de API con alcance `devices:read`
solo puede consultar su estado, no gestionarlos.

## `GET /v1/devices`

```bash
curl https://api.yallego.app/v1/devices \
  -H "Authorization: Bearer yk_live_..."
```

```json
[
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
```

| Campo          | Valores                       | Significado                                                       |
| -------------- | ----------------------------- | ----------------------------------------------------------------- |
| `status`       | `ACTIVE`, `PAUSED`, `REVOKED` | Estado de gestión, lo controla el panel                           |
| `connectivity` | `ONLINE`, `OFFLINE`           | Derivado: `ONLINE` si `last_seen_at` fue hace menos de 15 minutos |

## `GET /v1/devices/{id}`

Mismo formato que un elemento del listado. `404 NOT_FOUND` si el dispositivo
no existe o pertenece a otro tenant.

## Uso típico

Si tu integración depende de que el dispositivo de captura esté en línea
(por ejemplo, para alertar a un supervisor si dejó de recibir cobros),
suscribe el evento `device.offline` en un webhook en vez de hacer _polling_
sobre este endpoint — ver [06 — Catálogo de eventos](./06-eventos.md).
