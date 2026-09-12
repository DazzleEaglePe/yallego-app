# Justificación del acceso a notificaciones — Google Play Console

`BIND_NOTIFICATION_LISTENER_SERVICE` es un "permiso restringido" en Google
Play: exige completar el formulario de declaración de permisos en Play
Console (Play Console → Política de la app → Permisos y funciones
sensibles → Acceso a notificaciones) con una explicación en texto **y**
un video corto mostrando el uso real dentro de la app. Este documento
prepara el texto; el video queda pendiente de grabar contra la app
corriendo en un dispositivo real.

## Texto para el campo "¿Por qué tu app necesita este acceso?"

```
Yallegó es una app para negocios que necesita detectar, en tiempo real,
cuándo el negocio recibe un cobro por una billetera digital (Yape, Plin,
BIM). Esas apps de billetera notifican el cobro mediante una notificación
del sistema — es la única señal disponible en Android para detectar el
cobro sin depender de una integración directa con cada banco o billetera,
que no existe públicamente para terceros.

La app lee el título y cuerpo de las notificaciones ÚNICAMENTE de los
paquetes de las apps de billetera que el propio dueño del negocio activó
explícitamente desde el panel web de Yallegó (por ejemplo, solo Yape si
es la única billetera que el negocio usa). Las notificaciones de
cualquier otra aplicación instalada en el dispositivo se descartan de
inmediato, sin almacenarse ni transmitirse — el filtrado ocurre en el
propio dispositivo antes de cualquier otro procesamiento
(NotificationCaptureCoordinator.kt: `if (notification.packageName !in
monitoredPackages) return`).

No existe una alternativa menos sensible: las apps de billetera digital
peruanas no ofrecen una API pública ni un webhook para notificar cobros a
terceros, y capturar una captura de pantalla en su lugar sería
falsificable (el problema exacto que Yallegó existe para resolver — ver
la notificación real del sistema, no una imagen).
```

## Alcance declarado (checklist del formulario)

- [x] La app usa el acceso a notificaciones como parte de su
      funcionalidad principal (no es opcional ni secundario).
- [x] Solo se procesan notificaciones de paquetes explícitamente elegidos
      por el usuario, no todas las notificaciones del dispositivo.
- [x] El contenido leído se transmite cifrado (TLS) al backend de
      Yallegó y se almacena cifrado en reposo (ver
      `docs/legal/politica-de-privacidad.md` §4).
- [x] La app no vende ni comparte el contenido de notificaciones con
      terceros ajenos al propio negocio dueño de los datos.

## Otros permisos sensibles del manifiesto (justificación breve)

| Permiso | Para qué | ¿Requiere formulario aparte? |
| --- | --- | --- |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | El servicio de captura debe seguir corriendo en segundo plano de forma continua; sin esta exención, el sistema operativo lo mata para ahorrar batería y se pierden cobros | No, pero Play Console puede pedir justificación textual similar si la revisión automática lo marca |
| `CAMERA` | Lectura del código QR de vinculación (alternativa al ingreso manual del código de 8 caracteres) | No, uso evidente por el contexto de la app |
| `RECEIVE_BOOT_COMPLETED` | Reiniciar el servicio de captura tras un reinicio del dispositivo, sin intervención manual | No |

## Video de demostración (pendiente)

Google exige un video corto (no need de edición profesional) mostrando:
1. El flujo de vinculación hasta la pantalla que solicita el permiso de
   notificaciones.
2. El sistema operativo otorgando el permiso.
3. Una notificación real de una billetera activada apareciendo en el
   panel de Yallegó pocos segundos después.

Queda pendiente de grabar contra la app real — no puedo producirlo sin
ejecutarla en un dispositivo.
