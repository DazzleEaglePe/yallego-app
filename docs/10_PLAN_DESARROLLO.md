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

- [ ] Implementar el guard que resuelve el tenant desde la credencial
- [ ] Implementar el mecanismo que establece el contexto de tenant en cada transacción de base de datos
- [ ] Activar Row Level Security en todas las tablas correspondientes
- [ ] Definir las políticas de aislamiento
- [ ] Implementar pruebas que verifiquen la imposibilidad de acceso cruzado
- [ ] Implementar el cambio de tenant activo en la sesión

### Roles y permisos

- [ ] Implementar el guard de autorización por rol
- [ ] Implementar el decorador de declaración de rol requerido por endpoint
- [ ] Aplicar la matriz de permisos definida
- [ ] Implementar las invariantes: un solo propietario, no autodegradación, no autoremoción

### Gestión de equipo

- [ ] Implementar listado de miembros
- [ ] Implementar envío de invitación con token
- [ ] Implementar aceptación de invitación para usuario nuevo y existente
- [ ] Implementar revocación de invitación
- [ ] Implementar cambio de rol
- [ ] Implementar remoción de miembro
- [ ] Implementar transferencia de propiedad de forma atómica

### Administración de plataforma

- [ ] Implementar autenticación independiente para administradores
- [ ] Implementar segundo factor obligatorio
- [ ] Implementar listado y búsqueda de tenants
- [ ] Implementar activación y suspensión de tenants

### Panel

- [ ] Implementar la vista de equipo con listado, invitación y gestión
- [ ] Implementar el selector de tenant activo
- [ ] Implementar la ocultación de acciones no permitidas según el rol

### Criterios de aceptación

- [ ] Un usuario de un tenant no puede acceder a recursos de otro ni conociendo el identificador
- [ ] La respuesta ante acceso cruzado es de recurso inexistente, no de acceso denegado
- [ ] Un operador no visualiza las secciones de configuración
- [ ] La transferencia de propiedad deja exactamente un propietario

---

## 4. Sprint 3 — Dispositivos y aplicación Android base

**Objetivo:** vincular un dispositivo Android real y establecer comunicación con el backend.

### Backend

- [ ] Implementar generación de código de vinculación con vigencia y un solo uso
- [ ] Implementar el endpoint de vinculación
- [ ] Implementar emisión y verificación del token de dispositivo
- [ ] Implementar el endpoint de señal de vida
- [ ] Implementar el endpoint de configuración remota
- [ ] Implementar la detección de dispositivos sin reporte mediante tarea programada
- [ ] Implementar validación del límite de dispositivos según plan
- [ ] Implementar revocación de dispositivo

### Aplicación Android — estructura

- [ ] Inicializar el proyecto con la arquitectura definida
- [ ] Configurar inyección de dependencias
- [ ] Configurar cliente HTTP con interceptor de autenticación
- [ ] Configurar base de datos local
- [ ] Configurar almacenamiento cifrado para el token
- [ ] Configurar el tema visual a partir de los tokens de diseño

### Aplicación Android — vinculación

- [ ] Implementar pantalla de bienvenida
- [ ] Implementar ingreso manual de código
- [ ] Implementar lectura de código QR
- [ ] Implementar confirmación con el nombre del negocio
- [ ] Implementar persistencia segura del token

### Aplicación Android — permisos

- [ ] Implementar pantalla de solicitud de acceso a notificaciones
- [ ] Implementar apertura directa de los ajustes correspondientes
- [ ] Implementar detección automática del estado del permiso
- [ ] Implementar solicitud de exclusión de optimización de batería
- [ ] Implementar detección de fabricante e instrucciones específicas
- [ ] Implementar la lista de verificación final

### Aplicación Android — servicio

- [ ] Implementar el servicio en primer plano con notificación persistente
- [ ] Implementar el trabajador de señal de vida
- [ ] Implementar el receptor de arranque del dispositivo
- [ ] Implementar la pantalla de estado operativo

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
- [ ] La ausencia de señal por más de quince minutos marca el dispositivo como desconectado

---

## 5. Sprint 4 — Captura, ingesta y parsing

**Objetivo:** convertir una notificación real de billetera en una transacción persistida.

### Aplicación Android — captura

- [ ] Implementar el servicio de escucha de notificaciones
- [ ] Implementar el filtrado por paquetes monitoreados
- [ ] Implementar la extracción de título, cuerpo y marca temporal
- [ ] Implementar la inserción inmediata en la cola local
- [ ] Implementar el trabajador de sincronización con envío por lotes
- [ ] Implementar el reintento con espera creciente
- [ ] Implementar la eliminación de la cola solo tras confirmación del servidor
- [ ] Implementar el indicador de elementos pendientes
- [ ] Implementar la alerta ante pérdida del permiso

### Backend — ingesta

- [ ] Implementar el endpoint de ingesta con autenticación por token de dispositivo
- [ ] Implementar la aceptación de lotes
- [ ] Implementar el cálculo de huella para deduplicación
- [ ] Implementar la persistencia íntegra de la notificación cruda
- [ ] Implementar la validación del límite de transacciones del plan
- [ ] Implementar el encolado del trabajo de parsing
- [ ] Implementar la respuesta diferenciada para elementos duplicados

### Backend — parsing

- [ ] Definir el contrato del parser en el dominio
- [ ] Implementar el registro de parsers con selección por paquete
- [ ] Implementar el cargador de patrones desde base de datos con caché
- [ ] Implementar el parser de Yape
- [ ] Implementar el parser de Plin BBVA
- [ ] Implementar el parser de Plin Interbank
- [ ] Implementar el parser de BIM
- [ ] Implementar el modelo normalizado de salida
- [ ] Implementar el manejo de notificaciones sin coincidencia
- [ ] Implementar el trabajador que consume la cola de parsing
- [ ] Implementar la creación de la transacción a partir del resultado
- [ ] Implementar el cifrado del nombre del remitente
- [ ] Implementar la emisión del evento de dominio

### Pruebas de parsers

- [ ] Recolectar muestras reales de cada billetera
- [ ] Anonimizar las muestras conservando la estructura
- [ ] Construir la suite de pruebas por parser
- [ ] Verificar cobertura mínima del ochenta por ciento en el módulo
- [ ] Incluir casos límite: montos con separador de miles, nombres con caracteres especiales, ausencia de código de seguridad

### Administración de parsers

- [ ] Implementar el listado de versiones por billetera
- [ ] Implementar la creación de versión
- [ ] Implementar la prueba de una versión contra muestras almacenadas
- [ ] Implementar la activación de versión
- [ ] Implementar la consulta de notificaciones sin coincidencia

### Criterios de aceptación

- [ ] Un cobro real por Yape produce una transacción con monto, remitente y código correctos
- [ ] Un cobro real por Plin produce una transacción correcta
- [ ] Sin conectividad, la notificación se conserva y se envía al restablecerse
- [ ] Una notificación duplicada no genera una segunda transacción
- [ ] Una notificación sin parser coincidente queda registrada para revisión
- [ ] Modificar los patrones desde la base de datos altera el resultado sin redespliegue

---

## 6. Sprint 5 — Panel de transacciones y tiempo real

**Objetivo:** el negocio visualiza sus cobros en el momento en que ocurren.

### Backend

- [ ] Implementar el listado de transacciones con paginación por cursor
- [ ] Implementar los filtros: rango de fechas, billetera, dispositivo, estado, monto
- [ ] Implementar la búsqueda por nombre de remitente
- [ ] Implementar el detalle de transacción
- [ ] Implementar la confirmación de transacción
- [ ] Implementar la disputa de transacción
- [ ] Implementar el resumen agregado por período
- [ ] Implementar la exportación asíncrona a archivo separado por comas
- [ ] Implementar el gateway de tiempo real con autenticación
- [ ] Implementar el adaptador de distribución entre instancias
- [ ] Implementar la emisión de eventos al canal del tenant

### Panel

- [ ] Implementar la vista de transacciones con listado
- [ ] Implementar el componente de tarjeta de transacción
- [ ] Implementar la barra de filtros
- [ ] Implementar la búsqueda incremental
- [ ] Implementar el panel de detalle
- [ ] Implementar las acciones de confirmación y disputa
- [ ] Implementar el cliente de tiempo real con reconexión automática
- [ ] Implementar la actualización de la vista ante evento entrante
- [ ] Implementar el indicador de conexión activa
- [ ] Implementar la vista de resumen con métricas del período
- [ ] Implementar la exportación desde la interfaz
- [ ] Implementar los cuatro estados en cada vista

### Criterios de aceptación

- [ ] Un cobro real aparece en el panel en menos de dos segundos sin recargar
- [ ] El código de seguridad es legible a distancia de brazo en un teléfono
- [ ] Los filtros producen resultados correctos y componibles
- [ ] La confirmación registra el usuario y la marca temporal
- [ ] La reconexión tras pérdida de red resincroniza el estado
- [ ] La exportación genera un archivo con los registros filtrados

---

## 7. Sprint 6 — API pública y webhooks

**Objetivo:** un sistema externo se integra con Yallegó.

### Claves de API

- [ ] Implementar la generación con alcances
- [ ] Implementar el almacenamiento por huella
- [ ] Implementar la verificación con caché
- [ ] Implementar la revocación
- [ ] Implementar el registro de último uso
- [ ] Implementar el guard de autenticación por clave
- [ ] Implementar el guard de verificación de alcances
- [ ] Implementar la limitación de tasa por clave según plan

### Webhooks — configuración

- [ ] Implementar el registro de endpoint con validación de dirección
- [ ] Implementar la prevención de solicitudes a redes internas
- [ ] Implementar la generación y cifrado del secreto
- [ ] Implementar la suscripción a eventos
- [ ] Implementar la modificación y eliminación
- [ ] Implementar la rotación de secreto con ventana de transición
- [ ] Implementar el envío de evento de prueba
- [ ] Implementar la validación del límite según plan

### Webhooks — entrega

- [ ] Implementar la cola de entregas
- [ ] Implementar el trabajador de despacho
- [ ] Implementar la construcción del payload versionado
- [ ] Implementar el cálculo de la firma
- [ ] Implementar el cliente HTTP con tiempo límite estricto
- [ ] Implementar la política de reintentos con espera creciente
- [ ] Implementar el registro de cada intento
- [ ] Implementar el manejo diferenciado por código de respuesta
- [ ] Implementar la desactivación automática tras fallos sostenidos
- [ ] Implementar el reintento manual
- [ ] Implementar la notificación al tenant ante desactivación

### API pública

- [ ] Exponer los endpoints de consulta de transacciones
- [ ] Exponer los endpoints de gestión de webhooks
- [ ] Exponer los endpoints de estado de dispositivos
- [ ] Implementar el formato uniforme de error
- [ ] Implementar las cabeceras de limitación de tasa
- [ ] Restringir el acceso al canal de tiempo real según plan
- [ ] Generar la especificación de la interfaz

### Documentación

- [ ] Crear el sitio de documentación
- [ ] Redactar la guía de inicio rápido
- [ ] Documentar la autenticación
- [ ] Documentar cada endpoint con ejemplos
- [ ] Documentar el catálogo de eventos
- [ ] Documentar la verificación de firma con ejemplos en varios lenguajes
- [ ] Documentar la política de reintentos
- [ ] Documentar los límites de tasa

### Panel

- [ ] Implementar la vista de claves de API
- [ ] Implementar la vista de webhooks
- [ ] Implementar el historial de entregas con detalle expandible
- [ ] Implementar el reintento manual desde la interfaz

### Criterios de aceptación

- [ ] Un integrador consume la API con una clave y obtiene transacciones
- [ ] Una clave sin el alcance requerido recibe una respuesta de acceso denegado
- [ ] Un cobro real dispara la entrega al endpoint configurado en menos de tres segundos
- [ ] La firma se verifica correctamente siguiendo la documentación
- [ ] Un endpoint caído genera reintentos según la política definida
- [ ] Al restablecerse el endpoint, la entrega pendiente se completa
- [ ] Superar el límite de tasa produce la respuesta correspondiente con cabeceras informativas

---

## 8. Sprint 7 — Membresías, límites y auditoría

**Objetivo:** el modelo de negocio opera y toda acción queda trazada.

### Planes y límites

- [ ] Implementar la consulta del plan vigente con sus límites
- [ ] Implementar el servicio de verificación de límites
- [ ] Aplicar la verificación en cada punto correspondiente
- [ ] Implementar los contadores de uso por período
- [ ] Implementar el incremento de contadores ante cada evento contabilizable
- [ ] Implementar el cierre y apertura de período mediante tarea programada
- [ ] Implementar las notificaciones al alcanzar umbrales de consumo
- [ ] Implementar la respuesta uniforme ante límite alcanzado

### Cambio de plan

- [ ] Implementar la solicitud de cambio
- [ ] Implementar la aplicación inmediata al mejorar de plan
- [ ] Implementar la aplicación diferida al reducir de plan
- [ ] Implementar el registro histórico de cambios
- [ ] Implementar la confirmación de pago manual desde administración
- [ ] Implementar la activación tras confirmación
- [ ] Implementar la notificación al tenant

### Retención

- [ ] Implementar la tarea de eliminación por vencimiento de retención
- [ ] Implementar el archivado de notificaciones crudas antiguas
- [ ] Implementar la limpieza de tokens vencidos

### Auditoría

- [ ] Implementar el servicio de registro de eventos
- [ ] Instrumentar todas las acciones definidas como auditables
- [ ] Implementar la restricción de modificación a nivel de motor
- [ ] Implementar la consulta con filtros
- [ ] Implementar la exportación

### Panel

- [ ] Implementar la vista de membresía con consumo
- [ ] Implementar la comparación de planes
- [ ] Implementar el flujo de solicitud de cambio
- [ ] Implementar los avisos de consumo
- [ ] Implementar la vista de auditoría

### Administración de plataforma

- [ ] Implementar el registro de pagos manuales
- [ ] Implementar la aplicación de cambio de plan
- [ ] Implementar la concesión de planes de cortesía
- [ ] Implementar el panel de métricas globales

### Criterios de aceptación

- [ ] Alcanzar el límite de transacciones detiene la ingesta con mensaje claro
- [ ] Los elementos rechazados por límite permanecen en la cola del dispositivo
- [ ] Al mejorar de plan, los nuevos límites aplican de inmediato
- [ ] Toda acción sensible aparece en el registro de auditoría
- [ ] El registro de auditoría no admite modificación por ninguna vía
- [ ] Los datos vencidos se eliminan según la retención del plan

---

## 9. Sprint 8 — Endurecimiento, observabilidad y despliegue

**Objetivo:** el sistema opera en producción de forma confiable y observable.

### Observabilidad

- [ ] Implementar registro estructurado con identificador de correlación
- [ ] Implementar la exposición de métricas de aplicación
- [ ] Instrumentar trazas en los flujos críticos
- [ ] Implementar el endpoint de verificación de salud
- [ ] Configurar la recolección de registros
- [ ] Configurar los tableros de monitoreo
- [ ] Configurar las alertas definidas
- [ ] Integrar el seguimiento de errores no controlados
- [ ] Publicar la página de estado del servicio

### Seguridad

- [ ] Aplicar las cabeceras de seguridad
- [ ] Verificar la política de seguridad de contenido
- [ ] Ejecutar auditoría de dependencias
- [ ] Ejecutar análisis estático
- [ ] Verificar ausencia de secretos en el historial
- [ ] Ejecutar la suite de pruebas de aislamiento entre tenants
- [ ] Revisar la configuración de red de la aplicación Android
- [ ] Aplicar ofuscación en la compilación de publicación
- [ ] Revisar manualmente las superficies de mayor riesgo

### Rendimiento

- [ ] Ejecutar pruebas de carga sobre el endpoint de ingesta
- [ ] Ejecutar pruebas de carga sobre la API de consulta
- [ ] Verificar el comportamiento del canal de tiempo real con múltiples conexiones
- [ ] Revisar los planes de ejecución de las consultas principales
- [ ] Ajustar índices según los hallazgos
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
