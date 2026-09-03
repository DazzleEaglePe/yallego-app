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
     ejecuta `adb reverse tcp:3001 tcp:3001` antes de iniciar la app.
3. Con el backend corriendo (`pnpm dev:api` desde la raíz del repositorio),
   ejecuta la app en un emulador o dispositivo.

## Estado de este módulo

Verificado con Gradle 8.10.2/JDK 21 y probado en un Xiaomi M2101K7BL (Android
13): instalación incremental, migración Room 1→2, vinculación preservada,
acceso a notificaciones, configuración remota y conexión al API local.

Pendiente del Sprint 3 (no cubierto en este pase): verificación de nombres de
paquete en dispositivos físicos reales (`docs/10_PLAN_DESARROLLO.md`, sección
"Verificación de paquetes").
