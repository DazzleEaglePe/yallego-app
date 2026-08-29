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
pnpm docker:build:proxy
```

Las etiquetas locales resultantes son `yallego-api:local` y
`yallego-dashboard:local` y `yallego-proxy:local`.

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

## Proxy HTTPS

La imagen `yallego-proxy` es el único componente que debe publicar puertos en
el host: `80` y `443`. API, dashboard, PostgreSQL y Redis se conectan por redes
privadas de Docker y solo declaran sus puertos internos; no deben usar la clave
`ports` en el archivo de despliegue.

El proxy recibe `SERVER_NAME` (uno o varios nombres separados por espacios) y
espera estos archivos de solo lectura:

- `/etc/nginx/certs/fullchain.pem`
- `/etc/nginx/certs/privkey.pem`

Por ejemplo, el servicio de Compose puede declararse así:

```yaml
services:
  proxy:
    image: yallego-proxy:release
    environment:
      SERVER_NAME: panel.example.com
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - /etc/letsencrypt/live/panel.example.com/fullchain.pem:/etc/nginx/certs/fullchain.pem:ro
      - /etc/letsencrypt/live/panel.example.com/privkey.pem:/etc/nginx/certs/privkey.pem:ro
    networks: [edge]
    depends_on: [api, dashboard]

  api:
    image: yallego-api:release
    expose: ['3001']
    networks: [edge, data]

  dashboard:
    image: yallego-dashboard:release
    expose: ['3000']
    networks: [edge]

networks:
  edge:
  data:
    internal: true
```

El dashboard de producción debe construirse para el mismo origen del proxy:

```bash
docker build \
  -f apps/dashboard/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://panel.example.com/v1 \
  --build-arg NEXT_PUBLIC_WS_URL=https://panel.example.com \
  -t yallego-dashboard:release .
```

Nginx redirige HTTP a HTTPS, termina TLS 1.2/1.3, enruta `/v1`,
`/internal/v1` y `/platform/v1` hacia la API, conserva el cambio de protocolo
de `/v1/realtime` y envía el resto al dashboard. `/metrics` no se publica: el
recolector debe consultarlo directamente dentro de la red privada. La emisión
y renovación del certificado (por ejemplo, con Certbot en el VPS) es una
responsabilidad del entorno; después de renovarlo se recarga Nginx con
`nginx -s reload` dentro del contenedor.

## Propiedades de ejecución

- Node.js 22 sobre Debian slim.
- Builds multi-stage; las herramientas de compilación no pasan a runtime.
- Usuario final `node`, sin privilegios de root.
- `dumb-init` como PID 1 para propagar señales y recoger procesos hijos.
- Healthchecks incorporados en ambas imágenes.
- `.dockerignore` excluye `.env`, dependencias, artefactos y metadatos locales.
