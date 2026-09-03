# Política de Privacidad de Yallegó — BORRADOR

> **⚠️ Este documento es un borrador técnico, no un documento legal
> definitivo.** Lo redacté a partir de lo que el sistema realmente hace hoy
> (docs/07_SEGURIDAD_AUTH.md §14, el modelo de datos y el código de
> retención/cifrado ya implementado), no a partir de asesoría legal. **No
> debe publicarse ni presentarse a un usuario final sin que un abogado
> especializado en protección de datos (Ley 29733 y su reglamento) lo
> revise y ajuste** — en particular los campos marcados `[COMPLETAR]`, que
> son datos societarios/legales que no me constan y no debo inventar.
>
> Los datos técnicos citados aquí (qué se captura, cuánto se retiene, cómo
> se cifra) SÍ están verificados contra el código; lo que falta es la capa
> jurídica: razón social, domicilio, jurisdicción, autoridad de control,
> plazos formales de respuesta ante solicitudes ARCO.

**Última actualización:** [COMPLETAR — fecha de publicación real]
**Responsable del tratamiento (según el rol descrito en la sección 2):** [COMPLETAR — razón social, RUC, domicilio legal]

## 1. Qué es Yallegó

Yallegó es un servicio SaaS que captura las notificaciones de pago de
billeteras digitales (Yape, Plin, BIM) que un negocio recibe en un
dispositivo Android de su propiedad, las convierte en transacciones
estructuradas y las pone a disposición del negocio y, si el negocio lo
autoriza, de sus propios sistemas mediante una API.

## 2. Dos roles distintos frente a esta política

Bajo la Ley N.º 29733 (Ley de Protección de Datos Personales del Perú):

- **El negocio que usa Yallegó (el "tenant") es el responsable del
  tratamiento** de los datos personales de sus propios clientes que
  aparecen en las notificaciones de pago (nombre del remitente, monto).
  Es el negocio quien decide instalar la aplicación de captura y activar
  cada billetera.
- **Yallegó actúa como encargado del tratamiento** por cuenta del negocio:
  procesamos esos datos siguiendo las instrucciones del negocio (a través
  de su configuración en el panel) y con las medidas de seguridad
  descritas más abajo, pero no decidimos para qué los usa el negocio.

Esta política describe cómo Yallegó, como encargado, trata los datos. El
negocio, como responsable, debe tener su propia política de privacidad
frente a sus clientes finales — Yallegó no la reemplaza.

## 3. Qué datos capturamos y por qué

| Dato | Origen | Para qué |
| --- | --- | --- |
| Contenido de la notificación de pago (título, cuerpo, momento) | La app de captura instalada en el dispositivo del negocio, solo para las billeteras que el negocio activó explícitamente | Extraer el monto, el remitente y el código de seguridad de cada cobro |
| Nombre del remitente del pago | Parte del texto de la notificación | Mostrarlo al negocio para que concilie el cobro con su venta |
| Correo, nombre y contraseña (cifrada) del usuario del panel | Registro del usuario | Autenticación y comunicación operativa |
| Metadatos del dispositivo (fabricante, modelo, versión de la app) | El propio dispositivo, al vincularse | Diagnóstico y soporte |
| Dirección IP, agente de usuario | Cada solicitud a la API | Seguridad (bloqueo de intentos de acceso, límites de tasa) |

**No capturamos** el contenido de notificaciones de aplicaciones que el
negocio no activó explícitamente — el filtrado ocurre en el propio
dispositivo, antes de que la notificación salga de él.

## 4. Cómo protegemos los datos

- El nombre del remitente se almacena cifrado en la base de datos
  (cifrado autenticado AES-256-GCM); solo se descifra para mostrarlo a un
  usuario autorizado del negocio dueño de esa transacción.
- Cada negocio está aislado a nivel de motor de base de datos (Row Level
  Security) — una consulta de un negocio no puede, ni por error de código,
  devolver datos de otro negocio.
- Todo acceso queda en un registro de auditoría inmutable (no puede
  modificarse ni borrarse una vez escrito).
- Las claves de cifrado y las credenciales de infraestructura viven fuera
  del código fuente.

## 5. Cuánto tiempo conservamos los datos

La retención depende del plan contratado por el negocio (definida en el
contrato de servicio, no en esta política, porque puede cambiar con el
plan):

| Plan | Retención de transacciones y entregas de webhook |
| --- | --- |
| Free | 30 días |
| Negocio | 90 días |
| Comercio | 365 días |
| Cadena | 1095 días (3 años) |

Pasado ese plazo, la transacción y sus datos asociados se eliminan de
forma automática y programada. La notificación cruda que dio origen a una
transacción se archiva a los 90 días (dejando de estar disponible en
consultas ordinarias) — se conserva más allá de ese plazo únicamente para
auditoría interna y corrección de parsers, no para consulta del negocio.

## 6. Con quién compartimos los datos

- **Con el propio negocio dueño de los datos**, a través del panel y de su
  API con clave propia — esto es el servicio en sí, no una divulgación a
  terceros.
- **Con integraciones que el negocio configure explícitamente**
  (webhooks a sistemas propios del negocio) — el negocio elige a quién
  apunta cada webhook; Yallegó no envía datos a nadie que el negocio no
  haya configurado.
- **No vendemos datos a terceros ni los usamos con fines publicitarios.**
- [COMPLETAR — proveedores de infraestructura que sí procesan datos por
  cuenta de Yallegó como sub-encargados: proveedor de hosting, proveedor
  de correo transaccional. Deben listarse aquí una vez estén definidos.]

## 7. Sus derechos

Como titular de datos personales que aparecen en una notificación de pago
capturada por el negocio con el que usted transaccionó, tiene derecho a
acceder, rectificar, cancelar u oponerse al tratamiento de sus datos
(derechos ARCO) ante **el negocio**, que es el responsable del
tratamiento. Yallegó, como encargado, ejecuta esas solicitudes cuando el
negocio las canaliza a través de nosotros.

> **Estado real de implementación (para quien redacte la versión legal
> final):** hoy el negocio puede confirmar o disputar una transacción
> propia, y un administrador de plataforma puede suspender un tenant, pero
> el flujo de autoservicio de "exportar todos mis datos" / "eliminar mi
> cuenta y todos mis datos" descrito conceptualmente en
> `docs/06_API_CONTRACT.md` §3 **todavía no está implementado** como
> funcionalidad operativa — existe el campo en la base de datos
> (`deletionRequestedAt`) pero no el flujo que lo consume. No publicar una
> promesa de autoservicio inmediato hasta que exista; mientras tanto, el
> canal es soporte directo por correo.

## 8. Menores de edad

Yallegó no está dirigido a menores de edad. Los datos que procesamos
provienen de transacciones comerciales entre negocios y sus clientes, no
de un registro directo de menores.

## 9. Cambios a esta política

[COMPLETAR — procedimiento de notificación de cambios: plazo de aviso
previo, canal de notificación a los negocios]

## 10. Contacto

Para consultas sobre esta política o para ejercer derechos frente a un
negocio que usa Yallegó: [COMPLETAR — correo/canal de contacto real]

Para reportar una vulnerabilidad de seguridad de buena fe, ver el canal de
divulgación responsable descrito en `docs/07_SEGURIDAD_AUTH.md` §15.3.
