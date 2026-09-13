# Yallegó

Validación en tiempo real de pagos por billeteras digitales para negocios peruanos.

Este repositorio es un monorepo de `pnpm` y Turborepo. Contiene el backend NestJS, el panel Next.js y los paquetes compartidos. La aplicación Android se incorporará en el Sprint 3 y se compilará con Gradle fuera del espacio de trabajo de Node.

## Requisitos

- Node.js 22 o superior
- Corepack
- Docker con Compose

## Primer arranque

```bash
corepack enable
corepack pnpm install
cp .env.example .env
# Añade las claves al final; dotenv se queda con la última aparición de cada
# variable, así que no hace falta editar las líneas vacías de arriba.
./tools/scripts/generate-jwt-keys.sh >> .env
corepack pnpm docker:up
corepack pnpm db:migrate
corepack pnpm db:seed

# `apps/api` y `apps/dashboard` arrancan con el directorio de cada paquete
# como working directory (tanto `turbo run dev` como `pnpm --filter`), así
# que necesitan ver el `.env` de la raíz ahí también.
ln -s ../../.env apps/api/.env
ln -s ../../.env apps/dashboard/.env

corepack pnpm dev:stack
```

Servicios locales:

| Servicio                    | URL                                     |
| --------------------------- | --------------------------------------- |
| Panel                       | <http://localhost:3000>                 |
| API                         | <http://localhost:3001>                 |
| Estado de la API (liveness) | <http://localhost:3001/v1/health>       |
| Estado de la API (DB+Redis) | <http://localhost:3001/v1/health/ready> |
| Métricas (Prometheus)       | <http://localhost:3001/metrics>         |
| Mailpit                     | <http://localhost:8025>                 |

## Comandos

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm format:check
```

## Documentación

La definición funcional y técnica aprobada está en [docs/README.md](./docs/README.md). El trabajo se ordena por los ocho sprints descritos en [docs/10_PLAN_DESARROLLO.md](./docs/10_PLAN_DESARROLLO.md).

Para integrar contra la API pública, ver [docs/api-publica](./docs/api-publica/README.md) y la especificación [OpenAPI](./docs/openapi.yaml). Para operar el sistema, ver el [runbook de incidentes](./docs/runbook-incidentes.md), el [procedimiento de despliegue](./docs/12_DESPLIEGUE.md) y la [referencia de contenedores](./tools/docker/README.md).

## Convenciones

- Ramas: `feat/<descripcion>`, `fix/<descripcion>`, `chore/<descripcion>` y `docs/<descripcion>`.
- Commits: [Conventional Commits](https://www.conventionalcommits.org/), con ámbito cuando corresponda; por ejemplo, `feat(api): agregar registro de usuarios`.
- Código TypeScript estricto; archivos en `kebab-case` y componentes React en `PascalCase`.
