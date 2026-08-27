# 07 — Seguridad y Autenticación

> **Versión:** 1.0

---

## 1. Decisión de estrategia de autenticación

### 1.1. Opciones evaluadas

| Opción                                                                   | Ventajas                                                                            | Desventajas para este contexto                                                                   | Veredicto           |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------- |
| **Sesiones con cookie de servidor**                                      | Revocación inmediata, simple                                                        | Requiere estado compartido; complica el escalado horizontal y la API pública                     | ❌                  |
| **OAuth 2.0 completo con servidor de autorización propio**               | Estándar de industria, delegación de terceros                                       | Complejidad desproporcionada: no hay terceros solicitando acceso en nombre de usuarios en el MVP | ❌                  |
| **Proveedor de identidad externo gestionado**                            | Delega el riesgo, funcionalidades listas                                            | Dependencia de proveedor, costo por usuario activo, menor control sobre el modelo multi-tenant   | ❌                  |
| **JWT con rotación de refresh token + API keys + tokens de dispositivo** | Backend sin estado, cada audiencia con el mecanismo adecuado a su modelo de amenaza | Requiere implementar cuidadosamente la revocación                                                | ✅ **Seleccionado** |

### 1.2. Justificación

El sistema tiene **cuatro audiencias con modelos de amenaza distintos**. Aplicar un mecanismo único a todas sería incorrecto:

| Audiencia                     | Característica                                                              | Mecanismo adecuado                                                |
| ----------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Usuarios del panel            | Sesión interactiva, navegador, riesgo de XSS/CSRF                           | JWT de vida corta + refresh token rotativo en cookie `HttpOnly`   |
| Integradores externos         | Servidor a servidor, credencial de larga vida, sin interacción              | API key con alcances y revocación                                 |
| Dispositivos Android          | Instalación permanente, credencial en almacenamiento seguro del dispositivo | Token de dispositivo de larga vida, revocable, con alcance mínimo |
| Administradores de plataforma | Acceso privilegiado, superficie crítica                                     | JWT + segundo factor obligatorio + dominio separado               |

**OAuth 2.0 se contempla para v1.0**, cuando existan aplicaciones de terceros que necesiten actuar en nombre de un usuario (flujo de autorización). Para el MVP, donde el integrador actúa en nombre propio del tenant, la API key es el mecanismo correcto y estándar (es el modelo de Stripe, Resend y la mayoría de APIs de infraestructura).

---

## 2. Autenticación de usuarios del panel

### 2.1. Estructura del access token

```json
{
  "sub": "9f8c2a1e-...",
  "email": "dueno@negocio.pe",
  "tid": "3f6a8c2e-...",
  "role": "OWNER",
  "type": "access",
  "jti": "8c2e1b5d-...",
  "iat": 1747250400,
  "exp": 1747251300,
  "iss": "https://api.yallego.app",
  "aud": "yallego-dashboard"
}
```

| Campo  | Significado                                          |
| ------ | ---------------------------------------------------- |
| `sub`  | Identificador del usuario                            |
| `tid`  | Tenant activo en la sesión                           |
| `role` | Rol del usuario en ese tenant                        |
| `jti`  | Identificador único del token, usado para revocación |

### 2.2. Parámetros

| Parámetro                        | Valor                                          | Justificación                                                        |
| -------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| Algoritmo de firma               | `RS256`                                        | Clave asimétrica: permite verificación sin exponer la clave de firma |
| Vigencia del access token        | 15 minutos                                     | Ventana corta de exposición ante robo                                |
| Vigencia del refresh token       | 30 días                                        | Equilibrio entre comodidad y riesgo                                  |
| Rotación del refresh token       | En cada uso                                    | Permite detectar reutilización                                       |
| Almacenamiento del refresh token | Cookie `HttpOnly`, `Secure`, `SameSite=Strict` | Inaccesible desde JavaScript                                         |
| Almacenamiento del access token  | Memoria del cliente                            | Nunca en `localStorage`                                              |

### 2.3. Rotación y detección de robo

```
1. El cliente presenta el refresh token RT₁
2. El servidor valida RT₁ y verifica que no esté revocado
3. Emite access token nuevo y refresh token RT₂
4. Marca RT₁ como revocado, con referencia a RT₂
5. Si posteriormente se presenta RT₁ nuevamente:
      → indica robo o clonación de la credencial
      → se revoca toda la cadena de tokens del usuario
      → se fuerza reautenticación
      → se registra el evento en auditoría
```

Esta técnica (_refresh token rotation with reuse detection_) es el mecanismo estándar recomendado para detectar exfiltración de credenciales de sesión.

### 2.4. Cambio de tenant activo

Un usuario perteneciente a varios tenants solicita un nuevo access token indicando el tenant destino. El servidor verifica la membresía y emite un token con el `tid` y `role` correspondientes. El refresh token no se ve afectado.

### 2.5. Política de contraseñas

| Regla                                                                                             |
| ------------------------------------------------------------------------------------------------- |
| Longitud mínima: 10 caracteres                                                                    |
| Verificación contra listas de contraseñas comprometidas conocidas                                 |
| Sin exigencia de composición arbitraria (mayúsculas, símbolos), conforme a guías actuales de NIST |
| Hash con Argon2id: memoria 64 MB, iteraciones 3, paralelismo 4                                    |
| Bloqueo temporal tras 5 intentos fallidos en 15 minutos                                           |
| Al restablecer contraseña se revocan todas las sesiones activas                                   |

---

## 3. Autenticación de integradores (API keys)

### 3.1. Formato

```
yk_live_9f8c2a1e4b7d3f6a8c2e1b5d7f9a3c6e
│  │    └── 32 caracteres aleatorios (entropía criptográfica)
│  └─────── entorno: live | test
└────────── prefijo identificador del producto
```

### 3.2. Almacenamiento y verificación

| Aspecto                    | Definición                                                                     |
| -------------------------- | ------------------------------------------------------------------------------ |
| Persistencia               | Únicamente el hash SHA-256 de la clave completa                                |
| Visibilidad                | El valor completo se muestra una sola vez, al crearse                          |
| Identificación en interfaz | Mediante el prefijo (primeros 16 caracteres)                                   |
| Verificación               | Hash de la clave presentada, búsqueda por índice sobre el hash                 |
| Caché                      | El resultado de verificación se cachea 60 segundos en Redis para reducir carga |
| Revocación                 | Inmediata; se invalida la entrada de caché                                     |

### 3.3. Modelo de alcances

Cada clave declara explícitamente qué operaciones permite. La ausencia de un alcance produce `403 FORBIDDEN`.

| Alcance              | Operaciones                           |
| -------------------- | ------------------------------------- |
| `transactions:read`  | Consulta de transacciones y resúmenes |
| `transactions:write` | Confirmación y disputa                |
| `devices:read`       | Consulta de estado de dispositivos    |
| `webhooks:read`      | Consulta de endpoints y entregas      |
| `webhooks:write`     | Gestión de endpoints                  |
| `realtime:subscribe` | Conexión al canal de tiempo real      |

### 3.4. Buenas prácticas comunicadas al integrador

La documentación pública indica explícitamente: transmitir la clave únicamente en la cabecera `Authorization`, nunca en parámetros de URL; almacenarla como variable de entorno; usar claves distintas por entorno y por integración; rotarla periódicamente.

---

## 4. Autenticación de dispositivos

### 4.1. Vinculación

```
1. Un usuario con rol ADMIN u OWNER genera un código de vinculación
2. El código tiene 8 caracteres, vigencia de 10 minutos y un solo uso
3. La base de datos almacena únicamente el hash del código
4. La app lo recibe por ingreso manual o escaneo de código QR
5. La app envía el código junto con los metadatos del dispositivo
6. El servidor valida vigencia, unicidad y límite de dispositivos del plan
7. Emite un token de dispositivo permanente
8. Marca el código como consumido
9. Registra el evento en auditoría
```

### 4.2. Token de dispositivo

| Aspecto                        | Definición                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| Formato                        | `dvt_` + 32 caracteres aleatorios                                                      |
| Vigencia                       | Indefinida hasta revocación explícita                                                  |
| Persistencia en servidor       | Solo el hash                                                                           |
| Persistencia en el dispositivo | Almacenamiento cifrado del sistema (`EncryptedSharedPreferences`)                      |
| Alcance                        | Exclusivamente `/internal/v1/ingest`, `/internal/v1/heartbeat` y `/internal/v1/config` |
| Revocación                     | Desde el panel; efecto inmediato                                                       |

### 4.3. Principio de privilegio mínimo

El token de dispositivo **no permite leer transacciones, consultar datos del tenant ni realizar ninguna operación de lectura sobre el negocio**. Su único privilegio es escribir notificaciones entrantes y reportar estado. Un dispositivo comprometido no expone el historial del negocio.

---

## 5. Autorización

### 5.1. Modelo

Control de acceso basado en roles, evaluado en dos dimensiones:

```
¿El recurso pertenece al tenant activo?     → aislamiento (RLS + guard)
¿El rol permite esta operación?             → autorización (guard de rol)
```

### 5.2. Matriz de permisos

| Operación                          | OWNER | ADMIN | OPERATOR | VIEWER |
| ---------------------------------- | :---: | :---: | :------: | :----: |
| Ver transacciones                  |  ✅   |  ✅   |    ✅    |   ✅   |
| Confirmar / disputar transacciones |  ✅   |  ✅   |    ✅    |   ❌   |
| Exportar datos                     |  ✅   |  ✅   |    ✅    |   ✅   |
| Gestionar dispositivos             |  ✅   |  ✅   |    ❌    |   ❌   |
| Gestionar billeteras               |  ✅   |  ✅   |    ❌    |   ❌   |
| Invitar / remover miembros         |  ✅   |  ✅   |    ❌    |   ❌   |
| Asignar roles                      |  ✅   |  ❌   |    ❌    |   ❌   |
| Gestionar API keys                 |  ✅   |  ✅   |    ❌    |   ❌   |
| Gestionar webhooks                 |  ✅   |  ✅   |    ❌    |   ❌   |
| Consultar auditoría                |  ✅   |  ✅   |    ❌    |   ❌   |
| Gestionar suscripción              |  ✅   |  ❌   |    ❌    |   ❌   |
| Editar datos del tenant            |  ✅   |  ✅   |    ❌    |   ❌   |
| Eliminar tenant                    |  ✅   |  ❌   |    ❌    |   ❌   |

### 5.3. Invariantes

| Invariante                               | Aplicación                            |
| ---------------------------------------- | ------------------------------------- |
| Todo tenant tiene exactamente un OWNER   | Índice único parcial en base de datos |
| El OWNER no puede degradarse a sí mismo  | Validación en el caso de uso          |
| El OWNER no puede ser removido           | Validación en el caso de uso          |
| La transferencia de propiedad es atómica | Transacción de base de datos          |

---

## 6. Aislamiento entre tenants

### 6.1. Defensa en profundidad

```
Capa 1 — Guard de aplicación
  Extrae el tenant del token o API key.
  Ningún endpoint acepta el tenant como parámetro del cliente.

Capa 2 — Contexto de persistencia
  Antes de cada transacción se establece la variable de sesión
  correspondiente al tenant.

Capa 3 — Row Level Security
  Las políticas del motor filtran cada consulta.
  Un error en las capas anteriores no produce fuga de datos.

Capa 4 — Auditoría
  Toda operación registra el tenant. Los patrones anómalos son detectables.
```

### 6.2. Regla fundamental

> El identificador de tenant **nunca** proviene del cuerpo, de los parámetros de consulta ni de una cabecera controlada por el cliente. Se deriva exclusivamente de la credencial autenticada.

### 6.3. Verificación

La suite de pruebas incluye casos explícitos que intentan acceder a recursos de otro tenant usando identificadores válidos, verificando que la respuesta sea `404 NOT_FOUND` y no `403`, para evitar confirmar la existencia del recurso.

---

## 7. Protección de datos

### 7.1. Clasificación

| Dato                                | Clasificación              | Tratamiento                                       |
| ----------------------------------- | -------------------------- | ------------------------------------------------- |
| Contraseñas                         | Crítico                    | Hash Argon2id; nunca recuperable                  |
| API keys                            | Crítico                    | Hash SHA-256; valor mostrado una sola vez         |
| Tokens de dispositivo               | Crítico                    | Hash en servidor; cifrado en el dispositivo       |
| Secretos de webhook                 | Crítico                    | Cifrado simétrico en reposo                       |
| Nombre del emisor de la transacción | Sensible (dato de tercero) | Cifrado en reposo; columna auxiliar para búsqueda |
| Montos y códigos                    | Interno                    | Sin cifrado adicional; protegido por aislamiento  |
| Metadatos de dispositivo            | Interno                    | Sin cifrado adicional                             |

### 7.2. Cifrado de datos de terceros

El nombre del remitente pertenece a una persona que **no es cliente de Yallegó** y no otorgó consentimiento directo. Recibe tratamiento reforzado:

- Cifrado simétrico autenticado en reposo
- Clave gestionada fuera de la base de datos
- Columna auxiliar normalizada para permitir búsqueda sin descifrar el conjunto completo
- Excluido de registros de aplicación y de mensajes de error

### 7.3. Cifrado en tránsito

| Regla                                                               |
| ------------------------------------------------------------------- |
| TLS 1.2 como mínimo en todos los endpoints                          |
| Redirección obligatoria de HTTP a HTTPS                             |
| HSTS con `max-age` de un año e inclusión de subdominios             |
| Las URLs de webhook deben ser HTTPS; se rechazan las que no lo sean |

---

## 8. Seguridad de webhooks salientes

### 8.1. Firma

Cada entrega incluye una firma HMAC-SHA256 calculada sobre la concatenación de la marca temporal y el cuerpo crudo. El integrador verifica con comparación de tiempo constante.

### 8.2. Prevención de repetición

La marca temporal se incluye dentro del contenido firmado. La documentación indica rechazar eventos con antigüedad superior a 5 minutos.

### 8.3. Idempotencia

Cada evento porta un identificador único estable entre reintentos. El integrador debe usarlo para descartar procesamiento duplicado.

### 8.4. Prevención de SSRF

Antes de registrar un endpoint se valida:

| Validación                                                                                                      |
| --------------------------------------------------------------------------------------------------------------- |
| El esquema debe ser HTTPS                                                                                       |
| Se resuelve el nombre de dominio y se rechazan direcciones de rango privado, loopback, enlace local y multicast |
| Se rechazan puertos no estándar fuera de una lista permitida                                                    |
| Se limita el número de redirecciones seguidas                                                                   |
| El cliente HTTP opera con timeout estricto                                                                      |

### 8.5. Rotación de secretos

El tenant puede rotar el secreto de un endpoint. Durante una ventana de 24 horas se aceptan ambos secretos, permitiendo actualizar el sistema receptor sin interrupción.

---

## 9. Seguridad de la aplicación Android

| Medida                            | Implementación                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| Almacenamiento del token          | `EncryptedSharedPreferences` respaldado por el almacén de claves del sistema                     |
| Comunicación                      | Exclusivamente HTTPS; se deshabilita tráfico en claro mediante configuración de seguridad de red |
| Fijación de certificado           | Contemplado para v0.2, con plan de rotación                                                      |
| Ofuscación                        | R8 con reglas de retención mínimas en compilaciones de publicación                               |
| Detección de entorno comprometido | Advertencia no bloqueante ante indicios de dispositivo con acceso root                           |
| Respaldo del sistema              | Excluido para los archivos que contienen credenciales                                            |
| Registros                         | Deshabilitados en compilaciones de publicación                                                   |
| Exportación de componentes        | Todos los componentes declarados como no exportables salvo los estrictamente necesarios          |

---

## 10. Seguridad del panel administrativo

| Medida                             | Implementación                                                                                            |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Política de seguridad de contenido | Restrictiva, sin `unsafe-inline` en scripts                                                               |
| Protección contra incrustación     | `X-Frame-Options: DENY`                                                                                   |
| Tipo de contenido                  | `X-Content-Type-Options: nosniff`                                                                         |
| Referencia de origen               | `Referrer-Policy: strict-origin-when-cross-origin`                                                        |
| Permisos del navegador             | `Permissions-Policy` restrictiva                                                                          |
| CSRF                               | Mitigado por `SameSite=Strict` en la cookie de refresh y uso de cabecera `Authorization` para operaciones |
| XSS                                | Escapado automático del framework; sin inserción de HTML sin sanitizar                                    |
| Dependencias                       | Auditoría automática en integración continua                                                              |

---

## 11. Administración de plataforma

Superficie de máximo privilegio; controles reforzados:

| Control                                                                              |
| ------------------------------------------------------------------------------------ |
| Dominio y aplicación separados del panel de tenants                                  |
| Autenticación independiente, sin relación con las cuentas de tenant                  |
| Segundo factor obligatorio (TOTP)                                                    |
| Vigencia de sesión reducida a 30 minutos con renovación por actividad                |
| Restricción por lista de direcciones IP permitidas                                   |
| Toda acción registrada en auditoría, sin excepción                                   |
| Acceso a datos de tenant únicamente mediante procedimientos explícitos y registrados |
| El acceso a datos personales requiere justificación registrada                       |

---

## 12. Registro de auditoría

### 12.1. Eventos registrados obligatoriamente

| Categoría     | Eventos                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| Autenticación | Inicio de sesión, cierre de sesión, fallo de autenticación, bloqueo de cuenta, restablecimiento de contraseña |
| Tenant        | Creación, actualización, suspensión, solicitud de eliminación                                                 |
| Miembros      | Invitación, aceptación, cambio de rol, remoción, transferencia de propiedad                                   |
| Dispositivos  | Generación de código, vinculación, pausa, revocación                                                          |
| Credenciales  | Creación y revocación de API keys, rotación de secretos de webhook                                            |
| Webhooks      | Creación, modificación, eliminación, reintento manual                                                         |
| Transacciones | Confirmación, disputa                                                                                         |
| Facturación   | Cambio de plan, registro de pago                                                                              |
| Plataforma    | Toda acción administrativa                                                                                    |

### 12.2. Estructura del registro

```json
{
  "id": "...",
  "tenant_id": "...",
  "actor_type": "USER",
  "actor_user_id": "...",
  "action": "api_key.created",
  "resource_type": "api_key",
  "resource_id": "...",
  "metadata": { "label": "Integración POS", "scopes": ["transactions:read"] },
  "ip_address": "190.x.x.x",
  "user_agent": "Mozilla/5.0 ...",
  "created_at": "2026-05-14T18:45:00Z"
}
```

### 12.3. Garantía de integridad

El registro es de solo inserción. Se revocan a nivel de motor los permisos de actualización y eliminación. Ninguna ruta de la aplicación expone modificación.

---

## 13. Gestión de secretos

| Regla                                                                                               |
| --------------------------------------------------------------------------------------------------- |
| Ningún secreto se versiona en el repositorio                                                        |
| Los secretos se inyectan como variables de entorno desde el gestor del entorno de despliegue        |
| El esquema de variables se valida al arranque; la aplicación no inicia con configuración incompleta |
| Los secretos se rotan ante cualquier sospecha de exposición                                         |
| Se emplean secretos distintos por entorno                                                           |
| El repositorio incluye análisis automático de secretos filtrados en cada integración                |

---

## 14. Cumplimiento normativo

### 14.1. Ley 29733 — Protección de Datos Personales (Perú)

| Obligación               | Implementación                                                                                                         |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Consentimiento informado | El tenant acepta condiciones explícitas al vincular un dispositivo, declarando su rol como responsable del tratamiento |
| Finalidad determinada    | La política de privacidad detalla qué datos se capturan y con qué propósito                                            |
| Proporcionalidad         | Solo se capturan notificaciones de las billeteras activadas por el tenant                                              |
| Seguridad                | Cifrado en tránsito y en reposo, control de acceso, auditoría                                                          |
| Derecho de acceso        | Exportación completa de datos disponible para el tenant                                                                |
| Derecho de supresión     | Procedimiento de eliminación definitiva disponible                                                                     |
| Conservación limitada    | Retención automática según plan; eliminación programada                                                                |

### 14.2. Rol de Yallegó

Yallegó actúa como **encargado del tratamiento**; el tenant es el **responsable**. Esta relación se documenta en las condiciones de servicio, incluyendo las obligaciones de cada parte.

---

## 15. Respuesta a incidentes

### 15.1. Clasificación

| Severidad   | Definición                                                                                 | Tiempo de respuesta |
| ----------- | ------------------------------------------------------------------------------------------ | ------------------- |
| **Crítica** | Fuga de datos entre tenants, compromiso de credenciales, acceso no autorizado a producción | Inmediata           |
| **Alta**    | Vulnerabilidad explotable sin evidencia de explotación, indisponibilidad total             | 4 horas             |
| **Media**   | Vulnerabilidad de impacto limitado, degradación parcial                                    | 24 horas            |
| **Baja**    | Hallazgo sin impacto directo                                                               | 7 días              |

### 15.2. Procedimiento

```
1. Contención     — limitar el alcance del incidente
2. Evaluación     — determinar datos y tenants afectados
3. Erradicación   — corregir la causa raíz
4. Recuperación   — restablecer el servicio y verificar integridad
5. Notificación   — informar a los tenants afectados y a la autoridad si corresponde
6. Análisis       — documentar causa raíz y acciones preventivas
```

### 15.3. Canal de divulgación responsable

Se publica una dirección de contacto para reporte de vulnerabilidades, con compromiso de acuse de recibo en 48 horas y no ejercicio de acciones legales ante investigación de buena fe.

---

## 16. Verificaciones de seguridad en integración continua

| Verificación                                             | Momento                     |
| -------------------------------------------------------- | --------------------------- |
| Auditoría de dependencias con vulnerabilidades conocidas | Cada solicitud de cambio    |
| Análisis estático de código                              | Cada solicitud de cambio    |
| Detección de secretos en el historial                    | Cada solicitud de cambio    |
| Pruebas de aislamiento entre tenants                     | Cada solicitud de cambio    |
| Verificación de cabeceras de seguridad                   | Despliegue a preproducción  |
| Revisión manual de seguridad                             | Antes de cada versión mayor |
