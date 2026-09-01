# apps/web — Dockerfile multi-stage (Sprint 5, despliegue).
#
# El repo es un monorepo con npm workspaces (workspaces: ["apps/*"] en el
# package.json raíz) con un único package-lock.json en la raíz. Por eso el
# contexto de build tiene que ser la RAÍZ del repo, no apps/web:
#
#   docker build -f apps/web/Dockerfile -t cv-web \
#     --build-arg VITE_API_URL=https://api.tudominio.com \
#     .
#
# (desde la raíz del repo). Un .dockerignore en la raíz evita mandar
# node_modules/artefactos/secretos locales al daemon de Docker.
#
# Vite incrusta las variables `VITE_*` en el JS en TIEMPO DE BUILD, no de
# runtime (no son variables de entorno del contenedor final, que ni
# siquiera corre Node — es solo nginx sirviendo archivos estáticos). Por
# eso VITE_API_URL entra como build arg: cada entorno (staging, producción)
# que apunte a una API distinta necesita reconstruir la imagen con un
# --build-arg distinto, no puede cambiarse en runtime como en apps/api.

ARG NODE_VERSION=20-alpine

# ---------------------------------------------------------------------------
# Stage "build": instala TODAS las dependencias (incluidas devDependencies,
# necesarias para `tsc` y `vite`) y compila apps/web a estáticos (dist/).
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS build
WORKDIR /repo

# Manifests primero (cache de capas): npm ci solo se vuelve a correr si
# cambia algún package.json o el lockfile, no en cada cambio de código.
# Se necesitan los package.json de AMBOS workspaces (aunque este Dockerfile
# solo construya apps/web) porque el único package-lock.json de la raíz
# describe el árbol completo de los dos workspaces declarados ahí.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

# --ignore-scripts: `npm ci` en la raíz corre el lifecycle script de TODOS
# los workspaces del monorepo, no solo el de apps/web. El "postinstall" de
# apps/api (`prisma generate`) necesitaría el schema de Prisma disponible
# para no tronar, pero esta imagen no compila apps/api ni usa su cliente
# de Prisma para nada — no tiene sentido copiar ese schema aquí solo para
# satisfacer un postinstall de un workspace ajeno. apps/web no tiene
# postinstall propio, así que --ignore-scripts es seguro para este build.
RUN npm ci --ignore-scripts

# Resto del código fuente de apps/web necesario para compilar.
COPY apps/web/index.html apps/web/components.json ./apps/web/
COPY apps/web/tsconfig.json apps/web/tsconfig.app.json apps/web/tsconfig.node.json ./apps/web/
COPY apps/web/vite.config.ts ./apps/web/
COPY apps/web/public ./apps/web/public
COPY apps/web/src ./apps/web/src

# Build arg -> env var: Vite solo expone en `import.meta.env` las variables
# que existen como variable de entorno de proceso (o en un archivo `.env`)
# en el momento en que corre `vite build`, con prefijo VITE_ (ver
# apps/web/src/lib/api-client.ts, único consumidor de VITE_API_URL hoy).
# El valor por defecto aquí es solo para que la imagen sea construible sin
# argumentos explícitos en desarrollo local; en un despliegue real siempre
# debe pasarse --build-arg VITE_API_URL=<url pública real de apps/api>.
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build --workspace apps/web

# ---------------------------------------------------------------------------
# Stage final: nginx sirviendo los estáticos generados por Vite
# (apps/web/dist). No hay Node ni devDependencies en la imagen final.
# ---------------------------------------------------------------------------
FROM nginx:alpine AS runtime

# Sustituye la config por defecto de nginx por una que hace fallback a
# index.html para rutas de cliente de React Router (ver apps/web/nginx.conf
# para el detalle de por qué hace falta).
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /repo/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
