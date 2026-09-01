#!/bin/sh
# apps/api/scripts/backup-db.sh
#
# Backup de la base de datos a S3 (Sprint 5 — despliegue; ver
# docs/plan-tecnico.md, Sprint 5: "cron de pg_dump con copia a S3").
#
# Standalone a propósito: no depende de que la API esté corriendo y no
# arranca ningún cron por sí solo (un contenedor de aplicación de larga
# vida no es el lugar típico para correr un cron persistente). Formas de
# invocarlo:
#
#   1. Manualmente, con las mismas variables de entorno que ya usa la API
#      (DATABASE_URL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION,
#      S3_BUCKET_NAME — ver .env.example) exportadas en el shell:
#        $ set -a; . apps/api/.env; set +a
#        $ ./apps/api/scripts/backup-db.sh
#
#   2. Vía `docker exec`, disparado por un cron EXTERNO al contenedor
#      (crontab del host, o el programador de tareas propio de
#      Dokploy/Coolify apuntando al contenedor de la API ya desplegado):
#        0 3 * * * docker exec cv-api /app/scripts/backup-db.sh >> /var/log/cv-backup.log 2>&1
#
#   3. Como contenedor de un solo uso con la misma imagen (si se prefiere
#      no tocar el contenedor de la API que sirve tráfico):
#        0 3 * * * docker run --rm --env-file /ruta/produccion.env \
#          --entrypoint /app/scripts/backup-db.sh cv-api
#
# Requiere en el entorno donde corre: `pg_dump` (incluido en la imagen de
# producción vía el paquete `postgresql16-client`, ver apps/api/Dockerfile;
# en un host sin Docker, instalar un cliente de PostgreSQL 16 aparte) y
# Node.js con las dependencias de producción de apps/api ya instaladas
# (usa @aws-sdk/client-s3, ver upload-backup-to-s3.js en esta misma
# carpeta).
set -e

: "${DATABASE_URL:?Falta DATABASE_URL en el entorno}"
: "${S3_BUCKET_NAME:?Falta S3_BUCKET_NAME en el entorno}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILENAME="cvportafolio-${TIMESTAMP}.dump"
TMP_PATH="${TMPDIR:-/tmp}/${FILENAME}"

# DATABASE_URL trae `?schema=public` (una extensión propia de Prisma, ver
# prisma7.config.ts) que `pg_dump`/libpq no reconocen como parámetro de
# conexión válido ("invalid URI query parameter"). Se recorta la query
# string completa antes de pasarla a pg_dump -- el esquema por defecto de
# Postgres ya es "public" y es el único que usa esta app.
PG_DUMP_URL="${DATABASE_URL%%\?*}"

echo "[backup-db] Generando dump de la base de datos en ${TMP_PATH}..."
# Formato "custom" (-Fc): comprimido y pensado para restaurarse con
# `pg_restore`, no con `psql` directo.
pg_dump "${PG_DUMP_URL}" --format=custom --file="${TMP_PATH}"

echo "[backup-db] Subiendo a s3://${S3_BUCKET_NAME}/backups/${FILENAME}..."
node "${SCRIPT_DIR}/upload-backup-to-s3.js" "${TMP_PATH}" "backups/${FILENAME}"

rm -f "${TMP_PATH}"
echo "[backup-db] Listo."
