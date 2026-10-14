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

# Fase 8 (UC-27) — analítica con Umami, OPCIONAL. Igual que VITE_API_URL,
# se incrustan en el JS en tiempo de build. Si cualquiera de las dos queda
# vacía (el default), `components/publico/Analitica.tsx` no inyecta ningún
# script y el sitio sale sin tracker. Al activarlas también hay que poner
# ANALITICA_ORIGIN en runtime (CSP), ver docs/despliegue.md §7.
ARG VITE_UMAMI_URL=
ARG VITE_UMAMI_WEBSITE_ID=
ENV VITE_UMAMI_URL=${VITE_UMAMI_URL}
ENV VITE_UMAMI_WEBSITE_ID=${VITE_UMAMI_WEBSITE_ID}

RUN npm run build --workspace apps/web

# Fase 8 (UC-34) — la inyección de metadatos en servidor depende de que la
# directiva SSI `<!--# include virtual="/_seo/metadatos" -->` de
# apps/web/index.html llegue intacta a dist/index.html. Vite conserva los
# comentarios de index.html hoy, pero una minificación futura (plugin de
# HTML, cambio de versión) podría quitarla en silencio y el sitio seguiría
# funcionando... sin SEO para bots. Mejor que el build falle aquí.
RUN grep -q 'include virtual="/_seo/metadatos"' apps/web/dist/index.html

# ---------------------------------------------------------------------------
# Stage final: nginx sirviendo los estáticos generados por Vite
# (apps/web/dist). No hay Node ni devDependencies en la imagen final.
# ---------------------------------------------------------------------------
FROM nginx:alpine AS runtime

# Fase 6 — la config de nginx es una plantilla que la propia imagen oficial
# renderiza con envsubst al arrancar (/docker-entrypoint.sh →
# 20-envsubst-on-templates.sh): /etc/nginx/templates/default.conf.template
# → /etc/nginx/conf.d/default.conf. Así API_ORIGIN y MEDIA_ORIGIN (orígenes
# de la Content-Security-Policy) se resuelven en RUNTIME del contenedor,
# no en build, a diferencia de VITE_API_URL. Ver apps/web/nginx/*.
COPY apps/web/nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Cabeceras de seguridad (CSP, HSTS, nosniff...) — snippet estático que la
# plantilla incluye en cada location; no pasa por envsubst.
COPY apps/web/nginx/cabeceras-seguridad.conf /etc/nginx/snippets/cabeceras-seguridad.conf

# Defaults seguros para API_ORIGIN / MEDIA_ORIGIN / SEO_UPSTREAM /
# ANALITICA_ORIGIN si no vienen del entorno (envsubst no soporta
# ${VAR:-default}). Es un `.envsh`: la imagen lo carga con `source` para
# que sus exports lleguen al paso de envsubst.
COPY apps/web/docker-entrypoint.d/10-defaults.envsh /docker-entrypoint.d/10-defaults.envsh
RUN chmod +x /docker-entrypoint.d/10-defaults.envsh

# envsubst SOLO toca estas variables: cualquier otro `$nombre` de la
# plantilla ($uri, $host, $csp_api_origin, $seo_upstream...) es sintaxis de
# nginx y debe llegar intacto. Sin este filtro, una variable de entorno
# llamada casualmente `uri` o `host` corrompería la config. Fase 8 añade
# SEO_UPSTREAM (proxy interno al API para SSI/sitemap/robots) y
# ANALITICA_ORIGIN (origen de Umami en la CSP).
ENV NGINX_ENVSUBST_FILTER="^(API_ORIGIN|MEDIA_ORIGIN|SEO_UPSTREAM|ANALITICA_ORIGIN)$"

COPY --from=build /repo/apps/web/dist /usr/share/nginx/html

EXPOSE 80

# Fase 6 — liveness check: nginx responde el index.html en `/`. `wget` es el
# de busybox que ya trae alpine.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
