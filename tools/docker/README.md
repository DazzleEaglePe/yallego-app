# Contenedores de Yallegó

Las imágenes de aplicación se construyen desde la raíz del monorepo porque la
API y el dashboard consumen paquetes internos de `packages/`.

## Construcción local

```bash
pnpm docker:build
```

También pueden construirse por separado:

```bash
pnpm docker:build:api
pnpm docker:build:dashboard
```

Las etiquetas locales resultantes son `yallego-api:local` y
`yallego-dashboard:local`.

## Dashboard

Las variables públicas de Next.js se fijan durante la construcción. Para un
entorno real se deben proporcionar como argumentos:

```bash
docker build \
  -f apps/dashboard/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/v1 \
  --build-arg NEXT_PUBLIC_WS_URL=wss://api.example.com \
  --build-arg NEXT_PUBLIC_APP_NAME=Yallegó \
  -t yallego-dashboard:release .
```

La imagen escucha en el puerto `3000` y comprueba `/login` como healthcheck.

## API

La configuración sensible de la API se inyecta al ejecutar el contenedor; no
se incorpora al build. Como mínimo, producción requiere las conexiones a
PostgreSQL y Redis, las claves JWT, la clave de cifrado, el origen del dashboard
y una configuración SMTP válida. La lista completa y sus formatos están en
`.env.example`.

La imagen escucha en el puerto `3001` y comprueba `/v1/health`. No ejecuta
migraciones automáticamente: `prisma migrate deploy` debe correr como una tarea
de despliegue única con `DIRECT_DATABASE_URL` antes de reemplazar las réplicas
de la API.

## Propiedades de ejecución

- Node.js 22 sobre Debian slim.
- Builds multi-stage; las herramientas de compilación no pasan a runtime.
- Usuario final `node`, sin privilegios de root.
- `dumb-init` como PID 1 para propagar señales y recoger procesos hijos.
- Healthchecks incorporados en ambas imágenes.
- `.dockerignore` excluye `.env`, dependencias, artefactos y metadatos locales.
