# 09 — Límites de tasa

## Cabeceras en cada respuesta

Toda respuesta autenticada por clave de API incluye:

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 287
X-RateLimit-Reset: 1747051200
```

| Cabecera                | Significado                                                                       |
| ----------------------- | --------------------------------------------------------------------------------- |
| `X-RateLimit-Limit`     | Solicitudes permitidas en la ventana actual (1 minuto), según el plan del negocio |
| `X-RateLimit-Remaining` | Solicitudes restantes en la ventana actual                                        |
| `X-RateLimit-Reset`     | Marca de tiempo Unix en la que la ventana se reinicia                             |

El límite se cuenta **por clave de API**, no por tenant — si un negocio usa
varias claves, cada una tiene su propio contador independiente.

## Límite según el plan

| Plan     | Solicitudes por minuto                             |
| -------- | -------------------------------------------------- |
| Free     | 0 (la API pública no está disponible en este plan) |
| Negocio  | 60                                                 |
| Comercio | 300                                                |
| Cadena   | 1 000                                              |

Si tu integración necesita más volumen del que tu plan permite, la solución
es cambiar de plan (`POST /v1/subscription/change`), no repartir la carga
entre varias claves — eso sería evadir el límite, no resolverlo, y el
soporte de Yallegó puede detectarlo.

## Al exceder el límite

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

Respeta la cabecera `Retry-After` (en segundos) antes de reintentar — un
cliente que reintenta inmediatamente tras un `429` solo prolonga el bloqueo.

## Otros límites, fuera de la API pública

Estos aplican a superficies distintas de la que cubre esta guía, pero
conviene conocerlos si tu integración también toca autenticación de panel:

| Superficie                      | Límite        | Ventana               |
| ------------------------------- | ------------- | --------------------- |
| `POST /v1/auth/login`           | 5 intentos    | 15 min por IP + email |
| `POST /v1/auth/forgot-password` | 3 solicitudes | 1 hora por email      |

## Recomendaciones

- Implementa retroceso exponencial (_exponential backoff_) en tu cliente
  para el caso general, no solo para `429` — reduce la carga sobre tu propia
  integración si la API responde lento.
- Si necesitas sincronizar grandes volúmenes históricos (por ejemplo, al
  integrarte por primera vez), usa `GET /v1/transactions/summary` para
  totales agregados antes de paginar el detalle completo con
  `GET /v1/transactions`, y respeta `has_more`/`next_cursor` en vez de
  reconstruir la paginación por offset.
- Prefiere webhooks sobre _polling_ siempre que el caso de uso lo permita
  ([04 — Webhooks](./04-webhooks.md)) — no consumen tu cupo de límite de
  tasa porque son solicitudes salientes de Yallegó hacia ti, no al revés.
