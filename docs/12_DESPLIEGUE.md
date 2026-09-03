# 12 — Procedimiento de despliegue

Este procedimiento cubre un ambiente Yallegó de un solo host con Docker
Compose. La misma topología sirve para `staging` y `production`; cada ambiente
usa su propio dominio, archivo de secretos, proyecto Compose y volúmenes.

> Ejecutar primero en preproducción. Un ambiente no se considera operativo
> hasta validar DNS, TLS, migraciones, readiness, respaldo externo y una prueba
> funcional. La validación local del repositorio no sustituye esa comprobación.

## 1. Arquitectura operativa

Solo Nginx publica `80/443`. Dashboard, API, PostgreSQL y Redis usan redes de
Docker; la red `data` es interna. Una tarea efímera aplica migraciones antes de
que la API pueda iniciar.

```text
Internet → Nginx (80/443) → dashboard:3000
                         └→ api:3001 → PostgreSQL:5432
                                     └→ Redis:6379
```

Archivos relevantes:

- `tools/docker/deploy/compose.yml`: topología.
- `tools/docker/deploy/deploy.env.example`: contrato de configuración.
- `tools/docker/deploy/scripts/deploy-zero-downtime.sh`: actualización.
- `tools/docker/deploy/BACKUPS.md`: respaldos, restauración y rollback.
- `docs/runbook-incidentes.md`: diagnóstico operativo.

## 2. Requisitos previos

- Servidor Linux con Docker Engine y el complemento `docker compose`.
- Usuario de despliegue autorizado a usar Docker, sin trabajar como `root` de
  forma cotidiana.
- Dominio apuntando a la IP pública del host.
- Firewall con SSH limitado a IPs administrativas y únicamente `80/443`
  públicos para la aplicación.
- Registro privado o público para las cuatro imágenes.
- Certificado TLS válido y renovable.
- Destino de respaldos fuera del servidor.

Comprobar versiones y espacio antes de continuar:

```bash
docker version
docker compose version
df -h
```

## 3. Construir y publicar una versión

Construir desde un commit revisado y con el árbol limpio. El tag debe ser
inmutable; se recomienda el SHA completo o corto del commit, nunca `latest`.

```bash
git status --short
corepack pnpm install --frozen-lockfile
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build

RELEASE_TAG="$(git rev-parse --short=12 HEAD)"
REGISTRY="registry.example.com/yallego"
PUBLIC_URL="https://staging.example.com"

docker build -f apps/api/Dockerfile \
  -t "$REGISTRY/api:$RELEASE_TAG" .
docker build --target migrations -f apps/api/Dockerfile \
  -t "$REGISTRY/migrations:$RELEASE_TAG" .
docker build -f apps/dashboard/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL="$PUBLIC_URL/v1" \
  --build-arg NEXT_PUBLIC_WS_URL="$PUBLIC_URL" \
  --build-arg NEXT_PUBLIC_APP_NAME=Yallegó \
  -t "$REGISTRY/dashboard:$RELEASE_TAG" .
docker build -f tools/docker/nginx/Dockerfile \
  -t "$REGISTRY/proxy:$RELEASE_TAG" tools/docker/nginx

docker push "$REGISTRY/api:$RELEASE_TAG"
docker push "$REGISTRY/migrations:$RELEASE_TAG"
docker push "$REGISTRY/dashboard:$RELEASE_TAG"
docker push "$REGISTRY/proxy:$RELEASE_TAG"
```

Construir para la arquitectura del servidor o publicar una imagen multiarch si
la máquina de build y el VPS no coinciden.

## 4. Preparar el host y los secretos

Clonar el repositorio en una ruta estable y crear un archivo distinto por
ambiente. Los archivos `.env.*` están ignorados por Git.

```bash
cp tools/docker/deploy/deploy.env.example .env.staging
chmod 600 .env.staging
```

Completar todos los valores `REPLACE_*`, las rutas del certificado y los tags
de imagen. Las dos contraseñas de PostgreSQL deben ser diferentes, aleatorias y
URL-safe. Generar el material criptográfico con permisos restrictivos:

```bash
umask 077
./tools/scripts/generate-jwt-keys.sh > .env.keys
```

Copiar los tres valores de `.env.keys` al gestor de secretos y al archivo del
ambiente, y luego retirar esa copia temporal de forma segura. La clave
`ENCRYPTION_KEY` protege datos persistidos: no debe rotarse sin un proceso de
recifrado. Cambiar el par JWT invalida sesiones existentes y debe tratarse como
una rotación planificada.

No ejecutar `docker compose config` sin `--quiet` en CI o terminales grabadas:
la salida renderizada incluye secretos.

## 5. DNS y certificado inicial

Crear el registro DNS antes de emitir el certificado y verificar que resuelve a
la IP del host. Como el proxy exige certificado para arrancar, la primera
emisión debe hacerse fuera del stack — por ejemplo con Certbot en modo
`standalone` mientras el puerto 80 esté libre— o mediante el mecanismo del
proveedor.

Las rutas resultantes se declaran en el archivo del ambiente:

```dotenv
SERVER_NAME=staging.example.com
PUBLIC_URL=https://staging.example.com
TLS_FULLCHAIN_PATH=/etc/letsencrypt/live/staging.example.com/fullchain.pem
TLS_PRIVATE_KEY_PATH=/etc/letsencrypt/live/staging.example.com/privkey.pem
```

El usuario/daemon de Docker debe poder leer ambos archivos. Después de una
renovación se recarga Nginx sin recrearlo:

```bash
docker compose --env-file .env.staging \
  -f tools/docker/deploy/compose.yml exec -T proxy nginx -s reload
```

Probar la renovación automática del mecanismo elegido con su modo `dry-run`.

## 6. Primer despliegue

Autenticarse en el registro, validar el archivo sin imprimirlo y descargar las
imágenes:

```bash
docker login registry.example.com
docker compose --env-file .env.staging \
  -f tools/docker/deploy/compose.yml config --quiet
docker compose --env-file .env.staging \
  -f tools/docker/deploy/compose.yml pull
docker compose --env-file .env.staging \
  -f tools/docker/deploy/compose.yml up -d
```

El orden esperado es PostgreSQL saludable → migración `exit 0` → Redis
saludable → API/dashboard saludables → proxy. Verificarlo:

```bash
docker compose --env-file .env.staging \
  -f tools/docker/deploy/compose.yml ps
docker compose --env-file .env.staging \
  -f tools/docker/deploy/compose.yml logs migrate
```

Inicializar el catálogo de planes, billeteras y parsers. La semilla usa
`upsert`, por lo que es idempotente:

```bash
docker compose --env-file .env.staging \
  -f tools/docker/deploy/compose.yml run --rm --no-deps \
  --entrypoint node migrate \
  node_modules/tsx/dist/cli.mjs prisma/seed.ts
```

Crear el primer administrador de plataforma desde el host. Omitir `--password`
genera una contraseña aleatoria; registrar inmediatamente la contraseña y el
TOTP mostrados una sola vez:

```bash
docker compose --env-file .env.staging \
  -f tools/docker/deploy/compose.yml run --rm --no-deps \
  --entrypoint node migrate \
  node_modules/tsx/dist/cli.mjs scripts/create-platform-admin.ts \
  --email=ops@example.com --name="Operaciones Yallegó"
```

## 7. Verificación posterior

```bash
PUBLIC_URL="https://staging.example.com"

curl --fail --silent --show-error "$PUBLIC_URL/v1/health"
curl --fail --silent --show-error "$PUBLIC_URL/v1/health/ready"
curl --fail --silent --show-error "$PUBLIC_URL/login" >/dev/null
curl --head "http://staging.example.com/login"
```

Confirmar además:

- HTTP devuelve `308` hacia HTTPS.
- El certificado corresponde al dominio y no está próximo a vencer.
- Solo Nginx aparece publicado en `80/443`; `3000`, `3001`, `5432` y `6379`
  permanecen internos.
- Registro, correo de verificación, login y una consulta autenticada funcionan.
- Un dispositivo de prueba puede vincularse y reportar heartbeat.
- WebSocket conecta y un cobro de prueba aparece sin recargar.
- Grafana responde solo por loopback/túnel y el chequeo de observabilidad pasa:
  `./tools/docker/deploy/scripts/check-observability.sh`.
- El respaldo se copia al destino externo y puede listarse allí.

No habilitar tráfico real si readiness, TLS, migración o respaldo fallan.

## 8. Actualizar sin interrupción

1. Validar la versión en preproducción.
2. Crear un respaldo previo al despliegue.
3. Actualizar los cuatro tags en el archivo del ambiente.
4. Ejecutar:

```bash
./tools/docker/deploy/scripts/backup-database.sh \
  .env.staging /var/backups/yallego
./tools/docker/deploy/scripts/deploy-zero-downtime.sh .env.staging
```

El script aplica migraciones, espera candidatos saludables y conserva al menos
un upstream durante el reemplazo de API/dashboard. Al finalizar, repetir la
sección de verificación. Si falla, seguir el rollback documentado en
[`BACKUPS.md`](../tools/docker/deploy/BACKUPS.md).

Actualizar el propio proxy o perder el VPS no queda cubierto por el blue/green
de un solo host; para esos escenarios se necesitan dos hosts y un balanceador
externo.

## 9. Operación y acciones prohibidas

- Programar el respaldo y su copia externa según `BACKUPS.md`.
- Probar restauración periódicamente en un ambiente aislado.
- Vigilar espacio de disco, expiración TLS, readiness, colas y tasa de parsing.
- Operar métricas y registros según
  [`13_OBSERVABILIDAD.md`](./13_OBSERVABILIDAD.md); no publicar Grafana, Loki
  ni Prometheus directamente a Internet.
- Conservar el tag anterior conocido-bueno para rollback.
- No editar contenedores en ejecución: todo cambio nace de una imagen.
- No ejecutar `docker compose down --volumes` en staging/producción: elimina
  los volúmenes de PostgreSQL y Redis.
- No ejecutar semillas destructivas ni `prisma migrate dev` en el servidor.
- No exponer PostgreSQL, Redis, API o dashboard directamente a Internet.

Para un apagado controlado usar `docker compose stop`. Para retirar servicios
sin borrar datos se permite `docker compose down` **sin** `--volumes`, después
de confirmar que existe un respaldo externo válido.

## 10. Evidencia mínima por despliegue

Registrar en el ticket o bitácora:

- ambiente, fecha, operador y commit/tag desplegado;
- tags o digests anteriores y nuevos;
- resultado de CI y revisión de migraciones;
- ubicación y hora del respaldo previo;
- salida resumida de migración y healthchecks;
- resultado del smoke funcional;
- rollback realizado, si correspondió, y causa.
