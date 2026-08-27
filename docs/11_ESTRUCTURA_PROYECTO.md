# 11 — Estructura del Proyecto

> **Gestor de paquetes:** pnpm
> **Orquestador:** Turborepo
> **Node:** 22 LTS

---

## 1. Justificación del monorepo

| Motivo                          | Beneficio concreto                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| Tipos compartidos               | El contrato de la API se define una vez y lo consumen backend y panel                     |
| Cambios atómicos                | Modificar un endpoint actualiza servidor, cliente y tipos en una sola solicitud de cambio |
| Compilación incremental         | El orquestador reconstruye únicamente lo afectado                                         |
| Configuración unificada         | Reglas de linter, formateo y compilador definidas en un solo lugar                        |
| Biblioteca cliente reutilizable | El cliente que usa el panel es el mismo que se publica para integradores                  |

La aplicación Android reside en el mismo repositorio por coherencia organizativa, pero **no participa en el orquestador de tareas**: se compila con su propia herramienta y tiene un flujo de integración independiente.

---

## 2. Estructura de directorios

```
yallego/
│
├── apps/
│   ├── api/                    Backend
│   ├── dashboard/              Panel administrativo
│   ├── landing/                Sitio público
│   ├── docs/                   Documentación de la API
│   └── android/                Aplicación de captura
│
├── packages/
│   ├── contracts/              Tipos y esquemas compartidos
│   ├── api-client/             Cliente de la API
│   ├── parsers/                Núcleo de parsing
│   ├── design-tokens/          Tokens del sistema de diseño
│   ├── ui/                     Componentes compartidos
│   ├── config-eslint/
│   ├── config-typescript/
│   └── config-tailwind/
│
├── tools/
│   ├── docker/                 Entorno local
│   └── scripts/                Utilidades de desarrollo
│
├── docs/                       Documentación del proyecto
│
├── .github/workflows/          Integración y despliegue
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── .env.example
└── README.md
```

---

## 3. `apps/api` — Backend

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── memberships/
│   │   ├── tenants/
│   │   ├── devices/
│   │   ├── wallets/
│   │   │
│   │   ├── ingest/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── ports/
│   │   │   └── adapters/
│   │   │
│   │   ├── parsing/
│   │   │   ├── application/
│   │   │   ├── ports/
│   │   │   └── adapters/
│   │   │
│   │   ├── transactions/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── ports/
│   │   │   └── adapters/
│   │   │
│   │   ├── realtime/
│   │   ├── webhooks/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── ports/
│   │   │   └── adapters/
│   │   │
│   │   ├── api-keys/
│   │   ├── subscriptions/
│   │   ├── audit/
│   │   └── platform/
│   │
│   ├── shared/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── filters/
│   │   ├── decorators/
│   │   ├── errors/
│   │   └── utils/
│   │
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── cache/
│   │   ├── queue/
│   │   ├── storage/
│   │   ├── mailer/
│   │   └── observability/
│   │
│   ├── workers/
│   │   ├── parsing.worker.ts
│   │   ├── webhooks.worker.ts
│   │   └── scheduled.worker.ts
│   │
│   └── config/
│       ├── env.schema.ts
│       └── app.config.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── Dockerfile
├── package.json
└── tsconfig.json
```

### 3.1. Convención de módulos

Los módulos con lógica de negocio no trivial siguen la separación por capas:

| Capa           | Contenido                             | Dependencias permitidas   |
| -------------- | ------------------------------------- | ------------------------- |
| `domain/`      | Entidades, reglas, invariantes        | Ninguna externa           |
| `application/` | Casos de uso, orquestación            | Solo `domain/` y `ports/` |
| `ports/`       | Interfaces de entrada y salida        | Solo `domain/`            |
| `adapters/`    | Controladores, repositorios, clientes | Todas                     |

Los módulos de gestión simple (`users`, `tenants`, `devices`, `wallets`, `api-keys`, `audit`) emplean estructura directa: controlador, servicio y módulo, sin las capas anteriores.

---

## 4. `apps/dashboard` — Panel administrativo

```
apps/dashboard/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── registro/
│   │   │   ├── verificar-correo/
│   │   │   └── recuperar-clave/
│   │   ├── (app)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── transacciones/
│   │   │   ├── dispositivos/
│   │   │   ├── billeteras/
│   │   │   ├── equipo/
│   │   │   ├── integraciones/
│   │   │   ├── membresia/
│   │   │   ├── auditoria/
│   │   │   └── configuracion/
│   │   ├── invitacion/[token]/
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── transactions/
│   │   ├── devices/
│   │   ├── wallets/
│   │   ├── team/
│   │   ├── integrations/
│   │   ├── subscription/
│   │   └── audit/
│   │
│   ├── shared/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── stores/
│   │   └── providers/
│   │
│   └── middleware.ts
│
├── public/
├── next.config.mjs
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

### 4.1. Estructura de una feature

```
features/transactions/
├── components/       Componentes específicos de la feature
├── hooks/            Hooks de consulta y mutación
├── api/              Llamadas al backend
├── schemas/          Validación de formularios
└── types/            Tipos locales
```

Cada feature es autocontenida. Un componente usado por más de una feature se promueve a `shared/components/`.

---

## 5. `apps/android` — Aplicación de captura

```
apps/android/
├── app/src/main/
│   ├── kotlin/app/yallego/capture/
│   │   ├── YallegoApp.kt
│   │   ├── MainActivity.kt
│   │   │
│   │   ├── di/
│   │   │
│   │   ├── data/
│   │   │   ├── local/
│   │   │   │   ├── database/
│   │   │   │   ├── datastore/
│   │   │   │   └── secure/
│   │   │   ├── remote/
│   │   │   │   ├── api/
│   │   │   │   ├── dto/
│   │   │   │   └── interceptor/
│   │   │   └── repository/
│   │   │
│   │   ├── domain/
│   │   │   ├── model/
│   │   │   ├── repository/
│   │   │   └── usecase/
│   │   │
│   │   ├── service/
│   │   │   ├── CaptureNotificationListener.kt
│   │   │   └── CaptureForegroundService.kt
│   │   │
│   │   ├── worker/
│   │   │   ├── SyncWorker.kt
│   │   │   └── HeartbeatWorker.kt
│   │   │
│   │   ├── receiver/
│   │   │   └── BootReceiver.kt
│   │   │
│   │   ├── ui/
│   │   │   ├── theme/
│   │   │   ├── onboarding/
│   │   │   ├── status/
│   │   │   └── settings/
│   │   │
│   │   └── util/
│   │       └── VendorHints.kt
│   │
│   ├── res/
│   └── AndroidManifest.xml
│
├── app/build.gradle.kts
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties
```

### 5.1. Dependencias principales

| Biblioteca            | Propósito                                |
| --------------------- | ---------------------------------------- |
| Jetpack Compose       | Interfaz declarativa                     |
| Material 3            | Sistema de componentes                   |
| Hilt                  | Inyección de dependencias                |
| Room                  | Cola local persistente                   |
| WorkManager           | Trabajos en segundo plano con reintentos |
| Retrofit + OkHttp     | Cliente HTTP                             |
| Kotlinx Serialization | Serialización                            |
| DataStore             | Preferencias                             |
| Security Crypto       | Almacenamiento cifrado                   |
| CameraX + ML Kit      | Lectura de código QR                     |
| Timber                | Registro en desarrollo                   |

---

## 6. Paquetes compartidos

### 6.1. `packages/contracts`

Fuente única de verdad del contrato de la API. Define esquemas de validación de los que se derivan los tipos.

```
packages/contracts/src/
├── auth/
├── tenants/
├── devices/
├── transactions/
├── webhooks/
├── subscriptions/
├── common/
│   ├── pagination.ts
│   ├── errors.ts
│   └── money.ts
└── index.ts
```

Consumido por el backend para validar entradas y por el panel para validar formularios. Un cambio en el contrato produce error de compilación en ambos lados si no se actualiza.

### 6.2. `packages/parsers`

Núcleo de parsing sin dependencias de framework.

```
packages/parsers/
├── src/
│   ├── core/
│   │   ├── parser.port.ts
│   │   ├── registry.ts
│   │   └── normalize.ts
│   ├── implementations/
│   │   ├── yape.parser.ts
│   │   ├── plin-bbva.parser.ts
│   │   ├── plin-interbank.parser.ts
│   │   └── bim.parser.ts
│   └── index.ts
├── fixtures/
│   ├── yape/
│   ├── plin-bbva/
│   ├── plin-interbank/
│   └── bim/
└── test/
```

Aislado deliberadamente para mantener una suite de pruebas extensa que se ejecuta sin infraestructura.

### 6.3. `packages/api-client`

Cliente tipado de la API. Empleado por el panel y destinado a publicarse como biblioteca para integradores.

### 6.4. `packages/design-tokens`

Tokens del sistema de diseño. Fuente de la que derivan la configuración de estilos del panel y el tema de la aplicación Android.

### 6.5. `packages/ui`

Componentes compartidos entre panel y sitio público.

### 6.6. Paquetes de configuración

`config-eslint`, `config-typescript` y `config-tailwind` centralizan las reglas para evitar divergencia entre aplicaciones.

---

## 7. Configuración raíz

### 7.1. `pnpm-workspace.yaml`

```yaml
packages:
  - 'apps/api'
  - 'apps/dashboard'
  - 'apps/landing'
  - 'apps/docs'
  - 'packages/*'
  - 'tools/*'
```

> `apps/android` se excluye deliberadamente: no es un paquete de Node.

### 7.2. `package.json`

```json
{
  "name": "yallego",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "engines": { "node": ">=22.0.0", "pnpm": ">=9.0.0" },
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "format": "prettier --write \"**/*.{ts,tsx,md,json,yaml}\"",
    "dev:api": "pnpm --filter @yallego/api dev",
    "dev:dashboard": "pnpm --filter @yallego/dashboard dev",
    "dev:stack": "turbo run dev --filter=@yallego/api --filter=@yallego/dashboard",
    "db:migrate": "pnpm --filter @yallego/api db:migrate",
    "db:seed": "pnpm --filter @yallego/api db:seed",
    "db:studio": "pnpm --filter @yallego/api db:studio",
    "docker:up": "docker compose -f tools/docker/docker-compose.yml up -d",
    "docker:down": "docker compose -f tools/docker/docker-compose.yml down"
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "prettier": "^3.3.0",
    "typescript": "^5.6.0"
  }
}
```

### 7.3. `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "globalEnv": ["NODE_ENV"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "env": ["DATABASE_URL", "REDIS_URL", "NEXT_PUBLIC_*"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": { "dependsOn": ["^build"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

### 7.4. `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

---

## 8. Entorno de desarrollo local

### 8.1. `tools/docker/docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: yallego
      POSTGRES_PASSWORD: yallego_dev
      POSTGRES_DB: yallego
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U yallego']
      interval: 5s

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    volumes: ['redisdata:/data']

  mailpit:
    image: axllent/mailpit
    ports: ['1025:1025', '8025:8025']

volumes:
  pgdata:
  redisdata:
```

> `mailpit` captura los correos salientes en desarrollo, permitiendo verificar el contenido sin envío real.

### 8.2. Puesta en marcha

```bash
git clone <repositorio>
cd yallego

pnpm install
cp .env.example .env

pnpm docker:up
pnpm db:migrate
pnpm db:seed

pnpm dev:stack
```

| Servicio             | Dirección               |
| -------------------- | ----------------------- |
| Backend              | `http://localhost:3001` |
| Panel                | `http://localhost:3000` |
| Correo de desarrollo | `http://localhost:8025` |

### 8.3. Aplicación Android

```bash
cd apps/android
./gradlew assembleDebug
./gradlew installDebug
```

Para conectar con el backend local desde un dispositivo físico, se configura la dirección de red local del equipo de desarrollo en la variable correspondiente del archivo de propiedades.

---

## 9. Convenciones

### 9.1. Nomenclatura de paquetes

| Tipo          | Formato                                  |
| ------------- | ---------------------------------------- |
| Aplicaciones  | `@yallego/api`, `@yallego/dashboard`     |
| Paquetes      | `@yallego/contracts`, `@yallego/parsers` |
| Configuración | `@yallego/config-eslint`                 |

### 9.2. Nomenclatura de archivos

| Tipo                | Convención            | Ejemplo                  |
| ------------------- | --------------------- | ------------------------ |
| Archivos TypeScript | kebab-case con sufijo | `transaction.service.ts` |
| Componentes React   | PascalCase            | `TransactionCard.tsx`    |
| Archivos Kotlin     | PascalCase            | `SyncWorker.kt`          |
| Directorios         | kebab-case            | `api-keys/`              |
| Rutas del panel     | kebab-case en español | `transacciones/`         |

### 9.3. Ramas

| Formato               | Uso                 |
| --------------------- | ------------------- |
| `main`                | Estado desplegable  |
| `feat/<descripción>`  | Nueva funcionalidad |
| `fix/<descripción>`   | Corrección          |
| `chore/<descripción>` | Mantenimiento       |
| `docs/<descripción>`  | Documentación       |

### 9.4. Mensajes de commit

Se sigue la convención de commits convencionales, indicando el ámbito afectado:

```
feat(api): agregar rotación de secreto de webhook
fix(android): conservar elementos en cola ante respuesta de límite excedido
docs(api): documentar verificación de firma
chore(deps): actualizar dependencias del panel
```

---

## 10. Integración y despliegue continuos

```
.github/workflows/
├── ci.yml                Verificación de tipos, linter y pruebas del código TypeScript
├── ci-android.yml        Compilación y pruebas de la aplicación Android
├── deploy-api.yml        Despliegue del backend
├── deploy-dashboard.yml  Despliegue del panel
└── security.yml          Auditoría de dependencias y detección de secretos
```

| Característica              | Definición                                                        |
| --------------------------- | ----------------------------------------------------------------- |
| Caché                       | Dependencias y resultados del orquestador                         |
| Filtrado                    | El flujo de Android se ejecuta solo ante cambios en su directorio |
| Verificaciones obligatorias | El flujo principal debe aprobar antes de integrar                 |
| Despliegue a preproducción  | Automático al integrar en la rama principal                       |
| Despliegue a producción     | Manual, con aprobación explícita                                  |

---

## 11. Variables de entorno

### 11.1. Backend

```env
NODE_ENV=development
PORT=3001

DATABASE_URL=postgresql://yallego:yallego_dev@localhost:5432/yallego
REDIS_URL=redis://localhost:6379

JWT_PRIVATE_KEY=
JWT_PUBLIC_KEY=
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d

ENCRYPTION_KEY=

WEBHOOK_TIMEOUT_MS=10000
WEBHOOK_MAX_ATTEMPTS=8

SMTP_HOST=localhost
SMTP_PORT=1025
MAIL_FROM=no-reply@yallego.app

STORAGE_ENDPOINT=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=

DASHBOARD_URL=http://localhost:3000
SENTRY_DSN=
LOG_LEVEL=debug
```

### 11.2. Panel

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_APP_NAME=Yallegó
```

### 11.3. Aplicación Android

Definidas en el archivo de propiedades local, no versionado:

```properties
API_BASE_URL_DEBUG=http://192.168.1.100:3001
API_BASE_URL_RELEASE=https://api.yallego.app
```

---

## 12. Secuencia de creación del proyecto

| Paso | Acción                                                               |
| ---- | -------------------------------------------------------------------- |
| 1    | Crear el repositorio e inicializar el espacio de trabajo             |
| 2    | Configurar los paquetes de configuración compartida                  |
| 3    | Crear `packages/contracts` y `packages/design-tokens`                |
| 4    | Crear `apps/api` con la estructura modular definida                  |
| 5    | Definir el esquema de datos y generar la migración inicial           |
| 6    | Crear `apps/dashboard` con la estructura de features                 |
| 7    | Crear `packages/parsers` con el contrato del núcleo                  |
| 8    | Crear `packages/api-client`                                          |
| 9    | Crear `apps/android` con la arquitectura definida                    |
| 10   | Configurar el entorno local con contenedores                         |
| 11   | Configurar los flujos de integración continua                        |
| 12   | Verificar el arranque completo desde cero siguiendo la documentación |
