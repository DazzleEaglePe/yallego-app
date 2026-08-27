# 02 — Requerimientos Funcionales

> **Convención de IDs:** `RF-[MÓDULO]-[NNN]`
> **Prioridad:** `MUST` (MVP obligatorio) · `SHOULD` (MVP deseable) · `COULD` (v0.2+)

---

## Índice de módulos

| Código | Módulo                                  |
| ------ | --------------------------------------- |
| `AUTH` | Autenticación y cuentas                 |
| `TEN`  | Tenants (negocios)                      |
| `USR`  | Usuarios, roles y membresías            |
| `DEV`  | Dispositivos de captura                 |
| `WAL`  | Billeteras y parsers                    |
| `CAP`  | Captura de notificaciones (app Android) |
| `TXN`  | Transacciones                           |
| `API`  | API pública                             |
| `WHK`  | Webhooks                                |
| `SUB`  | Membresías y facturación                |
| `AUD`  | Auditoría                               |
| `ADM`  | Administración de plataforma            |

---

## 1. AUTH — Autenticación y cuentas

| ID          | Requerimiento                                                                                             | Prioridad |
| ----------- | --------------------------------------------------------------------------------------------------------- | --------- |
| RF-AUTH-001 | El sistema permite registrar una cuenta con email y contraseña.                                           | MUST      |
| RF-AUTH-002 | El sistema valida el email mediante enlace de confirmación antes de habilitar funcionalidad completa.     | MUST      |
| RF-AUTH-003 | El sistema permite iniciar sesión con email y contraseña, devolviendo un access token y un refresh token. | MUST      |
| RF-AUTH-004 | El sistema rota el refresh token en cada renovación e invalida el anterior.                               | MUST      |
| RF-AUTH-005 | El sistema permite cerrar sesión, invalidando el refresh token activo.                                    | MUST      |
| RF-AUTH-006 | El sistema permite recuperar contraseña mediante enlace enviado por email, con expiración de 60 minutos.  | MUST      |
| RF-AUTH-007 | El sistema bloquea temporalmente la cuenta tras 5 intentos fallidos consecutivos en 15 minutos.           | MUST      |
| RF-AUTH-008 | El sistema permite cambiar la contraseña desde la sesión activa, requiriendo la contraseña actual.        | MUST      |
| RF-AUTH-009 | El sistema soporta autenticación en dos pasos (TOTP).                                                     | COULD     |
| RF-AUTH-010 | El sistema soporta inicio de sesión con proveedor externo (Google).                                       | COULD     |

---

## 2. TEN — Tenants (negocios)

| ID         | Requerimiento                                                                                         | Prioridad |
| ---------- | ----------------------------------------------------------------------------------------------------- | --------- |
| RF-TEN-001 | Al registrarse, el usuario crea un tenant con nombre comercial obligatorio.                           | MUST      |
| RF-TEN-002 | El tenant recibe automáticamente el plan Free al crearse.                                             | MUST      |
| RF-TEN-003 | El usuario creador del tenant recibe el rol `OWNER`.                                                  | MUST      |
| RF-TEN-004 | El sistema permite editar datos del tenant: nombre comercial, razón social, RUC, rubro, zona horaria. | MUST      |
| RF-TEN-005 | Un usuario puede pertenecer a múltiples tenants y alternar entre ellos sin cerrar sesión.             | MUST      |
| RF-TEN-006 | El sistema aísla completamente los datos entre tenants a nivel de aplicación y de base de datos.      | MUST      |
| RF-TEN-007 | El `OWNER` puede solicitar la eliminación del tenant, con período de gracia de 30 días.               | SHOULD    |
| RF-TEN-008 | El sistema permite exportar todos los datos del tenant en formato estructurado.                       | SHOULD    |

---

## 3. USR — Usuarios, roles y membresías

### 3.1. Matriz de roles

| Permiso                  | OWNER | ADMIN | OPERATOR | VIEWER |
| ------------------------ | ----- | ----- | -------- | ------ |
| Ver transacciones        | ✅    | ✅    | ✅       | ✅     |
| Confirmar transacciones  | ✅    | ✅    | ✅       | ❌     |
| Exportar transacciones   | ✅    | ✅    | ✅       | ✅     |
| Gestionar dispositivos   | ✅    | ✅    | ❌       | ❌     |
| Gestionar billeteras     | ✅    | ✅    | ❌       | ❌     |
| Invitar/remover usuarios | ✅    | ✅    | ❌       | ❌     |
| Asignar roles            | ✅    | ❌    | ❌       | ❌     |
| Gestionar API keys       | ✅    | ✅    | ❌       | ❌     |
| Gestionar webhooks       | ✅    | ✅    | ❌       | ❌     |
| Ver auditoría            | ✅    | ✅    | ❌       | ❌     |
| Gestionar suscripción    | ✅    | ❌    | ❌       | ❌     |
| Editar datos del tenant  | ✅    | ✅    | ❌       | ❌     |
| Eliminar tenant          | ✅    | ❌    | ❌       | ❌     |

### 3.2. Requerimientos

| ID         | Requerimiento                                                                                 | Prioridad |
| ---------- | --------------------------------------------------------------------------------------------- | --------- |
| RF-USR-001 | El sistema permite invitar usuarios al tenant mediante email.                                 | MUST      |
| RF-USR-002 | La invitación expira a los 7 días si no es aceptada.                                          | MUST      |
| RF-USR-003 | Al aceptar la invitación, se crea la membresía con el rol asignado.                           | MUST      |
| RF-USR-004 | El `OWNER` puede cambiar el rol de cualquier miembro excepto el suyo propio.                  | MUST      |
| RF-USR-005 | El sistema impide que un tenant quede sin `OWNER`.                                            | MUST      |
| RF-USR-006 | El sistema permite remover miembros del tenant.                                               | MUST      |
| RF-USR-007 | El sistema valida el límite de usuarios según el plan activo antes de aceptar una invitación. | MUST      |
| RF-USR-008 | El sistema permite transferir la propiedad del tenant a otro miembro.                         | SHOULD    |
| RF-USR-009 | El sistema lista los miembros del tenant con su rol, estado y fecha de ingreso.               | MUST      |

---

## 4. DEV — Dispositivos de captura

| ID         | Requerimiento                                                                                             | Prioridad |
| ---------- | --------------------------------------------------------------------------------------------------------- | --------- |
| RF-DEV-001 | El sistema permite registrar un dispositivo Android generando un código de vinculación de un solo uso.    | MUST      |
| RF-DEV-002 | El código de vinculación expira a los 10 minutos.                                                         | MUST      |
| RF-DEV-003 | La app Android se vincula ingresando el código o escaneando un QR mostrado en el panel.                   | MUST      |
| RF-DEV-004 | Al vincularse, el dispositivo recibe un token permanente de autenticación.                                | MUST      |
| RF-DEV-005 | El sistema registra metadatos del dispositivo: fabricante, modelo, versión de Android, versión de la app. | MUST      |
| RF-DEV-006 | El dispositivo envía una señal de vida (heartbeat) cada 5 minutos.                                        | MUST      |
| RF-DEV-007 | El sistema marca un dispositivo como caído si no recibe heartbeat por más de 15 minutos.                  | MUST      |
| RF-DEV-008 | El sistema notifica al tenant cuando un dispositivo cae y cuando se restablece.                           | MUST      |
| RF-DEV-009 | El sistema permite pausar un dispositivo sin desvincularlo.                                               | SHOULD    |
| RF-DEV-010 | El sistema permite revocar un dispositivo, invalidando su token permanentemente.                          | MUST      |
| RF-DEV-011 | El sistema valida el límite de dispositivos según el plan antes de permitir una nueva vinculación.        | MUST      |
| RF-DEV-012 | El panel muestra el estado de cada dispositivo: activo, caído, pausado, revocado.                         | MUST      |

---

## 5. WAL — Billeteras y parsers

| ID         | Requerimiento                                                                                       | Prioridad |
| ---------- | --------------------------------------------------------------------------------------------------- | --------- |
| RF-WAL-001 | El sistema mantiene un catálogo global de billeteras soportadas con su package name de Android.     | MUST      |
| RF-WAL-002 | El tenant activa las billeteras que utiliza; solo se procesan notificaciones de billeteras activas. | MUST      |
| RF-WAL-003 | El sistema valida el límite de billeteras activas según el plan.                                    | MUST      |
| RF-WAL-004 | Cada billetera tiene una o más versiones de parser, con exactamente una activa.                     | MUST      |
| RF-WAL-005 | Los patrones de parsing se almacenan en base de datos, no en el código compilado.                   | MUST      |
| RF-WAL-006 | El sistema permite activar una versión de parser distinta sin necesidad de redespliegue.            | MUST      |
| RF-WAL-007 | El sistema soporta al menos: Yape, Plin (BBVA, Interbank), BIM en el MVP.                           | MUST      |
| RF-WAL-008 | El sistema permite agregar nuevas billeteras sin modificar código del núcleo.                       | MUST      |
| RF-WAL-009 | El sistema registra la tasa de éxito de parsing por billetera.                                      | SHOULD    |
| RF-WAL-010 | El sistema permite reprocesar notificaciones históricas con una versión de parser distinta.         | SHOULD    |

---

## 6. CAP — Captura de notificaciones (app Android)

| ID         | Requerimiento                                                                                                   | Prioridad |
| ---------- | --------------------------------------------------------------------------------------------------------------- | --------- |
| RF-CAP-001 | La app solicita el permiso de acceso a notificaciones mediante un asistente guiado.                             | MUST      |
| RF-CAP-002 | La app solicita exclusión de la optimización de batería.                                                        | MUST      |
| RF-CAP-003 | La app detecta el fabricante del dispositivo y muestra instrucciones específicas de configuración.              | MUST      |
| RF-CAP-004 | La app ejecuta un servicio en primer plano con notificación persistente para evitar terminación por el sistema. | MUST      |
| RF-CAP-005 | La app captura únicamente notificaciones cuyo package coincida con billeteras del catálogo.                     | MUST      |
| RF-CAP-006 | La app **no realiza parsing**; envía la notificación cruda al backend.                                          | MUST      |
| RF-CAP-007 | La app almacena las notificaciones en cola local persistente antes de enviarlas.                                | MUST      |
| RF-CAP-008 | La app reintenta el envío con backoff exponencial ante fallos de red.                                           | MUST      |
| RF-CAP-009 | La cola local sobrevive a reinicios del dispositivo.                                                            | MUST      |
| RF-CAP-010 | La app elimina de la cola local únicamente tras confirmación de recepción del backend.                          | MUST      |
| RF-CAP-011 | La app envía heartbeat periódico al backend.                                                                    | MUST      |
| RF-CAP-012 | La app muestra su estado operativo: permisos, conectividad, elementos en cola, último envío.                    | MUST      |
| RF-CAP-013 | La app se reinicia automáticamente tras el arranque del dispositivo.                                            | MUST      |
| RF-CAP-014 | La app alerta al usuario si detecta que perdió el permiso de notificaciones.                                    | MUST      |
| RF-CAP-015 | La app permite ver un historial local de las últimas notificaciones capturadas.                                 | SHOULD    |
| RF-CAP-016 | La app se actualiza automáticamente del catálogo de packages a monitorear.                                      | SHOULD    |

---

## 7. TXN — Transacciones

| ID         | Requerimiento                                                                                                         | Prioridad |
| ---------- | --------------------------------------------------------------------------------------------------------------------- | --------- |
| RF-TXN-001 | El backend recibe notificaciones crudas y las almacena íntegramente antes de procesarlas.                             | MUST      |
| RF-TXN-002 | El backend identifica el parser correspondiente según package name y billeteras activas del tenant.                   | MUST      |
| RF-TXN-003 | El backend extrae de la notificación: nombre del emisor, monto, moneda, código de seguridad y/o código de aprobación. | MUST      |
| RF-TXN-004 | Si ningún parser coincide, la notificación se marca como no reconocida y queda disponible para revisión.              | MUST      |
| RF-TXN-005 | El sistema previene duplicados mediante hash de contenido + dispositivo + ventana temporal.                           | MUST      |
| RF-TXN-006 | El sistema registra la marca temporal original de la notificación y la de recepción en el servidor.                   | MUST      |
| RF-TXN-007 | El panel muestra las transacciones en tiempo real sin necesidad de recargar.                                          | MUST      |
| RF-TXN-008 | El sistema permite filtrar transacciones por rango de fechas, billetera, monto y dispositivo.                         | MUST      |
| RF-TXN-009 | El sistema permite buscar transacciones por nombre del emisor.                                                        | MUST      |
| RF-TXN-010 | El sistema permite marcar una transacción como confirmada, registrando qué usuario la confirmó y cuándo.              | MUST      |
| RF-TXN-011 | El sistema permite marcar una transacción como disputada.                                                             | SHOULD    |
| RF-TXN-012 | El sistema permite exportar transacciones filtradas a CSV.                                                            | MUST      |
| RF-TXN-013 | El sistema muestra el código de seguridad de forma destacada para permitir validación manual.                         | MUST      |
| RF-TXN-014 | El sistema calcula y muestra totales agregados por período: monto total, cantidad, promedio.                          | SHOULD    |
| RF-TXN-015 | El sistema aplica la política de retención según el plan del tenant.                                                  | MUST      |
| RF-TXN-016 | El sistema valida el límite mensual de transacciones del plan y notifica al aproximarse al 80% y 100%.                | MUST      |

---

## 8. API — API pública

| ID         | Requerimiento                                                                              | Prioridad |
| ---------- | ------------------------------------------------------------------------------------------ | --------- |
| RF-API-001 | El sistema permite generar API keys con nombre descriptivo y alcances específicos.         | MUST      |
| RF-API-002 | La API key completa se muestra una única vez al crearse; después solo el prefijo.          | MUST      |
| RF-API-003 | El sistema permite revocar una API key en cualquier momento.                               | MUST      |
| RF-API-004 | El sistema registra la fecha de último uso de cada API key.                                | MUST      |
| RF-API-005 | La API REST expone consulta de transacciones con paginación por cursor.                    | MUST      |
| RF-API-006 | La API REST expone detalle de una transacción individual.                                  | MUST      |
| RF-API-007 | La API REST expone gestión completa de webhooks.                                           | MUST      |
| RF-API-008 | La API REST expone estado de dispositivos.                                                 | MUST      |
| RF-API-009 | La API está versionada mediante prefijo de ruta.                                           | MUST      |
| RF-API-010 | El sistema aplica rate limiting por API key según el plan.                                 | MUST      |
| RF-API-011 | Las respuestas incluyen cabeceras de rate limit: límite, restante, reinicio.               | MUST      |
| RF-API-012 | El WebSocket permite suscripción autenticada a eventos del tenant en tiempo real.          | MUST      |
| RF-API-013 | El acceso al WebSocket público está restringido a planes Comercio y Cadena.                | MUST      |
| RF-API-014 | La API devuelve errores en formato estructurado consistente con código, mensaje y detalle. | MUST      |
| RF-API-015 | El sistema publica documentación pública de la API.                                        | MUST      |
| RF-API-016 | El sistema expone especificación OpenAPI descargable.                                      | SHOULD    |

---

## 9. WHK — Webhooks

| ID         | Requerimiento                                                                                                | Prioridad |
| ---------- | ------------------------------------------------------------------------------------------------------------ | --------- |
| RF-WHK-001 | El tenant puede registrar endpoints HTTPS para recibir eventos.                                              | MUST      |
| RF-WHK-002 | El tenant selecciona qué tipos de evento desea recibir en cada endpoint.                                     | MUST      |
| RF-WHK-003 | Cada endpoint tiene un secreto único generado por el sistema.                                                | MUST      |
| RF-WHK-004 | Cada envío incluye firma HMAC-SHA256 del cuerpo en una cabecera.                                             | MUST      |
| RF-WHK-005 | Cada evento incluye un identificador único que sirve como clave de idempotencia.                             | MUST      |
| RF-WHK-006 | El sistema reintenta envíos fallidos con backoff exponencial hasta 8 intentos en 24 horas.                   | MUST      |
| RF-WHK-007 | El sistema considera exitoso un envío que responda con código 2xx dentro del timeout configurado.            | MUST      |
| RF-WHK-008 | El sistema registra cada intento: código de respuesta, cuerpo, error, marca temporal.                        | MUST      |
| RF-WHK-009 | El panel muestra el historial de envíos con su estado.                                                       | MUST      |
| RF-WHK-010 | El tenant puede reintentar manualmente un envío fallido.                                                     | MUST      |
| RF-WHK-011 | El sistema deshabilita automáticamente un endpoint tras fallos consecutivos sostenidos y notifica al tenant. | SHOULD    |
| RF-WHK-012 | El tenant puede enviar un evento de prueba a un endpoint.                                                    | SHOULD    |
| RF-WHK-013 | Los payloads de evento están versionados.                                                                    | MUST      |
| RF-WHK-014 | El sistema valida el límite de webhooks según el plan.                                                       | MUST      |

### 9.1. Catálogo de eventos

| Evento                   | Descripción                                        |
| ------------------------ | -------------------------------------------------- |
| `transaction.created`    | Nueva transacción capturada y parseada             |
| `transaction.confirmed`  | Transacción marcada como confirmada por un usuario |
| `transaction.disputed`   | Transacción marcada como disputada                 |
| `device.offline`         | Dispositivo dejó de reportar                       |
| `device.online`          | Dispositivo restableció comunicación               |
| `notification.unmatched` | Notificación recibida que ningún parser reconoció  |

---

## 10. SUB — Membresías y facturación

| ID         | Requerimiento                                                                                                  | Prioridad |
| ---------- | -------------------------------------------------------------------------------------------------------------- | --------- |
| RF-SUB-001 | El sistema mantiene un catálogo de planes con precios y límites.                                               | MUST      |
| RF-SUB-002 | Cada tenant tiene exactamente una suscripción activa.                                                          | MUST      |
| RF-SUB-003 | El sistema soporta ciclos de facturación mensual, semestral y anual.                                           | MUST      |
| RF-SUB-004 | El panel muestra el plan actual, el consumo del período y los límites.                                         | MUST      |
| RF-SUB-005 | El sistema impide exceder los límites del plan, devolviendo un error explicativo.                              | MUST      |
| RF-SUB-006 | El sistema notifica al tenant al alcanzar 80% y 100% de cualquier límite.                                      | MUST      |
| RF-SUB-007 | El `OWNER` puede solicitar un cambio de plan desde el panel.                                                   | MUST      |
| RF-SUB-008 | Al mejorar de plan, los nuevos límites aplican inmediatamente.                                                 | MUST      |
| RF-SUB-009 | Al reducir de plan, el cambio aplica al final del período vigente.                                             | MUST      |
| RF-SUB-010 | El sistema registra el historial de cambios de plan.                                                           | MUST      |
| RF-SUB-011 | El sistema acumula contadores de uso por período de facturación.                                               | MUST      |
| RF-SUB-012 | El registro de pago se gestiona manualmente en el MVP mediante confirmación de un administrador de plataforma. | MUST      |
| RF-SUB-013 | El sistema integra una pasarela de pago para cobro automático.                                                 | COULD     |
| RF-SUB-014 | El sistema genera comprobantes electrónicos.                                                                   | COULD     |

---

## 11. AUD — Auditoría

| ID         | Requerimiento                                                                                                                                                                                                 | Prioridad |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| RF-AUD-001 | El sistema registra toda acción sensible con actor, recurso, marca temporal, IP y agente.                                                                                                                     | MUST      |
| RF-AUD-002 | Las acciones auditables incluyen: cambios de rol, invitaciones, creación/revocación de API keys, cambios en webhooks, vinculación/revocación de dispositivos, cambios de plan, confirmación de transacciones. | MUST      |
| RF-AUD-003 | El registro de auditoría es inmutable: no se permite edición ni eliminación.                                                                                                                                  | MUST      |
| RF-AUD-004 | El panel permite consultar la auditoría filtrando por actor, acción y rango de fechas.                                                                                                                        | MUST      |
| RF-AUD-005 | El sistema permite exportar el registro de auditoría.                                                                                                                                                         | SHOULD    |

---

## 12. ADM — Administración de plataforma

> Módulo interno, accesible solo por personal de Yallegó. No visible para tenants.

| ID         | Requerimiento                                                                                                                      | Prioridad |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------- |
| RF-ADM-001 | El sistema provee un área administrativa separada con autenticación independiente.                                                 | MUST      |
| RF-ADM-002 | El administrador puede listar y buscar todos los tenants de la plataforma.                                                         | MUST      |
| RF-ADM-003 | El administrador puede activar o suspender un tenant.                                                                              | MUST      |
| RF-ADM-004 | El administrador puede confirmar pagos manuales y actualizar la suscripción de un tenant.                                          | MUST      |
| RF-ADM-005 | El administrador puede gestionar el catálogo de billeteras.                                                                        | MUST      |
| RF-ADM-006 | El administrador puede crear, probar y activar versiones de parsers.                                                               | MUST      |
| RF-ADM-007 | El administrador puede consultar notificaciones no reconocidas de toda la plataforma para mejorar parsers.                         | MUST      |
| RF-ADM-008 | El administrador puede reprocesar notificaciones históricas con un parser actualizado.                                             | SHOULD    |
| RF-ADM-009 | El administrador puede consultar métricas globales: tenants activos, volumen de transacciones, tasa de parsing, salud de webhooks. | MUST      |
| RF-ADM-010 | El administrador puede otorgar planes de cortesía a tenants específicos.                                                           | SHOULD    |
| RF-ADM-011 | Toda acción administrativa queda registrada en auditoría.                                                                          | MUST      |

---

## 13. Trazabilidad: requerimientos por sprint

| Sprint | Módulos principales                                  |
| ------ | ---------------------------------------------------- |
| 1      | Fundación: monorepo, BD, `AUTH`, `TEN`               |
| 2      | `USR`, `ADM` (base)                                  |
| 3      | `DEV`, `CAP` (app Android base)                      |
| 4      | `WAL`, `TXN` (ingesta y parsing)                     |
| 5      | `TXN` (panel y tiempo real)                          |
| 6      | `API`, `WHK`                                         |
| 7      | `SUB`, `AUD`                                         |
| 8      | Hardening, observabilidad, documentación, despliegue |
