# 14 — Prueba gratuita, cuotas y prevención de abuso

> **Estado:** implementación en curso; ciclo de vida y cuotas atómicas del Sprint 9 completados localmente (ver checklist §8). Falta identidad Android/Play Integrity (Sprint 10), panel/Android (fuera de este backend) y lanzamiento gradual (Sprint 11).
> **Fecha de decisión:** 2026-09-11.
> **Alcance:** sustituir el plan Free permanente por una prueba gratuita limitada para nuevos tenants, sin afectar retroactivamente a los tenants existentes.

> **Control de activación:** los registros nuevos ya crean la suscripción en `TRIAL/PENDING_TRIAL` (`AuthService.register`); el consumo atómico, las ventanas por zona horaria y la concurrencia están implementados y verificados localmente (`test/entitlement-quota.e2e-spec.ts`). Los tenants existentes antes de este cambio no se tocan (sin backfill, docs/14 §11). Sigue pendiente el lanzamiento gradual con feature flag descrito en el Sprint 11 antes de considerar esto listo para producción.

---

## 1. Objetivo

Permitir que un negocio compruebe el valor de Yallegó con cobros reales, evitando que una misma persona o dispositivo obtenga pruebas sucesivas creando cuentas nuevas.

El diseño debe cumplir simultáneamente estas condiciones:

- La prueba empieza cuando el producto entrega valor, no durante el registro.
- Solo cuentan cobros válidos, únicos y correctamente interpretados.
- El límite no puede superarse mediante concurrencia, lotes o reintentos.
- Reinstalar la app o crear otro correo no reinicia la prueba.
- Un falso positivo puede resolverse mediante una excepción administrativa auditada.
- Al finalizar la prueba no se borra la cuenta ni su historial: el producto pasa a modo lectura y ofrece la suscripción.
- No se recopilan IMEI, MAC, número de serie ni otros identificadores de hardware persistentes.

---

## 2. Decisiones de producto

### 2.1. Oferta inicial

| Regla                           |                Valor inicial |
| ------------------------------- | ---------------------------: |
| Duración                        |           72 horas continuas |
| Inicio del reloj                |          Primer cobro válido |
| Límite total                    |                   100 cobros |
| Límite diario                   | 50 cobros por día del tenant |
| Billeteras                      |                            1 |
| Dispositivos activos            |                            1 |
| Usuarios                        |                1 propietario |
| API pública                     |                  No incluida |
| Webhooks                        |                 No incluidos |
| Tarjeta                         |                 No requerida |
| Retención visible tras terminar |                      30 días |

Los valores deben residir en configuración de plan y no estar codificados en controladores. Se revisarán después de contar al menos 30 trials iniciados.

### 2.2. Definición de cobro contabilizable

Una unidad de consumo es una `Transaction` nueva creada desde una notificación que:

1. pertenece a una billetera habilitada;
2. coincide con un parser activo;
3. no es duplicada por `(device_id, dedupe_hash)`;
4. se persiste correctamente.

No consumen cuota los heartbeats, llamadas de configuración, notificaciones `UNMATCHED`, reintentos, duplicados ni errores de parsing.

### 2.3. Inicio y finalización

- Al registrarse, el tenant queda en `PENDING_TRIAL`.
- Verificar el correo permite completar el onboarding, pero no inicia el reloj.
- La identidad del dispositivo se reclama atómicamente durante la primera vinculación.
- El primer cobro válido cambia la suscripción a `TRIALING`, fija `trial_started_at` y `trial_ends_at = started_at + 72h`.
- El trial termina por `TIME_LIMIT`, `TOTAL_LIMIT` o una decisión administrativa.
- El límite diario bloquea hasta el próximo día local, pero no finaliza por sí solo el trial.
- El upgrade confirmado cambia a `ACTIVE` inmediatamente y abre un período pagado nuevo.

### 2.4. Experiencia después del trial

El usuario conserva acceso autenticado a Inicio, Membresía y su historial en modo lectura. Se permiten heartbeat y lectura de configuración para que el Android pueda reanudar inmediatamente después de pagar.

Se bloquean:

- creación de códigos de vinculación;
- nuevas vinculaciones;
- procesamiento de nuevos cobros;
- altas de miembros, billeteras, API keys y webhooks.

El Android distingue un límite diario de una suscripción requerida. Para `SUBSCRIPTION_REQUIRED` pausa el envío, conserva una cola acotada durante 24 horas y muestra una acción para contratar. Al activarse el plan puede reenviar esa ventana reciente.

---

## 3. Separación de conceptos

- **Membership:** relación entre `User` y `Tenant`, con rol `OWNER`, `ADMIN`, `OPERATOR` o `VIEWER`.
- **Subscription:** estado comercial del tenant, plan, ciclo, pago, trial y fechas.
- **Entitlement:** decisión efectiva de si una operación está permitida ahora.
- **Usage:** consumo atómico por ventana temporal.
- **Trial claim:** evidencia pseudónima de que una identidad ya recibió una prueba.

En el panel, la sección actualmente llamada “Membresía” debe pasar a llamarse **Plan y facturación** para no confundirla con la pertenencia de usuarios al tenant.

---

## 4. Modelo de datos propuesto

### 4.1. Suscripción

Extender `SubscriptionStatus` con:

- `PENDING_TRIAL`
- `TRIALING`
- `ACTIVE`
- `PAST_DUE`
- `CANCELED`
- `EXPIRED`

Agregar a `subscriptions`:

- `trial_started_at timestamptz null`
- `trial_ends_at timestamptz null`
- `trial_ended_at timestamptz null`
- `trial_end_reason varchar(32) null`
- `paid_through timestamptz null`

La restricción de suscripción vigente debe considerar `PENDING_TRIAL`, `TRIALING`, `ACTIVE` y `PAST_DUE`, no únicamente `ACTIVE`.

Crear un plan interno `TRIAL`, no público, con los límites de la sección 2. El plan `FREE` actual se conserva temporalmente solo para migración de tenants existentes y después se renombra `LEGACY_FREE`.

### 4.2. Límites tipados

Extender `PlanLimits` con:

- `transactions_per_period`
- `transactions_per_day`
- `trial_duration_hours`

Durante la migración, la API puede exponer `transactions_per_month` como alias de compatibilidad para planes pagados. Una propiedad ausente o inválida debe provocar un error de configuración y denegar la operación; nunca debe interpretarse como ilimitada. `-1` continúa significando ilimitado únicamente cuando aparece explícitamente.

### 4.3. Contadores

Crear `usage_buckets`:

| Campo                        | Propósito                                 |
| ---------------------------- | ----------------------------------------- |
| `tenant_id`                  | Tenant dueño del consumo                  |
| `metric`                     | Inicialmente `TRANSACTIONS`               |
| `window_type`                | `SUBSCRIPTION_PERIOD` o `DAY`             |
| `window_start`, `window_end` | Ventana exacta                            |
| `used`                       | Consumo confirmado                        |
| `reserved`                   | Trabajos aceptados todavía no finalizados |
| `updated_at`                 | Diagnóstico y auditoría                   |

Restricción única: `(tenant_id, metric, window_type, window_start)`.

La reserva y el consumo se realizan en la misma transacción SQL que crea la transacción de cobro. Se bloquea la fila de la suscripción o se usa una actualización condicional `used + reserved < limit`; así dos lotes concurrentes no pueden exceder la cuota.

### 4.4. Identidad y reclamos

Agregar a `devices`, siempre como hash/HMAC y nunca en claro:

- `installation_id_hash`
- `android_id_hash`
- `public_key_thumbprint`
- `integrity_level`
- `integrity_checked_at`

Crear `trial_identity_claims`:

| Campo                        | Propósito                                                           |
| ---------------------------- | ------------------------------------------------------------------- |
| `kind`                       | `PLAY_RECALL`, `ANDROID_ID`, `INSTALLATION_KEY`, `PHONE` o `TAX_ID` |
| `value_hash`                 | HMAC versionado del identificador                                   |
| `tenant_id`                  | Tenant que recibió la prueba                                        |
| `status`                     | `CLAIMED`, `CONSUMED`, `DENIED` u `OVERRIDDEN`                      |
| `claimed_at`, `last_seen_at` | Trazabilidad                                                        |
| `expires_at`                 | Política de retención antifraude                                    |
| `metadata`                   | Solo señales técnicas no sensibles                                  |

Restricción única: `(kind, value_hash)`. Todos los reclamos fuertes se insertan dentro de la misma transacción de vinculación. Un conflicto con otro tenant devuelve `TRIAL_ALREADY_USED`; un conflicto con el mismo tenant permite revincular sin reiniciar fechas ni consumo.

---

## 5. Identidad Android y Play Integrity

La aplicación enviará durante la vinculación:

- GUID aleatorio por instalación;
- clave pública creada en Android Keystore;
- `ANDROID_ID` convertido localmente en material para HMAC del servidor;
- token de Play Integrity ligado al código de vinculación, clave pública y cuerpo mediante `requestHash`.

El backend valida el token con Google y comprueba paquete, firma, versión, licencia, integridad del dispositivo, frescura y coincidencia de `requestHash`. El token no puede reutilizarse.

Cuando Google habilite **Device Recall**, se reserva un bit para “trial reclamado”. Es la señal preferida porque puede recuperarse después de reinstalar o restablecer el dispositivo sin revelar un identificador global. Mientras siga en beta, se usa defensa en profundidad con las demás señales y revisión administrativa.

No se utilizarán IMEI, IMSI, MAC, serial de SIM, número de serie ni Advertising ID.

---

## 6. Servicios y contrato HTTP

Crear un `EntitlementService` como única autoridad para:

- resolver estado efectivo;
- validar fecha de trial y pago;
- reservar/liberar/consumir cuota total y diaria;
- decidir capacidades por plan;
- devolver errores uniformes.

Errores nuevos:

| HTTP | Código                      | Uso                                                      |
| ---: | --------------------------- | -------------------------------------------------------- |
|  403 | `TRIAL_ALREADY_USED`        | Otra cuenta ya reclamó el trial con una identidad fuerte |
|  402 | `SUBSCRIPTION_REQUIRED`     | Trial terminado o plan pagado vencido                    |
|  422 | `DAILY_LIMIT_EXCEEDED`      | Cuota diaria agotada, con `resets_at`                    |
|  422 | `PLAN_LIMIT_EXCEEDED`       | Cuota total o del período agotada                        |
|  403 | `DEVICE_INTEGRITY_REQUIRED` | La vinculación no pudo demostrar integridad suficiente   |

Cambios de respuesta:

- `GET /v1/subscription` incluye `access_state`, datos del trial, límites total/diario y ambos consumos.
- `GET /internal/v1/mobile-overview` incluye el mismo estado resumido y la acción recomendada.
- `POST /internal/v1/devices/pair` acepta identidad, clave pública e integrity token.
- El administrador de plataforma obtiene endpoints para aprobar una excepción, consultar señales y revocar una concesión, siempre con auditoría.

No se exponen hashes, verdicts completos ni razones antifraude detalladas a clientes.

---

## 7. Cambios por componente

### Backend

1. Migraciones y tipos Prisma.
2. Validador estricto del JSON de límites al arrancar.
3. `EntitlementService` y consumo atómico.
4. Estados y scheduler de expiración; una suscripción no se renueva sin pago confirmado.
5. Verificación server-to-server de Play Integrity.
6. Reclamo antifraude durante pairing.
7. Nuevos códigos de error, auditoría, métricas y correos.
8. Migración de los chequeos existentes desde `PlanLimitsService`.

### Android

1. GUID de instalación y par de claves en Keystore.
2. Obtención segura de `ANDROID_ID` sin permisos adicionales.
3. Integración de Play Integrity Standard.
4. Firma de la solicitud de pairing y `requestHash`.
5. Estados `trial`, límite diario y suscripción requerida.
6. Cola acotada de 24 horas después de expiración y reanudación tras upgrade.

### Panel

1. Registro comunica “3 días o 100 cobros”, no “plan Free”.
2. Tarjeta de trial con horas restantes y consumos total/diario.
3. Avisos a 80% y 100%, y 24 horas antes del vencimiento.
4. Modo lectura después de expirar con CTA a planes.
5. Pantalla explicativa para trial ya utilizado y enlace de revisión.
6. Renombrar “Membresía” a “Plan y facturación”.

### Operación y privacidad

1. Declarar “Device or other IDs” y finalidad de seguridad en Play Console.
2. Actualizar política de privacidad y términos, sujetos a revisión legal.
3. Guardar el pepper HMAC como secreto versionado y permitir rotación.
4. Panel administrativo para excepciones y soporte.
5. Alertas por aumento de denegaciones, fallos de Integrity y drift de contadores.

---

## 8. Plan de ejecución

### Sprint 9 — Ciclo de vida y cuotas exactas (2 semanas)

**Objetivo:** un nuevo tenant recorre un trial de 72 horas/100 cobros y no puede excederlo por concurrencia.

- [ ] Congelar los contratos actuales con pruebas de caracterización — no se hizo como paso separado; en su lugar se verificó contra la suite e2e existente completa antes y después del cambio (ver más abajo).
- [x] Crear migraciones aditivas para estados, fechas y `usage_buckets`.
- [x] Crear y sembrar el plan interno `TRIAL`.
- [x] Implementar validación estricta y fail-closed de límites.
- [x] Implementar la base de `EntitlementService` para resolver estados y acceso efectivo.
- [x] Mover creación de transacción y consumo a una transacción atómica _(Claude)_ — `IngestNotificationsUseCase` reserva (`EntitlementService.reserveQuota`) dentro de la misma transacción que el `INSERT` de `raw_notifications`; `ParseNotificationUseCase` confirma (`commitQuota`) dentro de la misma transacción que crea la `Transaction`, o libera (`releaseQuota`) si queda `UNMATCHED`. Verificado con concurrencia real: 80 transacciones SQL simultáneas reservando contra el límite diario (50) de un tenant TRIAL real — exactamente 50 se reservan, el resto queda `DAILY_LIMIT_EXCEEDED` (`test/entitlement-quota.e2e-spec.ts`); depende del bloqueo de fila de Postgres sobre `usage_buckets`, no de lógica de aplicación.
- [x] Implementar ventanas diaria y total usando la zona horaria del tenant _(Claude)_ — `EntitlementService.resolveDayWindow` calcula la medianoche local sin dependencia nueva (mismo criterio que TOTP: sin librería externa); corregido un error real de cálculo que aparecía en el día de un cambio de horario de verano (el desplazamiento horario cambia dentro del mismo día) y otro que dejaba milisegundos residuales en el límite de ventana — este segundo rompía silenciosamente la contención de fila entre reservas concurrentes, detectado por la propia prueba de concurrencia. La ventana total usa `subscription.createdAt` como ancla fija; su fin es solo informativo, el corte real lo impone `trial_ends_at`/`trial_ended_at`.
- [x] Iniciar el trial con el primer cobro válido _(Claude)_ — `EntitlementService.commitQuota` transiciona `PENDING_TRIAL` → `TRIALING` con `trial_started_at`/`trial_ends_at` dentro de la misma transacción que confirma el primer cobro.
- [x] Expirar por tiempo o límite total sin renovación automática _(Claude)_ — `trial_ended_at` es la única fuente de verdad que usa `evaluate()`: `commitQuota` lo fija con `TOTAL_LIMIT` al agotar el total, y el nuevo `TrialExpirationScheduler` (cada 15 min) lo fija con `TIME_LIMIT` una vez pasado `trial_ends_at` — aunque `evaluate()` ya bloquea por tiempo sin depender del scheduler, que solo persiste el motivo y dispara el aviso una vez.
- [x] Implementar respuestas de API, correos y métricas _(Claude)_ — `DAILY_LIMIT_EXCEEDED`/`PLAN_LIMIT_EXCEEDED` por ítem en la respuesta de ingesta (`rejected[]`, ya contemplado en el contrato); `MailerService.sendTrialEndedEmail`; métricas `yallego_trial_started_total` y `yallego_trial_expired_total{reason}`.
- [ ] Actualizar panel y Android con estados de trial, sin Play Integrity todavía — fuera de alcance de este cambio (backend).

**Hallazgo no previsto:** habilitar el trial expuso que varios puntos del código (`WalletsService`, `DevicesService`, `PlanChangeApplicationService`, `ApiKeyVerifier`, vistas de administración de plataforma, `DeviceGatewayService`) resolvían "la suscripción vigente" del tenant con `status: 'ACTIVE'` codificado a mano en vez de reutilizar `PlanLimitsService.getActiveSubscription` — coherente con el §4.1 de este documento, pero no implementado hasta ahora. Con el registro entregando `PENDING_TRIAL` en vez de `ACTIVE`, esto bloqueaba con 503/429 acciones básicas de onboarding (activar billetera, vincular dispositivo, usar una API key) para todo tenant nuevo. Se centralizó en `CURRENT_SUBSCRIPTION_STATUSES` (`plan-limits.service.ts`) y se corrigieron los ocho puntos; `PlanChangeApplicationService.applyConfirmedChange` también fue ajustado para que un upgrade confirmado desde el trial fije `status: ACTIVE` y un período de facturación real, no solo el `planId`.

**Criterio de salida:** con 20 procesos concurrentes, se crean exactamente 100 cobros; el número 101 queda bloqueado. Al avanzar el reloj 72 horas, el sistema pasa a lectura y un upgrade confirmado restaura la captura. _(Claude — verificado el mecanismo de concurrencia contra el límite diario real con Postgres; el escenario completo de 100/72h de punta a punta, incluyendo el paso de tiempo real, queda para verificación manual o e2e adicional.)_

### Sprint 10 — Identidad Android y prevención de repetición (2 semanas)

**Objetivo:** una misma identidad Android no obtiene un trial nuevo usando otro correo o reinstalando la app.

- [ ] Implementar GUID, Keystore y firma en Android.
- [ ] Integrar Play Integrity Standard con `requestHash`.
- [ ] Implementar HMAC versionado de identificadores secundarios.
- [ ] Crear `trial_identity_claims` y reclamar señales atómicamente.
- [ ] Permitir revinculación al mismo tenant sin reiniciar el trial.
- [ ] Bloquear un tenant diferente con `TRIAL_ALREADY_USED`.
- [ ] Crear excepción administrativa auditada.
- [ ] Solicitar acceso e integrar Device Recall detrás de feature flag.
- [ ] Actualizar Data Safety y borradores legales.
- [ ] Ejecutar pruebas en al menos tres fabricantes y escenarios de reinstalación.

**Criterio de salida:** cuenta A consume el trial; cuenta B en el mismo equipo no obtiene otro. Cuenta A puede reinstalar y recuperar su relación sin recibir cuota nueva. Un cliente pagado nunca queda bloqueado por un reclamo histórico de trial.

### Sprint 11 — Lanzamiento gradual y optimización (1 semana)

- [ ] Desplegar primero con feature flag y modo observación.
- [ ] Mantener tenants actuales en `LEGACY_FREE`.
- [ ] Habilitar el trial para empleados y tenants de prueba.
- [ ] Habilitar al 10%, 50% y 100% de registros nuevos.
- [ ] Revisar falsos positivos, errores y conversión en cada etapa.
- [ ] Retirar compatibilidad `transactions_per_month` cuando todos los consumidores usen el contrato nuevo.

**Criterio de salida:** siete días al 100% sin sobreconsumo, drift, pérdida de colas ni falsos positivos críticos.

---

## 9. Matriz mínima de pruebas

### Ciclo de vida

- Registro y verificación no consumen tiempo de trial.
- El primer cobro válido inicia exactamente una vez el reloj.
- Vencimiento por tiempo y por total.
- Reinicio del límite diario en `America/Lima` y en otra zona configurada.
- Upgrade inmediato desde cada estado.
- Suscripción pagada no se renueva sin cobertura de pago.

### Cuotas e idempotencia

- Duplicados y `UNMATCHED` no cuentan.
- Fallo después de reservar libera la reserva.
- Reintento después de commit no vuelve a contar.
- Lotes simultáneos no pasan de 50 diarios ni 100 totales.
- Contador visible coincide con las transacciones persistidas.

### Antifraude

- Mismo correo y mismo dispositivo.
- Correo distinto en el mismo dispositivo.
- Reinstalación y limpieza de datos.
- Cambio de dispositivo dentro del mismo tenant.
- Token de Integrity vencido, reutilizado, alterado o de otra app.
- Emulador/root según la política de riesgo elegida.
- Excepción administrativa y auditoría completa.

### Experiencia

- Avisos 80/100 y 24 horas.
- Panel legible después de expirar.
- Android no reintenta indefinidamente un error terminal.
- Cola reciente se reanuda tras upgrade.
- Ningún mensaje revela reglas antifraude explotables.

---

## 10. Métricas de decisión

- `trial_registered_total`
- `trial_device_claimed_total`
- `trial_started_total`
- `trial_first_transaction_seconds`
- `trial_transactions_used`
- `trial_expired_total{reason}`
- `trial_conversion_total`
- `trial_conversion_seconds`
- `trial_reuse_denied_total{signal}`
- `trial_override_total`
- `integrity_verdict_total{level}`
- `usage_reservation_drift`

Revisar a los 30, 100 y 300 trials iniciados. Si menos del 20% alcanza 20 cobros, revisar onboarding antes de aumentar la cuota. Si muchos negocios alcanzan 100 en menos de un día pero convierten, el límite está cumpliendo su función. Si abandonan antes de comprobar valor, probar 150–200 mediante configuración, no con una migración.

---

## 11. Despliegue y reversión

1. Migraciones aditivas compatibles con la versión anterior.
2. Backend en modo `observe_only`: calcula decisiones pero no bloquea.
3. Android compatible con contrato antiguo y nuevo.
4. Panel compatible con `FREE` y `TRIAL`.
5. Activación solo para nuevos tenants mediante feature flag.
6. Rollback desactiva el flag; no elimina reclamos ni contadores.
7. Eliminación de columnas o compatibilidad únicamente en una versión posterior.

Los tenants creados antes del corte no se convierten retroactivamente en trial. Una migración administrativa explícita decidirá entre `LEGACY_FREE`, cortesía o plan pagado.

---

## 12. Fuera de alcance inicial

- Cobro automático con tarjeta.
- Detección biométrica o verificación de identidad personal.
- Bloqueo por IP como criterio único.
- Fingerprinting oculto del navegador.
- Uso de identificadores de hardware no restablecibles.
- Decisiones totalmente automáticas ante señales ambiguas.

---

## 13. Referencias oficiales de Android

- [Prácticas recomendadas para identificadores únicos](https://developer.android.com/identity/user-data-ids?hl=es-419)
- [Play Integrity API](https://developer.android.com/google/play/integrity/overview)
- [Solicitudes estándar y protección contra replay](https://developer.android.com/google/play/integrity/standard)
- [Device Recall para abuso repetido](https://developer.android.com/google/play/integrity/device-recall)
- [Política de datos de usuario de Google Play](https://support.google.com/googleplay/android-developer/answer/10144311?hl=es-419)
