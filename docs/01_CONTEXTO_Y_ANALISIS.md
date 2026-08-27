# 01 — Contexto y Análisis de Negocio

> **Producto:** Yallegó · **Tagline:** "¿Ya llegó?"
> **Versión del documento:** 1.0
> **Estado:** Aprobado para desarrollo

---

## 1. Resumen ejecutivo

**Yallegó** es una plataforma SaaS multi-tenant que permite a negocios peruanos **validar en tiempo real los pagos recibidos por billeteras digitales** (Yape, Plin, BIM y otras), distribuyendo la confirmación a todo el equipo del negocio y a cualquier sistema externo mediante una API pública.

El producto captura las **notificaciones reales del sistema operativo Android** en el dispositivo del negocio (no capturas de pantalla, que son falsificables), las normaliza en el backend y las expone vía REST, WebSocket y Webhooks.

**Diferenciador central:** Yallegó es **API-first**. Mientras la competencia se limita a reenviar notificaciones, Yallegó es infraestructura sobre la cual otros desarrolladores pueden construir integraciones (POS, e-commerce, ERP, sistemas custom).

---

## 2. El problema

### 2.1. Yapeos falsos

Existe una modalidad de estafa extendida en Perú: el cliente muestra una **captura de pantalla falsificada** simulando un pago que nunca ocurrió. Las capturas son triviales de generar y visualmente idénticas a las reales.

Yape implementó en 2025 un **código de seguridad de 3 dígitos** visible tanto en el comprobante del emisor como en la notificación del receptor, para permitir validación cruzada.

**El problema operativo persiste:** el cajero no tiene acceso al celular del dueño, por lo tanto no puede ejecutar la validación oficial que el propio Yape recomienda.

### 2.2. Dependencia del dispositivo del dueño

La notificación llega únicamente al celular registrado en la cuenta de la billetera. Si el dueño no está presente:

- El equipo confía en capturas (vulnerable a fraude)
- O detiene la operación hasta validar (fricción, pérdida de ventas)
- O el dueño debe estar disponible 24/7 (no escalable)

### 2.3. Fragmentación de billeteras

Un negocio peruano típico recibe pagos por múltiples canales:

| Billetera               | Emisor(es)                          | Nota                                                |
| ----------------------- | ----------------------------------- | --------------------------------------------------- |
| **Yape**                | BCP                                 | Mayor participación de mercado                      |
| **Plin**                | BBVA, Interbank, Scotiabank, BanBif | Cada banco genera notificación con formato distinto |
| **BIM**                 | Consorcio de entidades              | Menor volumen pero creciente                        |
| Transferencias directas | Múltiples bancos                    | Fuera del alcance del MVP                           |

Cada canal produce notificaciones con estructura propia. La conciliación manual es ineficiente y propensa a error.

### 2.4. Ausencia de integración con sistemas

No existe un estándar accesible para que un POS, e-commerce o ERP peruano "sepa" que un pago digital llegó. Hoy se resuelve manualmente o no se resuelve.

---

## 3. Propuesta de valor

Yallegó captura las notificaciones del SO Android desde el dispositivo del negocio y las distribuye a:

1. **El equipo del negocio** — mediante panel web accesible desde cualquier dispositivo
2. **Sistemas externos** — vía API pública (REST + WebSocket + Webhooks)
3. **El propio panel administrativo** — historial, conciliación, exportación

### 3.1. Diferenciadores

| #   | Diferenciador                                   | Por qué importa                                                                       |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | **Validación con código de seguridad**          | Único que captura y expone los 3 dígitos de Yape de forma estructurada                |
| 2   | **API pública documentada**                     | REST + WS + Webhooks con HMAC, retry policy, SDK — nadie más lo ofrece con este nivel |
| 3   | **Multi-billetera con arquitectura extensible** | Plugin-based: sumar una billetera nueva no requiere redeploy                          |
| 4   | **Multi-tenancy real**                          | Row Level Security en BD, no "shared state con filtros"                               |
| 5   | **Plan Free funcional**                         | Captura long tail de micronegocios                                                    |
| 6   | **Producto peruano**                            | Facturación en soles, soporte local, contexto regulatorio nacional                    |

---

## 4. Mercado objetivo

### 4.1. Segmentos

| Segmento                           | Perfil                                                 | Tier objetivo     |
| ---------------------------------- | ------------------------------------------------------ | ----------------- |
| **Micronegocios**                  | Bodegas, puestos de mercado, 1 persona                 | Free → Negocio    |
| **Comercios pequeños**             | Tiendas, peluquerías, ferreterías, 2-5 personas        | Negocio           |
| **Comercios medianos**             | Múltiples cajeros, alto volumen, necesitan integración | Comercio          |
| **Cadenas y franquicias**          | Múltiples sucursales, ERP propio, conciliación         | Cadena            |
| **Desarrolladores e integradores** | Construyen software para clientes finales              | Comercio → Cadena |

### 4.2. Estimación de mercado (bottom-up)

- Base de usuarios de billeteras digitales en Perú: decenas de millones
- Negocios pequeños y medianos que aceptan pagos digitales: estimado 600,000+
- Objetivo conservador a 24 meses: 0.5% de penetración = ~3,000 tenants pagos

### 4.3. Estrategia geográfica

| Fase | Alcance                                         |
| ---- | ----------------------------------------------- |
| MVP  | Ica (mercado conocido, ciclo de feedback corto) |
| v0.2 | Lima + ciudades secundarias                     |
| v1.0 | Nacional                                        |

---

## 5. Análisis competitivo

| Competidor        | Modelo               | Fortalezas                            | Debilidad frente a Yallegó                                        |
| ----------------- | -------------------- | ------------------------------------- | ----------------------------------------------------------------- |
| **NotiYape**      | App gratuita         | Bajo costo, en producción             | Solo reenvío; sin API, sin webhooks, sin panel, sin multi-tenancy |
| **PayCheck**      | SaaS con planes      | Alertas de voz, multi-wallet          | Sin API pública documentada, sin SDK                              |
| **Tingu Alerta**  | SaaS con webhooks    | Multi-billetera, integración POS      | Documentación limitada, menos énfasis API-first                   |
| **Yape Empresas** | Producto oficial BCP | Respaldo bancario, integración nativa | Solo Yape, afiliación lenta, no es API-first                      |

### 5.1. Posicionamiento

Yallegó **no compite por precio**. Compite por completitud técnica y extensibilidad.

**Frase de posicionamiento interno:**

> _"Lo que Stripe hizo por las tarjetas, Yallegó lo hace por las billeteras digitales peruanas."_

---

## 6. Modelo de negocio

### 6.1. Estructura de precios (Freemium por tiers)

| Plan            | Mensual | Semestral (−10%) | Anual (−17%, "2 meses gratis") |
| --------------- | ------- | ---------------- | ------------------------------ |
| **Free**        | S/0     | —                | —                              |
| **Negocio**     | S/29    | S/156            | S/290                          |
| **Comercio** ⭐ | S/79    | S/426            | S/790                          |
| **Cadena**      | S/199   | S/1,074          | S/1,990                        |

### 6.2. Límites por tier

| Recurso                 | Free      | Negocio | Comercio    | Cadena     |
| ----------------------- | --------- | ------- | ----------- | ---------- |
| Billeteras activas      | 1         | 3       | Ilimitadas  | Ilimitadas |
| Dispositivos de captura | 1         | 2       | 5           | Ilimitados |
| Transacciones/mes       | 200       | 2,000   | 15,000      | Ilimitadas |
| Usuarios                | 1         | 3       | 10          | Ilimitados |
| Webhooks                | 0         | 1       | 5           | Ilimitados |
| WebSocket API pública   | ❌        | ❌      | ✅          | ✅         |
| Retención de historial  | 30 días   | 90 días | 12 meses    | 36 meses   |
| Rate limit API          | —         | 60/min  | 300/min     | 1,000/min  |
| Soporte                 | Comunidad | Email   | Prioritario | SLA        |

### 6.3. Lógica de conversión

- **Free** captura volumen y genera prueba social
- **Free → Negocio** se dispara al necesitar más de una billetera
- **Negocio → Comercio** se dispara al necesitar **API/webhooks** (integración con sistemas) — línea principal de monetización
- **Cadena** funciona como anchor pricing y captura multi-sucursal real

### 6.4. Comunicación del descuento anual

Usar **"2 meses gratis"** en lugar de "17% de descuento". Mismo valor económico, mayor conversión por concreción cognitiva.

---

## 7. Restricciones y decisiones fundamentales

### 7.1. Restricción técnica: Android-only para captura

La captura de notificaciones de aplicaciones de terceros solo es posible mediante `NotificationListenerService`, **API exclusiva de Android**. iOS no expone ningún equivalente.

**Consecuencia de producto:** el dispositivo de captura debe ser Android. Se comunica abiertamente y se recomienda dispositivo dedicado (S/300–500).

**No es limitación del panel administrativo**, que es web y accesible desde cualquier sistema operativo.

### 7.2. Alcance horizontal, no vertical

El producto se diseña **agnóstico de rubro**. No se incluyen features específicas de restaurantes, retail u otro vertical. Cualquier negocio que reciba pagos digitales es cliente potencial.

### 7.3. Componentes del sistema (alcance MVP)

| Componente               | Tecnología              | Propósito                                                                     |
| ------------------------ | ----------------------- | ----------------------------------------------------------------------------- |
| **App de captura**       | Kotlin nativo (Android) | Capturar notificaciones y enviarlas al backend                                |
| **Panel administrativo** | Next.js (web)           | Gestión de tenants, usuarios, roles, membresías, transacciones, integraciones |
| **Backend / API**        | NestJS                  | Ingesta, parsing, persistencia, distribución, API pública                     |

---

## 8. Riesgos y mitigaciones

### 8.1. Técnicos

| Riesgo                                                     | Prob. | Impacto | Mitigación                                                                                             |
| ---------------------------------------------------------- | ----- | ------- | ------------------------------------------------------------------------------------------------------ |
| Cambio de formato en notificaciones                        | Alta  | Alto    | Parsers configurables desde BD (sin redeploy), suite de tests con fixtures, monitoreo de tasa de éxito |
| Vendor kills de background services (Xiaomi, Huawei, Oppo) | Alta  | Medio   | Foreground service persistente, asistente de configuración por marca, heartbeat con alertas            |
| Pérdida de conectividad en el dispositivo                  | Media | Medio   | Cola local en SQLite con reintento automático                                                          |
| Latencia bajo carga                                        | Media | Medio   | BullMQ con workers escalables, monitoreo de profundidad de cola                                        |

### 8.2. Legales y regulatorios

| Riesgo                                     | Prob.      | Impacto    | Mitigación                                                                                                          |
| ------------------------------------------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------- |
| Conflicto de marca con billeteras          | Baja-Media | Alto       | Nombre propio sin referencias a marcas de terceros; comunicación como "compatible con", nunca "afiliado a"          |
| Ley 29733 (Protección de Datos Personales) | Media      | Medio      | Política de privacidad explícita, consentimiento del tenant, cifrado at-rest, procedimiento de eliminación de datos |
| Términos de servicio de las billeteras     | Media      | Bajo-Medio | El uso es lectura de notificaciones propias del titular, no scraping ni acceso no autorizado                        |

### 8.3. Comerciales

| Riesgo                                     | Prob. | Impacto  | Mitigación                                                                                    |
| ------------------------------------------ | ----- | -------- | --------------------------------------------------------------------------------------------- |
| Producto oficial de banco ocupa el espacio | Media | Alto     | Posicionamiento multi-billetera y API-first (fuera del alcance de productos de un solo banco) |
| Competencia gratuita                       | Media | Medio    | No competir en precio; competir en API, multi-wallet, soporte                                 |
| Adopción lenta                             | Media | Alto     | Plan Free agresivo, contenido SEO, programa de integradores                                   |
| Cambios regulatorios de interoperabilidad  | Media | Variable | Posicionar Yallegó como capa de orquestación independiente de la billetera específica         |

---

## 9. Métricas de éxito

### 9.1. Producto (primeros 6 meses)

| Métrica                                   | Objetivo     |
| ----------------------------------------- | ------------ |
| Tasa de captura exitosa de notificaciones | > 98%        |
| Latencia notificación → panel (P95)       | < 2 segundos |
| Uptime del backend                        | > 99.5%      |
| Webhook delivery exitoso (1er intento)    | > 95%        |
| Webhook delivery exitoso (con retries)    | > 99.5%      |

### 9.2. Negocio (primer año)

| Métrica                | Objetivo           |
| ---------------------- | ------------------ |
| Tenants Free activos   | 500+               |
| Tenants pagos          | 100+               |
| Conversión Free → Pago | > 15%              |
| MRR mes 12             | S/8,000 – S/15,000 |
| Churn mensual          | < 5%               |
| NPS                    | > 40               |

---

## 10. Roadmap general

### MVP (v0.1) — 8 sprints

- App Android de captura (Kotlin)
- Parsers: Yape, Plin BBVA, Plin Interbank, BIM
- Backend NestJS con API pública completa
- Panel administrativo multi-tenant
- Billing manual

### v0.2 (post-lanzamiento)

- Parsers restantes (Plin Scotiabank, BanBif, otras billeteras)
- Billing automatizado (pasarela de pago)
- SDK oficial publicado en npm
- Exportación contable avanzada

### v1.0

- Marketplace de integraciones
- Programa formal de partners
- Analítica avanzada y detección de anomalías
- Apps móviles nativas (si la tracción lo justifica)
