# apps/api — Dockerfile multi-stage (Sprint 5, despliegue).
#
# El repo es un monorepo con npm workspaces (workspaces: ["apps/*"] en el
# package.json raíz) con un único package-lock.json en la raíz. Por eso el
# contexto de build tiene que ser la RAÍZ del repo, no apps/api:
#
#   docker build -f apps/api/Dockerfile -t cv-api .
#
# (desde la raíz del repo). Un .dockerignore en la raíz evita mandar
# node_modules/artefactos/secretos locales al daemon de Docker.
#
# Ningún secreto (DATABASE_URL real, JWT_SECRET, credenciales AWS) vive en
# la imagen: todo llega por variables de entorno en runtime del contenedor.

ARG NODE_VERSION=20-alpine

# ---------------------------------------------------------------------------
# Stage "build": instala TODAS las dependencias (incluidas devDependencies,
# necesarias para `nest build`) y compila apps/api a JavaScript.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS build
WORKDIR /repo

# node-gyp-build (bcrypt) cae a compilar desde código fuente si no encuentra
# un prebuild para linux-musl; python3/make/g++ solo existen en este stage
# intermedio, nunca llegan a la imagen final.
RUN apk add --no-cache python3 make g++

# Manifests primero (cache de capas): npm ci solo se vuelve a correr si
# cambia algún package.json o el lockfile, no en cada cambio de código.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

# El postinstall de apps/api (`prisma generate`) corre como parte de este
# `npm ci` y necesita el schema + la config de Prisma disponibles de
# antemano. DATABASE_URL solo hace falta para que `prisma7.config.ts`
# (que hace `process.env['DATABASE_URL']`) no truene al cargarse: `prisma
# generate` no abre conexión real a la base de datos, así que un valor
# placeholder es seguro y nunca queda en la imagen final (este stage se
# descarta).
#
# tsconfig.json también tiene que estar antes de este `npm ci`: el
# generador de Prisma 7 (`prisma-client`) decide si escribe extensión
# `.ts` explícita en sus imports relativos internos según encuentre o no
# un tsconfig.json en el proyecto. Sin él, genera imports con `.ts`
# explícito (pensados para correrse con un loader que entiende TypeScript
# nativo); `tsc` los deja tal cual al compilar a CommonJS, y el `require`
# resultante en el `.js` compilado apunta a un archivo `.ts` que no existe
# en `dist/`, rompiendo el arranque en runtime.
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/prisma7.config.ts ./apps/api/prisma7.config.ts
COPY apps/api/tsconfig.json apps/api/tsconfig.build.json apps/api/nest-cli.json ./apps/api/
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"

RUN npm ci

# Resto del código fuente de apps/api necesario para compilar.
COPY apps/api/src ./apps/api/src

RUN npm run build --workspace apps/api

# NOTA: como `prisma/`, `prisma7.config.ts` y `generated/` viven fuera de
# apps/api/src pero se importan con rutas relativas desde src (p. ej.
# `../../generated/prisma/client`), TypeScript infiere el `rootDir` como
# apps/api/ completo, no solo `src/`. El build resultante queda en
# `dist/src/main.js`, no en `dist/main.js` — ver docker-entrypoint.sh y el
# script `start:prod` de apps/api/package.json, ambos ya apuntan ahí.

# ---------------------------------------------------------------------------
# Stage "prod-deps": mismas dependencias pero solo las de producción
# (`--omit=dev`), instaladas en un árbol limpio e independiente del stage
# de build (que sí tiene devDependencies como @nestjs/cli, jest, etc.).
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /repo

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

# --ignore-scripts: el "prepare" del package.json raíz (`husky`) es una
# devDependency y no se instala con --omit=dev, así que ejecutarlo aquí
# rompería el build (`husky: not found`). Tampoco hace falta correr el
# postinstall de apps/api (`prisma generate`) en este stage: el cliente ya
# quedó compilado dentro de `dist/` en el stage "build". `npm rebuild
# bcrypt` (nombrando el paquete, no el workspace) sí dispara únicamente el
# install script del único binario nativo que realmente lo necesita aquí
# (sharp resuelve su binario por `optionalDependencies`, sin script propio).
RUN npm ci --omit=dev --ignore-scripts --workspace apps/api
RUN npm rebuild bcrypt --workspace apps/api

# ---------------------------------------------------------------------------
# Stage final: imagen liviana, sin herramientas de compilación ni
# devDependencies. Corre `prisma migrate deploy` y luego la API.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production

# postgresql16-client (pg_dump/psql) — misma versión mayor que el
# `postgres:16` de docker-compose.yml. Permite invocar
# apps/api/scripts/backup-db.sh con `docker exec` desde un cron externo al
# contenedor (ver ese script); no arranca ningún cron por sí solo.
RUN apk add --no-cache postgresql16-client

# npm workspaces no siempre puede hoistear todo a /repo/node_modules (por
# ejemplo, @nestjs/mapped-types queda anidado en apps/api/node_modules por
# un conflicto de versiones/peers) — hay que copiar ambos árboles.
COPY --from=prod-deps /repo/node_modules ./node_modules
COPY --from=prod-deps /repo/apps/api/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./dist

# Necesarios en runtime para `prisma migrate deploy` (no para la app en sí):
# el schema, las migraciones ya commiteadas y la config de conexión.
COPY apps/api/prisma ./prisma
COPY apps/api/prisma7.config.ts ./prisma7.config.ts

# Script de backup a S3 (standalone, ver comentarios dentro del propio
# archivo) — se incluye para poder invocarlo con `docker exec` desde un
# cron externo al contenedor.
COPY apps/api/scripts ./scripts

COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh ./scripts/backup-db.sh

# Puerto real que escucha Nest (apps/api/src/main.ts: `process.env.PORT ??
# 3000`). Configurable por variable de entorno PORT en runtime.
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
