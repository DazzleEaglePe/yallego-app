# 03 — Transacciones

Una transacción representa un cobro capturado por Yape, Plin o BIM en uno de
los dispositivos vinculados al negocio. Requiere el alcance `transactions:read`
para consultar y `transactions:write` para confirmar o disputar.

## Ciclo de vida

```
CAPTURED ──confirm──► CONFIRMED
   │
   └────dispute─────► DISPUTED
```

- **`CAPTURED`**: el parser extrajo la transacción de una notificación real. Estado inicial siempre.
- **`CONFIRMED`**: un operador (o tu integración, con `transactions:write`) verificó que el cobro corresponde a una venta.
- **`DISPUTED`**: se marcó como sospechosa o incorrecta.
- **`VOIDED`**: anulada — no se puede transicionar a `VOIDED` vía API pública, es un estado interno.

Confirmar o disputar una transacción que ya no está en `CAPTURED` responde
`409 CONFLICT`.

## `GET /v1/transactions`

Lista paginada por cursor, con filtros compuestos.

```bash
curl "https://api.yallego.app/v1/transactions?wallet_code=YAPE&min_amount=20&limit=20" \
  -H "Authorization: Bearer yk_live_..."
```

| Parámetro                   | Tipo     | Descripción                                                                 |
| --------------------------- | -------- | --------------------------------------------------------------------------- |
| `from` / `to`               | ISO 8601 | Rango sobre `occurred_at`                                                   |
| `wallet_code`               | string   | `YAPE`, `PLIN_BBVA`, `PLIN_INTERBANK`, `BIM`                                |
| `device_id`                 | uuid     | Filtra por dispositivo de captura                                           |
| `status`                    | enum     | `CAPTURED`, `CONFIRMED`, `DISPUTED`, `VOIDED`                               |
| `min_amount` / `max_amount` | decimal  | Rango de monto                                                              |
| `search`                    | string   | Coincide contra `sender_name`                                               |
| `limit`                     | int      | 1–100, por defecto 50                                                       |
| `cursor`                    | string   | Ver [paginación por cursor](../06_API_CONTRACT.md#15-paginación-por-cursor) |

```json
{
  "data": [
    {
      "id": "9f8c2a1e-...",
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
  "pagination": { "has_more": true, "next_cursor": "eyJpZCI6...", "limit": 20 }
}
```

> `confirmed_by` es `null` cuando quien confirmó fue una integración por
> clave de API en vez de un usuario del panel — la clave de API no tiene un
> `user_id` que atribuir.

## `GET /v1/transactions/{id}`

Detalle completo de una transacción individual. `404 NOT_FOUND` si no existe
o pertenece a otro tenant.

## `POST /v1/transactions/{id}/confirm`

```bash
curl -X POST https://api.yallego.app/v1/transactions/{id}/confirm \
  -H "Authorization: Bearer yk_live_..." \
  -H "Content-Type: application/json" \
  -d '{"note": "Verificado contra el pedido #4821"}'
```

`note` es opcional, hasta 500 caracteres. Dispara el evento
`transaction.confirmed` a tus webhooks suscritos.

## `POST /v1/transactions/{id}/dispute`

Misma forma que `confirm`. Dispara `transaction.disputed`. Una transacción
`VOIDED` o ya `DISPUTED` no puede volver a disputarse (`409 CONFLICT`).

## `GET /v1/transactions/summary`

Totales agregados — útil para un dashboard propio sin traer cada transacción individual.

```bash
curl "https://api.yallego.app/v1/transactions/summary?from=2026-05-01T00:00:00Z&to=2026-05-14T23:59:59Z" \
  -H "Authorization: Bearer yk_live_..."
```

```json
{
  "period": { "from": "2026-05-01T00:00:00Z", "to": "2026-05-14T23:59:59Z" },
  "totals": { "count": 1247, "amount": "42817.50", "currency": "PEN", "average": "34.34" },
  "by_wallet": [
    { "wallet_code": "YAPE", "count": 981, "amount": "33420.00" },
    { "wallet_code": "PLIN_BBVA", "count": 266, "amount": "9397.50" }
  ],
  "by_day": [{ "date": "2026-05-14", "count": 87, "amount": "2984.00" }]
}
```

## `POST /v1/transactions/export`

Genera un CSV con los mismos filtros que el listado, sin paginar — pensado
para descargas puntuales, no para integraciones que necesitan datos
estructurados (usa `GET /v1/transactions` con cursor para eso).

```bash
curl -X POST "https://api.yallego.app/v1/transactions/export?from=2026-05-01T00:00:00Z&status=CONFIRMED" \
  -H "Authorization: Bearer yk_live_..." \
  -o transacciones.csv
```
