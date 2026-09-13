# Incorporación y verificación de billeteras Android

Este procedimiento evita registrar nombres de paquete inferidos y convertir notificaciones reales en datos de prueba sin anonimizar.

## 1. Verificar el paquete en un dispositivo real

1. Instalar la versión oficial de la billetera desde su canal de distribución.
2. Conectar un teléfono de pruebas mediante ADB.
3. Obtener los paquetes instalados con `adb shell pm list packages` y confirmar fabricante, nombre visible y versión mediante `adb shell dumpsys package <paquete>`.
4. Registrar la fecha, modelo y versión de Android usados. Un paquete observado en un único dispositivo se considera verificado para esa versión, no universal para todas las distribuciones históricas.

No se deben copiar tokens, números de teléfono, nombres de clientes ni códigos de seguridad a la documentación.

## 2. Actualizar catálogo y compatibilidad

1. Actualizar el paquete canónico en `apps/api/prisma/seed.ts`.
2. Actualizar los ejemplos contractuales y el modelo de datos.
3. Mantener temporalmente identificadores históricos en `packageNames` del parser cuando ya existan instalaciones en circulación.
4. Ejecutar la semilla en un entorno controlado y comprobar que `GET /internal/v1/config` o el siguiente heartbeat entregue el paquete correcto solo a tenants que tengan la billetera activa.

## 3. Recolectar una muestra real

1. Fijar una línea base de notificaciones y transacciones del dispositivo.
2. Realizar un cobro mínimo autorizado por el responsable de la cuenta.
3. Confirmar en orden: captura local, `202 Accepted` en ingesta, `PARSED` en la notificación cruda y una única transacción asociada.
4. Anonimizar remitente, referencias y códigos conservando puntuación, espacios, decimales y título.
5. Añadir la muestra anonimizada a `packages/parsers/fixtures/<billetera>/samples.json`.

## 4. Publicar el parser de forma segura

1. Añadir o ajustar la regla en `packages/parsers` y ejecutar pruebas, cobertura y tipado.
2. Crear una nueva versión inmutable del parser desde la administración de plataforma; no editar una versión histórica.
3. Probar la versión contra las notificaciones `UNMATCHED` seleccionadas.
4. Activarla, invalidar su caché y reprocesar únicamente las capturas verificadas.
5. Confirmar idempotencia: una notificación cruda, un `dedupe_hash` y como máximo una transacción.

## 5. Evidencia mínima para cerrar el checklist

- Dispositivo, Android, aplicación y versión de billetera.
- Paquete canónico observado y alias históricos conservados.
- Fixture anonimizado y prueba de regresión.
- Versión de parser activada.
- Hora de captura, ingesta, parsing y creación de transacción.
- Cola local en cero después de la confirmación del servidor.
