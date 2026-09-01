# Despliegue (Sprint 5)

Guía de referencia para desplegar el portafolio en un VPS con Docker + Dokploy o Coolify (ver `docs/plan-portafolio.md`, sección "Hosting"). Complementa, no reemplaza, `docs/plan-tecnico.md` (sección "Sprint 5 — Despliegue").

## 1. Componentes

- `apps/api/Dockerfile`: imagen de la API (NestJS). Corre migraciones (`prisma migrate deploy`) al arrancar y luego `node dist/src/main.js`.
- `apps/web/Dockerfile`: imagen del frontend (build de Vite servido por nginx, con fallback de SPA).
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
