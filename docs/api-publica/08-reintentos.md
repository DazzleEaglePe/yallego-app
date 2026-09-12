# 08 — Política de reintentos

## Calendario de reintentos

Un evento fallido se reintenta hasta **8 intentos en total**, con espera
creciente entre cada uno:

| Intento | Espera desde el intento anterior | Tiempo acumulado desde el fallo original |
| ------- | -------------------------------- | ---------------------------------------- |
| 1       | — (inmediato)                    | 0 s                                      |
| 2       | 1 s                              | 1 s                                      |
| 3       | 5 s                              | 6 s                                      |
| 4       | 30 s                             | 36 s                                     |
| 5       | ~4 min 24 s                      | 5 min                                    |
| 6       | 30 min                           | 35 min                                   |
| 7       | ~1 h 55 min                      | 2 h 30 min                               |
| 8       | ~9 h 30 min                      | 12 h                                     |

Si el intento 8 también falla, la entrega pasa a **`ABANDONED`** y no se
reintenta más automáticamente — a partir de ahí, solo un reintento manual
la reactiva (ver abajo).

## Qué cuenta como fallo

- Cualquier código de respuesta fuera del rango `2xx`.
- Timeout: tu endpoint tiene **10 segundos** para responder antes de que
  Yallegó considere el intento fallido.
- Error de red o de resolución DNS.
- Una redirección (`3xx`): las entregas **no siguen redirecciones** — si tu
  endpoint responde con un `301`/`302`, cuenta como fallo. Configura la URL
  registrada para que apunte directo al destino final.

## La excepción: `410 Gone`

Si tu endpoint responde explícitamente `410 Gone`, Yallegó lo interpreta
como _"este endpoint ya no existe, deja de intentar"_ — la entrega se marca
`ABANDONED` de inmediato (sin agotar los 8 intentos) y **el endpoint se
deshabilita en el acto**, sin esperar el umbral de fallos consecutivos
descrito abajo. Úsalo si estás retirando una integración permanentemente en
vez de dejar que expire por fallos.

## Desactivación automática por fallos sostenidos

Si un endpoint acumula **5 entregas `ABANDONED` consecutivas** (cada una ya
agotó sus 8 intentos, o recibió un `410`), Yallegó lo deshabilita
automáticamente (`is_enabled: false`) y notifica por correo a los usuarios
con rol OWNER o ADMIN del negocio. Un endpoint deshabilitado deja de recibir
nuevos eventos hasta que lo reactives explícitamente con
`PATCH /v1/webhooks/{id}` (`{"is_enabled": true}`).

Este umbral es una decisión operativa propia de Yallegó (no forma parte de
un estándar externo) — su intención es detectar un endpoint roto en horas,
no dejarlo fallando silenciosamente durante semanas mientras acumula
entregas perdidas.

Cualquier entrega exitosa reinicia el contador de fallos consecutivos a cero.

## Reintento manual

Para reactivar una entrega puntual sin esperar el calendario automático —
por ejemplo, después de corregir un bug que causó el fallo original:

```bash
curl -X POST https://api.yallego.app/v1/webhooks/{id}/deliveries/{deliveryId}/retry \
  -H "Authorization: Bearer yk_live_..."
```

Solo aplica a entregas en `FAILED` o `ABANDONED`. Un reintento manual no
cuenta contra el calendario de 8 intentos ni contra el umbral de 5 fallos
consecutivos del endpoint — es una entrega nueva e independiente.

## Recomendaciones para tu endpoint

- Responde `2xx` en cuanto valides la firma y encoles el procesamiento —
  no hagas trabajo pesado de forma síncrona dentro del handler, o corres
  riesgo de superar los 10 segundos de timeout.
- Diseña tu handler para ser **idempotente**: usa `X-Yallego-Delivery-Id`
  (único por intento) o `X-Yallego-Event-Id` (único por evento, estable a
  través de reintentos) para descartar procesamientos duplicados — un mismo
  evento puede llegarte más de una vez si tu respuesta se perdió en tránsito
  aunque tu handler sí lo haya procesado.
- Monitorea `GET /v1/webhooks/{id}/deliveries?status=ABANDONED` periódicamente,
  o suscribe activamente a que tu propio sistema te alerte — no dependas
  solo del correo de desactivación automática como única señal.
