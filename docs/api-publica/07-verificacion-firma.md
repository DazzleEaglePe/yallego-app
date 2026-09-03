# 07 — Verificación de firma

Cada entrega de webhook incluye una firma HMAC-SHA256 que te permite
confirmar que el evento vino de Yallegó y que su cuerpo no fue alterado en
tránsito. **Verifica siempre la firma antes de procesar un evento** — un
endpoint que confía en el cuerpo sin verificar puede recibir eventos
falsificados por cualquiera que descubra su URL.

## Cabeceras enviadas

```
Content-Type: application/json
User-Agent: Yallego-Webhooks/1.0
X-Yallego-Event-Id: 3f6a8c2e-1b5d-4f9a-8c6e-9f8c2a1e4b7d
X-Yallego-Event-Type: transaction.created
X-Yallego-Delivery-Id: 8c2e1b5d-7f9a-4c6e-9f8c-2a1e4b7d3f6a
X-Yallego-Timestamp: 1747250400
X-Yallego-Signature: sha256=a3f5b8c2e1d4f7a9b6c8e2d5f1a4b7c9e3d6f8a2b5c7e9d1f4a6b8c2e5d7f9a1
```

Durante las 24 horas posteriores a una rotación de secreto
(`POST /v1/webhooks/{id}/rotate-secret`), se agrega además:

```
X-Yallego-Signature-Previous: sha256=<firmado con el secreto anterior>
```

## Algoritmo

```
mensaje = "{X-Yallego-Timestamp}.{cuerpo_crudo_de_la_solicitud}"
firma_esperada = hex(HMAC_SHA256(clave = secreto_del_endpoint, mensaje = mensaje))
```

- El **cuerpo crudo** es el que llega en el `body` de la solicitud HTTP,
  byte a byte — no el resultado de volver a serializar el JSON parseado
  (`JSON.stringify(JSON.parse(body))` puede reordenar claves o cambiar
  espaciado y producir una firma distinta). Verifica contra el cuerpo antes
  de deserializarlo.
- Compara `firma_esperada` contra el valor tras `sha256=` en `X-Yallego-Signature`
  usando una **comparación de tiempo constante** (nunca `===` ni `==` sobre
  los strings hex) para no filtrar la firma correcta por temporización.
- **Rechaza eventos con `X-Yallego-Timestamp` de más de 5 minutos de
  antigüedad** respecto al reloj de tu servidor, incluso si la firma es
  válida — previene que alguien reproduzca (_replay_) una entrega capturada
  previamente.

## Node.js

```javascript
const crypto = require('node:crypto');

function verifyYallegoSignature(rawBody, timestamp, signatureHeader, secret) {
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 5 * 60) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex');

  const received = signatureHeader.replace(/^sha256=/, '');
  const expectedBuf = Buffer.from(expected, 'hex');
  const receivedBuf = Buffer.from(received, 'hex');
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// Express — usa express.raw() en esta ruta, NO express.json(),
// para conservar el cuerpo crudo tal como llegó.
app.post('/hooks/yallego', express.raw({ type: 'application/json' }), (req, res) => {
  const rawBody = req.body.toString('utf8');
  const timestamp = req.header('X-Yallego-Timestamp');
  const signature = req.header('X-Yallego-Signature');

  if (!verifyYallegoSignature(rawBody, timestamp, signature, process.env.YALLEGO_WEBHOOK_SECRET)) {
    return res.status(401).send('firma inválida');
  }

  const event = JSON.parse(rawBody);
  // ... procesar event.type / event.data
  res.status(200).send();
});
```

## Python

```python
import hashlib
import hmac
import time

def verify_yallego_signature(raw_body: bytes, timestamp: str, signature_header: str, secret: str) -> bool:
    now = int(time.time())
    if abs(now - int(timestamp)) > 5 * 60:
        return False

    message = f"{timestamp}.".encode("utf-8") + raw_body
    expected = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
    received = signature_header.removeprefix("sha256=")

    return hmac.compare_digest(expected, received)

# Flask — request.get_data() devuelve el cuerpo crudo sin parsear
@app.route("/hooks/yallego", methods=["POST"])
def yallego_webhook():
    raw_body = request.get_data()
    timestamp = request.headers.get("X-Yallego-Timestamp")
    signature = request.headers.get("X-Yallego-Signature")

    if not verify_yallego_signature(raw_body, timestamp, signature, YALLEGO_WEBHOOK_SECRET):
        return "firma inválida", 401

    event = request.get_json()
    # ... procesar event["type"] / event["data"]
    return "", 200
```

## PHP

```php
<?php

function verifyYallegoSignature(string $rawBody, string $timestamp, string $signatureHeader, string $secret): bool
{
    if (abs(time() - (int) $timestamp) > 5 * 60) {
        return false;
    }

    $message = $timestamp . '.' . $rawBody;
    $expected = hash_hmac('sha256', $message, $secret);
    $received = str_replace('sha256=', '', $signatureHeader);

    return hash_equals($expected, $received);
}

// El cuerpo crudo se lee directo del stream de entrada, antes de
// cualquier framework que lo parsee como JSON.
$rawBody = file_get_contents('php://input');
$timestamp = $_SERVER['HTTP_X_YALLEGO_TIMESTAMP'] ?? '';
$signature = $_SERVER['HTTP_X_YALLEGO_SIGNATURE'] ?? '';

if (!verifyYallegoSignature($rawBody, $timestamp, $signature, getenv('YALLEGO_WEBHOOK_SECRET'))) {
    http_response_code(401);
    exit('firma inválida');
}

$event = json_decode($rawBody, true);
// ... procesar $event['type'] / $event['data']
http_response_code(200);
```

## Durante una rotación de secreto

Si acabas de rotar y aún no desplegaste el secreto nuevo en producción,
verifica primero contra `X-Yallego-Signature` con el secreto nuevo y, si
falla, reintenta contra `X-Yallego-Signature-Previous` con el secreto
anterior — cualquiera de las dos siendo válida basta para aceptar el evento
dentro de la ventana de 24 horas.

## Errores comunes

| Síntoma                                  | Causa habitual                                                                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| La firma nunca coincide                  | El framework ya parseó el JSON antes de tu handler (cuerpo re-serializado ≠ cuerpo original)                                            |
| Funciona en pruebas, falla en producción | Un proxy o _load balancer_ intermedio reescribe el cuerpo (compresión, normalización) — asegúrate de firmar/verificar antes de esa capa |
| Falla intermitente                       | Reloj del servidor desincronizado — usa NTP; la ventana de 5 minutos no perdona más que eso                                             |
