# Yallegó — Aplicación de captura (Android)

Vinculación, permisos y servicio en primer plano del Sprint 3. La escucha real
de notificaciones de billeteras usa una cola local persistente y sincronización
por lotes con reintentos de WorkManager (Sprint 4).

No participa en pnpm/Turborepo (`docs/11_ESTRUCTURA_PROYECTO.md` §1): se abre
y compila directamente con Android Studio / Gradle.

## Primer arranque

1. Abre `apps/android/` en Android Studio (Ladybug o más reciente) y sincroniza
   Gradle con el wrapper incluido en el repositorio.
2. Copia `local.properties.example` a `local.properties` y ajusta
   `API_BASE_URL_DEBUG` según cómo vayas a probar:
   - Emulador: `http://10.0.2.2:3001/` (valor por defecto, apunta al backend
     local corriendo en el equipo host).
   - Celular físico por USB/Wi-Fi debugging: usa `http://127.0.0.1:3001/` y
     ejecuta `adb reverse tcp:3001 tcp:3001` antes de iniciar la app. El primer
     puerto es el configurado en Android y el segundo es el puerto real del API
     en tu Mac. Por ejemplo, si el API corre con `PORT=3011`, usa
     `adb reverse tcp:3001 tcp:3011`. Repite el comando al reconectar el celular.
   - Si quieres probar los accesos web de `Más`, configura
     `DASHBOARD_URL_DEBUG` y `ACCOUNT_URL_DEBUG`. En un celular físico puedes
     usar `http://127.0.0.1:3010/membresia` y
     `http://127.0.0.1:3010/cuenta` junto con
     `adb reverse tcp:3010 tcp:3010`.
3. Con el backend corriendo (`pnpm dev:api` desde la raíz del repositorio),
   ejecuta la app en un emulador o dispositivo.

## Estado de este módulo

Verificado con Gradle 8.10.2/JDK 21 y probado en un Xiaomi M2101K7BL (Android
13): instalación incremental, migración Room 1→2, vinculación preservada,
acceso a notificaciones, configuración remota y conexión al API local.

La superficie principal se organiza en tres destinos:

- `Inicio`: salud de la captura, conectividad real con el servidor, última
  señal, cola pendiente y permisos esenciales.
- `Actividad`: últimos cobros detectados por este dispositivo, con billetera,
  importe, fecha, hora y estado.
- `Más`: negocio y dispositivo vinculados, billeteras monitoreadas, plan y uso,
  acceso al panel de membresía y ajustes del sistema.

Mientras el servicio persistente está activo, envía una señal cada 2 minutos.
El panel la interpreta como `En línea` durante 3 minutos, `Señal retrasada`
entre 3 y 6 minutos y `Sin conexión` a partir de los 6 minutos. WorkManager
mantiene un heartbeat de respaldo cada 15 minutos para recuperación.

Pendiente del Sprint 3 (no cubierto en este pase): verificación de nombres de
paquete en dispositivos físicos reales (`docs/10_PLAN_DESARROLLO.md`, sección
"Verificación de paquetes").
