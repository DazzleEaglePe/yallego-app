# Yallegó

> **¿Ya llegó?**
> Validación de pagos por billeteras digitales en tiempo real para negocios peruanos.

---

## Qué es

Plataforma SaaS multi-tenant que captura las notificaciones de billeteras digitales (Yape, Plin, BIM y otras) desde un dispositivo Android del negocio, las normaliza y las distribuye en tiempo real al equipo y a sistemas externos mediante una API pública.

**Diferenciador:** es la única solución del mercado peruano diseñada como infraestructura consumible — REST, WebSocket y Webhooks documentados para que terceros construyan sobre ella.

---

## Documentación

| #   | Documento                                                              | Contenido                                                                                |
| --- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 01  | [Contexto y Análisis](./01_CONTEXTO_Y_ANALISIS.md)                     | Problema, propuesta de valor, mercado, competencia, modelo de negocio, riesgos, métricas |
| 02  | [Requerimientos Funcionales](./02_REQUERIMIENTOS_FUNCIONALES.md)       | 120+ requerimientos identificados por módulo y priorizados                               |
| 03  | [Requerimientos No Funcionales](./03_REQUERIMIENTOS_NO_FUNCIONALES.md) | Rendimiento, escalabilidad, seguridad, privacidad, observabilidad, accesibilidad         |
| 04  | [Arquitectura de Software](./04_ARQUITECTURA_SOFTWARE.md)              | Decisión arquitectónica, componentes, flujos, multi-tenancy, registro de decisiones      |
| 05  | [Modelo de Datos](./05_MODELO_DATOS.md)                                | Diagrama ER, DDL completo, políticas RLS, datos semilla, retención                       |
| 06  | [Contrato de API](./06_API_CONTRACT.md)                                | Endpoints, payloads, eventos, WebSocket, limitación de tasa, versionado                  |
| 07  | [Seguridad y Autenticación](./07_SEGURIDAD_AUTH.md)                    | Estrategia por audiencia, autorización, aislamiento, cifrado, cumplimiento               |
| 08  | [Flujos de Experiencia](./08_UX_FLUJOS.md)                             | Navegación, onboarding, operación diaria, estados de interfaz, accesibilidad             |
| 09  | [Sistema de Diseño](./09_DESIGN_SYSTEM.md)                             | Color, tipografía, espaciado, componentes, iconografía, tokens                           |
| 10  | [Plan de Desarrollo](./10_PLAN_DESARROLLO.md)                          | 8 sprints con listas de verificación y criterios de aceptación                           |
| 11  | [Estructura del Proyecto](./11_ESTRUCTURA_PROYECTO.md)                 | Monorepo, configuración, convenciones, entorno local, despliegue                         |

> La especificación [OpenAPI 3.1](./openapi.yaml) y la [documentación para
> integradores](./api-publica/README.md) de la API pública (Transacciones,
> Webhooks, Dispositivos) complementan al contrato en prosa del punto 06.
> El [runbook de incidentes](./runbook-incidentes.md) cubre qué hacer ante
> cada alerta que el propio sistema emite en operación, y
> [respaldos, restauración y reversión](../tools/docker/deploy/BACKUPS.md)
> cubre qué hacer con los datos y con un despliegue que salió mal.
> [`docs/legal/`](./legal/) tiene borradores técnicos de términos de
> servicio y política de privacidad — **no publicables sin revisión
> legal**, ver la advertencia al inicio de cada archivo.
> [`docs/publicacion-android/`](./publicacion-android/) tiene el contenido
> listo para Play Console (ficha de tienda, declaración de seguridad de
> datos, justificación del permiso de notificaciones) — falta trasladarlo
> al formulario real y las capturas de pantalla, que requieren la app
> corriendo en un dispositivo.

---

## Arquitectura en una vista

```
┌──────────────────┐   notificaciones   ┌──────────────────┐
│  App Android     │ ─────────────────► │                  │
│  (Kotlin)        │    (crudas)        │                  │
│  Captura         │ ◄───────────────── │                  │
└──────────────────┘   configuración    │                  │
                                         │     Backend      │
┌──────────────────┐                    │   (NestJS)       │
│  Panel           │ ◄────────────────► │                  │
│  (Next.js)       │  REST + WebSocket  │  Monolito        │
│  Administración  │                    │  modular         │
└──────────────────┘                    │                  │
                                         │                  │
┌──────────────────┐                    │                  │
│  Integradores    │ ◄────────────────► │                  │
│  POS · ERP · web │  API + Webhooks    └────────┬─────────┘
└──────────────────┘                             │
                                    ┌────────────┴────────────┐
                                    ▼                         ▼
                            ┌──────────────┐         ┌──────────────┐
                            │  PostgreSQL  │         │    Redis     │
                            │  (con RLS)   │         │ colas+caché  │
                            └──────────────┘         └──────────────┘
```

---

## Stack técnico

| Componente     | Tecnología                        | Motivo                                                      |
| -------------- | --------------------------------- | ----------------------------------------------------------- |
| App de captura | Kotlin + Jetpack Compose          | La API de escucha de notificaciones es exclusiva de Android |
| Backend        | NestJS + TypeScript               | Modularidad, inyección de dependencias, ecosistema maduro   |
| Panel          | Next.js 15 + Tailwind + shadcn/ui | Cobertura multiplataforma vía web, iteración rápida         |
| Base de datos  | PostgreSQL 16                     | Row Level Security nativo, integridad relacional, JSONB     |
| Colas y caché  | Redis 7 + BullMQ                  | Reintentos con backoff, distribución de eventos             |
| Tiempo real    | Socket.io                         | Reconexión automática, adaptador para múltiples instancias  |
| ORM            | Prisma                            | Tipado generado, migraciones versionadas                    |
| Monorepo       | Turborepo + pnpm                  | Compilación incremental, tipos compartidos                  |

---

## Estilo arquitectónico

**Monolito modular con arquitectura hexagonal en el núcleo de dominio.**

Se descartó microservicios por complejidad operativa desproporcionada al tamaño del equipo, y monolito en capas por acoplar la lógica crítica al framework. El patrón de puertos y adaptadores se aplica selectivamente a los módulos con reglas de negocio no triviales — parsing, transacciones, webhooks, suscripciones — y no a los módulos de gestión simple, donde añadiría ceremonia sin beneficio.

El módulo de parsing es el caso paradigmático: su núcleo no depende de HTTP, base de datos ni framework, permitiendo ejecutar cientos de casos de prueba con muestras reales en milisegundos.

---

## Decisiones clave

| Decisión                                     | Razón                                                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Kotlin nativo para captura**               | La funcionalidad requerida no existe en iOS ni se beneficia de frameworks multiplataforma             |
| **Parsing en servidor, no en cliente**       | Los formatos de notificación cambian sin aviso; corregir no debe requerir actualizar la app instalada |
| **Patrones de parsing en base de datos**     | Permite corregir en minutos, versionar y revertir                                                     |
| **Panel web, no aplicación nativa**          | Cubre Android, iOS y escritorio con un solo desarrollo                                                |
| **Multi-tenancy con RLS**                    | Segunda capa de aislamiento a nivel de motor de base de datos                                         |
| **Cola local persistente en el dispositivo** | Garantía de no perder capturas ante fallos de red                                                     |
| **Notificación cruda conservada**            | Auditoría, corrección de parsers y reprocesamiento histórico                                          |
| **API key, no OAuth, para integradores**     | El integrador actúa en nombre propio del tenant; OAuth se contempla para v1.0                         |

---

## Modelo de negocio

| Plan         | Mensual  | Semestral | Anual     |
| ------------ | -------- | --------- | --------- |
| Free         | S/0      | —         | —         |
| Negocio      | S/29     | S/156     | S/290     |
| **Comercio** | **S/79** | **S/426** | **S/790** |
| Cadena       | S/199    | S/1,074   | S/1,990   |

La línea de monetización principal está entre **Negocio** y **Comercio**: es donde se habilita el acceso a la API y los webhooks, que es lo que distingue a Yallegó de la competencia.

El descuento anual se comunica como **"2 meses gratis"**, no como porcentaje.

---

## Estado del proyecto

| Fase                   | Estado                    |
| ---------------------- | ------------------------- |
| Definición de producto | ✅ Completa               |
| Documentación técnica  | ✅ Completa               |
| Desarrollo             | ⏳ Pendiente de inicio    |
| Prueba cerrada         | ⏳ Prevista tras Sprint 5 |
| Lanzamiento público    | ⏳ Previsto tras Sprint 8 |

---

## Próximos pasos

| #   | Acción                                                                   | Bloqueante                                              |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| 1   | Verificar disponibilidad de la marca ante INDECOPI                       | No, pero conviene antes de invertir en identidad visual |
| 2   | Registrar dominios y perfiles de redes                                   | No                                                      |
| 3   | **Recolectar muestras reales de notificaciones de cada billetera**       | **Sí — bloquea el Sprint 4**                            |
| 4   | **Verificar los nombres de paquete de las aplicaciones de billetera**    | **Sí — bloquea el Sprint 3**                            |
| 5   | Conseguir dispositivos Android de al menos tres fabricantes para pruebas | Sí — bloquea el Sprint 3                                |
| 6   | Inicializar el monorepo siguiendo el documento 11                        | No                                                      |
| 7   | Identificar los tres participantes de la prueba cerrada                  | No, pero conviene antes del Sprint 5                    |

> Los puntos 3, 4 y 5 son los únicos verdaderamente bloqueantes y deben resolverse en paralelo al Sprint 1.

---

## Restricciones conocidas

| Restricción                                          | Consecuencia                                                     |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| El dispositivo de captura debe ser Android           | El dueño con iPhone requiere un dispositivo Android dedicado     |
| El dispositivo debe permanecer encendido y conectado | Se recomienda dispositivo dedicado en el punto de venta          |
| No se recuperan cobros ocurridos con la app detenida | El heartbeat alerta la condición para minimizar la ventana       |
| Los formatos de notificación pueden cambiar          | Mitigado con patrones configurables y monitoreo de tasa de éxito |

---

## Uso de esta documentación con un agente de codificación

Los documentos están escritos para servir como contexto persistente de un agente de desarrollo. Orden de lectura recomendado según la tarea:

| Tarea                                | Documentos relevantes |
| ------------------------------------ | --------------------- |
| Comprender el producto               | 01                    |
| Implementar una funcionalidad        | 02, 04, 06            |
| Trabajar con la base de datos        | 05                    |
| Implementar autenticación o permisos | 07                    |
| Construir interfaz                   | 08, 09                |
| Configurar el proyecto               | 11                    |
| Planificar el trabajo                | 10                    |

Cada sprint del documento 10 contiene listas de verificación con granularidad suficiente para convertirse directamente en tareas.
