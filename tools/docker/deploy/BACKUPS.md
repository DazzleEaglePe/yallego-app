# Respaldos, restauración y reversión

Complementa [`../README.md`](../README.md) (construcción y despliegue de las
imágenes) — este documento cubre qué hacer con los datos y con un despliegue
que salió mal, una vez el ambiente ya está arriba.

## Respaldo automático

[`scripts/backup-database.sh`](./scripts/backup-database.sh) genera un
volcado en formato `custom` de `pg_dump` (comprimido, restaurable
parcialmente si hace falta) del contenedor `postgres` del ambiente indicado.

```bash
./tools/docker/deploy/scripts/backup-database.sh .env.staging /var/backups/yallego
```

Para que sea automático, se programa con cron (o el mecanismo equivalente
del proveedor) en el servidor donde vive el ambiente, por ejemplo:

```cron
# Todos los días a las 3:00 AM hora del servidor
0 3 * * * cd /ruta/al/repo && ./tools/docker/deploy/scripts/backup-database.sh .env.staging /var/backups/yallego >> /var/log/yallego-backup.log 2>&1
```

**Pendiente de infraestructura real** (no se puede completar sin un
servidor): copiar los archivos generados a un destino fuera del propio
servidor (S3/backblaze/etc.) y una política de retención — un respaldo que
vive solo en el disco que se puede perder junto con el servidor no protege
contra el escenario que más importa.

## Restaurar un respaldo

[`scripts/restore-database.sh`](./scripts/restore-database.sh) hace el
camino inverso. Se niega a ejecutar sobre una base con datos existentes
salvo que se pase `--force` — un restore accidental sobre un ambiente con
tráfico real no tiene deshacer.

```bash
# Ambiente recién provisionado, base vacía: no hace falta --force
./tools/docker/deploy/scripts/restore-database.sh .env.staging /var/backups/yallego/yallego-staging-20260829T030000Z.dump

# Restaurar sobre un ambiente con datos (p. ej. un ensayo de recuperación
# ante desastre, o revertir una corrupción de datos confirmada)
./tools/docker/deploy/scripts/restore-database.sh .env.staging /var/backups/yallego/yallego-staging-20260829T030000Z.dump --force
```

Ambos scripts se validaron localmente contra el stack de despliegue real
(`compose.yml`, incluyendo la creación del rol `yallego_app` vía
`initdb/01-app-role.sh`): respaldo, restauración sobre base vacía,
restauración forzada sobre datos existentes con `--clean --if-exists`
confirmando que el resultado es exactamente el estado del respaldo, sin
mezclar con lo que hubiera antes. Sigue pendiente un ensayo de restauración
real en el ambiente productivo (Sprint 8: "ejecutar una prueba de
restauración") — la validación local prueba que el mecanismo funciona, no
sustituye ese ensayo con los volúmenes y la latencia reales del servidor.

## Procedimiento de reversión (rollback)

Las imágenes son inmutables y versionadas por tag
(`API_IMAGE`/`MIGRATIONS_IMAGE`/`DASHBOARD_IMAGE`/`PROXY_IMAGE` en el
archivo de ambiente) — revertir un despliegue es, en el caso general,
volver a apuntar esas variables al tag anterior y re-ejecutar:

```bash
# Editar .env.staging: volver los *_IMAGE al tag anterior conocido-bueno
docker compose --env-file .env.staging -f tools/docker/deploy/compose.yml up -d
```

Compose recrea únicamente los servicios cuya imagen cambió; `postgres` y
`redis` no se tocan.

### Por qué esto es seguro con las migraciones de este proyecto

RNF-MAN-006 (`docs/03_REQUERIMIENTOS_NO_FUNCIONALES.md`) exige que las
migraciones sean **reversibles y no destructivas**: agregar una columna
nullable o una tabla nueva es seguro para el código viejo (la ignora);
nunca se elimina ni se renombra una columna en el mismo despliegue que dejó
de usarla (eso requiere dos despliegues: uno que deja de leerla, uno
posterior — ya sin código que dependa de ella — que la elimina). Bajo esa
disciplina, el código de la versión anterior sigue funcionando contra el
esquema ya migrado, así que un rollback de imagen sin tocar la base es
seguro en el caso general.

### Cuándo el rollback de imagen SÍ requiere revertir el esquema

Si la migración de la versión con problemas violó esa disciplina (debería
ser la excepción, detectable en revisión de código), un rollback de imagen
no basta — hay que restaurar desde el respaldo tomado antes de esa
migración. Es la razón por la que el respaldo automático corre
**antes** de cualquier ventana de despliegue, no solo en un horario fijo
desconectado de cuándo se despliega.

### Pasos completos ante un despliegue con problemas

1. Confirmar que el problema es del despliegue nuevo, no de datos o de un
   servicio externo (`GET /v1/health/ready`, revisar `docs/runbook-incidentes.md`).
2. Si la migración de este despliegue fue aditiva (caso general): revertir
   los tags de imagen y `docker compose up -d`.
3. Si la migración fue destructiva (caso excepcional, no debería ocurrir):
   restaurar el respaldo tomado antes del despliegue con
   `restore-database.sh --force`, y **después** revertir los tags de imagen.
4. Verificar `GET /v1/health/ready` en `200` y una transacción de humo
   (login + una consulta de solo lectura) antes de dar el incidente por
   cerrado.
5. Registrar qué falló y por qué en un post-mortem breve — no está
   automatizado, es disciplina de equipo.
