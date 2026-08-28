# 02 — Autenticación

## Formato

Toda solicitud a la API pública lleva la clave en la cabecera `Authorization`,
como un _bearer token_:

```
Authorization: Bearer yk_live_9f8c2a1e4b7d3f6a8c2e1b5d7f9a3c6e
```

No hay un esquema alternativo (sin cabecera personalizada, sin parámetro de
consulta) — pasar la clave por la URL queda deliberadamente fuera de soporte
porque las URLs terminan en logs de servidores intermedios.

## Alcances (`scopes`)

Cada clave se crea con una lista explícita de alcances. Una solicitud a un
recurso que la clave no cubre responde `403 FORBIDDEN`, no `401` — la clave
es válida, simplemente no alcanza para esa operación.

| Alcance              | Permite                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| `transactions:read`  | Consultar transacciones, su resumen y exportarlas                          |
| `transactions:write` | Confirmar o disputar transacciones                                         |
| `devices:read`       | Consultar el estado de los dispositivos vinculados                         |
| `webhooks:read`      | Consultar webhooks y su historial de entregas                              |
| `webhooks:write`     | Crear, modificar, eliminar y probar webhooks                               |
| `realtime:subscribe` | Conectarse al WebSocket de tiempo real (requiere plan Comercio o superior) |

Sigue el **principio de menor privilegio**: si tu integración solo lee
transacciones, crea la clave únicamente con `transactions:read`. Si necesitas
distintos niveles de acceso para distintos sistemas, crea una clave por
sistema en vez de compartir una con alcance amplio.

## Ciclo de vida de una clave

- **Creación:** `POST /v1/api-keys` (requiere sesión de panel con rol ADMIN, no se puede crear una clave con otra clave).
- **Listado:** `GET /v1/api-keys` devuelve `key_prefix`, nunca el valor completo.
- **Revocación:** `DELETE /v1/api-keys/{id}` — inmediata, no reversible. Las solicitudes en curso con esa clave pueden completarse, las siguientes reciben `401 UNAUTHENTICATED`.
- **Expiración opcional:** al crearla puedes fijar `expires_at`; pasada esa fecha la clave deja de aceptarse automáticamente.

No existe endpoint para "rotar" una clave de API conservando el mismo `id`
(a diferencia del secreto de webhook, que sí rota in-place — ver guía 04):
para rotar, crea la nueva, migra tu integración, y luego revoca la anterior.

## Errores de autenticación

| HTTP | Código                     | Causa típica                                                                                  |
| ---- | -------------------------- | --------------------------------------------------------------------------------------------- |
| 401  | `UNAUTHENTICATED`          | Cabecera `Authorization` ausente, con formato inválido, o clave revocada/expirada/inexistente |
| 403  | `FORBIDDEN`                | La clave es válida pero no tiene el alcance requerido para la operación                       |
| 403  | `PLAN_FEATURE_UNAVAILABLE` | La operación requiere un plan superior (p. ej. `realtime:subscribe` en un plan sin WebSocket) |

```json
// 401 Unauthorized
{
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "La clave de API no es válida.",
    "request_id": "b7f3a2e1-..."
  }
}
```

## Buenas prácticas

- Trata cada clave como una contraseña: nunca la incluyas en código fuente versionado, en un cliente móvil o en JavaScript que corre en el navegador del usuario final.
- Usa una clave distinta por entorno (una para tus pruebas, otra para producción) para poder revocar una sin afectar la otra.
- Monitorea `X-RateLimit-Remaining` (ver [09 — Límites de tasa](./09-limites-tasa.md)) para detectar un uso anómalo antes de que te bloquee `429`.
