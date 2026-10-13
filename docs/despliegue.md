# Despliegue (Sprint 5)

Guía de referencia para desplegar el portafolio en un VPS con Docker + Dokploy o Coolify (ver `docs/plan-portafolio.md`, sección "Hosting"). Complementa, no reemplaza, `docs/plan-tecnico.md` (sección "Sprint 5 — Despliegue").

## 1. Componentes

- `apps/api/Dockerfile`: imagen de la API (NestJS). Corre migraciones (`prisma migrate deploy`) al arrancar y luego `node dist/src/main.js`.
- `apps/web/Dockerfile`: imagen del frontend (build de Vite servido por nginx, con fallback de SPA). La config de nginx vive en `apps/web/nginx/` (plantilla + snippet de cabeceras de seguridad, ver sección 6).
- `docker-compose.prod.yml`: define los tres servicios (`postgres`, `api`, `web`) para un despliegue "Docker Compose" en Dokploy/Coolify.
- `apps/api/scripts/backup-db.sh`: backup de la base de datos (`pg_dump`) con copia a la carpeta `backups/` del bucket S3.
- `scripts/smoke-test.sh`: verificación rápida post-despliegue (login + sitio público).
- `.github/workflows/ci.yml`: además de lint/test/build, en push a `main` construye y publica las imágenes en GitHub Container Registry (`ghcr.io/<owner>/<repo>/api` y `.../web`), y opcionalmente dispara un webhook de despliegue.

## 2. Checklist de variables de entorno de producción

Todas están documentadas con su propósito en `.env.example` (raíz). Antes de desplegar, confirmar que ninguna quedó con el valor placeholder de desarrollo:

| Variable | Dónde se usa | Nota de producción |
|---|---|---|
| `NODE_ENV` | `apps/api/src/main.ts`, cookie de sesión | Debe ser `production` (cookie `secure` se activa con HTTPS). |
| `PORT` | `apps/api/src/main.ts` | Puerto interno del contenedor `api` (el reverse proxy de Dokploy/Coolify decide el puerto público). |
| `DATABASE_URL` | Prisma | Apuntar al servicio `postgres` del propio `docker-compose.prod.yml` (o a una instancia gestionada, si se decide migrar de eso más adelante). |
| `FRONTEND_ORIGIN` | CORS (`apps/api/src/main.ts`) | URL pública real de `apps/web`, sin barra final. |
| `JWT_SECRET` | Autenticación | Secreto largo y aleatorio, distinto al de desarrollo. Nunca reutilizar el de `.env.example`. |
| `JWT_EXPIRES_IN` | Autenticación | `15m` por defecto, ajustable. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD_SEED` | `apps/api/prisma/seed.ts` | Solo se usan al correr el seed inicial; cambiar la contraseña real desde el panel admin después. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` / `S3_BUCKET_NAME` | Media (S3) y `backup-db.sh` | Credenciales reales de producción, con permisos acotados al bucket. |
| `CLOUDFRONT_DOMAIN` | Media (opcional) | Vacío si no se usa CloudFront en v1. |
| `VITE_API_URL` | Build de `apps/web` | **Build arg**, no variable de runtime — ver Dockerfile de `apps/web`. Debe ser la URL pública real de `api` antes de construir la imagen. |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Servicio `postgres` de `docker-compose.prod.yml` | Deben coincidir con las credenciales embebidas en `DATABASE_URL`. |

En Dokploy/Coolify estas variables se cargan desde el panel del proyecto (no como archivo `.env` en el servidor). En GitHub Actions, `VITE_API_URL` de producción y (opcionalmente) `DEPLOY_WEBHOOK_URL` se configuran como *secrets* del repositorio (`VITE_API_URL_PRODUCCION`, `DEPLOY_WEBHOOK_URL`).

## 3. Despliegue con Dokploy o Coolify

1. Crear un proyecto de tipo "Docker Compose" apuntando a este repositorio y a `docker-compose.prod.yml`.
2. Cargar las variables de la tabla anterior en el panel de variables de entorno del proyecto.
3. Desplegar. El primer arranque de `api` corre `prisma migrate deploy` automáticamente (ver `apps/api/docker-entrypoint.sh`) — no hace falta correr migraciones a mano.
4. Correr el seed inicial una sola vez (crea el administrador único): `docker compose -f docker-compose.prod.yml exec api npx prisma db seed` (o el comando equivalente del panel de la plataforma para ejecutar un comando dentro del contenedor `api`).
5. Correr `scripts/smoke-test.sh` (ver sección 5) contra la URL pública real.

## 4. Backups

`apps/api/scripts/backup-db.sh` no corre solo: es un script standalone pensado para invocarse desde un cron externo al contenedor (el cron de Dokploy/Coolify, o un cron del propio VPS que haga `docker compose exec api ...`). Programarlo con la periodicidad que se decida (diaria, por ejemplo) fuera de este repositorio, en la configuración de la plataforma de hosting.

## 5. Smoke test post-despliegue

```bash
API_URL=https://api.tudominio.com \
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD=la-contrasena-real \
./scripts/smoke-test.sh
```

Verifica: login (UC-01), que una ruta admin autenticada responde con la cookie de sesión, y que el sitio público (`GET /sitio`, UC-12) responde igual con y sin cookie (acceso anónimo). Sale con código distinto de 0 en el primer fallo — apto para encadenarse después de `trigger-deploy` en CI si se quiere automatizar más adelante.

## 6. Fase 6 — Fundamentos de producción

Cambios de infraestructura de la Fase 6 (no tocan casos de uso): usuario no root y health checks en las imágenes, cabeceras de seguridad y CSP en nginx, variables de runtime nuevas y CI con Postgres real. Las secciones anteriores siguen vigentes; esta solo añade lo nuevo.

### 6.1 Variables nuevas

**`web` (runtime del contenedor nginx, NO build arg):**

| Variable | Valor típico | Qué hace |
|---|---|---|
| `API_ORIGIN` | `https://api.tudominio.com` | Origen permitido en `connect-src` de la CSP (los `fetch()` del panel y del sitio). Debe coincidir con el `VITE_API_URL` con el que se construyó la imagen; `docker-compose.prod.yml` lo toma de `VITE_API_URL` si no se define. Sin ruta ni barra final. |
| `MEDIA_ORIGIN` | `https://<bucket>.s3.<region>.amazonaws.com` o `https://<id>.cloudfront.net` | Origen permitido en `object-src`/`frame-src` para incrustar el PDF del CV (`<object type="application/pdf">` en `MediaPreview.tsx`). |

Ambas se sustituyen al arrancar el contenedor (envsubst de la imagen `nginx:alpine` sobre `apps/web/nginx/default.conf.template`, limitado por `NGINX_ENVSUBST_FILTER` a esas dos variables). Si faltan, `apps/web/docker-entrypoint.d/10-defaults.envsh` cae a `https:` (cualquier origen HTTPS): el sitio sigue funcionando, solo con una política menos estricta. El log de arranque del contenedor muestra los valores aplicados (`[10-defaults.envsh] CSP: API_ORIGIN=... MEDIA_ORIGIN=...`).

**`api` (runtime):**

| Variable | Default | Qué hace |
|---|---|---|
| `TRUST_PROXY` | `true` en `docker-compose.prod.yml` | La API corre detrás de Traefik (Dokploy/Coolify): con esto Express confía en `X-Forwarded-For` / `X-Forwarded-Proto`, así el rate limiting y los logs ven la IP real del visitante y la cookie `secure` se emite correctamente aunque el salto proxy→contenedor sea HTTP. Dejar en `false` solo si la API se expone directamente sin proxy. |
| `LOG_LEVEL` | `info` | Nivel de los logs JSON (`trace`, `debug`, `info`, `warn`, `error`). `debug` solo para diagnosticar; sube mucho el volumen. |
| `THROTTLE_TTL_MS` | `60000` | Ventana del rate limiting global, en milisegundos. |
| `THROTTLE_LIMIT` | `120` | Peticiones máximas por IP dentro de esa ventana (120/min). El login (UC-01) además conserva su bloqueo por intentos fallidos. |

Todas van en el panel de variables de Dokploy/Coolify, igual que las de la sección 2.

### 6.2 Health checks

| Endpoint | Qué comprueba | Para qué usarlo |
|---|---|---|
| `GET /health` | Que el proceso Node responde (liveness). **No** consulta la base de datos. | `HEALTHCHECK` de la imagen `api` y `healthcheck` de `docker-compose.prod.yml` (cada 30 s, 20 s de gracia para `prisma migrate deploy`). Es el que debe usar Dokploy/Coolify como "health check path" del servicio. |
| `GET /health/ready` | Liveness + conexión real a Postgres (readiness). | Comprobación manual post-despliegue o monitor externo (UptimeRobot, etc.). No se usa en el `HEALTHCHECK` de la imagen a propósito: si Postgres cae unos segundos, la API no debe reiniciarse en cascada. |
| `GET /` de `web` | nginx sirve el `index.html`. | `HEALTHCHECK` de la imagen `web`. |

`web` declara `depends_on: api: condition: service_healthy`: en un despliegue nuevo el frontend no se levanta hasta que `api` ya migró la base de datos y responde `/health`. Si la plataforma muestra `api` como *unhealthy* permanentemente, revisar primero `docker logs` (lo normal es `DATABASE_URL` incorrecta o migración fallida).

En Traefik/Dokploy el health check del router se configura con path `/health`, puerto `3000` (el `PORT` interno), intervalo 30 s.

### 6.3 Cabeceras de seguridad y CSP de `web`

`apps/web/nginx/cabeceras-seguridad.conf` añade a todas las respuestas: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Strict-Transport-Security: max-age=31536000; includeSubDomains` y la `Content-Security-Policy`. HSTS solo tiene efecto cuando el navegador recibe la respuesta por HTTPS (lo termina Traefik delante del contenedor); por HTTP plano se ignora, no estorba.

La CSP resultante (con `API_ORIGIN` y `MEDIA_ORIGIN` ya sustituidos):

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:; font-src 'self' data:;
connect-src 'self' <API_ORIGIN>; object-src 'self' blob: <MEDIA_ORIGIN>;
frame-src 'self' <MEDIA_ORIGIN>; frame-ancestors 'self'; base-uri 'self';
form-action 'self'; worker-src 'self'; manifest-src 'self'
```

Cada directiva está justificada en comentarios dentro del propio snippet. Lo relevante operativamente:

- **Si una imagen externa no carga**: `img-src` ya admite cualquier `https:`, así que una imagen de S3/CloudFront solo falla si se sirve por `http://` (configurar HTTPS en el bucket/CDN, no relajar la CSP).
- **Si el PDF del CV no se previsualiza en el panel** (la consola del navegador muestra `Refused to load plugin data from 'https://...' because it violates the following Content Security Policy directive: "object-src ..."`): `MEDIA_ORIGIN` no coincide con el origen real del archivo. Corregir la variable en el panel de Dokploy/Coolify y redesplegar `web` (no hace falta reconstruir la imagen). Como último recurso, dejar `MEDIA_ORIGIN` vacía cae a `https:`.
- **Si el panel no habla con la API** (`Refused to connect to 'https://api...' because it violates ... "connect-src ..."`): `API_ORIGIN` no coincide con `VITE_API_URL`. Mismo remedio.
- **Si hace falta un origen nuevo** (por ejemplo un embed de YouTube en un bloque futuro): editar `apps/web/nginx/cabeceras-seguridad.conf` (y, si es un origen configurable, añadir la variable a `default.conf.template`, al filtro `NGINX_ENVSUBST_FILTER` del Dockerfile y a `10-defaults.envsh`). Nunca añadir `'unsafe-inline'` a `script-src` ni `'unsafe-eval'`.

Para probar la política sin romper nada en producción se puede, temporalmente, renombrar la cabecera a `Content-Security-Policy-Report-Only` en el snippet: el navegador reporta en consola lo que bloquearía, sin bloquearlo.

### 6.4 Logs

La API emite logs en JSON (una línea por evento, nivel según `LOG_LEVEL`), pensados para que Dokploy/Coolify/Loki los indexen. Para leerlos en humano desde el VPS:

```bash
docker logs -f --tail 200 <contenedor-api> | npx pino-pretty
# o, dentro de un despliegue Compose:
docker compose -f docker-compose.prod.yml logs -f api | npx pino-pretty
```

nginx (`web`) mantiene el formato de acceso por defecto; los assets con hash y `robots.txt` no se registran (`access_log off`) para no llenar el log con peticiones repetidas.

### 6.5 Imágenes: usuario no root y gzip

- `api` corre como el usuario `node` (uid 1000) de la imagen base; `/app` (incluido `uploads/`, solo para el fallback local sin S3) le pertenece. `prisma migrate deploy` del entrypoint y `scripts/backup-db.sh` (escribe en `/tmp`) siguen funcionando sin privilegios. Si se monta un volumen sobre `/app/uploads`, debe pertenecer al uid 1000.
- `web` sigue arrancando nginx como root (el master abre el puerto 80 y cede los workers al usuario `nginx`, comportamiento estándar de la imagen oficial). Pasar a `nginxinc/nginx-unprivileged` (puerto 8080) queda como mejora opcional.
- nginx comprime con gzip (`text/css`, JS, JSON, SVG, XML; mínimo 1 KB). Los assets con hash de Vite se cachean 30 días como `immutable`; `index.html` sigue en `no-cache`; `robots.txt` (`apps/web/public/robots.txt`, bloquea `/admin` a los rastreadores) se cachea 1 hora.

### 6.6 CI

`.github/workflows/ci.yml` levanta un `postgres:16` como servicio del job `api`, corre `prisma migrate deploy` + `prisma db seed` con credenciales dummy exclusivas del runner y luego `npm run test:e2e`; los unit tests corren con cobertura y el reporte se sube como artifact (`cobertura-api`, 7 días). Los runs obsoletos de un mismo PR se cancelan (`concurrency`); en `main` no, para no cortar un build-and-push a medias. `.github/workflows/codeql.yml` analiza el código (javascript-typescript) en cada PR, push a `main` y semanalmente; `.github/dependabot.yml` abre un PR semanal agrupado con las actualizaciones minor/patch de npm (lockfile único en la raíz) y otro para las acciones de GitHub, etiquetados `dependencias`.
