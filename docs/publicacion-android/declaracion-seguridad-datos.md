# Declaración de seguridad de datos — Google Play Console

> **Nota de alcance:** Google exige llenar esto en su propio formulario
> estructurado (Play Console → Política de la app → Seguridad de los
> datos), no aceptar un documento libre. Este archivo prepara las
> respuestas correctas por categoría, verificadas contra el código real
> de captura y contra la política de privacidad — quien complete el
> formulario solo necesita trasladarlas. La categorización exacta de
> Google puede tener matices que no puedo anticipar sin acceso al
> formulario en vivo; revisar cada respuesta contra las opciones
> disponibles al momento de llenarlo.

## ¿La app recopila o comparte alguno de los tipos de datos del usuario?

**Sí.**

## Datos recopilados, por categoría

### Información financiera → Otra información financiera

- **Se recopila:** sí (monto, código de seguridad y datos del remitente de
  cada cobro capturado desde la notificación de la billetera).
- **Se comparte con terceros:** no — se transmite únicamente al backend de
  Yallegó, propiedad del mismo negocio dueño de la cuenta.
- **Es opcional o requerida:** requerida — es la función central de la app.
- **Propósito:** funcionalidad de la app.

### Mensajes → Otros mensajes en la app (o la categoría más cercana disponible)

- **Se recopila:** sí — título y cuerpo de las notificaciones de las apps
  de billetera que el negocio activó explícitamente. Notificaciones de
  cualquier otra app se descartan sin almacenarse.
- **Se comparte con terceros:** no.
- **Es opcional o requerida:** requerida.
- **Propósito:** funcionalidad de la app.

### Identificadores de dispositivo u otros

- **Se recopila:** sí — fabricante, modelo y versión del sistema
  operativo del dispositivo, capturados al vincularlo.
- **Se comparte con terceros:** no.
- **Es opcional o requerida:** requerida.
- **Propósito:** funcionalidad de la app (diagnóstico y soporte).

### Información sobre la app y su rendimiento → Registros de fallos, diagnósticos

- **Se recopila:** sí — señal de vida periódica (`heartbeat`) con estado
  del permiso de notificaciones y tamaño de la cola local pendiente.
- **Se comparte con terceros:** no.
- **Es opcional o requerida:** requerida.
- **Propósito:** funcionalidad de la app.

### Categorías que la app NO recopila

Ubicación, fotos y videos, archivos y documentos, calendario, contactos,
historial de navegación web, salud y bienestar, audio. **La cámara se usa
únicamente para leer un código QR en el momento de la vinculación — la
imagen capturada por la cámara no se almacena ni se envía**, se procesa
en memoria solo para decodificar el código.

## ¿Los datos se cifran en tránsito?

**Sí** — toda comunicación con el backend usa TLS.

## ¿El usuario puede solicitar la eliminación de sus datos?

**Sí, pero hoy por un canal manual, no un botón de autoservicio dentro de
la app.** Ver la nota de estado real en
`docs/legal/politica-de-privacidad.md` §7 — el flujo de autoservicio de
eliminación todavía no está implementado como funcionalidad operativa.
**No marcar "sí, con mecanismo en la app" en el formulario de Google
hasta que ese flujo exista** — declarar una capacidad que no existe
puede derivar en el rechazo o retiro de la app.

## ¿Los datos siguen las prácticas de seguridad de Google Play (revisados por un tercero independiente)?

[COMPLETAR — depende de si el equipo se somete a una auditoría de
seguridad de terceros antes de la publicación; hoy no hay una registrada
en este repositorio.]

## Contexto adicional para quien complete el formulario

Toda respuesta de este documento se contrastó contra el código de
`NotificationCaptureCoordinator.kt` (filtrado por paquete monitoreado
antes de persistir cualquier dato) y contra `docs/07_SEGURIDAD_AUTH.md`
(cifrado, aislamiento entre tenants, retención). Si el formulario de
Google en el momento de publicar ofrece categorías distintas a las
usadas aquí, priorizar la descripción funcional de arriba sobre el
nombre exacto de la categoría — lo que importa es que la respuesta sea
honesta, no que calce perfecto con esta plantilla.
