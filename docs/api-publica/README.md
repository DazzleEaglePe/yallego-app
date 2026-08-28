# API pública de Yallegó

Documentación para integradores externos que consumen la API de Yallegó con
una **clave de API** (`Authorization: Bearer yk_live_...`). Si estás
implementando el panel administrativo o la app Android del propio proyecto,
usa en cambio [`../06_API_CONTRACT.md`](../06_API_CONTRACT.md) (contrato
completo, incluye las superficies de panel, dispositivo y plataforma).

> **Base URL:** `https://api.yallego.app/v1`
> **Especificación máquina-legible:** [`../openapi.yaml`](../openapi.yaml) (OpenAPI 3.1)

## Contenido

| Guía                                                     | Contenido                                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [01 — Inicio rápido](./01-inicio-rapido.md)              | Crear una clave, hacer la primera solicitud, registrar el primer webhook                    |
| [02 — Autenticación](./02-autenticacion.md)              | Formato de la clave, alcances, errores de autenticación                                     |
| [03 — Transacciones](./03-transacciones.md)              | Consultar, confirmar y disputar cobros capturados                                           |
| [04 — Webhooks](./04-webhooks.md)                        | Registrar endpoints, probar, rotar el secreto, ver entregas                                 |
| [05 — Dispositivos](./05-dispositivos.md)                | Consultar el estado de los dispositivos de captura (solo lectura)                           |
| [06 — Catálogo de eventos](./06-eventos.md)              | Todos los eventos que puede emitir un webhook, con su payload completo                      |
| [07 — Verificación de firma](./07-verificacion-firma.md) | Cómo validar que un evento entrante viene de Yallegó, con ejemplos en Node.js, Python y PHP |
| [08 — Política de reintentos](./08-reintentos.md)        | Calendario de reintentos de webhooks y desactivación automática                             |
| [09 — Límites de tasa](./09-limites-tasa.md)             | Límites por plan y cómo interpretar las cabeceras `X-RateLimit-*`                           |

## Qué NO cubre esta guía

- `/internal/v1/*` — exclusivo de la app Android de captura, autenticado con token de dispositivo.
- `/platform/v1/*` — administración interna de Yallegó, no es una superficie pública.
- Rutas de `/v1` que solo aceptan sesión del panel (registro, miembros, catálogo de billeteras, suscripción) — una clave de API no puede llamarlas.

## Soporte

Ante dudas sobre la integración, escribe a soporte con el `request_id` de la
respuesta (presente en toda respuesta, exitosa o no) — acelera el diagnóstico.
