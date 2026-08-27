# 08 — Flujos de Experiencia de Usuario

> **Versión:** 1.0

---

## 1. Actores del sistema

| Actor                           | Contexto de uso                                    | Dispositivo principal           |
| ------------------------------- | -------------------------------------------------- | ------------------------------- |
| **Dueño (OWNER)**               | Configura el negocio, gestiona el plan y el equipo | Navegador móvil o de escritorio |
| **Administrador (ADMIN)**       | Gestiona operación diaria e integraciones          | Navegador de escritorio         |
| **Operador (OPERATOR)**         | Consulta y confirma cobros durante la jornada      | Navegador móvil                 |
| **Observador (VIEWER)**         | Consulta sin modificar                             | Cualquiera                      |
| **Integrador**                  | Consume la API desde su propio sistema             | Terminal, editor de código      |
| **Administrador de plataforma** | Opera Yallegó                                      | Navegador de escritorio         |

---

## 2. Mapa de navegación del panel

```
/login
/registro
/verificar-correo
/recuperar-clave
/invitacion/{token}
│
└── /app                              (requiere sesión)
    ├── /                             Resumen
    ├── /transacciones                Listado y detalle
    ├── /dispositivos                 Gestión de dispositivos
    │   └── /vincular                 Asistente de vinculación
    ├── /billeteras                   Billeteras activas
    ├── /equipo                       Miembros e invitaciones
    ├── /integraciones
    │   ├── /claves-api               API keys
    │   └── /webhooks                 Endpoints y entregas
    ├── /membresia                    Plan, consumo y cambio
    ├── /auditoria                    Registro de actividad
    └── /configuracion                Datos del negocio y preferencias
```

---

## 3. Flujo: registro y primera configuración

Este es el flujo más crítico del producto. Si el usuario no completa la vinculación del dispositivo, el producto no entrega valor alguno.

```
┌─────────────────────────────────────────────────────────────────┐
│ PASO 1 — Registro                                               │
│ Formulario: nombre del negocio, nombre completo, correo, clave  │
│ Acción: crear cuenta                                            │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 2 — Verificación de correo                                 │
│ Pantalla de espera con instrucciones y opción de reenvío        │
│ El usuario abre el enlace recibido                              │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 3 — Selección de billeteras                                │
│ "¿Qué billeteras usas para cobrar?"                             │
│ Selección múltiple con logotipos                                │
│ Indicador: plan Free permite una billetera                      │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 4 — Vinculación del dispositivo                            │
│ Explicación breve: se requiere un celular Android donde llegan  │
│ las notificaciones de la billetera                              │
│ Se muestra código QR y código alfanumérico                      │
│ Enlace de descarga de la aplicación                             │
│ Estado en vivo: "Esperando vinculación..."                      │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 5 — Confirmación de recepción                              │
│ "Realiza un cobro de prueba para verificar la conexión"         │
│ El panel espera la primera transacción y la muestra al llegar   │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ PASO 6 — Listo                                                  │
│ Confirmación de configuración completa                          │
│ Sugerencias: invitar al equipo, explorar integraciones          │
└─────────────────────────────────────────────────────────────────┘
```

**Principios aplicados:**

| Principio                                  | Aplicación                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Valor demostrado antes de pedir compromiso | El usuario ve su primera transacción real antes de cualquier consideración de pago |
| Un objetivo por pantalla                   | Cada paso solicita una sola decisión                                               |
| Progreso visible                           | Indicador de paso actual sobre el total                                            |
| Recuperable                                | El usuario puede abandonar y retomar; el estado se conserva                        |
| Sin jerga técnica                          | No se mencionan términos como "listener", "API" o "parser"                         |

---

## 4. Flujo: configuración de la aplicación Android

Este flujo determina la fiabilidad del sistema. Un permiso mal configurado produce pérdida silenciosa de transacciones.

```
┌─────────────────────────────────────────────────────────────────┐
│ PANTALLA 1 — Bienvenida                                         │
│ Explicación en una frase de qué hace la aplicación              │
│ Botón: comenzar                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ PANTALLA 2 — Vinculación                                        │
│ Opción A: escanear código QR mostrado en el panel               │
│ Opción B: ingresar código manualmente                           │
│ Al validar: se muestra el nombre del negocio para confirmación  │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ PANTALLA 3 — Permiso de acceso a notificaciones                 │
│ Explicación de por qué se necesita, en lenguaje claro           │
│ Botón que abre directamente la pantalla de ajustes del sistema  │
│ Detección automática al regresar; avance sin acción adicional   │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ PANTALLA 4 — Optimización de batería                            │
│ Explicación: el sistema podría detener la aplicación            │
│ Botón que abre el diálogo del sistema                           │
│ Verificación automática del estado                              │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ PANTALLA 5 — Ajustes del fabricante  (condicional)              │
│ Se muestra solo si el fabricante requiere configuración extra   │
│ Instrucciones ilustradas específicas del modelo detectado       │
│ Opción de omitir con advertencia sobre el riesgo                │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ PANTALLA 6 — Verificación                                       │
│ Lista de comprobación con estado de cada requisito              │
│ Indicación de realizar un cobro de prueba                       │
│ Confirmación visual al capturar la primera notificación         │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ PANTALLA PRINCIPAL — Estado operativo                           │
│ Indicador general: activo / con advertencias / detenido         │
│ Detalle: permisos, conectividad, elementos en cola              │
│ Historial de las últimas capturas                               │
└─────────────────────────────────────────────────────────────────┘
```

### 4.1. Fabricantes que requieren configuración adicional

| Fabricante              | Ajuste requerido                                                          |
| ----------------------- | ------------------------------------------------------------------------- |
| Xiaomi / Redmi / POCO   | Inicio automático y bloqueo de la aplicación en la vista de recientes     |
| Huawei / Honor          | Gestión manual de inicio de aplicación                                    |
| Oppo / Realme / OnePlus | Permiso de inicio automático y congelación de aplicación en segundo plano |
| Vivo                    | Consumo de batería en segundo plano y inicio automático                   |
| Samsung                 | Exclusión de aplicaciones en suspensión profunda                          |

La aplicación detecta el fabricante e ilustra únicamente los pasos correspondientes.

### 4.2. Estados de la pantalla principal

| Estado              | Condición                                        | Indicación al usuario                                    |
| ------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| **Operativo**       | Permisos correctos, con conectividad, cola vacía | Todo en orden                                            |
| **Sincronizando**   | Elementos pendientes en cola                     | Cantidad pendiente y reintento en curso                  |
| **Sin conexión**    | Sin red disponible                               | Las capturas se conservan y se enviarán al restablecerse |
| **Permiso ausente** | Acceso a notificaciones revocado                 | Acción correctiva destacada                              |
| **Desvinculado**    | Token revocado desde el panel                    | Solicitud de nueva vinculación                           |

---

## 5. Flujo: operación diaria

### 5.1. Consulta de cobros

```
El operador abre el panel en su navegador
        ↓
Vista de transacciones con actualización en tiempo real
        ↓
Al llegar un cobro, aparece en la parte superior con animación breve
        ↓
Elementos visibles sin necesidad de abrir el detalle:
   • Monto (elemento de mayor jerarquía visual)
   • Nombre del remitente
   • Código de seguridad, destacado
   • Billetera de origen
   • Tiempo transcurrido
```

### 5.2. Validación con código de seguridad

```
1. El cliente indica haber realizado el pago
2. El operador localiza el cobro en la lista
3. El operador solicita al cliente el código de su comprobante
4. Compara con el código mostrado en el panel
5. Si coinciden: marca el cobro como confirmado
6. Si no coinciden: no confirma y comunica la discrepancia
```

**Consideración de diseño:** el código de seguridad se presenta con tipografía monoespaciada y tamaño destacado, ya que se lee en voz alta en un entorno con ruido ambiental.

### 5.3. Búsqueda de un cobro específico

```
El operador ingresa un criterio (nombre parcial o monto)
        ↓
Resultados filtrados de forma incremental
        ↓
Si no hay coincidencias, se ofrecen alternativas:
   • Ampliar el rango de fechas
   • Verificar el estado del dispositivo
```

---

## 6. Flujo: gestión del equipo

```
Administrador accede a la sección de equipo
        ↓
Visualiza miembros actuales con su rol y estado
        ↓
Selecciona invitar
        ↓
Ingresa correo y selecciona rol
   (cada rol muestra una descripción de sus permisos)
        ↓
Sistema valida el límite de usuarios del plan
   ├── Dentro del límite → envía invitación
   └── Límite alcanzado → informa y ofrece cambio de plan
        ↓
La invitación aparece como pendiente, con opción de revocar
        ↓
El invitado recibe el correo y accede al enlace
        ↓
   ├── Sin cuenta previa → completa registro y acepta
   └── Con cuenta previa → acepta e ingresa
        ↓
La membresía queda activa
```

---

## 7. Flujo: configuración de una integración

Dirigido a un perfil técnico. Se prioriza densidad de información sobre simplicidad.

```
Administrador accede a integraciones
        ↓
┌─────────────────────────────────────────────────────────┐
│ Opción A — API key                                      │
│  1. Asigna un nombre descriptivo                        │
│  2. Selecciona alcances                                 │
│  3. Se genera y muestra la clave una única vez          │
│  4. Advertencia explícita: no volverá a mostrarse       │
│  5. Enlace a la documentación                           │
└─────────────────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────────────────┐
│ Opción B — Webhook                                      │
│  1. Ingresa la dirección del endpoint                   │
│  2. Selecciona los eventos a recibir                    │
│  3. Se genera y muestra el secreto de firma             │
│  4. Envía un evento de prueba                           │
│  5. Verifica el resultado en el historial de entregas   │
└─────────────────────────────────────────────────────────┘
```

### 7.1. Historial de entregas

Cada entrega muestra: estado, código de respuesta, número de intentos, marca temporal y, al expandir, el contenido enviado y la respuesta recibida. Las entregas fallidas ofrecen reintento manual.

---

## 8. Flujo: cambio de plan

```
El dueño accede a la sección de membresía
        ↓
Visualiza plan actual y consumo del período
   (barras de progreso por recurso, con alerta al superar el 80%)
        ↓
Selecciona comparar planes
        ↓
Tabla comparativa con el plan actual señalado
Selector de ciclo: mensual / semestral / anual
   (el ahorro anual se comunica como "2 meses gratis")
        ↓
Selecciona el plan destino
        ↓
Resumen del cambio: qué se habilita, monto a pagar, vigencia
        ↓
Instrucciones de pago con número de referencia
        ↓
El cambio queda en estado pendiente hasta la confirmación del pago
        ↓
Al confirmarse, el plan se activa y se notifica al dueño
```

---

## 9. Flujo: incidencia de dispositivo caído

Flujo crítico: mientras el dispositivo no reporta, el negocio no recibe cobros en el panel.

```
El backend detecta ausencia de heartbeat por más de 15 minutos
        ↓
Cambia el estado del dispositivo a desconectado
        ↓
Emite evento en tiempo real al panel y dispara webhook si está configurado
        ↓
El panel muestra un aviso persistente en la parte superior
        ↓
El aviso ofrece acceso a una guía de resolución:
   • Verificar que el dispositivo esté encendido
   • Verificar conectividad
   • Verificar que la aplicación esté en ejecución
   • Verificar que el permiso siga otorgado
   • Revisar ajustes de batería
        ↓
Al restablecerse el heartbeat, el aviso desaparece
y se notifica la normalización
```

---

## 10. Estados de interfaz

Cada vista define explícitamente cuatro estados. La ausencia de definición produce interfaces incompletas.

| Estado            | Tratamiento                                                                          |
| ----------------- | ------------------------------------------------------------------------------------ |
| **Cargando**      | Esqueleto que refleja la estructura del contenido esperado, no un indicador genérico |
| **Vacío**         | Explicación del motivo y acción principal sugerida                                   |
| **Error**         | Descripción del problema, causa probable y acción correctiva                         |
| **Con contenido** | Presentación normal                                                                  |

### 10.1. Mensajes de estado vacío

| Vista                           | Mensaje                             | Acción sugerida             |
| ------------------------------- | ----------------------------------- | --------------------------- |
| Transacciones (sin dispositivo) | Aún no hay un dispositivo vinculado | Vincular dispositivo        |
| Transacciones (con dispositivo) | Todavía no se registran cobros      | Realizar un cobro de prueba |
| Transacciones (con filtro)      | No hay cobros con esos criterios    | Limpiar filtros             |
| Dispositivos                    | No hay dispositivos vinculados      | Vincular dispositivo        |
| Equipo                          | Solo estás tú en este negocio       | Invitar a alguien           |
| Webhooks                        | No hay webhooks configurados        | Ver documentación           |
| Auditoría                       | Aún no hay actividad registrada     | —                           |

---

## 11. Notificaciones y comunicaciones

### 11.1. Correo electrónico

| Evento                           | Destinatario         |
| -------------------------------- | -------------------- |
| Verificación de correo           | Usuario registrado   |
| Invitación al equipo             | Persona invitada     |
| Recuperación de contraseña       | Titular de la cuenta |
| Dispositivo desconectado         | Roles OWNER y ADMIN  |
| Consumo al 80% del límite        | Rol OWNER            |
| Consumo al 100% del límite       | Rol OWNER            |
| Cambio de plan confirmado        | Rol OWNER            |
| Webhook deshabilitado por fallos | Roles OWNER y ADMIN  |

### 11.2. Avisos dentro del panel

| Aviso                             | Persistencia                               | Nivel       |
| --------------------------------- | ------------------------------------------ | ----------- |
| Dispositivo desconectado          | Persistente hasta resolución               | Crítico     |
| Límite de transacciones alcanzado | Persistente hasta cambio de período o plan | Crítico     |
| Consumo al 80%                    | Descartable                                | Advertencia |
| Correo sin verificar              | Persistente hasta verificación             | Advertencia |
| Webhook con fallos recurrentes    | Descartable                                | Advertencia |

---

## 12. Consideraciones de accesibilidad

| Requisito                            | Aplicación                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| Navegación por teclado               | Todas las acciones alcanzables sin puntero, con orden lógico y foco visible     |
| Lectores de pantalla                 | Etiquetas descriptivas, regiones activas anunciadas para eventos en tiempo real |
| Contraste                            | Relación mínima de 4.5:1 en texto normal y 3:1 en elementos de interfaz         |
| Información no dependiente del color | El estado se comunica con texto e iconografía, no solo con color                |
| Objetivos táctiles                   | Mínimo de 44 por 44 píxeles en interfaces móviles                               |
| Movimiento reducido                  | Se respeta la preferencia del sistema, desactivando animaciones no esenciales   |
| Escalado de texto                    | La interfaz permanece funcional al ampliar hasta 200%                           |

---

## 13. Comportamiento responsivo

| Rango           | Comportamiento                                                       |
| --------------- | -------------------------------------------------------------------- |
| Menor a 640 px  | Navegación inferior, listas en tarjetas, filtros en panel deslizante |
| 640 – 1024 px   | Navegación lateral colapsable, listas en tabla simplificada          |
| Mayor a 1024 px | Navegación lateral fija, tabla completa, panel de detalle lateral    |

**Prioridad de contenido en móvil:** monto, remitente y código de seguridad son los elementos que permanecen visibles en cualquier ancho. El resto se subordina.

---

## 14. Tono de las comunicaciones

| Principio                                  | Aplicación                                                     |
| ------------------------------------------ | -------------------------------------------------------------- |
| Directo y sin ambigüedad                   | Se indica qué ocurrió y qué hacer, sin rodeos                  |
| Sin jerga técnica en interfaces de negocio | Se evitan términos de implementación                           |
| Español neutro                             | Comprensible en todo el territorio, sin regionalismos marcados |
| Sin culpabilizar al usuario                | Los errores se describen sin atribuir responsabilidad          |
| Accionable                                 | Todo mensaje de error propone un siguiente paso                |

**Ejemplo de aplicación:**

| Formulación evitada        | Formulación adoptada                                                       |
| -------------------------- | -------------------------------------------------------------------------- |
| Error 422: límite excedido | Alcanzaste los 2,000 cobros de tu plan este mes. Se renueva el 1 de junio. |
| Ingresaste mal el código   | El código no es válido o ya venció. Genera uno nuevo desde el panel.       |
| Fallo de conexión          | Sin conexión. Tus cobros se están guardando y se enviarán al reconectarse. |
