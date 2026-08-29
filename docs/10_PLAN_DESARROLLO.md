# 10 — Plan de Desarrollo

> **Duración del sprint:** 2 semanas
> **Sprints hasta MVP:** 8 (16 semanas)
> **Metodología:** iterativa con entregable funcional al cierre de cada sprint

---

## 1. Visión general

| Sprint | Objetivo                                    | Entregable verificable                                                    |
| ------ | ------------------------------------------- | ------------------------------------------------------------------------- |
| **1**  | Fundación técnica y autenticación           | Un usuario puede registrarse, verificar su correo e ingresar al panel     |
| **2**  | Multi-tenancy, roles y equipo               | Un dueño puede invitar miembros y asignarles roles con permisos efectivos |
| **3**  | Dispositivos y aplicación Android base      | Un dispositivo Android se vincula y reporta estado al backend             |
| **4**  | Captura, ingesta y parsing                  | Una notificación real de Yape produce una transacción persistida          |
| **5**  | Panel de transacciones y tiempo real        | El cobro aparece en el panel sin recargar, en menos de dos segundos       |
| **6**  | API pública y webhooks                      | Un integrador consume la API y recibe eventos en su endpoint              |
| **7**  | Membresías, límites y auditoría             | Los límites del plan se aplican y toda acción queda registrada            |
| **8**  | Endurecimiento, observabilidad y despliegue | El sistema opera en producción con monitoreo activo                       |

---

## 2. Sprint 1 — Fundación técnica y autenticación

**Objetivo:** establecer la base del proyecto y permitir que un usuario cree una cuenta y acceda.

### Infraestructura de proyecto

- [x] Inicializar monorepo con pnpm y orquestador de tareas
- [x] Configurar paquetes de configuración compartida: TypeScript, linter, formateador
- [x] Crear la aplicación de backend con estructura modular definida
- [x] Crear la aplicación de panel con enrutador y estructura de features
- [x] Configurar entorno local con contenedores: base de datos y Redis
- [x] Establecer variables de entorno con validación estricta al arranque
- [x] Configurar integración continua: verificación de tipos, linter, pruebas
- [x] Definir convención de commits y ramas
- [x] Documentar el procedimiento de arranque en el archivo principal del repositorio

### Base de datos

- [x] Definir el esquema completo en el ORM
- [x] Generar la migración inicial
- [x] Implementar el script de datos semilla: planes y catálogo de billeteras
- [x] Verificar que las restricciones e índices se apliquen correctamente

### Autenticación

- [x] Implementar registro con creación simultánea de tenant y membresía de propietario
- [x] Implementar verificación de correo mediante token de un solo uso
- [x] Implementar inicio de sesión con emisión de par de tokens
- [x] Implementar renovación con rotación de refresh token
- [x] Implementar detección de reutilización de refresh token
- [x] Implementar cierre de sesión con revocación
- [x] Implementar recuperación y restablecimiento de contraseña
- [x] Implementar bloqueo por intentos fallidos
- [x] Implementar limitación de tasa en endpoints de autenticación
- [x] Configurar el servicio de envío de correo transaccional

### Panel

- [x] Implementar pantallas de registro, ingreso y recuperación
- [x] Implementar cliente HTTP con renovación automática de token
- [x] Implementar protección de rutas
- [x] Implementar disposición base con navegación lateral
- [x] Aplicar los tokens del sistema de diseño

### Criterios de aceptación

- [x] Un usuario nuevo completa el registro y recibe el correo de verificación
- [x] Tras verificar, ingresa al panel y ve su negocio creado
- [x] La sesión se renueva de forma transparente al expirar el token de acceso
- [x] Reutilizar un refresh token consumido invalida toda la cadena
- [x] Cinco intentos fallidos bloquean el acceso temporalmente

---

## 3. Sprint 2 — Multi-tenancy, roles y equipo

**Objetivo:** garantizar el aislamiento entre negocios y habilitar la gestión de equipo.

### Aislamiento

- [x] Implementar el guard que resuelve el tenant desde la credencial _(Claude)_
- [x] Implementar el mecanismo que establece el contexto de tenant en cada transacción de base de datos _(Claude)_
- [x] Activar Row Level Security en todas las tablas correspondientes _(Claude)_
- [x] Definir las políticas de aislamiento _(Claude)_
- [x] Implementar pruebas que verifiquen la imposibilidad de acceso cruzado _(Claude)_
- [x] Implementar el cambio de tenant activo en la sesión _(Claude)_

### Roles y permisos

- [x] Implementar el guard de autorización por rol _(Claude)_
- [x] Implementar el decorador de declaración de rol requerido por endpoint _(Claude)_
- [x] Aplicar la matriz de permisos definida _(Claude)_
- [x] Implementar las invariantes: un solo propietario, no autodegradación, no autoremoción _(Claude)_

### Gestión de equipo

- [x] Implementar listado de miembros _(Claude)_
- [x] Implementar envío de invitación con token _(Claude)_
- [x] Implementar aceptación de invitación para usuario nuevo y existente _(Claude)_
- [x] Implementar revocación de invitación _(Claude)_
- [x] Implementar cambio de rol _(Claude)_
- [x] Implementar remoción de miembro _(Claude)_
- [x] Implementar transferencia de propiedad de forma atómica _(Claude)_

### Administración de plataforma

- [x] Implementar autenticación independiente para administradores _(Claude)_ — `PlatformAdmin` propio, sin relación con `User`; sin ruta de autorregistro, se aprovisiona con `scripts/create-platform-admin.ts` fuera de banda
- [x] Implementar segundo factor obligatorio _(Claude)_ — TOTP (RFC 6238) implementado a mano con `node:crypto`, sin dependencia nueva; verificado contra el vector de prueba oficial de la RFC
- [x] Implementar listado y búsqueda de tenants _(Claude)_ — `GET /platform/v1/tenants`
- [x] Implementar activación y suspensión de tenants _(Claude)_ — `PATCH /platform/v1/tenants/{id}/status`; verificado que una suspensión bloquea de inmediato el acceso del propio tenant al panel

### Panel

- [x] Implementar la vista de equipo con listado de miembros e invitaciones _(Codex)_
- [x] Implementar envío de invitaciones, cambio de rol, revocación y remoción desde el panel _(Codex)_
- [x] Exponer la transferencia de propiedad en el panel como acción sensible _(Codex)_ — exclusiva del propietario, confirmación escrita y renovación inmediata de sesión
- [x] Implementar el selector de tenant activo _(Codex)_ — conserva el negocio seleccionado durante la renovación de sesión y limpia la caché del panel al cambiar
- [x] Implementar la ocultación de acciones no permitidas según el rol _(Codex)_ — navegación y configuración inicial derivadas de la matriz compartida de permisos

### Criterios de aceptación

- [x] Un usuario de un tenant no puede acceder a recursos de otro ni conociendo el identificador _(Claude)_
- [x] La respuesta ante acceso cruzado es de recurso inexistente, no de acceso denegado _(Claude)_
- [x] Un operador no visualiza las secciones de configuración _(Codex)_
- [x] La transferencia de propiedad deja exactamente un propietario _(Claude)_

---

## 4. Sprint 3 — Dispositivos y aplicación Android base

**Objetivo:** vincular un dispositivo Android real y establecer comunicación con el backend.

### Backend

- [x] Implementar generación de código de vinculación con vigencia y un solo uso _(Claude)_
- [x] Implementar el endpoint de vinculación _(Claude)_
- [x] Implementar emisión y verificación del token de dispositivo _(Claude)_
- [x] Implementar el endpoint de señal de vida _(Claude)_
- [x] Implementar el endpoint de configuración remota _(Claude)_
- [x] Implementar la detección de dispositivos sin reporte mediante tarea programada _(Claude)_
- [x] Implementar validación del límite de dispositivos según plan _(Claude)_
- [x] Implementar revocación de dispositivo _(Claude)_
- [x] Implementar catálogo y activación de billeteras por tenant — prerrequisito no listado en este plan, necesario para calcular `monitored_packages` al vincular _(Claude)_

> ⚠️ Los ítems de Android marcados _(Claude)_ en esta sección están escritos siguiendo la arquitectura definida, pero no se compilaron: este entorno no tiene Android SDK/Gradle. Verificar en Android Studio antes de confiar en ellos (ver `apps/android/README.md`).

### Aplicación Android — estructura

- [x] Inicializar el proyecto con la arquitectura definida _(Claude)_
- [x] Configurar inyección de dependencias _(Claude)_
- [x] Configurar cliente HTTP con interceptor de autenticación _(Claude)_
- [x] Configurar base de datos local _(Claude)_
- [x] Configurar almacenamiento cifrado para el token _(Claude)_
- [x] Configurar el tema visual a partir de los tokens de diseño _(Claude)_

### Aplicación Android — vinculación

- [x] Implementar pantalla de bienvenida _(Claude)_
- [x] Implementar ingreso manual de código _(Claude)_
- [x] Implementar lectura de código QR _(Claude)_
- [x] Implementar confirmación con el nombre del negocio _(Claude)_
- [x] Implementar persistencia segura del token _(Claude)_

### Aplicación Android — permisos

- [x] Implementar pantalla de solicitud de acceso a notificaciones _(Claude)_
- [x] Implementar apertura directa de los ajustes correspondientes _(Claude)_
- [x] Implementar detección automática del estado del permiso _(Claude)_
- [x] Implementar solicitud de exclusión de optimización de batería _(Claude)_
- [x] Implementar detección de fabricante e instrucciones específicas _(Claude)_
- [x] Implementar la lista de verificación final _(Claude)_

### Aplicación Android — servicio

- [x] Implementar el servicio en primer plano con notificación persistente _(Claude)_
- [x] Implementar el trabajador de señal de vida _(Claude)_
- [x] Implementar el receptor de arranque del dispositivo _(Claude)_
- [x] Implementar la pantalla de estado operativo _(Claude)_

### Verificación de paquetes

- [ ] Instalar las aplicaciones de billetera en un dispositivo real
- [ ] Registrar y confirmar los nombres de paquete de cada una
- [ ] Actualizar los datos semilla con los valores verificados
- [ ] Documentar el procedimiento para futuras billeteras

### Criterios de aceptación

- [ ] Un dispositivo completa la vinculación en menos de tres minutos
- [ ] El asistente de permisos se completa sin asistencia técnica
- [ ] El panel refleja el estado del dispositivo en tiempo real
- [ ] El servicio sobrevive al reinicio del dispositivo
- [x] La ausencia de señal por más de quince minutos marca el dispositivo como desconectado _(Claude)_

---

## 5. Sprint 4 — Captura, ingesta y parsing

**Objetivo:** convertir una notificación real de billetera en una transacción persistida.

> Backend y app Android ya cubren la ruta completa de captura e ingesta. La app fue compilada e instalada sobre un Xiaomi real conservando su vinculación; Yape quedó activado y su paquete remoto fue verificado. Falta ejecutar el cobro real final para certificar la conversión completa a transacción. Los patrones de Plin y BIM siguen basados en muestras inferidas.

### Aplicación Android — captura

- [x] Implementar el servicio de escucha de notificaciones _(Codex)_
- [x] Implementar el filtrado por paquetes monitoreados _(Codex)_
- [x] Implementar la extracción de título, cuerpo y marca temporal _(Codex)_
- [x] Implementar la inserción inmediata en la cola local _(Codex)_
- [x] Implementar el trabajador de sincronización con envío por lotes _(Codex)_
- [x] Implementar el reintento con espera creciente _(Codex)_
- [x] Implementar la eliminación de la cola solo tras confirmación del servidor _(Codex)_
- [x] Implementar el indicador de elementos pendientes _(Codex)_
- [x] Implementar la alerta ante pérdida del permiso _(Codex)_

### Backend — ingesta

- [x] Implementar el endpoint de ingesta con autenticación por token de dispositivo _(Claude)_
- [x] Implementar la aceptación de lotes _(Claude)_
- [x] Implementar el cálculo de huella para deduplicación _(Claude)_
- [x] Implementar la persistencia íntegra de la notificación cruda _(Claude)_
- [x] Implementar la validación del límite de transacciones del plan _(Claude)_
- [x] Implementar el encolado del trabajo de parsing _(Claude)_
- [x] Implementar la respuesta diferenciada para elementos duplicados _(Claude)_

### Backend — parsing

- [x] Definir el contrato del parser en el dominio _(Claude)_
- [x] Implementar el registro de parsers con selección por paquete _(Claude)_
- [x] Implementar el cargador de patrones desde base de datos con caché _(Claude)_
- [x] Implementar el parser de Yape _(Claude + Codex — compatible con el formato documentado y con `Confirmación de Pago` observado en un dispositivo real; regresión anonimizada incluida)_
- [x] Implementar el parser de Plin BBVA _(Claude — patrón inferido, no verificado contra una notificación real; ver `packages/parsers`)_
- [x] Implementar el parser de Plin Interbank _(Claude — patrón inferido, no verificado contra una notificación real; ver `packages/parsers`)_
- [x] Implementar el parser de BIM _(Claude — patrón inferido, no verificado contra una notificación real; ver `packages/parsers`)_
- [x] Implementar el modelo normalizado de salida _(Claude)_
- [x] Implementar el manejo de notificaciones sin coincidencia _(Claude)_
- [x] Implementar el trabajador que consume la cola de parsing _(Claude)_
- [x] Implementar la creación de la transacción a partir del resultado _(Claude)_
- [x] Implementar el cifrado del nombre del remitente _(Claude)_
- [x] Implementar la emisión del evento de dominio _(Claude)_

### Pruebas de parsers

- [ ] Recolectar muestras reales de cada billetera _(Yape completado el 2026-08-27; faltan Plin BBVA, Plin Interbank y BIM)_
- [ ] Anonimizar las muestras conservando la estructura _(Yape completado en `packages/parsers/fixtures/yape/samples.json`; faltan las demás billeteras)_
- [x] Construir la suite de pruebas por parser _(Claude + Codex — 26 pruebas; incluye una muestra real anonimizada de Yape)_
- [x] Verificar cobertura mínima del ochenta por ciento en el módulo _(Claude — 100%)_
- [x] Incluir casos límite: montos con separador de miles, nombres con caracteres especiales, ausencia de código de seguridad _(Claude)_

### Administración de parsers

- [x] Implementar el listado de versiones por billetera _(Claude)_ — incluye la tasa de coincidencia por versión (RF-WAL-009)
- [x] Implementar la creación de versión _(Claude)_
- [x] Implementar la prueba de una versión contra muestras almacenadas _(Claude)_ — corre el mismo `Parser` de producción para esa billetera, contra notificaciones reales (`raw_notification_ids`, típicamente `UNMATCHED`) y/o muestras manuales; no persiste nada
- [x] Implementar la activación de versión _(Claude)_ — exactamente una activa por billetera (RF-WAL-004); invalida el caché de 60s del cargador de patrones de inmediato, verificado con una ingesta real sin redespliegue (RF-WAL-006)
- [x] Implementar la consulta de notificaciones sin coincidencia _(Claude)_ — más `POST /platform/v1/notifications/reprocess` (RF-ADM-008/RF-WAL-010, SHOULD, no estaba en este checklist) y `GET/POST /platform/v1/wallets` para el catálogo (RF-WAL-001/008)

### Criterios de aceptación

- [x] Un cobro real por Yape produce una transacción con monto, remitente y código correctos _(Codex — captura real `Confirmación de Pago`, parser v19, S/ 1.00 y evento `transaction.created`; la variante observada no incluye código de seguridad)_
- [ ] Un cobro real por Plin produce una transacción correcta
- [x] Sin conectividad, la notificación se conserva y se envía al restablecerse _(Codex — verificado en Xiaomi real: cinco intentos fallidos con API detenida y confirmación del lote tras levantar el backend)_
- [x] Una notificación duplicada no genera una segunda transacción _(Claude)_
- [x] Una notificación sin parser coincidente queda registrada para revisión _(Claude)_
- [x] Modificar los patrones desde la base de datos altera el resultado sin redespliegue _(Claude)_

---

## 6. Sprint 5 — Panel de transacciones y tiempo real

**Objetivo:** el negocio visualiza sus cobros en el momento en que ocurren.

> ⚠️ Backend probado de punta a punta con datos reales: ingesta → parsing → transacción → WebSocket con un cliente Socket.IO real conectándose, autenticándose y recibiendo el evento. El panel (Next.js) compila y pasa lint/typecheck, y quedó conectado al backend real, pero no pude verlo renderizado — este entorno no tiene la extensión de Chrome disponible en este momento. Exportación implementada síncrona, no asíncrona (ver nota puntual abajo).

### Backend

- [x] Implementar el listado de transacciones con paginación por cursor _(Claude)_
- [x] Implementar los filtros: rango de fechas, billetera, dispositivo, estado, monto _(Claude)_
- [x] Implementar la búsqueda por nombre de remitente _(Claude)_
- [x] Implementar el detalle de transacción _(Claude)_
- [x] Implementar la confirmación de transacción _(Claude)_
- [x] Implementar la disputa de transacción _(Claude)_
- [x] Implementar el resumen agregado por período _(Claude)_
- [x] Implementar la exportación asíncrona a archivo separado por comas _(Claude — implementada síncrona, no asíncrona: no hay infraestructura de almacenamiento de objetos todavía y el contrato no especifica la respuesta del flujo async; sirve el CSV directo en la respuesta)_
- [x] Implementar el gateway de tiempo real con autenticación _(Claude)_
- [x] Implementar el adaptador de distribución entre instancias _(Claude — @socket.io/redis-adapter conectado; no probado con múltiples instancias reales, solo con una)_
- [x] Implementar la emisión de eventos al canal del tenant _(Claude)_

### Panel

- [x] Implementar la vista de transacciones con listado _(Claude — código escrito y verificado por API real hasta el borde del navegador; sin extensión de Chrome disponible en este entorno no pude tomar una captura real, ver docs/10 nota de Sprint 5)_
- [x] Implementar el componente de tarjeta de transacción _(Claude)_
- [x] Implementar la barra de filtros _(Claude)_
- [x] Implementar la búsqueda incremental _(Claude)_
- [x] Implementar el panel de detalle _(Claude)_
- [x] Implementar las acciones de confirmación y disputa _(Claude)_
- [x] Implementar el cliente de tiempo real con reconexión automática _(Claude)_
- [x] Implementar la actualización de la vista ante evento entrante _(Claude)_
- [x] Implementar el indicador de conexión activa _(Claude)_
- [x] Implementar la vista de resumen con métricas del período _(Claude)_
- [x] Implementar la exportación desde la interfaz _(Claude)_
- [x] Implementar los cuatro estados en cada vista _(Claude)_

### Criterios de aceptación

- [ ] Un cobro real aparece en el panel en menos de dos segundos sin recargar
- [ ] El código de seguridad es legible a distancia de brazo en un teléfono
- [x] Los filtros producen resultados correctos y componibles _(Claude)_
- [x] La confirmación registra el usuario y la marca temporal _(Claude)_
- [ ] La reconexión tras pérdida de red resincroniza el estado
- [x] La exportación genera un archivo con los registros filtrados _(Claude)_

---

## 7. Sprint 6 — API pública y webhooks

**Objetivo:** un sistema externo se integra con Yallegó.

### Claves de API

- [x] Implementar la generación con alcances _(Claude)_
- [x] Implementar el almacenamiento por huella _(Claude)_
- [x] Implementar la verificación con caché _(Claude)_
- [x] Implementar la revocación _(Claude)_
- [x] Implementar el registro de último uso _(Claude)_
- [x] Implementar el guard de autenticación por clave _(Claude)_
- [x] Implementar el guard de verificación de alcances _(Claude)_
- [x] Implementar la limitación de tasa por clave según plan _(Claude)_ — ventana fija de 1 minuto en Redis por clave, según `plan.limits.rate_limit_per_minute`

### Webhooks — configuración

- [x] Implementar el registro de endpoint con validación de dirección _(Claude)_
- [x] Implementar la prevención de solicitudes a redes internas _(Claude)_ — resolución DNS + rangos privados IPv4/IPv6, re-verificado en cada intento de entrega (protege contra DNS rebinding)
- [x] Implementar la generación y cifrado del secreto _(Claude)_
- [x] Implementar la suscripción a eventos _(Claude)_
- [x] Implementar la modificación y eliminación _(Claude)_
- [x] Implementar la rotación de secreto con ventana de transición _(Claude)_ — 24h, valor propio ya que los docs no fijan uno
- [x] Implementar el envío de evento de prueba _(Claude)_
- [x] Implementar la validación del límite según plan _(Claude)_

### Webhooks — entrega

- [x] Implementar la cola de entregas _(Claude)_
- [x] Implementar el trabajador de despacho _(Claude)_
- [x] Implementar la construcción del payload versionado _(Claude)_
- [x] Implementar el cálculo de la firma _(Claude)_
- [x] Implementar el cliente HTTP con tiempo límite estricto _(Claude)_
- [x] Implementar la política de reintentos con espera creciente _(Claude)_ — tabla exacta de docs/04 §5.2, verificada con pruebas unitarias; el calendario completo (hasta 12h) no se ejerció en tiempo real en e2e, solo la lógica de cada paso
- [x] Implementar el registro de cada intento _(Claude)_
- [x] Implementar el manejo diferenciado por código de respuesta _(Claude)_ — 2xx entregado, 410 deshabilita el endpoint de inmediato, el resto reintenta según la política
- [x] Implementar la desactivación automática tras fallos sostenidos _(Claude)_ — umbral propio de 5 entregas ABANDONADAS consecutivas; los docs no fijan uno
- [x] Implementar el reintento manual _(Claude)_
- [x] Implementar la notificación al tenant ante desactivación _(Claude)_ — reutiliza `MailerService`

### API pública

- [x] Exponer los endpoints de consulta de transacciones _(Claude)_
- [x] Exponer los endpoints de gestión de webhooks _(Claude)_
- [x] Exponer los endpoints de estado de dispositivos _(Claude)_ — solo lectura (`devices:read`); la gestión (emparejar, revocar) sigue exclusiva del panel
- [x] Implementar el formato uniforme de error _(Claude)_
- [x] Implementar las cabeceras de limitación de tasa _(Claude)_ — `X-RateLimit-Limit/Remaining/Reset` en cada respuesta autenticada por clave, `Retry-After` al superar el límite
- [x] Restringir el acceso al canal de tiempo real según plan _(Claude)_ — solo clientes de API key (`websocket_api` + alcance `realtime:subscribe`); el panel conserva acceso sin importar el plan
- [x] Generar la especificación de la interfaz _(Claude)_ — `docs/openapi.yaml` (OpenAPI 3.1), escrita a mano a partir de los contratos Zod (no autogenerada, porque el proyecto valida con Zod y no con `class-validator`); cubre solo la superficie `/v1` invocable con clave de API (transacciones, webhooks, dispositivos de solo lectura)

### Documentación

- [ ] Crear el sitio de documentación — pendiente de Sprint 8 (despliegue); el contenido ya existe como Markdown en `docs/api-publica/`
- [x] Redactar la guía de inicio rápido _(Claude)_ — `docs/api-publica/01-inicio-rapido.md`
- [x] Documentar la autenticación _(Claude)_ — `docs/api-publica/02-autenticacion.md`
- [x] Documentar cada endpoint con ejemplos _(Claude)_ — `docs/api-publica/03-transacciones.md`, `04-webhooks.md`, `05-dispositivos.md`, más `docs/openapi.yaml`
- [x] Documentar el catálogo de eventos _(Claude)_ — `docs/api-publica/06-eventos.md`
- [x] Documentar la verificación de firma con ejemplos en varios lenguajes _(Claude)_ — `docs/api-publica/07-verificacion-firma.md` (Node.js, Python, PHP)
- [x] Documentar la política de reintentos _(Claude)_ — `docs/api-publica/08-reintentos.md`
- [x] Documentar los límites de tasa _(Claude)_ — `docs/api-publica/09-limites-tasa.md`

### Panel

- [x] Implementar la vista de claves de API _(Codex)_ — creación con alcances y vencimiento, secreto visible una sola vez, listado y revocación
- [x] Implementar la vista de webhooks _(Codex)_ — alta, edición de suscripciones, pausa/activación, prueba, rotación de secreto y eliminación
- [x] Implementar el historial de entregas con detalle expandible _(Codex)_ — filtros por estado, actualización automática de entregas activas y detalle de intentos, respuesta y error sin exponer el payload
- [x] Implementar el reintento manual desde la interfaz _(Codex)_ — disponible para entregas fallidas o abandonadas, con invalidación del historial y confirmación de encolado

### Criterios de aceptación

- [x] Un integrador consume la API con una clave y obtiene transacciones _(Claude)_
- [x] Una clave sin el alcance requerido recibe una respuesta de acceso denegado _(Claude)_
- [x] Un cobro real dispara la entrega al endpoint configurado en menos de tres segundos _(Claude)_ — verificado con e2e real (ingesta → parsing → evento → entrega HTTPS firmada) usando un receptor local con certificado autofirmado, ya que el guard de SSRF real rechaza `localhost`
- [x] La firma se verifica correctamente siguiendo la documentación _(Claude)_
- [x] Un endpoint caído genera reintentos según la política definida _(Claude)_ — el calendario de espera está probado exhaustivamente a nivel unitario; no se ejerció en tiempo real un calendario completo de 8 intentos (tomaría hasta 12h)
- [x] Al restablecerse el endpoint, la entrega pendiente se completa _(Claude)_ — verificado forzando un fallo y disparando el reintento manual (mismo código que usa el reintento automático)
- [x] Superar el límite de tasa produce la respuesta correspondiente con cabeceras informativas _(Claude)_

---

## 8. Sprint 7 — Membresías, límites y auditoría

**Objetivo:** el modelo de negocio opera y toda acción queda trazada.

### Planes y límites

- [x] Implementar la consulta del plan vigente con sus límites _(Claude)_ — `GET /v1/subscription`, incluye uso del período y plan pendiente si hay un downgrade agendado
- [x] Implementar el servicio de verificación de límites _(Claude)_ — `PlanLimitsService`, punto único; reemplazó seis implementaciones duplicadas
- [x] Aplicar la verificación en cada punto correspondiente _(Claude)_ — claves de API, dispositivos, usuarios, billeteras, webhooks, transacciones (ingesta)
- [x] Implementar los contadores de uso por período _(Claude)_ — `UsagePeriod` vía `UsageCounterService`
- [x] Implementar el incremento de contadores ante cada evento contabilizable _(Claude)_ — transacción creada, llamada autenticada por clave de API, intento de entrega de webhook
- [x] Implementar el cierre y apertura de período mediante tarea programada _(Claude)_ — `SubscriptionPeriodScheduler`, diario
- [x] Implementar las notificaciones al alcanzar umbrales de consumo _(Claude)_ — 80% y 100% (RF-TXN-016), un solo aviso por umbral por período
- [x] Implementar la respuesta uniforme ante límite alcanzado _(Claude)_

### Cambio de plan

- [x] Implementar la solicitud de cambio _(Claude)_ — `POST /v1/subscription/change`, calcula monto y referencia de pago, no toca la suscripción todavía (docs/06 §11)
- [x] Implementar la aplicación inmediata al mejorar de plan _(Claude)_ — `PlanChangeApplicationService`, probado directamente
- [x] Implementar la aplicación diferida al reducir de plan _(Claude)_ — vía `pendingPlanId`, se aplica en el cierre de período
- [x] Implementar el registro histórico de cambios _(Claude)_ — `GET /v1/subscription/history`
- [x] Implementar la confirmación de pago manual desde administración _(Claude)_ — `POST /platform/v1/payments` (ver "Administración de plataforma" más abajo)
- [x] Implementar la activación tras confirmación _(Claude)_
- [x] Implementar la notificación al tenant _(Claude)_

### Retención

- [x] Implementar la tarea de eliminación por vencimiento de retención _(Claude)_ — `RetentionScheduler`: `transactions` y `webhook_deliveries` según `retention_days` del plan de cada tenant
- [x] Implementar el archivado de notificaciones crudas antiguas _(Claude)_ — solo marca `archivedAt` a los 90 días (docs/05 §7); mover a almacenamiento de objetos y eliminar de la tabla queda pendiente, este proyecto no integra un proveedor todavía — borrar sin ese paso sería pérdida de datos real
- [x] Implementar la limpieza de tokens vencidos _(Claude)_ — refresh tokens (30 días de gracia) y de un solo uso

### Auditoría

- [x] Implementar el servicio de registro de eventos _(Claude)_ — ya existía desde Sprint 2, ahora también consultable y exportable
- [x] Instrumentar todas las acciones definidas como auditables _(Claude)_ — verificado contra el catálogo de docs/07_SEGURIDAD_AUTH.md §12.1; encontró y corrigió dos huecos reales: el reintento manual de una entrega de webhook y pausar/reanudar un dispositivo no dejaban registro. Única excepción real: "solicitud de eliminación" de tenant no tiene evento porque ese flujo (`Tenant.deletionRequestedAt`) todavía no está implementado — no hay nada que auditar todavía
- [x] Implementar la restricción de modificación a nivel de motor _(Claude)_ — `REVOKE UPDATE, DELETE` sobre `audit_events` para el rol de la aplicación; verificado con psql y con una prueba e2e
- [x] Implementar la consulta con filtros _(Claude)_ — `GET /v1/audit`: `from`, `to`, `action`, `actor_user_id`, `resource_type`, cursor
- [x] Implementar la exportación _(Claude)_ — `POST /v1/audit/export`, CSV

### Panel

- [x] Implementar la vista de membresía con consumo _(Codex)_ — plan y ciclo vigentes, próxima renovación, cambio programado, consumo del período con umbrales y capacidades incluidas; acceso exclusivo del propietario
- [x] Implementar la comparación de planes _(Codex)_ — catálogo responsive con plan actual destacado, selector mensual/semestral/anual, precios y límites comparables, incluyendo capacidades ilimitadas y ciclos no disponibles
- [x] Implementar el flujo de solicitud de cambio _(Codex)_ — selección de plan y ciclo, confirmación de monto, solicitud `PENDING_PAYMENT` y comprobante con referencia de transferencia copiable; deja explícito que la activación ocurre tras confirmar el pago
- [x] Implementar los avisos de consumo _(Codex)_ — advertencia descartable al 80% por tenant/período y aviso crítico persistente al 100%, visibles globalmente para el propietario con acceso directo a Membresía
- [x] Implementar la vista de auditoría _(Codex)_ — filtros por acción, recurso, período y actor; paginación por cursor, detalle expandible con metadatos, exportación CSV y acceso para propietario/administrador

### Administración de plataforma

- [x] Implementar el registro de pagos manuales _(Claude)_ — `POST /platform/v1/payments`, independiente de un cambio de plan (cubre también la renovación del mismo plan)
- [x] Implementar la aplicación de cambio de plan _(Claude)_ — `POST /platform/v1/tenants/{id}/subscription`; en el camino encontré que `subscription_changes.performed_by` tenía una FK a `User`, no admitía un administrador de plataforma como actor — se agregó `performed_by_platform_admin_id` (migración `subscription_change_platform_admin_actor`)
- [x] Implementar la concesión de planes de cortesía _(Claude)_ — `POST /platform/v1/tenants/{id}/courtesy-plan`, sin pago asociado, motivo obligatorio y marcado en el historial
- [x] Implementar el panel de métricas globales _(Claude)_ — `GET /platform/v1/metrics`: tenants activos/suspendidos, volumen de transacciones, tasa de parsing, salud de webhooks (RF-ADM-009)

### Criterios de aceptación

- [x] Alcanzar el límite de transacciones detiene la ingesta con mensaje claro _(Claude)_ — verificado con e2e real: 5 transacciones aceptadas contra un límite de 5, la 6ª rechazada con 422
- [x] Los elementos rechazados por límite permanecen en la cola del dispositivo _(Codex)_ — verificado con una prueba Android de regresión: ante `422 PLAN_LIMIT_EXCEEDED` el worker retorna reintento, incrementa el contador de intentos y conserva el elemento en Room sin ejecutar su eliminación
- [x] Al mejorar de plan, los nuevos límites aplican de inmediato _(Claude)_
- [x] Toda acción sensible aparece en el registro de auditoría _(Claude)_ — mismo alcance que el punto de "Auditoría" arriba
- [x] El registro de auditoría no admite modificación por ninguna vía _(Claude)_
- [x] Los datos vencidos se eliminan según la retención del plan _(Claude)_

---

## 9. Sprint 8 — Endurecimiento, observabilidad y despliegue

**Objetivo:** el sistema opera en producción de forma confiable y observable.

### Observabilidad

- [x] Implementar registro estructurado con identificador de correlación _(Claude)_ — `nestjs-pino` (JSON en producción, legible en desarrollo); `pino-http` es ahora el único generador del id de correlación (antes había dos independientes, ver `RequestIdMiddleware`); cada línea incluye `tenantId`/`actorType`/actor cuando el guard correspondiente ya lo resolvió (`LogContextInterceptor`)
- [x] Implementar la exposición de métricas de aplicación _(Claude)_ — `GET /metrics` (formato Prometheus, `prom-client`): HTTP por ruta/estado, ingesta, resultados de parsing por billetera, entregas de webhook, profundidad de cola, más las métricas por defecto del proceso
- [x] Instrumentar trazas en los flujos críticos _(Claude)_ — OpenTelemetry (`NodeSDK` + instrumentación automática de HTTP/Express/ioredis, spans manuales en ingesta/parsing/entrega de webhooks); sin `OTEL_EXPORTER_OTLP_ENDPOINT` configurado no hay colector real desplegado todavía, así que hoy no se envían a ningún lado — la instrumentación queda lista para cuando exista uno
- [x] Implementar el endpoint de verificación de salud _(Claude)_ — se separó en `GET /health` (liveness, sin dependencias) y `GET /health/ready` (RNF-OBS-008: valida conectividad real con Postgres y Redis vía `@nestjs/terminus`)
- [ ] Configurar la recolección de registros — requiere un destino real (Loki, CloudWatch, etc.); no hay uno desplegado todavía
- [ ] Configurar los tableros de monitoreo — requiere una instancia real de Grafana o similar
- [x] Configurar las alertas definidas _(Claude)_ — cubre las 3 alertas de los RNF: tasa de parsing por billetera bajo 95% y profundidad de la cola de webhooks (`ParsingSuccessAlertScheduler`/`WebhookQueueDepthAlertScheduler`, ambas por correo a administradores de plataforma, con deduplicación por Redis) y dispositivo sin heartbeat (ya existía, `DeviceOfflineScheduler`). No incluye reglas de Alertmanager/infra — son alertas a nivel de aplicación
- [x] Integrar el seguimiento de errores no controlados _(Claude)_ — `@sentry/nestjs`, captura excepciones 5xx y `uncaughtException`/`unhandledRejection`; sin `SENTRY_DSN` configurado (no hay cuenta real) queda en no-op seguro
- [ ] Publicar la página de estado del servicio — servicio externo (p. ej. Statuspage), no aplica sin una cuenta real

### Seguridad

- [x] Aplicar las cabeceras de seguridad _(Codex)_ — API protegida con Helmet; dashboard con `nosniff`, denegación de framing, políticas de referencia/permisos, aislamiento de origen, desactivación de DNS prefetch y HSTS; verificado sobre respuestas HTTP reales
- [x] Verificar la política de seguridad de contenido _(Codex)_ — CSP estricta del dashboard con nonce criptográfico por solicitud, `strict-dynamic`, conexión limitada al API/WebSocket configurados y directivas restrictivas para objetos, formularios y ancestros; prueba unitaria, renderizado local sin violaciones y build de producción correctos
- [x] Ejecutar auditoría de dependencias _(Codex)_ — `pnpm audit` sin vulnerabilidades conocidas en todo el workspace y 179 dependencias Maven resueltas del build Android contrastadas con OSV sin hallazgos
- [x] Ejecutar análisis estático _(Codex)_ — ESLint y TypeScript correctos en los siete paquetes del monorepo; Android Lint Release correcto y única deprecación encontrada (`LocalLifecycleOwner`) actualizada a `androidx.lifecycle.compose`
- [x] Verificar ausencia de secretos en el historial _(Codex)_ — Gitleaks v8.30.1 revisó los 33 commits; los únicos hallazgos iniciales eran valores sintéticos publicados como ejemplos de la API, fijados por huella exacta en `.gitleaksignore`; el escaneo completo posterior terminó sin filtraciones
- [x] Ejecutar la suite de pruebas de aislamiento entre tenants _(Codex)_ — 5/5 pruebas e2e sobre PostgreSQL/Redis: invitaciones, membresías, acceso cruzado oculto como `404`, restricciones del propietario y transferencia atómica con un único owner
- [x] Revisar la configuración de red de la aplicación Android _(Codex)_ — release declara explícitamente tráfico en claro deshabilitado, confía solo en certificados del sistema y rechaza durante el build una `API_BASE_URL_RELEASE` que no sea HTTPS absoluta; debug conserva HTTP únicamente para emulador/loopback
- [x] Aplicar ofuscación en la compilación de publicación _(Codex)_ — R8 optimizado y reducción de recursos activos; `assembleRelease` completó correctamente y produjo el APK reducido junto con su archivo de mapping
- [x] Revisar manualmente las superficies de mayor riesgo _(Codex)_ — revisados autenticación y rotación de sesiones, ingesta autenticada por dispositivo, administración protegida por credencial/TOTP y allowlist de IP, aislamiento tenant y entrega de webhooks; se amplió el guard SSRF para rechazar rangos IPv4/IPv6 no públicos, multicast, documentación, benchmark y representaciones IPv4-mapped; 8 pruebas SSRF y 35 e2e críticas correctas

### Rendimiento

- [x] Ejecutar pruebas de carga sobre el endpoint de ingesta _(Codex)_ — runner local reproducible con fixture y limpieza automáticos: 10 solicitudes/10 s, 5 notificaciones por lote, 0 errores, p95 53.66 ms; umbral p95 500 ms y error máximo 1%
- [x] Ejecutar pruebas de carga sobre la API de consulta _(Codex)_ — 40 consultas/10 s, 0 errores, p95 31.25 ms; la tasa base de 4 req/s deja margen para bootstrap e ingesta dentro del límite global de 60 req/min; umbral p95 300 ms y error máximo 1%
- [x] Verificar el comportamiento del canal de tiempo real con múltiples conexiones _(Codex)_ — prueba e2e con 30 WebSockets concurrentes y dos tenants: los 20 clientes del tenant objetivo recibieron exactamente el evento, los 10 del tenant aislado no recibieron ninguno y cada conexión obtuvo una sesión única; `connected` ahora espera la suscripción efectiva a la sala para evitar perder el primer evento con el adaptador Redis
- [x] Revisar los planes de ejecución de las consultas principales _(Codex)_ — `EXPLAIN (ANALYZE, BUFFERS)` con 100 000 transacciones y 100 000 eventos de auditoría dentro de una transacción reversible: listados recientes en 0.1–0.2 ms; el resumen de 14 días usa correctamente escaneo secuencial al devolver ~81% de la tabla; se detectó que el predicado `OR` de un cursor profundo descartaba 69 119 entradas antes de producir la página
- [x] Ajustar índices según los hallazgos _(Codex)_ — índices compuestos alineados con el orden estable `(tenant_id, fecha DESC, id DESC)` y con auditoría por tenant/acción; la cota indexable del cursor redujo la página profunda de transacciones de 7.02 ms a 0.03 ms y auditoría de 4.70 ms a 0.04 ms en 100 000 filas, leyendo 51 entradas en lugar de recorrer 69 170; migración, RLS y paginación con fechas empatadas verificadas
- [ ] Verificar el consumo de batería de la aplicación en uso prolongado

### Despliegue

- [ ] Preparar las imágenes de contenedor
- [ ] Configurar el proxy inverso con certificados
- [ ] Configurar el entorno de preproducción
- [ ] Configurar el entorno de producción
- [ ] Configurar los respaldos automáticos
- [ ] Ejecutar una prueba de restauración
- [ ] Configurar el despliegue sin interrupción
- [ ] Documentar el procedimiento de reversión

### Publicación de la aplicación Android

- [ ] Preparar la ficha de la tienda
- [ ] Preparar las capturas de pantalla
- [ ] Redactar la política de privacidad
- [ ] Completar la declaración de seguridad de datos
- [ ] Justificar el uso del permiso de acceso a notificaciones
- [ ] Publicar en canal de pruebas internas
- [ ] Publicar en producción

### Documentación

- [ ] Completar el archivo principal del repositorio
- [ ] Documentar la arquitectura para nuevos integrantes
- [ ] Documentar el procedimiento de despliegue
- [ ] Documentar los procedimientos operativos ante incidentes comunes
- [ ] Completar la documentación pública de la interfaz
- [ ] Publicar los términos de servicio y la política de privacidad

### Criterios de aceptación

- [ ] El sistema opera en producción con los tres tenants de la prueba cerrada
- [ ] Las alertas se disparan correctamente ante condiciones simuladas
- [ ] Un despliegue no interrumpe el servicio
- [ ] La restauración de respaldo se completa dentro del objetivo definido
- [ ] La aplicación está disponible para instalación
- [ ] La documentación permite integrar sin asistencia

---

## 10. Prueba cerrada

### 10.1. Participantes

Tres negocios de rubros distintos, con volúmenes y patrones de uso diferentes. La diversidad de perfiles es deliberada: un solo participante produce retroalimentación sesgada hacia un único caso de uso.

### 10.2. Condiciones

| Aspecto                     | Definición                                                                 |
| --------------------------- | -------------------------------------------------------------------------- |
| Duración                    | Cuatro semanas                                                             |
| Contraprestación            | Acceso sin costo durante doce meses                                        |
| Compromiso del participante | Retroalimentación estructurada semanal y autorización de uso de testimonio |
| Compromiso del equipo       | Soporte directo y corrección prioritaria de incidencias                    |

### 10.3. Métricas de la prueba

| Métrica                                           | Objetivo                 |
| ------------------------------------------------- | ------------------------ |
| Notificaciones capturadas sobre cobros reales     | > 98%                    |
| Latencia hasta visualización                      | < 2 s en el percentil 95 |
| Interrupciones del servicio de captura por semana | < 1                      |
| Configuración completada sin asistencia           | 3 de 3                   |
| Incidencias críticas                              | 0                        |

### 10.4. Criterio de salida

Se procede al lanzamiento público cuando: la tasa de captura supera el 98% durante dos semanas consecutivas, no existen incidencias críticas abiertas y los tres participantes manifiestan disposición a continuar usando el producto.

---

## 11. Estimación de esfuerzo

| Sprint    | Backend   | Panel     | Android   | Otros     | Total     |
| --------- | --------- | --------- | --------- | --------- | --------- |
| 1         | 45 h      | 30 h      | —         | 15 h      | 90 h      |
| 2         | 40 h      | 25 h      | —         | 10 h      | 75 h      |
| 3         | 30 h      | 20 h      | 45 h      | 5 h       | 100 h     |
| 4         | 50 h      | 10 h      | 35 h      | 10 h      | 105 h     |
| 5         | 35 h      | 45 h      | —         | 5 h       | 85 h      |
| 6         | 50 h      | 25 h      | —         | 25 h      | 100 h     |
| 7         | 40 h      | 30 h      | —         | 5 h       | 75 h      |
| 8         | 25 h      | 15 h      | 20 h      | 40 h      | 100 h     |
| **Total** | **315 h** | **200 h** | **100 h** | **115 h** | **730 h** |

> Estimación para un desarrollador con asistencia de agentes de codificación. A dedicación parcial de veinte horas semanales, el MVP se completa en aproximadamente treinta y seis semanas; a dedicación completa, en dieciocho.

---

## 12. Riesgos del plan

| Riesgo                                                           | Impacto                  | Mitigación                                                                                    |
| ---------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| Los formatos de notificación difieren de lo previsto             | Retrasa el Sprint 4      | Recolectar muestras reales durante el Sprint 3, antes de implementar                          |
| Un fabricante impide mantener el servicio activo                 | Compromete la fiabilidad | Probar en al menos tres marcas distintas durante el Sprint 3                                  |
| La publicación en la tienda se rechaza por el permiso solicitado | Bloquea la distribución  | Preparar la justificación desde el Sprint 3; contemplar distribución directa como alternativa |
| La prueba cerrada revela un problema de fondo                    | Retrasa el lanzamiento   | Iniciar la prueba al cierre del Sprint 5, no al final                                         |
| La estimación resulta insuficiente                               | Extiende el cronograma   | Los sprints 6 y 7 contienen elementos diferibles a la versión siguiente                       |

---

## 13. Elementos diferidos a versiones posteriores

| Elemento                                            | Versión prevista |
| --------------------------------------------------- | ---------------- |
| Parsers de billeteras adicionales                   | v0.2             |
| Cobro automatizado mediante pasarela                | v0.2             |
| Biblioteca cliente publicada                        | v0.2             |
| Lectura de correo como alternativa de captura       | v0.2             |
| Segundo factor para usuarios de tenant              | v0.2             |
| Modo oscuro                                         | v0.2             |
| Conciliación contable avanzada                      | v0.2             |
| Autorización delegada para aplicaciones de terceros | v1.0             |
| Directorio de integraciones                         | v1.0             |
| Aplicaciones móviles nativas para consulta          | v1.0             |
| Detección de anomalías                              | v1.0             |
