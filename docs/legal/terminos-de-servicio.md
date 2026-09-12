# Términos de Servicio de Yallegó — BORRADOR

> **⚠️ Este documento es un borrador técnico, no un documento legal
> definitivo.** Lo redacté a partir de lo que el sistema realmente hace hoy
> (los planes, límites y flujos ya implementados y verificados con
> pruebas), no a partir de asesoría legal. **No debe publicarse ni
> presentarse a un usuario final sin que un abogado revise y ajuste** — en
> particular los campos `[COMPLETAR]` (datos societarios, jurisdicción,
> ley aplicable, procedimiento de resolución de disputas) y cualquier
> cláusula de responsabilidad, que requiere criterio legal que no me
> corresponde ejercer.
>
> Ver también `docs/legal/politica-de-privacidad.md`, con las mismas
> salvedades.

**Última actualización:** [COMPLETAR — fecha de publicación real]
**Prestador del servicio:** [COMPLETAR — razón social, RUC, domicilio legal]

## 1. Aceptación

Al registrar una cuenta y crear un negocio en Yallegó, usted acepta estos
términos en representación del negocio que registra. Si actúa en nombre de
una empresa, declara tener la facultad para vincularla.

## 2. Qué es el servicio

Yallegó captura las notificaciones de pago que un negocio recibe en un
dispositivo Android de su propiedad (Yape, Plin, BIM u otras billeteras
que se incorporen), las convierte en transacciones estructuradas y las
pone a disposición del negocio a través de un panel web, una API y
webhooks configurables.

## 3. Requisitos del negocio

- Un dispositivo Android compatible, encendido y con conexión a internet
  de forma continua, dedicado o compartido, que reciba las notificaciones
  de las billeteras que el negocio desea monitorear.
- El negocio es responsable de mantener las credenciales de acceso al
  panel, las claves de API y los dispositivos vinculados bajo su control;
  Yallegó no es responsable de accesos realizados con credenciales
  legítimas del negocio que hayan sido comprometidas por negligencia del
  propio negocio.

## 4. Planes, precios y facturación

| Plan | Mensual | Semestral | Anual |
| --- | --- | --- | --- |
| Free | S/0 | — | — |
| Negocio | S/29 | S/156 | S/290 |
| Comercio | S/79 | S/426 | S/790 |
| Cadena | S/199 | S/1,074 | S/1,990 |

Cada plan define límites de uso (dispositivos, usuarios, billeteras
activas, transacciones mensuales, webhooks, acceso a la API y al canal en
tiempo real, y días de retención de datos) — el detalle vigente de cada
plan se consulta en `GET /v1/plans`, no se transcribe aquí para evitar que
este documento quede desactualizado frente al catálogo real.

**Cambios de plan:** una mejora de plan se aplica de inmediato, prorrateo
[COMPLETAR — política de prorrateo real]; una reducción de plan se aplica
al cierre del período de facturación vigente, para no interrumpir un
servicio ya pagado. **Cancelación:** un negocio cancela reduciendo su plan
a Free — conserva sus datos según la retención de ese plan, no se eliminan
de inmediato.

**Pago:** [COMPLETAR — método de pago real, proceso de confirmación de
pago manual actualmente implementado en la administración interna, plazo
de gracia ante impago].

## 5. Límites de uso

Alcanzar el límite de un plan (transacciones del mes, dispositivos
vinculados, webhooks configurados, etc.) impide crear nuevos recursos de
ese tipo hasta que el período se renueve o el negocio mejore de plan. No
se pierden datos ya capturados por alcanzar un límite — para el caso
específico de la captura en el dispositivo, ver la nota de la sección 7.

## 6. Uso aceptable

El negocio se compromete a:

- Usar el servicio únicamente para monitorear pagos que efectivamente
  recibe, no para simular o falsificar transacciones.
- No intentar vulnerar el aislamiento entre negocios, ni acceder a datos
  de otro negocio.
- No usar la API pública para fines distintos a integrar sus propios
  sistemas con sus propios datos.
- Cumplir la normativa de protección de datos personales aplicable
  respecto de los datos de sus propios clientes que aparecen en las
  notificaciones de pago (ver la política de privacidad, sección 2, sobre
  el rol del negocio como responsable del tratamiento).

Yallegó puede suspender una cuenta que incumpla lo anterior, con aviso
previo salvo que la naturaleza del incumplimiento (p. ej. un intento
activo de vulnerar el aislamiento entre tenants) justifique una suspensión
inmediata.

## 7. Disponibilidad y limitaciones conocidas del servicio

- El servicio depende de que el dispositivo Android del negocio permanezca
  encendido, conectado y con la aplicación de captura en ejecución. Un
  cobro recibido mientras el dispositivo está sin conexión se encola
  localmente y se envía al restablecerse la conexión — no se pierde,
  salvo que el dispositivo se quede sin conexión más tiempo del que su
  almacenamiento local puede retener la cola pendiente.
- Los formatos de notificación de las billeteras pueden cambiar sin aviso
  de parte de esas aplicaciones; Yallegó corrige sus patrones de
  reconocimiento tan pronto se detecta una caída en la tasa de
  reconocimiento, pero puede existir una ventana entre el cambio de
  formato y la corrección durante la cual algunos cobros no se reconozcan
  automáticamente.
- [COMPLETAR — nivel de servicio (SLA) comprometido, si alguno, y
  compensación ante incumplimiento; hoy no hay un SLA formal definido]

## 8. Propiedad de los datos

Los datos de transacciones capturadas pertenecen al negocio. Al terminar
la relación contractual, el negocio puede solicitar la exportación de sus
datos [COMPLETAR — el flujo de autoservicio de exportación descrito
conceptualmente en `docs/06_API_CONTRACT.md` §3 todavía no está
implementado como funcionalidad operativa; hasta que lo esté, no prometer
un mecanismo automático — el canal actual es soporte directo].

## 9. Limitación de responsabilidad

[COMPLETAR — cláusula de limitación de responsabilidad; requiere criterio
legal sobre qué es razonable limitar en la jurisdicción aplicable. No debo
redactar esta cláusula sin supervisión de un abogado: define quién asume
qué riesgo, y una redacción técnica sin ese criterio podría dejar a
Yallegó expuesta o ser inaplicable.]

## 10. Terminación

Cualquiera de las partes puede terminar la relación en cualquier momento.
[COMPLETAR — plazo de aviso, efectos sobre datos tras la terminación,
período de gracia antes de la eliminación definitiva de datos].

## 11. Ley aplicable y resolución de disputas

[COMPLETAR — jurisdicción, ley aplicable, mecanismo de resolución de
disputas]

## 12. Contacto

[COMPLETAR — correo/canal de contacto real]
