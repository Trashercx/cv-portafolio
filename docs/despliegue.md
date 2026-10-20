# Despliegue (Sprint 5)

Guía de referencia para desplegar el portafolio en un VPS con Docker + Dokploy o Coolify (ver `docs/plan-portafolio.md`, sección "Hosting"). Complementa, no reemplaza, `docs/plan-tecnico.md` (sección "Sprint 5 — Despliegue").

## 1. Componentes

- `apps/api/Dockerfile`: imagen de la API (NestJS). Corre migraciones (`prisma migrate deploy`) al arrancar y luego `node dist/src/main.js`.
- `apps/web/Dockerfile`: imagen del frontend (build de Vite servido por nginx, con fallback de SPA). La config de nginx vive en `apps/web/nginx/` (plantilla + snippet de cabeceras de seguridad, ver sección 6).
- `docker-compose.prod.yml`: define los tres servicios (`postgres`, `api`, `web`) para un despliegue "Docker Compose" en Dokploy/Coolify.
- `docker-compose.umami.yml` (Fase 8, opcional): stack aparte con Umami (analítica sin cookies) y su propio Postgres — ver sección 7.4.
- `apps/web/scripts/api-simulada.mjs` + `apps/web/scripts/fixtures/` (Fase 8): API pública simulada y snapshot de prueba que usa el workflow de Lighthouse CI; también sirven para probar la plantilla de nginx en local — ver sección 7.5.
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
| `API_ORIGIN` / `MEDIA_ORIGIN` | CSP de nginx (`web`, runtime) | Fase 6, ver 6.1. Opcionales (caen a `https:`). |
| `SEO_UPSTREAM` | nginx (`web`, runtime) | **Opcional** (Fase 8). URL interna del API para SSI de metadatos, sitemap y robots; default `http://api:3000`. Ver 7.2. |
| `ANALITICA_ORIGIN` | CSP de nginx (`web`, runtime) | **Opcional** (Fase 8). Origen de Umami; vacío = sin analítica. Ver 7.4. |
| `VITE_UMAMI_URL` / `VITE_UMAMI_WEBSITE_ID` | Build de `apps/web` | **Opcionales** (Fase 8). **Build args**, como `VITE_API_URL`; activan el tracker de Umami en el sitio público. Ver 7.4. |
| `UMAMI_API_URL` / `UMAMI_WEBSITE_ID` / `UMAMI_API_TOKEN` o `UMAMI_USUARIO` + `UMAMI_CONTRASENA` | `GET /admin/metricas` (`api`, runtime) | **Opcionales** (Fase 8). Sin ellas la página de métricas del panel muestra "no configurado". Ver 7.4. |
| `UMAMI_DB_PASSWORD` / `UMAMI_APP_SECRET` (+ `UMAMI_DB_USER`, `UMAMI_DB_NAME`, `UMAMI_PUBLIC_PORT`) | `docker-compose.umami.yml` | Solo si se despliega Umami; las dos primeras son obligatorias **para ese stack**. Ver 7.4. |

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

**Comprobaciones manuales de la Fase 8** (contra el dominio público de `web`, no del API; detalle en la sección 7):

```bash
WEB=https://tudominio.com
# 7.2 — metadatos inyectados por SSI: el PRIMER <title> debe ser el del perfil, no "Portafolio"
curl -s "$WEB/" | grep -m1 '<title'
# ... y en un detalle, el del proyecto (como lo vería el bot de Facebook/LinkedIn)
curl -s -A "facebookexternalhit/1.1" "$WEB/proyecto/<id>" | grep 'og:'
# 7.3 — sitemap y robots generados por el API (robots debe traer la línea Sitemap:)
curl -si "$WEB/sitemap.xml" | grep -i '^HTTP\|content-type\|<loc'
curl -s  "$WEB/robots.txt"
# la ruta interna del SSI nunca se expone (200 vacío o 404, nunca metadatos)
curl -s -o /dev/null -w '%{http_code} %{size_download}\n' "$WEB/_seo/metadatos"
# 7.4 — solo si Umami está activo: el script del tracker y su origen en la CSP
curl -s "$WEB/" | grep -o 'script.js[^>]*data-website-id="[^"]*"'
curl -sI "$WEB/" | grep -io 'script-src[^;]*'
```

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
| `THROTTLE_LOGIN_LIMIT` | `5` | Intentos máximos de `POST /auth/login` por IP dentro de `THROTTLE_LOGIN_TTL_MS` (responde 429). Independiente del bloqueo de cuenta por 3 intentos fallidos. |
| `THROTTLE_LOGIN_TTL_MS` | `60000` | Ventana del límite del login, en milisegundos. |
| `THROTTLE_IMPORTAR_LIMIT` | `10` | Opcional. Peticiones máximas por IP y minuto a `POST /admin/insignias/importar` e `importar-archivo` (Fase 7d, UC-35; hacen peticiones salientes). Solo se sobrescribe en pruebas. |
| `THROTTLE_GITHUB_LIMIT` | `6` | Opcional. Peticiones máximas por IP y minuto a `POST /admin/integraciones/github/sincronizar` (Fase 7l, UC-36; hace peticiones salientes a GitHub). Solo se sobrescribe en pruebas. |
| `GITHUB_TOKEN` | vacío | Opcional (Fase 7l, UC-36). Nunca se envía a otro host que `api.github.com` ni aparece en respuestas del API. Si en el panel se activa "Publicar automáticamente", cada sincronización con cambios publica una versión **completa** del sitio (todo lo guardado, no solo proyectos). Token personal de GitHub de **solo lectura**: sube el límite de la API de 60 a 5000 peticiones/hora. Sin él la sincronización de repos públicos funciona igual (la cron corre cada hora y respeta `ETag`, así que gasta poca cuota). Nunca se importan repos privados aunque el token los vea. |

Todas van en el panel de variables de Dokploy/Coolify, igual que las de la sección 2.

### 6.2 Health checks

| Endpoint | Qué comprueba | Para qué usarlo |
|---|---|---|
| `GET /health` | Que el proceso Node responde (liveness). **No** consulta la base de datos. | `HEALTHCHECK` de la imagen `api` y `healthcheck` de `docker-compose.prod.yml` (cada 30 s, 20 s de gracia para `prisma migrate deploy`). Es el que debe usar Dokploy/Coolify como "health check path" del servicio. |
| `GET /health/ready` | Liveness + conexión real a Postgres (readiness). | Comprobación manual post-despliegue o monitor externo (UptimeRobot, etc.). No se usa en el `HEALTHCHECK` de la imagen a propósito: si Postgres cae unos segundos, la API no debe reiniciarse en cascada. |
| `GET /` de `web` | nginx sirve el `index.html`. | `HEALTHCHECK` de la imagen `web`. |

`web` declara `depends_on: api: condition: service_healthy`: en un despliegue nuevo el frontend no se levanta hasta que `api` ya migró la base de datos y responde `/health`. Si la plataforma muestra `api` como *unhealthy* permanentemente, revisar primero `docker logs` (lo normal es `DATABASE_URL` incorrecta o migración fallida).

En Traefik/Dokploy el health check del router se configura con path `/health`, puerto `3000` (el `PORT` interno), intervalo 30 s.

**Rate limiting y proxy (dos riesgos conocidos).** (1) Con `TRUST_PROXY=true` la API cree en `X-Forwarded-For`; por eso `docker-compose.prod.yml` publica el puerto 3000 solo en `127.0.0.1`. Si se expone a la red, cualquiera podría falsear la IP y saltarse el límite. Si en cambio se deja `TRUST_PROXY=false` detrás de Traefik, todos los visitantes comparten la IP del proxy y el límite global (120/min) y el del login (5/min) se vuelven compartidos: una ráfaga normal daría `429`. (2) El límite del login por IP y el bloqueo de cuenta tras 3 intentos (UC-01) permiten que un tercero mantenga al administrador fuera a base de intentos fallidos; es el mismo vector que ya existía y se acepta para un sitio de un solo administrador. La mitigación definitiva (passkeys) está en la Fase 11 del roadmap.

### 6.3 Cabeceras de seguridad y CSP de `web`

`apps/web/nginx/cabeceras-seguridad.conf` añade a todas las respuestas: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Strict-Transport-Security: max-age=31536000; includeSubDomains` y la `Content-Security-Policy`. HSTS solo tiene efecto cuando el navegador recibe la respuesta por HTTPS (lo termina Traefik delante del contenedor); por HTTP plano se ignora, no estorba.

La CSP resultante (con `API_ORIGIN` y `MEDIA_ORIGIN` ya sustituidos):

```
default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://rsms.me;
img-src 'self' data: blob: https:; font-src 'self' data: https://rsms.me;
connect-src 'self' <API_ORIGIN> https://cloudflareinsights.com; object-src 'self' blob: <MEDIA_ORIGIN>;
frame-src 'self' <MEDIA_ORIGIN>; frame-ancestors 'self'; base-uri 'self';
form-action 'self'; worker-src 'self' blob:; manifest-src 'self'
```

Cada directiva está justificada en comentarios dentro del propio snippet. Lo relevante operativamente:

- **Dos terceros admitidos a propósito** (hotfix post-Fase 6): `rsms.me`, porque el CSS de Puck importa la fuente Inter desde ahí y, si el navegador bloquea ese `@import`, Chrome marca la hoja entera como fallida, Vite no puede precargar el CSS del editor y `/admin/editor` cae en el `ErrorBoundary` ("Unable to preload CSS"); y `static.cloudflareinsights.com` / `cloudflareinsights.com`, el beacon de Cloudflare Web Analytics que Cloudflare inyecta al proxear el dominio (si se desactiva Web Analytics en Cloudflare, se puede quitar).
- **`blob:` en `worker-src`** (Fase 7g, UC-09): `heic-to` crea su worker de decodificación con `URL.createObjectURL`; sin `blob:` la CSP lo bloquea ("Creating a worker from 'blob:…' violates…") y la conversión HEIC falla con el mensaje de error del panel. Solo scripts ya admitidos por `script-src` pueden crear ese blob. Se usa la variante `heic-to/csp` del paquete: la principal necesita `'unsafe-eval'` (usa `new Function`).
- **`'wasm-unsafe-eval'` en `script-src`** (Fase 7g, UC-09): permite compilar WebAssembly del propio origen y no habilita `eval`. La necesita `heic-to` (libheif), que convierte en el navegador las fotos HEIC/HEIF del móvil a JPEG antes de subirlas, y algunos PDF (decodificadores JPX/JBIG2 de `pdfjs-dist`). Si al subir un `.heic` el panel dice "No se pudo convertir la foto HEIC" y la consola muestra `Refused to compile ... WebAssembly`, la CSP desplegada no incluye esa palabra clave: redesplegar `web` con la imagen nueva. La librería viaja en un chunk propio del mismo origen (nunca de un CDN) que solo se descarga al elegir un HEIC.
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
- nginx comprime con gzip (`text/css`, JS, JSON, SVG, XML; mínimo 1 KB). Los assets con hash de Vite se cachean 30 días como `immutable`; `index.html` sigue en `no-cache`; `robots.txt` (desde la Fase 8 lo genera el API y nginx lo proxea; `apps/web/public/robots.estatico.txt` es el respaldo si el API no responde; bloquea `/admin` a los rastreadores) se cachea 1 hora.

### 6.6 CI

`.github/workflows/ci.yml` levanta un `postgres:16` como servicio del job `api`, corre `prisma migrate deploy` + `prisma db seed` con credenciales dummy exclusivas del runner y luego `npm run test:e2e`; los unit tests corren con cobertura y el reporte se sube como artifact (`cobertura-api`, 7 días). Los runs obsoletos de un mismo PR se cancelan (`concurrency`); en `main` no, para no cortar un build-and-push a medias. `.github/workflows/codeql.yml` analiza el código (javascript-typescript, consultas `security-extended`) en cada PR, push a `main` y semanalmente; como el repositorio es privado sin GitHub Advanced Security, no sube los resultados a Code Scanning: guarda el SARIF como artifact (`codeql-sarif`, 30 días) y el job falla si hay alertas, listándolas en el log; `.github/dependabot.yml` abre un PR semanal agrupado con las actualizaciones minor/patch de npm (lockfile único en la raíz) y otro para las acciones de GitHub, etiquetados `dependencias`.

## 7. Fase 8 — Visibilidad

Infraestructura de la Fase 8 (UC-27, UC-34; contrato en `docs/plan-tecnico.md`, "Fase 8 — Visibilidad"): metadatos SEO inyectados en el servidor sin SSR, sitemap y robots generados por el API, presupuestos de Lighthouse en CI y analítica opcional con Umami. Nada de esto es obligatorio para que el sitio funcione: sin configurar ninguna variable nueva, el despliegue de la Fase 6 sigue igual (con `SEO_UPSTREAM` en su default, que ya apunta al servicio `api` del compose).

### 7.1 Variables nuevas

**`web` (runtime del contenedor nginx, NO build arg):**

| Variable | Default | Qué hace |
|---|---|---|
| `SEO_UPSTREAM` | `http://api:3000` | URL interna (esquema + host + puerto, sin barra final) a la que nginx hace proxy para el fragmento SSI de metadatos, `/sitemap.xml` y `/robots.txt`. El default es el servicio `api` de `docker-compose.prod.yml` por la red interna de Docker. Cambiarlo solo si el API vive en otro stack o máquina; admite `https://` (nginx manda SNI). |
| `ANALITICA_ORIGIN` | vacío | Origen público de Umami (`https://analitica.tudominio.com`) que se suma a `script-src` y `connect-src` de la CSP. Vacío = sin analítica y CSP idéntica a la de la Fase 6. Debe coincidir con `VITE_UMAMI_URL`. |

Ambas pasan por el mismo `envsubst` + `10-defaults.envsh` que `API_ORIGIN`/`MEDIA_ORIGIN` (el log de arranque muestra `[10-defaults.envsh] SEO: SEO_UPSTREAM=...`).

**`web` (build args, como `VITE_API_URL`):**

| Variable | Default | Qué hace |
|---|---|---|
| `VITE_UMAMI_URL` | vacío | Origen del tracker de Umami, sin barra final. |
| `VITE_UMAMI_WEBSITE_ID` | vacío | Id del sitio creado en Umami. |

Si falta cualquiera de las dos, `Analitica.tsx` no inyecta ningún script. Quedan incrustadas en el JS: cambiarlas exige **reconstruir la imagen `web`** (en GitHub Actions, como secretos adicionales del job `build-and-push-web`, igual que `VITE_API_URL_PRODUCCION`; en Dokploy, como build args del servicio).

**`api` (runtime):**

| Variable | Default | Qué hace |
|---|---|---|
| `UMAMI_API_URL` | vacío | URL de Umami sin barra final. La pública (`https://analitica.tudominio.com`) es la opción simple; `http://umami:3000` solo si se unen las redes de los dos stacks (7.4). |
| `UMAMI_WEBSITE_ID` | vacío | Mismo id que `VITE_UMAMI_WEBSITE_ID`. |
| `UMAMI_API_TOKEN` | vacío | Token de API de Umami (`Authorization: Bearer`). |
| `UMAMI_USUARIO` / `UMAMI_CONTRASENA` | vacío | Alternativa al token: el API hace login en `/api/auth/login` y cachea el token en memoria. Si existe `UMAMI_API_TOKEN`, gana el token. |

Sin `UMAMI_API_URL` o `UMAMI_WEBSITE_ID`, `GET /admin/metricas` responde `{ disponible: false, motivo: 'no_configurado' }` y la página "Métricas" del panel lo explica; nunca un 5xx.

**Stack `docker-compose.umami.yml`** (solo si se despliega Umami): `UMAMI_DB_PASSWORD` y `UMAMI_APP_SECRET` obligatorias (`openssl rand -hex 32` para ambas); `UMAMI_DB_USER` (`umami`), `UMAMI_DB_NAME` (`umami`) y `UMAMI_PUBLIC_PORT` (`3100`, solo loopback) con default.

### 7.2 Metadatos por SSI (UC-34)

**Cómo funciona.** El sitio sigue siendo una SPA servida por nginx: no hay SSR. `apps/web/index.html` lleva en `<head>`, antes del `<title>` estático, la directiva `<!--# include virtual="/_seo/metadatos" -->`. nginx tiene `ssi on` solo en las respuestas de `index.html` (fallback de SPA y `location = /index.html`; los assets con hash no pasan por el filtro) y resuelve el include con un subrequest interno a `location = /_seo/metadatos`, que hace `proxy_pass ${SEO_UPSTREAM}/seo/metadatos` enviando la ruta original del visitante en la cabecera `X-Ruta-Publica`. El API (`SeoController`, módulo `seo`) lee la versión publicada y devuelve el fragmento HTML de esa ruta (`<title>`, `description`, `canonical`, Open Graph, Twitter card y, en la home, el JSON-LD `Person`), siempre con 200. Los bots que no ejecutan JavaScript (Facebook, LinkedIn, Slack, Twitter, Google en su primera pasada) ven así metadatos reales; en el navegador, `MetadatosPagina` retira esos nodos (`data-meta-estatico`) al montar y pone los suyos, como en la Fase 6. Como el `proxy_pass` usa una variable, nginx necesita un `resolver` (`127.0.0.11`, el DNS de Docker) y resuelve `api` en runtime: el contenedor `web` levanta aunque `api` todavía no exista.

**Qué pasa si el API cae.** Timeouts cortos (`resolver_timeout 1s`, `proxy_connect_timeout 1s`, `proxy_read_timeout 2s`) y `error_page 404 500 502 503 504 =200 /_seo/vacio`: el include se sustituye por una cadena vacía (`ssi_silent_errors on`, sin el texto "[an error occurred...]") y el HTML sale igual, con los metadatos estáticos de respaldo de `index.html`. Coste: mientras `api` está caído cada `index.html` tarda ~1-2 s más (el DNS de Docker no responde NXDOMAIN para un contenedor detenido, simplemente no contesta). El `HEALTHCHECK` de `web` (`wget /`) sigue pasando. `/_seo/metadatos` es `internal`: pedido desde fuera responde 200 vacío (el 404 de `internal` también cae en el `error_page`), nunca metadatos ni errores del API.

**El build protege la directiva.** Vite conserva los comentarios de `index.html`, pero el `Dockerfile` de `web` ejecuta `grep -q 'include virtual="/_seo/metadatos"' apps/web/dist/index.html` tras el build: si una minificación futura la eliminara, la imagen no se construiría en vez de perder el SEO en silencio. En desarrollo (Vite) la directiva es un comentario inerte.

**Cómo comprobarlo** (contra el dominio de `web`):

```bash
# El primer <title> del documento debe ser el inyectado (el estático "Portafolio" viene después)
curl -s https://tudominio.com/ | grep -m1 '<title'
# Como lo ve el bot de Facebook/LinkedIn en un detalle de proyecto
curl -A "facebookexternalhit/1.1" https://tudominio.com/proyecto/<id> | grep og:
# Ruta desconocida: noindex
curl -s https://tudominio.com/no-existe | grep -m1 'robots'
```

Si el `<title>` inyectado no aparece: (1) `docker logs <web>` — un `could not be resolved` o `connect() failed` apunta a `SEO_UPSTREAM` (nombre o puerto del servicio `api` incorrectos, o `web` y `api` en redes distintas); (2) `docker exec <web> wget -qO- --header 'X-Ruta-Publica: /' http://api:3000/seo/metadatos` debe devolver el fragmento; (3) si el API responde pero el HTML no cambia, confirmar que `dist/index.html` conserva la directiva (`docker exec <web> grep -c '_seo/metadatos' /usr/share/nginx/html/index.html`).

### 7.3 Sitemap y robots

`GET /sitemap.xml` y `GET /robots.txt` los genera el API desde la versión publicada (home con `lastmod`, una `<url>` por proyecto, certificación y logro; robots con `Disallow: /admin` y la línea `Sitemap: ${FRONTEND_ORIGIN}/sitemap.xml`). nginx hace proxy de las dos rutas al mismo `SEO_UPSTREAM` con los mismos timeouts, así siguen viviendo bajo el dominio del sitio (los rastreadores solo aceptan un sitemap del mismo host). Respaldo si el API no responde: `/robots.txt` sirve `apps/web/public/robots.estatico.txt` (mismo contenido sin `Sitemap:`, 200, caché 1 h) y `/sitemap.xml` responde **503 en texto plano** (nunca el `index.html` del fallback de SPA: un sitemap con HTML lo descarta Google, un 503 solo le dice "vuelve luego"). La caché de las respuestas normales la decide el API (`Cache-Control: public, max-age=3600`). Para dar de alta el sitemap en Google Search Console basta con la URL `https://tudominio.com/sitemap.xml`.

### 7.4 Umami (analítica sin cookies, UC-27)

Umami se despliega como **stack aparte y opcional** (`docker-compose.umami.yml`): quien no lo quiera no gasta sus ~400 MB de RAM, y tiene su propio Postgres (nunca la base del portafolio). No usa cookies ni requiere banner de consentimiento.

1. **Desplegar el stack.** En el mismo proyecto de Dokploy, crear un segundo servicio "Docker Compose" apuntando a este repo y a `docker-compose.umami.yml`. Variables: `UMAMI_DB_PASSWORD` y `UMAMI_APP_SECRET` (obligatorias, `openssl rand -hex 32`). Asignarle un dominio (p. ej. `analitica.tudominio.com`, puerto interno 3000; Traefik termina el TLS). El primer arranque corre las migraciones de Umami (el `healthcheck` da 60 s de gracia).
2. **Primer acceso.** Usuario inicial `admin` / contraseña `umami`: cambiarla de inmediato (Settings → Profile).
3. **Crear el sitio.** Settings → Websites → Add website (nombre y dominio del portafolio). Copiar el **Website ID**.
4. **Activar el tracker en `web`.** Build args `VITE_UMAMI_URL=https://analitica.tudominio.com` y `VITE_UMAMI_WEBSITE_ID=<id>` → **reconstruir la imagen `web`** (en CI: añadir los dos secretos al `build-args` de `build-and-push-web`; en Dokploy: build args del servicio). Y en runtime de `web`, `ANALITICA_ORIGIN=https://analitica.tudominio.com` para que la CSP permita `script.js` y los envíos a `/api/send` (redesplegar `web`, sin reconstruir, si solo cambia esta). Sin `ANALITICA_ORIGIN` la consola del navegador mostrará `Refused to load the script 'https://analitica.../script.js'`.
5. **Métricas en el panel (`api`).** Crear en Umami las credenciales que usará el API: o bien un token de API (Settings → API keys, en las versiones que lo traen) para `UMAMI_API_TOKEN`, o bien un usuario de solo lectura (Settings → Users → rol *View only*) para `UMAMI_USUARIO` + `UMAMI_CONTRASENA`. Cargar `UMAMI_API_URL=https://analitica.tudominio.com` y `UMAMI_WEBSITE_ID=<id>` en `api` y redesplegar. La página `/admin/metricas` del panel muestra resumen, páginas, referidos, países y los eventos `descargar_cv` / `clic_red` del periodo elegido (7/30/90 días), con caché de 60 s.

**Cómo se conecta `api` con Umami.** Por la URL pública (la opción simple y recomendada): funciona aunque los stacks estén en redes de Docker distintas (en Dokploy cada Compose tiene la suya) y va por HTTPS. La alternativa es unir redes: declarar en ambos compose una red `external` compartida (Dokploy ya crea `dokploy-network`) y usar `UMAMI_API_URL=http://umami:3000`; ahorra el salto por Internet pero acopla los despliegues. El tracker del navegador siempre carga por el dominio público, en cualquiera de los dos casos.

Si las tarjetas del panel dicen "sin respuesta" (`motivo: 'sin_respuesta'`), el API no alcanza `UMAMI_API_URL` en 5 s (dominio, TLS o red); "no autorizado" (`no_autorizado`) es token o usuario/contraseña inválidos.

### 7.5 Lighthouse CI

`.github/workflows/lighthouse.yml` corre en cada PR y push a `main`: construye `apps/web` con `VITE_API_URL=http://127.0.0.1:4010`, levanta la **API simulada** (`apps/web/scripts/api-simulada.mjs`, un servidor Node sin dependencias que responde `GET /sitio`, `/proyectos/:id`, `/certificaciones/:id`, `/redes`, `/cv` y las imágenes SVG del fixture desde `apps/web/scripts/fixtures/sitio-demo.json`) y `vite preview` en `:4173`, y ejecuta `treosh/lighthouse-ci-action` con `apps/web/lighthouserc.json`: home y detalle del primer proyecto del fixture, preset **móvil** (el default de Lighthouse, con su red y CPU simuladas), **3 corridas** y mediana. El fixture es un snapshot realista (navegación, hero con imagen de fondo y foto, sobre-mí con estadísticas, 3 proyectos con imágenes y tecnologías, skills, certificaciones, galería, logros, contacto y fondo animado) para que la medida se parezca al sitio real y no a una página vacía.

**Qué mide y umbrales** (`ci.assert.assertions`, todas con nivel `error`: el PR falla si bajan): `performance ≥ 0.90`, `accessibility ≥ 0.95`, `best-practices ≥ 0.90`, `seo ≥ 0.90`.

**Cómo leer el artefacto.** El run sube `lighthouse-informes` (carpeta `.lighthouseci`): un `lhr-*.html` por corrida y URL (abrir en el navegador: es el informe normal de Lighthouse, con las auditorías que restan puntos y el filmstrip), los `lhr-*.json` crudos y `manifest.json` (qué corrida es la mediana por URL, `isRepresentativeRun`). En el log del paso "Lighthouse CI" aparecen las aserciones fallidas con el valor obtenido y el esperado.

**Cómo ajustar.** Umbrales en `apps/web/lighthouserc.json` (`minScore`); para exigir una auditoría concreta, añadir p. ej. `"largest-contentful-paint": ["warn", { "maxNumericValue": 2500 }]` (`warn` no rompe el PR). Para medir otra página, añadir su URL a `ci.collect.url` (y los datos que necesite, al fixture). Para probar en local sin CI:

```bash
cd apps/web
VITE_API_URL=http://127.0.0.1:4010 npm run build
cp public/robots.estatico.txt dist/robots.txt   # lo mismo que hace el workflow: el preview no tiene el proxy de nginx
npm run api-simulada &                          # :4010
npx vite preview --port 4173 --strictPort --host 127.0.0.1 &
npx @lhci/cli@0.14 autorun --config=lighthouserc.json   # informes en apps/web/.lighthouseci (ignorado por git)
```

La API simulada expone además `/seo/metadatos`, `/sitemap.xml` y `/robots.txt` con una versión mínima del contrato 8.1, útil para probar la plantilla de nginx en local: levantar `node:20-alpine` con `HOST=0.0.0.0 node /scripts/api-simulada.mjs` y `nginx:alpine` con `dist/` y la plantilla renderizada (`SEO_UPSTREAM=http://<contenedor-api>:4010`) en la misma red de Docker, y hacer `curl` como en la sección 5.
