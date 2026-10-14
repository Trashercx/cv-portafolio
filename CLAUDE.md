# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Portafolio CV — contexto del proyecto

Sitio de portafolio/CV personal con panel de administración privado. Monorepo con npm workspaces (`apps/*`, un solo `package-lock.json` en la raíz). Stack: React 19 + Vite (`apps/web`) y NestJS 10 + Prisma 7 + PostgreSQL (`apps/api`). Un solo usuario administrador, sin registro público. Código, comentarios, nombres de tabla y mensajes de commit en español.

## Decisiones ya tomadas (no las vuelvas a proponer como abiertas)

- Editor de plantillas: visual, arrastrar y soltar, con Puck (`@puckeditor/core` 0.23, migrado en la Fase 7).
- ORM: Prisma 7 con driver adapter `@prisma/adapter-pg`. La URL de conexión vive en `apps/api/prisma7.config.ts`, no en `schema.prisma`. El cliente se genera en `apps/api/generated/prisma` (ignorado por git, lo regenera el `postinstall`).
- Autenticación: `@nestjs/passport` + `passport-jwt`, administrador único, sin endpoint de registro. El JWT viaja **solo** en la cookie httpOnly `access_token`, nunca en el header `Authorization` ni en el cuerpo de la respuesta; el frontend nunca lo lee ni lo guarda.
- Multimedia: AWS S3 (`@aws-sdk/client-s3`) con sharp para miniaturas, detrás de la interfaz `MediaStorageService` (token `MEDIA_STORAGE_SERVICE`). `S3MediaStorageService` es el provider real; `LocalMediaStorageService` se conserva solo como fallback de desarrollo sin credenciales y como stub en tests e2e (vía `overrideProvider`). CloudFront es opcional. Fase 8: al subir o reemplazar una imagen rasterizada, `VariantesImagenService` genera variantes WebP/AVIF (640/1024/1600 px) en `MEDIA_VARIANTE` sin hacer fallar la subida; toda `Media` (admin y snapshot) sale con `variantes` (`media.select.ts`) y el sitio las consume con `ImagenResponsive`. `sharp` se importa SIEMPRE desde `modules/media/sharp.ts`: sin `esModuleInterop`, `import sharp from 'sharp'` compila a `undefined`.
- UI: Tailwind CSS v4 + shadcn/ui (estilo `new-york`, íconos lucide). Alias `@/` → `apps/web/src`.
- Estado/formularios: TanStack Query para datos de servidor; Zustand **solo** para estado de edición en curso (`store/editor-secciones-store.ts`, `editor-panel-store.ts`, `auth-store.ts` en memoria); React Hook Form + Zod; Tiptap para texto enriquecido (**decidido, todavía NO implementado**: los campos largos como la biografía siguen siendo `<Textarea>` plano; Puck ya está en 0.23, así que el camino es usar su campo `richtext`, que es Tiptap, cuando llegue la fase de casos de estudio; ver roadmap).
- Hosting: VPS propio con Docker + Dokploy o Coolify. Imágenes publicadas a GHCR desde GitHub Actions en cada push a `main`. Ver `docs/despliegue.md`.

## Dónde está el detalle

- `docs/plan-portafolio.md`: stack justificado, los casos de uso (UC-01 a UC-18) con criterios de aceptación, el diagrama ER (bloque mermaid) normalizado a 3FN y la estrategia de ramas/criticidad. **Única fuente de verdad** para UC, campos y entidades. No inventes campos, entidades, endpoints ni tipos de bloque que no estén ahí; si hace falta algo nuevo, agrégalo primero a ese documento y luego codéalo.
- `docs/plan-tecnico.md`: estructura del monorepo, tareas por sprint/fase (ya se completaron Sprint 0–8, Fases 3.x/4.x, Fase 5 (panel unificado), Fase 6 (fundamentos de producción), Fase 7 (frontend y editor), Fase 8 (visibilidad) y Fase 7b (fondos interactivos); el historial de "rondas" de correcciones también está ahí, y al final de §2 el desglose propuesto de las Fases 9–11), la checklist consolidada de reglas (§4) y el índice UC → tarea → subagente. Revísalo antes de arrancar cualquier tarea.
- `docs/plan-portafolio.md` §7: **roadmap de profesionalización** (Fases 7 y 8 aprobadas e implementadas; Fases 9–11 propuestas, pendientes de aprobación por fase; de UC-19 a UC-34 solo UC-27 y UC-34 están implementados). No los implementes sin que el usuario apruebe la fase.
- `docs/despliegue.md`: variables de producción (incluidas las de la Fase 6: `TRUST_PROXY`, `LOG_LEVEL`, `THROTTLE_*`, `API_ORIGIN`/`MEDIA_ORIGIN` de la CSP; y las de la Fase 8: `SEO_UPSTREAM`, `ANALITICA_ORIGIN`, `UMAMI_*`, `VITE_UMAMI_*`), Dokploy/Coolify, health checks, backups, smoke test y en §7 el stack opcional de Umami (`docker-compose.umami.yml`) y Lighthouse CI.
- `docs/design/`: mockups HTML de referencia de las pantallas del panel.

## Comandos

Instalar todo desde la raíz con `npm install` (los workspaces comparten un lockfile; `apps/api` corre `prisma generate` en el `postinstall`).

Base de datos local: `docker compose up -d` en la raíz levanta Postgres 16 en el puerto **5433** del host (para no chocar con un Postgres nativo en 5432) y Adminer en `:8080`. `DATABASE_URL` de `apps/api/.env` ya apunta ahí.

Variables de entorno: copiar `.env.example` a `apps/api/.env` (Nest carga `dotenv/config` desde `main.ts`, `prisma7.config.ts` y `seed.ts`) y crear `apps/web/.env.local` con `VITE_API_URL=http://localhost:3000`. Vite incrusta `VITE_*` en tiempo de build, no de runtime.

Backend (`apps/api`):

```
npm run start:dev                 # Nest en watch, puerto 3000
npm run build                     # nest build → dist/src/main.js
npm run lint                      # eslint --fix
npm test                          # unit tests (*.spec.ts bajo src/)
npx jest src/modules/auth/auth.service.spec.ts   # un solo spec
npx jest -t "nombre del test"     # por nombre
npm run test:e2e                  # test/*.e2e-spec.ts, requiere Postgres levantado y seed aplicado
npx jest --config ./test/jest-e2e.json test/secciones.e2e-spec.ts   # un solo e2e
npx prisma migrate dev --name <cambio>   # migración nueva (solo vía subagente db-schema)
npx prisma db seed                # admin único + catálogos (idempotente, usa ADMIN_EMAIL/ADMIN_PASSWORD_SEED)
```

Frontend (`apps/web`):

```
npm run dev                       # Vite en :5173
npm run build                     # tsc -b && vite build
npm run lint                      # oxlint
npm test                          # vitest run (jsdom, setup en src/test/setup.ts)
npx vitest run src/features/editor/LienzoPuck.test.tsx   # un solo archivo
npx vitest run -t "nombre"        # por nombre
```

Los tests e2e del API levantan `AppModule` real (`test/utils/test-app.ts`): necesitan la base de datos con migraciones y seed, corren con `maxWorkers: 1`, y `agenteAutenticado()` hace login real y reenvía la cookie. Para rutas públicas usar `request(app.getHttpServer())` sin agente.

El frontend se sirve con nginx desde una plantilla (`apps/web/nginx/default.conf.template` + `cabeceras-seguridad.conf`): la CSP toma `API_ORIGIN`/`MEDIA_ORIGIN` en runtime vía `envsubst` (defaults `https:` en `docker-entrypoint.d/10-defaults.envsh`). Si agregas un origen externo (fuente, script, iframe), hay que tocar la CSP, no solo el código. Fase 8: nginx procesa `index.html` con SSI (`<!--# include virtual="/_seo/metadatos" -->`, subrequest interno a `${SEO_UPSTREAM}/seo/metadatos` con la ruta del visitante en `X-Ruta-Publica`) y proxea `/sitemap.xml` y `/robots.txt` al API; si el API no responde, el HTML sale igual con los metadatos estáticos y `public/robots.estatico.txt` hace de respaldo. El Dockerfile de `web` falla si la directiva desaparece de `dist/index.html`. `.gitattributes` fuerza LF: en Windows, `git status` ya no debe mostrar ruido de finales de línea.

Husky corre `commitlint` (Conventional Commits) y `lint-staged` (lint por workspace) en cada commit. CI (`.github/workflows/ci.yml`) corre lint + build + test de ambas apps en cada PR a `main`, y para el API además migraciones + seed + **e2e** contra un servicio Postgres 16 (variables dummy en el workflow); CodeQL y Dependabot corren aparte; `lighthouse.yml` (Fase 8) audita `/` y un detalle de proyecto contra `apps/web/scripts/api-simulada.mjs` + `vite preview`, con presupuestos en `apps/web/lighthouserc.json`. En push a `main` además construye y publica las imágenes Docker. El contexto de build de ambos Dockerfiles es la **raíz** del repo.

## Arquitectura (lo que no se ve leyendo un solo archivo)

### Publicación por snapshot (decisión central)

El sitio público **nunca lee las tablas de contenido en vivo**. `VersionesSitioService.armarSnapshot()` (`modules/versiones-sitio`) arma una foto completa del sitio (perfil, tema, secciones, proyectos, certificaciones, logros, redes, skills, fondo) reutilizando los servicios de cada módulo, y la guarda como JSONB en `VersionSitio.snapshot` con `estado='borrador'` (preview, UC-10) o `'publicado'` (UC-11). `PublicoController` (`GET /sitio`, `/proyectos/:id`, `/certificaciones/:id`, `/redes`, `/cv`) solo consulta la última versión publicada. Si el admin edita y no publica, el visitante no lo ve. Las relaciones a `Media` ya vienen resueltas dentro del snapshot (`perfil.imagen_perfil`, `certificacion.logo`, `hero.imagen_fondo`, fotos de galería); referencias rotas se omiten en silencio. La forma del snapshot está en `snapshot.types.ts` (API) y `features/publico/types.ts` (web): si cambias lo que devuelve un servicio admin, cambia también el snapshot.

### Rutas y guards del API

- Rutas admin: `@UseGuards(JwtAuthGuard)` a nivel de clase y prefijo `admin/*` (`admin/proyectos`, `admin/secciones`, `admin/media`, `admin/versiones`, `admin/temas`, ...). Varias se llaman `*-admin.controller.ts`.
- `AuthController` (`/auth/login`, `/auth/refresh`, `/auth/logout`) no lleva guard de clase; `refresh` protege su propia ruta y `logout` no (debe funcionar con token vencido; borra la cookie con las opciones compartidas de `cookie-acceso.ts`). UC-01 bloquea la cuenta tras 3 intentos fallidos (`intentos_fallidos`/`bloqueado_hasta`) y además `@Throttle` limita el login por IP (`THROTTLE_LOGIN_*`).
- Fase 6: `ThrottlerGuard` global (`APP_GUARD`), `helmet`, `compression`, `nestjs-pino` (JSON en producción, `x-request-id`, `silent` en tests), `GET /health` y `/health/ready` (Terminus, sin guard) y `enableShutdownHooks()`. Los e2e usan `crearAppDePrueba()` de `test/utils/test-app.ts`, que desactiva en la práctica el throttler; `throttle.e2e-spec.ts` lo prueba aparte.
- Rutas públicas (UC-12 a UC-14) sin guard alguno. Fase 8: `SeoController` (`GET /seo/metadatos`, `/sitemap.xml`, `/robots.txt`, módulo `seo`) lleva `@SkipThrottle()` porque todas sus peticiones llegan desde la IP interna de nginx; `GET /admin/metricas` (módulo `metricas`, proxy a Umami con caché de 60 s) nunca responde 5xx: devuelve `{ disponible: false, motivo }`.
- `ValidationPipe` global con `whitelist + forbidNonWhitelisted + transform`: ningún campo fuera del DTO entra en ningún endpoint. `test-app.ts` reproduce el mismo pipeline.

### Secciones: `configuracion` es JSON dinámico validado por tipo

`Seccion.configuracion` (JSONB) varía según `tipo_seccion`. `TIPOS_SECCION` y `CONFIGURACION_DTO_POR_TIPO` en `modules/secciones/dto/configuracion/index.ts` mapean cada tipo (`hero`, `sobre-mi`, `proyectos`, `certificaciones`, `logros`, `contacto`, `skills`, `columnas`, `galeria`) a un DTO de `class-validator`; `validar-configuracion.ts` reproduce a mano whitelist/forbidNonWhitelisted. El tipo `columnas` contiene bloques hijos (Slots API de Puck, UC-17) validados recursivamente por `@EsListaDeBloques()`; nunca admite `hero` ni otro `columnas` dentro. Agregar un tipo de bloque implica: UC en el plan → DTO + entrada en ese mapa → tipo en `features/secciones/types.ts` → componente en `components/publico/bloques/` → entrada en `lib/puck-config.tsx` → `DespachoBloqueSeccion`/`RenderizadorSecciones`.

### Un solo render para editor y sitio público (WYSIWYG)

Los bloques de `apps/web/src/components/publico/bloques/` (incluido `navegacion`, que va `fixed` en el sitio y `sticky` en el lienzo, fuera de `EnvoltorioSeccion`) son los mismos componentes que renderiza el lienzo de Puck (`lib/puck-config.tsx`, `features/editor/`) y el sitio publicado (`RenderizadorSecciones`). El lienzo recibe datos en vivo de los endpoints admin vía `useDatosEditor` (forma `DatosEditor`, estructuralmente igual a `SnapshotSitio` más `mediaPorId` como objeto plano, nunca `Map`: Puck serializa `metadata` hacia el iframe). Las clases Tailwind de layout se escriben literales en tablas (`GRID_COLS_POR_DISTRIBUCION`, `ALINEACION_TEXTO_CLASE`, `lib/escalas-bloque.ts`, `lib/efectos-hover.ts`, `lib/animaciones.ts`), nunca concatenadas en runtime, y las tablas se comparten para que lienzo y sitio no diverjan. Animaciones con `motion` (`LazyMotion` + `m`): apagadas en el lienzo (`modoRenderizado === 'editor'`) y con `prefers-reduced-motion`; el API no persiste defaults de configuración, así que todo componente tolera claves ausentes. Los props internos del editor llevan prefijo `_` para no viajar a `PATCH /admin/secciones/:id/configuracion`. Fase 8: toda imagen de media se pinta con `ImagenResponsive` (`<picture>` AVIF → WebP → original, `sizes` de `SIZES_POR_CONTEXTO` en `lib/imagenes.ts`; el fondo del hero con `fondoImagenSet`), nunca con un `<img>` directo; la analítica (`lib/analitica.ts`, `registrarEvento`) es no-op sin tracker y el tracker de Umami (`components/publico/Analitica.tsx`) solo se monta en rutas públicas.

El panel unificado `/admin/editor` fusionó Editor visual + Tema + Fondo + Publicación; `/admin/tema`, `/admin/fondo` y `/admin/publicacion` son redirects (`?panel=tema|fondo` abre el plugin del rail). Desde la Fase 7 el editor usa el layout nativo de Puck 0.23: rail de plugins (Bloques, Esquema, Campos + plugins propios `tema` y `fondo` en `features/editor/`), `dictionary` en español (`puck-diccionario.ts`, test contra el `.d.ts`), toolbar propio en `overrides.headerActions`, estado espejado en `editor-panel-store` (`pluginActivo`, `viewportActual`, `modoVistaPrevia`), guardia de cambios sin guardar (`navegacion-protegida.tsx`) y `Ctrl+S`. El `content` de Puck se espeja en `useEditorSeccionesStore` y "Guardar cambios" calcula crear/actualizar/eliminar/reordenar contra `admin/secciones`.

### Tema y modo oscuro

Los colores y la fuente se derivan del `Tema` activo a variables CSS (`lib/tema-css.ts`, `tema-oscuro.ts`, `tema-superficies.ts`); ningún componente hardcodea colores. Solo puede haber un `Tema.activo` y un `FondoSitio.activo` por admin (índice único parcial + transacción en el servicio). Fondos (Fase 7b, UC-15): el catálogo de 9 tipos vive en `features/fondo-sitio/catalogo-fondos.ts` (única fuente de claves, etiquetas y `normalizarTipoFondo` para los 7 tipos antiguos de snapshots ya publicados; el API replica las claves en `TIPOS_FONDO` del DTO); cada tipo es un componente en `components/publico/fondos/` que `FondoAnimado` carga lazy con `modo` `sitio|editor|miniatura` (miniatura: animada pero sin interactividad, canvas a 20 fps; `prefers-reduced-motion`: fotograma estático; editor: canvas a 30 fps, sin puntero). Un tipo nuevo implica catálogo → DTO → componente (→ migración de datos si reemplaza a otro). En el lienzo, `fondoEnEdicion` del `editor-panel-store` manda sobre `datos.fondo` mientras el panel Fondo ajusta.

### Frontend: sesión y errores

`lib/api-client.ts` (`apiFetch`) siempre manda `credentials: 'include'`; los hooks públicos (`features/publico/usePublico.ts`) deben pasar `conCredenciales: false`. `lib/query-client.ts` centraliza: 401 en rutas no `/auth/*` → limpia el store y recarga a `/admin/login?sesion=expirada`; toasts de éxito/error de mutaciones vía `mutation.meta.mensajeExito/mensajeError`. Organización: `features/<entidad>/` (hooks TanStack, schemas Zod, tipos), `pages/admin|public/`, `components/ui/` (shadcn, no editar a mano salvo necesidad).

## Convenciones

- Un módulo de Nest por entidad principal bajo `apps/api/src/modules/`.
- Nombres de tabla y columna en español y snake_case, iguales al diagrama ER (`usuario_admin`, `proyecto_tecnologia`, ...), con `@@map` en Prisma. Las únicas columnas JSONB son `seccion.configuracion`, `version_sitio.snapshot` y `fondo_sitio.configuracion`.
- Ninguna credencial (AWS, JWT, Postgres) en el código: solo variables de entorno; `.env` nunca se commitea, `.env.example` sí.
- Los comentarios del código referencian el UC-XX y el sprint/fase que motivó cada decisión; mantén esa práctica y actualiza los comentarios que queden desactualizados.

## Control de versiones y Scrum

- `main` protegida, sin push directo. Una rama por historia o ronda de correcciones (`feature/...`, `fix/...`), PR hacia `main`. Commits en Conventional Commits con scope `api`, `web` o el módulo (`feat(certificaciones): ... (UC-04)`).
- Niveles de criticidad en `docs/plan-portafolio.md` §6: bajo (commit libre en la rama), moderado (PR al cerrar un UC), crítico (esquema, auth, multi-módulo: exige `code-reviewer` y aprobación explícita del usuario antes de mergear).
- Ningún commit o push se hace sin pasar antes por el subagente `release-manager`: clasifica criticidad, corre pruebas/build y arma el resumen de cierre de sprint para que el usuario dé el visto bueno antes de seguir.

## Cómo trabajar

- Esquema de datos: subagente `db-schema` (actualiza primero el mermaid del plan, luego `schema.prisma` + migración). API: `backend-nestjs`. Pantallas y editor visual: `frontend-react`. Así la exploración de cada capa no llena la conversación principal.
- Antes de dar una tarea por terminada, pide a `code-reviewer` que revise el diff, y luego a `release-manager` que decida cómo y cuándo se sube.
- Si corres dos subagentes de código en paralelo, dales `isolation: worktree` para que no toquen los mismos archivos a la vez (las ramas `worktree-agent-*` vienen de ahí; se mergean a la rama de la historia).
