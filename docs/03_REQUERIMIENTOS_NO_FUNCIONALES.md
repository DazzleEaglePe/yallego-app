# 03 — Requerimientos No Funcionales

> **Convención de IDs:** `RNF-[CATEGORÍA]-[NNN]`

---

## 1. Rendimiento

| ID          | Requerimiento                                                                                            | Métrica objetivo         |
| ----------- | -------------------------------------------------------------------------------------------------------- | ------------------------ |
| RNF-PER-001 | Latencia extremo a extremo desde que la notificación llega al dispositivo hasta que aparece en el panel. | < 2 s (P95), < 5 s (P99) |
| RNF-PER-002 | Tiempo de respuesta de endpoints de lectura de la API.                                                   | < 200 ms (P95)           |
| RNF-PER-003 | Tiempo de respuesta del endpoint de ingesta.                                                             | < 150 ms (P95)           |
| RNF-PER-004 | Tiempo de parsing de una notificación.                                                                   | < 50 ms (P99)            |
| RNF-PER-005 | Primer envío de webhook tras crear la transacción.                                                       | < 3 s (P95)              |
| RNF-PER-006 | Carga inicial del panel administrativo (LCP).                                                            | < 2.5 s en 4G            |
| RNF-PER-007 | Consumo de batería de la app Android en operación normal.                                                | < 3% diario              |
| RNF-PER-008 | Consumo de memoria de la app Android en segundo plano.                                                   | < 80 MB                  |

---

## 2. Escalabilidad

| ID          | Requerimiento                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| RNF-ESC-001 | El backend debe ser stateless para permitir escalado horizontal sin sesiones pegajosas.                       |
| RNF-ESC-002 | El estado compartido entre instancias reside exclusivamente en PostgreSQL y Redis.                            |
| RNF-ESC-003 | Los workers de webhooks escalan independientemente del servidor de API.                                       |
| RNF-ESC-004 | El sistema debe soportar 1,000 tenants activos y 500,000 transacciones mensuales sin cambios arquitectónicos. |
| RNF-ESC-005 | Las conexiones WebSocket se distribuyen entre instancias mediante adaptador Redis.                            |
| RNF-ESC-006 | Las tablas de alto volumen deben admitir particionamiento temporal sin refactorización del modelo.            |
| RNF-ESC-007 | El pool de conexiones a base de datos se gestiona mediante un pooler externo.                                 |

---

## 3. Disponibilidad y fiabilidad

| ID          | Requerimiento                                                                                                         | Objetivo               |
| ----------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| RNF-DIS-001 | Disponibilidad del servicio de API.                                                                                   | ≥ 99.5% mensual        |
| RNF-DIS-002 | Ninguna notificación capturada por el dispositivo puede perderse por fallo de red.                                    | Cola local persistente |
| RNF-DIS-003 | RPO (máxima pérdida de datos tolerable ante desastre).                                                                | ≤ 15 min               |
| RNF-DIS-004 | RTO (tiempo máximo de recuperación ante desastre).                                                                    | ≤ 2 h                  |
| RNF-DIS-005 | El sistema degrada de forma controlada: si Redis cae, la ingesta continúa y los webhooks se encolan al restablecerse. | —                      |
| RNF-DIS-006 | Los despliegues del backend no generan interrupción del servicio.                                                     | Zero-downtime          |
| RNF-DIS-007 | Frecuencia de respaldo de base de datos.                                                                              | Diario + WAL continuo  |
| RNF-DIS-008 | Prueba de restauración de respaldos.                                                                                  | Mensual en staging     |

---

## 4. Seguridad

| ID          | Requerimiento                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| RNF-SEG-001 | Todo tráfico se transmite exclusivamente sobre TLS 1.2 o superior.                                       |
| RNF-SEG-002 | Las contraseñas se almacenan con algoritmo de hash adaptativo (Argon2id o bcrypt con coste ≥ 12).        |
| RNF-SEG-003 | Las API keys se almacenan únicamente como hash; el valor original nunca se persiste.                     |
| RNF-SEG-004 | Los datos personales de terceros (nombre del emisor) se cifran en reposo.                                |
| RNF-SEG-005 | El aislamiento entre tenants se garantiza en dos capas: aplicación y base de datos (Row Level Security). |
| RNF-SEG-006 | Todo endpoint que reciba datos valida y sanitiza la entrada mediante esquemas estrictos.                 |
| RNF-SEG-007 | El sistema aplica cabeceras de seguridad HTTP estándar.                                                  |
| RNF-SEG-008 | Los secretos de configuración nunca se versionan en el repositorio.                                      |
| RNF-SEG-009 | Las dependencias se auditan automáticamente en cada integración continua.                                |
| RNF-SEG-010 | Los tokens de acceso tienen vigencia máxima de 15 minutos; los de refresco, 30 días con rotación.        |
| RNF-SEG-011 | El endpoint de ingesta valida el token del dispositivo en cada solicitud.                                |
| RNF-SEG-012 | El sistema aplica limitación de tasa en endpoints de autenticación para prevenir fuerza bruta.           |
| RNF-SEG-013 | Los registros de aplicación no deben contener secretos, contraseñas ni tokens.                           |
| RNF-SEG-014 | Las URLs de webhook deben ser HTTPS; se rechazan direcciones de red interna para prevenir SSRF.          |

---

## 5. Privacidad y cumplimiento

| ID          | Requerimiento                                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------------- |
| RNF-PRI-001 | El sistema cumple con la Ley 29733 de Protección de Datos Personales del Perú.                                    |
| RNF-PRI-002 | El tenant declara consentimiento explícito para el procesamiento de datos de terceros al vincular un dispositivo. |
| RNF-PRI-003 | El sistema publica una política de privacidad accesible que detalla qué datos se capturan y con qué finalidad.    |
| RNF-PRI-004 | El sistema permite al tenant exportar la totalidad de sus datos en formato estructurado.                          |
| RNF-PRI-005 | El sistema permite al tenant solicitar la eliminación definitiva de sus datos.                                    |
| RNF-PRI-006 | Los datos se eliminan automáticamente al vencer el período de retención del plan.                                 |
| RNF-PRI-007 | El sistema no comparte datos de un tenant con terceros sin autorización explícita.                                |
| RNF-PRI-008 | Los respaldos se almacenan cifrados.                                                                              |

---

## 6. Mantenibilidad

| ID          | Requerimiento                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| RNF-MAN-001 | El código se escribe en TypeScript con modo estricto activado.                                        |
| RNF-MAN-002 | Cobertura mínima de pruebas en la capa de dominio y parsers: 80%.                                     |
| RNF-MAN-003 | Cobertura mínima global del backend: 60%.                                                             |
| RNF-MAN-004 | Todo cambio pasa por integración continua con verificación de tipos, linting y pruebas.               |
| RNF-MAN-005 | Los parsers son unidades aisladas con pruebas independientes basadas en muestras reales anonimizadas. |
| RNF-MAN-006 | Las migraciones de base de datos son reversibles y no destructivas.                                   |
| RNF-MAN-007 | Las decisiones arquitectónicas relevantes se documentan como registros de decisión.                   |
| RNF-MAN-008 | La API pública mantiene compatibilidad hacia atrás dentro de una misma versión mayor.                 |
| RNF-MAN-009 | Los mensajes de commit siguen la convención Conventional Commits.                                     |

---

## 7. Observabilidad

| ID          | Requerimiento                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------- |
| RNF-OBS-001 | Los registros son estructurados en formato JSON e incluyen identificador de correlación, tenant y actor.  |
| RNF-OBS-002 | El sistema expone métricas de aplicación en formato estándar para recolección.                            |
| RNF-OBS-003 | El sistema instrumenta trazas distribuidas en los flujos críticos: ingesta, parsing, entrega de webhooks. |
| RNF-OBS-004 | El sistema emite alertas cuando la tasa de parsing exitoso de una billetera cae por debajo del 95%.       |
| RNF-OBS-005 | El sistema emite alertas cuando la profundidad de la cola de webhooks supera un umbral definido.          |
| RNF-OBS-006 | El sistema emite alertas ante dispositivos sin heartbeat prolongado.                                      |
| RNF-OBS-007 | Los errores no controlados se reportan a un servicio de seguimiento de errores.                           |
| RNF-OBS-008 | El sistema expone un endpoint de verificación de salud que valida conectividad con base de datos y Redis. |

---

## 8. Usabilidad y accesibilidad

| ID          | Requerimiento                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| RNF-USA-001 | El panel administrativo cumple el nivel AA de las pautas WCAG 2.2.                                       |
| RNF-USA-002 | Toda la interfaz es navegable mediante teclado.                                                          |
| RNF-USA-003 | El contraste de color cumple una relación mínima de 4.5:1 para texto normal.                             |
| RNF-USA-004 | La interfaz es responsiva y funcional desde 360 px de ancho.                                             |
| RNF-USA-005 | Los mensajes de error son específicos y accionables, en español neutro.                                  |
| RNF-USA-006 | El asistente de configuración de la app Android permite completar la instalación sin asistencia técnica. |
| RNF-USA-007 | Los estados de carga, vacío y error están explícitamente diseñados en todas las vistas.                  |
| RNF-USA-008 | El idioma de la interfaz es español; la arquitectura permite internacionalización futura.                |

---

## 9. Compatibilidad

| ID          | Requerimiento                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| RNF-COM-001 | La app Android soporta desde Android 8.0 (API 26) hasta la versión estable más reciente.              |
| RNF-COM-002 | El panel administrativo soporta las dos últimas versiones estables de Chrome, Firefox, Safari y Edge. |
| RNF-COM-003 | El panel es funcional en navegadores móviles de Android e iOS.                                        |
| RNF-COM-004 | La API pública es consumible desde cualquier lenguaje mediante HTTP estándar.                         |
| RNF-COM-005 | El sistema opera en zona horaria configurable por tenant, almacenando internamente en UTC.            |
| RNF-COM-006 | Los montos se manejan con precisión decimal exacta, sin aritmética de punto flotante.                 |

---

## 10. Restricciones tecnológicas

| ID          | Restricción                                                                             | Justificación                                                                                     |
| ----------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| RNF-RES-001 | La captura de notificaciones se implementa exclusivamente en Android nativo con Kotlin. | La API requerida no existe en iOS ni se expone adecuadamente mediante frameworks multiplataforma. |
| RNF-RES-002 | El parsing de notificaciones ocurre en el servidor, nunca en el cliente.                | Permite corregir parsers sin requerir actualización de la aplicación instalada.                   |
| RNF-RES-003 | El panel administrativo es una aplicación web, no una aplicación nativa.                | Cobertura multiplataforma inmediata y ciclo de despliegue sin revisión de tiendas.                |
| RNF-RES-004 | La base de datos relacional es PostgreSQL.                                              | Row Level Security nativo, integridad referencial, soporte de JSONB.                              |
| RNF-RES-005 | No se utilizan servicios propietarios que impidan la portabilidad de infraestructura.   | Evitar dependencia de un proveedor único.                                                         |

---

## 11. Restricciones operativas

| ID          | Restricción                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| RNF-OPE-001 | El dispositivo de captura debe permanecer encendido, con conectividad y con la aplicación en ejecución.                  |
| RNF-OPE-002 | El dispositivo de captura debe tener la aplicación de la billetera instalada y con notificaciones habilitadas.           |
| RNF-OPE-003 | Se recomienda un dispositivo Android dedicado exclusivamente a la captura, no de uso personal.                           |
| RNF-OPE-004 | La cuenta de la billetera debe estar registrada en el dispositivo de captura.                                            |
| RNF-OPE-005 | El sistema no puede recuperar transacciones ocurridas mientras el dispositivo estuvo apagado o sin la aplicación activa. |

---

## 12. Matriz de atributos de calidad priorizados

| Atributo                      | Prioridad | Justificación                                                                                                  |
| ----------------------------- | --------- | -------------------------------------------------------------------------------------------------------------- |
| **Fiabilidad de captura**     | Crítica   | Una notificación perdida es una venta no validada; erosiona la confianza en el producto de forma irreversible. |
| **Seguridad y aislamiento**   | Crítica   | Se manejan datos financieros y personales de múltiples negocios en infraestructura compartida.                 |
| **Latencia**                  | Alta      | El valor del producto reside en la inmediatez; una demora perceptible lo equipara a métodos manuales.          |
| **Mantenibilidad de parsers** | Alta      | Los formatos de notificación cambian sin previo aviso; la capacidad de corregir rápido es diferencial.         |
| **Escalabilidad**             | Media     | El volumen inicial es moderado; la arquitectura debe permitir crecer sin reescritura.                          |
| **Usabilidad**                | Media     | El usuario objetivo tiene alfabetización digital variable; la configuración inicial debe ser autoexplicativa.  |
| **Portabilidad**              | Baja      | No es requisito inmediato, pero se evita el acoplamiento a proveedores específicos.                            |
