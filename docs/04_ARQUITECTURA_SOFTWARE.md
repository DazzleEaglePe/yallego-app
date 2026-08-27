# 04 — Arquitectura de Software

> **Estilo arquitectónico:** Monolito modular con arquitectura hexagonal en el núcleo de dominio
> **Versión:** 1.0

---

## 1. Decisión arquitectónica principal

### 1.1. Opciones evaluadas

| Estilo                                        | Ventajas                                                                                                                                              | Desventajas para este contexto                                                                                                                          | Veredicto           |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| **Monolito tradicional en capas**             | Simple, rápido de arrancar                                                                                                                            | Lógica de dominio acoplada a framework y base de datos; los parsers quedarían atados a NestJS y difíciles de probar aisladamente                        | ❌                  |
| **Microservicios**                            | Escalado independiente, aislamiento de fallos                                                                                                         | Complejidad operativa desproporcionada para un equipo pequeño; latencia de red entre servicios; transacciones distribuidas innecesarias en este dominio | ❌                  |
| **Monolito modular + hexagonal en el núcleo** | Un solo despliegue, dominio desacoplado y testeable, límites claros entre módulos, migración futura a servicios independientes viable sin reescritura | Requiere disciplina de equipo para respetar los límites                                                                                                 | ✅ **Seleccionado** |

### 1.2. Justificación

El dominio de Yallegó tiene **dos características determinantes**:

1. **Un núcleo de lógica pura y crítica** — los parsers de notificaciones. Es la pieza más frágil (los formatos cambian sin aviso) y la que más pruebas requiere. Debe estar completamente desacoplada de HTTP, de la base de datos y del framework para poder probarse con muestras reales sin infraestructura.

2. **El resto es orquestación y persistencia** — no hay complejidad algorítmica en gestionar tenants, usuarios o suscripciones.

La arquitectura hexagonal se aplica **selectivamente al núcleo de dominio** (parsing, reglas de transacción, validación de límites de plan) y no se impone dogmáticamente sobre módulos CRUD simples, donde añadiría ceremonia sin beneficio.

**Regla práctica adoptada:**

> Los módulos con reglas de negocio no triviales (`parsing`, `transactions`, `subscriptions`, `webhooks`) siguen el patrón puertos y adaptadores. Los módulos de gestión simple (`users`, `tenants`, `devices`) siguen una estructura de servicio directa sobre el ORM.

### 1.3. Camino de evolución

Los límites modulares se definen de modo que, si en el futuro el volumen lo exige, estos módulos puedan extraerse como servicios independientes sin reescritura:

| Candidato a extracción | Motivo probable                                           |
| ---------------------- | --------------------------------------------------------- |
| `webhook-dispatcher`   | Alto volumen de I/O saliente, escalado independiente      |
| `ingest`               | Punto de entrada de mayor tráfico                         |
| `parsing`              | Núcleo puro, fácilmente extraíble como servicio o función |

---

## 2. Vista de contexto

```
┌──────────────────────────────────────────────────────────────────────┐
│                          ACTORES EXTERNOS                            │
└──────────────────────────────────────────────────────────────────────┘

   Dueño del negocio        Equipo del negocio       Integrador externo
          │                         │                        │
          │ configura               │ consulta               │ consume API
          ▼                         ▼                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                            YALLEGÓ                                   │
│                                                                      │
│   ┌────────────────┐    ┌────────────────┐    ┌─────────────────┐  │
│   │  App captura   │    │     Panel      │    │  API pública    │  │
│   │   (Android)    │    │ administrativo │    │ REST · WS · WHK │  │
│   └────────┬───────┘    └────────┬───────┘    └────────┬────────┘  │
│            │                     │                     │            │
│            └─────────────────────┼─────────────────────┘            │
│                                  │                                  │
│                        ┌─────────▼──────────┐                       │
│                        │      Backend       │                       │
│                        │  Monolito modular  │                       │
│                        └─────────┬──────────┘                       │
│                                  │                                  │
│              ┌───────────────────┼───────────────────┐              │
│              ▼                   ▼                   ▼              │
│        ┌──────────┐       ┌──────────┐       ┌──────────────┐      │
│        │PostgreSQL│       │  Redis   │       │Object Storage│      │
│        └──────────┘       └──────────┘       └──────────────┘      │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │   Sistemas del tenant    │
                    │  POS · ERP · e-commerce  │
                    └──────────────────────────┘
```

---

## 3. Vista de componentes del backend

```
apps/api/src/
│
├── modules/                        ← MÓDULOS DE APLICACIÓN
│   │
│   ├── identity/                   [CRUD simple]
│   │   ├── auth/                   Autenticación, tokens, recuperación
│   │   ├── users/                  Cuentas de persona
│   │   └── memberships/            Relación usuario ↔ tenant + rol
│   │
│   ├── tenancy/                    [CRUD simple]
│   │   └── tenants/                Negocios, configuración
│   │
│   ├── devices/                    [CRUD simple]
│   │   ├── registration/           Vinculación por código
│   │   └── heartbeat/              Señal de vida y detección de caída
│   │
│   ├── wallets/                    [CRUD simple]
│   │   ├── catalog/                Catálogo global de billeteras
│   │   └── tenant-wallets/         Billeteras activas por tenant
│   │
│   ├── ingest/                     [HEXAGONAL]
│   │   ├── domain/                 Reglas de deduplicación y validación
│   │   ├── application/            Caso de uso: recibir notificación cruda
│   │   ├── ports/                  Interfaces de repositorio y publicador
│   │   └── adapters/               Controlador HTTP, repositorio Prisma
│   │
│   ├── parsing/                    [HEXAGONAL · NÚCLEO CRÍTICO]
│   │   ├── domain/
│   │   │   ├── parser.port.ts      Contrato de un parser
│   │   │   ├── registry.ts         Selección del parser adecuado
│   │   │   └── normalized-tx.ts    Modelo normalizado de salida
│   │   ├── application/            Caso de uso: parsear notificación
│   │   ├── parsers/                Implementaciones por billetera
│   │   └── adapters/               Carga de patrones desde BD
│   │
│   ├── transactions/               [HEXAGONAL]
│   │   ├── domain/                 Entidad, estados, invariantes
│   │   ├── application/            Casos de uso: crear, confirmar, consultar
│   │   ├── ports/
│   │   └── adapters/               Controlador, repositorio, exportador CSV
│   │
│   ├── realtime/                   [Infraestructura]
│   │   └── gateway/                Gateway WebSocket con adaptador Redis
│   │
│   ├── webhooks/                   [HEXAGONAL]
│   │   ├── domain/                 Política de reintentos, firma, idempotencia
│   │   ├── application/            Casos de uso: registrar, despachar, reintentar
│   │   ├── ports/
│   │   └── adapters/               Controlador, repositorio, cliente HTTP, worker
│   │
│   ├── api-keys/                   [CRUD simple]
│   │
│   ├── subscriptions/              [HEXAGONAL]
│   │   ├── domain/                 Planes, límites, reglas de cambio de plan
│   │   ├── application/            Casos de uso: cambiar plan, validar límite
│   │   ├── ports/
│   │   └── adapters/
│   │
│   ├── audit/                      [CRUD simple, append-only]
│   │
│   └── platform-admin/             [CRUD simple, autenticación separada]
│
├── shared/                         ← TRANSVERSAL
│   ├── guards/                     JWT, API key, tenant, rol
│   ├── interceptors/               Correlación, logging, transformación
│   ├── filters/                    Manejo uniforme de excepciones
│   ├── decorators/                 Extracción de contexto de request
│   ├── errors/                     Jerarquía de errores de dominio
│   └── utils/                      Utilidades puras
│
├── infrastructure/                 ← ADAPTADORES DE INFRAESTRUCTURA
│   ├── database/                   Cliente Prisma, gestión de contexto de tenant
│   ├── cache/                      Cliente Redis
│   ├── queue/                      Definición de colas y workers
│   ├── storage/                    Cliente de almacenamiento de objetos
│   ├── mailer/                     Envío de correo transaccional
│   └── observability/              Logging, métricas, trazas
│
└── config/                         ← CONFIGURACIÓN
    ├── env.schema.ts               Validación estricta de variables de entorno
    └── app.config.ts
```

---

## 4. Arquitectura hexagonal aplicada al núcleo de parsing

Este es el módulo donde el patrón aporta más valor. Se documenta en detalle porque es el modelo a replicar.

```
                    ┌─────────────────────────────────┐
                    │        ADAPTADORES DE           │
                    │          ENTRADA                │
                    │                                 │
                    │  • Consumidor de cola           │
                    │  • Endpoint de reprocesamiento  │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │       PUERTO DE ENTRADA         │
                    │   ParseNotificationUseCase      │
                    └────────────────┬────────────────┘
                                     │
                    ┌────────────────▼────────────────┐
                    │                                 │
                    │        NÚCLEO DE DOMINIO        │
                    │        (sin dependencias)       │
                    │                                 │
                    │   • ParserRegistry              │
                    │   • YapeParser                  │
                    │   • PlinBbvaParser              │
                    │   • PlinInterbankParser         │
                    │   • BimParser                   │
                    │   • NormalizedTransaction       │
                    │   • Reglas de validación        │
                    │                                 │
                    └────────────────┬────────────────┘
                                     │
                    ┌────────────────▼────────────────┐
                    │       PUERTOS DE SALIDA         │
                    │                                 │
                    │  • ParserPatternRepository      │
                    │  • TransactionRepository        │
                    │  • EventPublisher               │
                    └────────────────┬────────────────┘
                                     │
                    ┌────────────────▼────────────────┐
                    │      ADAPTADORES DE SALIDA      │
                    │                                 │
                    │  • PrismaParserPatternRepo      │
                    │  • PrismaTransactionRepo        │
                    │  • RedisEventPublisher          │
                    └─────────────────────────────────┘
```

### 4.1. Contrato del núcleo

```typescript
// domain/parser.port.ts — sin dependencias externas

export interface RawNotification {
  packageName: string;
  title: string | null;
  text: string | null;
  postedAt: Date;
}

export interface NormalizedTransaction {
  walletCode: string;
  senderName: string | null;
  amount: Money;
  securityCode: string | null;
  approvalCode: string | null;
  occurredAt: Date;
}

export interface Parser {
  readonly walletCode: string;
  supports(raw: RawNotification): boolean;
  parse(raw: RawNotification): NormalizedTransaction | null;
}

export interface ParserPatternRepository {
  findActivePatterns(walletCode: string): Promise<ParserPattern>;
}
```

### 4.2. Beneficio concreto

El núcleo se prueba sin base de datos, sin HTTP y sin NestJS:

```typescript
const parser = new YapeParser(patternsFixture);
const result = parser.parse(sampleNotification);
expect(result?.amount.value).toBe(35.5);
```

Esto permite mantener una suite de cientos de muestras reales anonimizadas ejecutándose en milisegundos.

---

## 5. Flujos principales

### 5.1. Ingesta y procesamiento de una notificación

```
 1. Billetera genera notificación en el dispositivo Android
 2. NotificationListenerService captura el evento
 3. La app filtra por package name contra el catálogo local
 4. Persiste en cola local (SQLite)
 5. Worker de sincronización envía al backend
       POST /internal/v1/ingest   (auth: device token)
 6. Backend valida token y resuelve el tenant
 7. Verifica límite de transacciones del plan
 8. Calcula hash de deduplicación → descarta si ya existe
 9. Persiste la notificación cruda íntegra
10. Responde 202 Accepted (la app elimina el ítem de su cola)
11. Encola job de parsing
12. Worker de parsing:
       - Carga patrones activos de la billetera
       - Selecciona parser mediante el registry
       - Normaliza el resultado
13. Si parsea correctamente → crea Transaction
    Si no → marca la notificación como no reconocida
14. Publica evento de dominio `TransactionCreated`
15. Suscriptores del evento:
       a) Gateway WebSocket → emite al canal del tenant
       b) Despachador de webhooks → encola entregas
       c) Contador de uso → incrementa consumo del período
16. Panel del tenant recibe el evento y actualiza la vista
17. Worker de webhooks entrega a endpoints externos con firma HMAC
```

### 5.2. Entrega de webhook con reintentos

```
 1. Se crea un registro de entrega en estado `pending`
 2. Worker toma el job de la cola
 3. Construye el payload versionado
 4. Calcula firma HMAC-SHA256 con el secreto del endpoint
 5. Envía POST con timeout configurado
 6. Respuesta 2xx  → estado `delivered`, se registra el intento
    Respuesta 4xx  → se evalúa: 410 marca el endpoint como inactivo;
                      otros 4xx reintentan
    Respuesta 5xx  → reintento programado
    Timeout        → reintento programado
 7. El reintento se agenda según la política de backoff
 8. Al agotar los intentos → estado `failed`, se notifica al tenant
```

**Política de reintentos:**

| Intento | Espera acumulada |
| ------- | ---------------- |
| 1       | inmediato        |
| 2       | 1 s              |
| 3       | 6 s              |
| 4       | 36 s             |
| 5       | 5 min            |
| 6       | 35 min           |
| 7       | 2 h 30 min       |
| 8       | 12 h             |

### 5.3. Vinculación de un dispositivo

```
 1. Usuario con rol OWNER o ADMIN solicita vincular dispositivo
 2. Backend verifica el límite de dispositivos del plan
 3. Genera un código de vinculación de 8 caracteres, válido 10 minutos
 4. Panel muestra el código y su representación en QR
 5. App Android escanea el QR o recibe el código manualmente
 6. App envía: código + metadatos del dispositivo
 7. Backend valida vigencia y unicidad del código
 8. Genera token permanente del dispositivo
 9. Invalida el código de vinculación
10. App almacena el token de forma cifrada en el almacenamiento seguro
11. App inicia el asistente de permisos
12. Backend registra la acción en auditoría
```

---

## 6. Multi-tenancy

### 6.1. Estrategia

**Aislamiento lógico sobre infraestructura compartida** (_pooled multi-tenancy_), con dos capas de defensa.

### 6.2. Capa 1 — Aplicación

Un guard extrae el identificador del tenant del token o de la API key y lo inyecta en el contexto de la solicitud. Todo repositorio recibe ese contexto y lo aplica en cada consulta.

### 6.3. Capa 2 — Base de datos

Row Level Security en PostgreSQL. Antes de cada transacción, el adaptador de persistencia establece la variable de sesión correspondiente. Las políticas de la base de datos filtran por esa variable.

**Consecuencia:** ante un error en la capa de aplicación, la base de datos no devuelve datos de otro tenant.

### 6.4. Contexto de administración de plataforma

El módulo de administración interna utiliza un rol de base de datos con capacidad de omitir RLS. Su acceso está restringido a un dominio separado, autenticación independiente y auditoría obligatoria.

---

## 7. Arquitectura de la aplicación Android

### 7.1. Estilo

**Clean Architecture** en tres capas, con patrón MVVM en la capa de presentación.

```
app/
├── di/                         Inyección de dependencias (Hilt)
│
├── data/
│   ├── local/
│   │   ├── database/           Room: cola de notificaciones pendientes
│   │   ├── datastore/          Preferencias y estado de configuración
│   │   └── secure/             Almacenamiento cifrado del token
│   ├── remote/
│   │   ├── api/                Definición de endpoints (Retrofit)
│   │   ├── dto/                Objetos de transferencia
│   │   └── interceptor/        Inyección de token, reintentos
│   └── repository/             Implementación de los contratos de dominio
│
├── domain/
│   ├── model/                  Modelos de dominio
│   ├── repository/             Contratos (interfaces)
│   └── usecase/                Casos de uso
│
├── service/
│   ├── CaptureNotificationListener.kt   Servicio de escucha del sistema
│   └── CaptureForegroundService.kt      Servicio en primer plano
│
├── worker/
│   ├── SyncWorker.kt           Envío de la cola pendiente
│   └── HeartbeatWorker.kt      Señal de vida periódica
│
├── receiver/
│   └── BootReceiver.kt         Reinicio automático tras arranque
│
└── ui/
    ├── onboarding/             Vinculación y asistente de permisos
    ├── status/                 Estado operativo
    └── settings/               Configuración
```

### 7.2. Garantía de no pérdida de datos

```
Notificación capturada
        ↓
Inserción inmediata en Room (estado: PENDING)
        ↓
SyncWorker consulta pendientes
        ↓
Envío al backend
        ↓
Respuesta 202 → estado: SENT → eliminación diferida
Error/sin red → permanece PENDING → reintento con backoff
```

El elemento **solo se elimina tras confirmación explícita del servidor**. La base de datos local sobrevive a reinicios y cierres forzados.

### 7.3. Resiliencia frente a terminación por el sistema

| Mecanismo                            | Propósito                                                      |
| ------------------------------------ | -------------------------------------------------------------- |
| Servicio en primer plano             | Reduce drásticamente la probabilidad de terminación            |
| Exclusión de optimización de batería | Evita restricciones agresivas del sistema                      |
| Receptor de arranque                 | Restablece el servicio tras reinicio del dispositivo           |
| WorkManager con restricciones        | Reprograma trabajo pendiente de forma confiable                |
| Heartbeat al servidor                | Permite detectar y alertar caídas desde el backend             |
| Instrucciones por fabricante         | Guía al usuario en configuraciones específicas del dispositivo |

---

## 8. Arquitectura del panel administrativo

### 8.1. Estructura

```
src/
├── app/                        Rutas (App Router)
│   ├── (public)/               Autenticación
│   └── (dashboard)/            Rutas protegidas
│
├── features/                   Organización vertical por dominio
│   ├── transactions/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types/
│   ├── devices/
│   ├── members/
│   ├── integrations/
│   ├── wallets/
│   └── billing/
│
├── shared/
│   ├── components/             Componentes transversales
│   ├── hooks/
│   ├── lib/                    Cliente HTTP, cliente WebSocket, utilidades
│   └── stores/                 Estado global mínimo
│
└── styles/
```

### 8.2. Gestión de estado

| Tipo de estado        | Herramienta                               | Justificación                                  |
| --------------------- | ----------------------------------------- | ---------------------------------------------- |
| Estado del servidor   | TanStack Query                            | Caché, revalidación, reintentos automáticos    |
| Estado de UI global   | Zustand                                   | Ligero, sin ceremonia                          |
| Estado de formulario  | React Hook Form + Zod                     | Validación tipada compartida con el backend    |
| Estado en tiempo real | Cliente WebSocket → invalidación de caché | El evento invalida la consulta correspondiente |

### 8.3. Integración de tiempo real

```
Evento WebSocket recibido
        ↓
Actualización optimista de la caché de TanStack Query
        ↓
Re-render del componente suscrito
```

Ante desconexión, el cliente reintenta con backoff y, al restablecerse, invalida la caché completa para resincronizar.

---

## 9. Modelo de despliegue

### 9.1. Topología del MVP

```
                        ┌──────────────┐
                        │   Internet   │
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │ Proxy inverso│
                        │  + TLS       │
                        └──────┬───────┘
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
      ┌────────────┐    ┌────────────┐    ┌────────────┐
      │  Panel     │    │  API       │    │   Docs     │
      │  (estático)│    │ (contenedor)│   │ (estático) │
      └────────────┘    └─────┬──────┘    └────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │  Workers     │    │  PostgreSQL  │
            │ (contenedor) │    │  + pooler    │
            └──────┬───────┘    └──────────────┘
                   │
                   ▼
            ┌──────────────┐
            │    Redis     │
            └──────────────┘
```

### 9.2. Separación de procesos

| Proceso            | Responsabilidad                                                                                  | Escalado                 |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------ |
| `api`              | HTTP + WebSocket                                                                                 | Horizontal según tráfico |
| `worker-parsing`   | Procesamiento de notificaciones                                                                  | Horizontal según volumen |
| `worker-webhooks`  | Entrega de eventos salientes                                                                     | Horizontal según I/O     |
| `worker-scheduled` | Tareas programadas: detección de dispositivos caídos, limpieza por retención, cierre de períodos | Instancia única          |

### 9.3. Ambientes

| Ambiente     | Propósito                      | Datos                                      |
| ------------ | ------------------------------ | ------------------------------------------ |
| `local`      | Desarrollo                     | Datos sintéticos generados por semilla     |
| `staging`    | Validación previa a producción | Datos sintéticos, réplica de configuración |
| `production` | Servicio real                  | Datos reales                               |

---

## 10. Registro de decisiones arquitectónicas

| ID      | Decisión                                    | Justificación                                                                                                                                                                 | Alternativas descartadas                                 |
| ------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| ADR-001 | Kotlin nativo para la app de captura        | La API de escucha de notificaciones es exclusiva de Android; los frameworks multiplataforma requieren igualmente código nativo y añaden una capa de indirección sin beneficio | Flutter, React Native                                    |
| ADR-002 | Aplicación web para el panel administrativo | Cobertura multiplataforma inmediata, despliegue sin revisión de tiendas, reutilización del stack del equipo                                                                   | Aplicación nativa, aplicación híbrida                    |
| ADR-003 | Monolito modular con hexagonal en el núcleo | Equilibrio entre simplicidad operativa y desacoplamiento del dominio crítico                                                                                                  | Microservicios, monolito en capas                        |
| ADR-004 | Parsing en el servidor                      | Permite corregir formatos sin actualizar la aplicación instalada en los dispositivos                                                                                          | Parsing en el cliente                                    |
| ADR-005 | Patrones de parsing en base de datos        | Corrección inmediata sin despliegue; versionado y reversión                                                                                                                   | Patrones compilados en el código                         |
| ADR-006 | PostgreSQL con Row Level Security           | Segunda capa de aislamiento entre tenants a nivel de motor                                                                                                                    | Solo filtrado en la aplicación, base de datos por tenant |
| ADR-007 | Redis con cola de trabajos para webhooks    | Reintentos, backoff y observabilidad de la entrega                                                                                                                            | Envío síncrono, tabla de cola en PostgreSQL              |
| ADR-008 | Conservación de la notificación cruda       | Auditoría, corrección de parsers y reprocesamiento histórico                                                                                                                  | Descartar tras parsear                                   |
| ADR-009 | Monorepo con orquestador de tareas          | Tipos compartidos entre backend y panel, cambios atómicos                                                                                                                     | Repositorios independientes                              |
| ADR-010 | Autenticación diferenciada por audiencia    | Cada consumidor tiene un modelo de amenaza distinto                                                                                                                           | Mecanismo único para todos                               |
| ADR-011 | Cola local persistente en el dispositivo    | Garantía de no pérdida ante fallos de red o del sistema                                                                                                                       | Envío directo sin persistencia                           |
| ADR-012 | Evento de dominio como punto de fan-out     | Desacopla la creación de la transacción de sus consumidores                                                                                                                   | Llamadas directas desde el caso de uso                   |
