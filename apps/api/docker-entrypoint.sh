#!/bin/sh
# Entrypoint de la imagen de apps/api (Sprint 5 — despliegue).
#
# Encadena las dos cosas que tienen que pasar, en orden, cada vez que arranca
# el contenedor:
#   1. Aplicar las migraciones de Prisma pendientes contra DATABASE_URL
#      (`prisma migrate deploy`, nunca `migrate dev`: no genera migraciones
#      nuevas ni pide confirmación interactiva, solo aplica las que ya están
#      commiteadas en apps/api/prisma/migrations).
#   2. Arrancar la API compilada (`dist/src/main.js` — ver el comentario en
#      apps/api/Dockerfile sobre por qué el build no queda en `dist/main.js`).
#
# `prisma migrate deploy` lee `prisma7.config.ts` (copiado junto a `prisma/`
# en el stage final del Dockerfile) para resolver DATABASE_URL y la carpeta
# de migraciones; ninguna credencial vive en la imagen, todo llega por
# variables de entorno del contenedor en runtime.
set -e

echo "[docker-entrypoint] Aplicando migraciones pendientes (prisma migrate deploy)..."
npx prisma migrate deploy

echo "[docker-entrypoint] Arrancando la API..."
exec node dist/src/main.js
