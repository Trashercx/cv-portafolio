# Plan Técnico de Desarrollo

**Documento de ejecución · v1**
Autor: Oscar · Fecha: 31 ago 2026

Este documento traduce `docs/plan-portafolio.md` a tareas técnicas ejecutables. No es un documento de producto: no cambia decisiones de casos de uso ni del diagrama ER, solo las secuencia, las convierte en trabajo concreto y consolida las reglas que ya existen en `CLAUDE.md` y en los subagentes de `.claude/agents/` en un solo lugar de referencia rápida.

Antes de arrancar cualquier sprint o tarea de infraestructura: revisa la Sección 4 (reglas) de este documento y la sección correspondiente de `docs/plan-portafolio.md`.

## 1. Estructura de monorepo y herramienta

| Opción | Encaje |
|---|---|
| **npm workspaces (elegida)** | Ya asumido implícitamente por `CLAUDE.md` (comandos `npm run ...` dentro de cada `apps/*`). Cero curva de aprendizaje adicional, cero config nueva, un solo lockfile en la raíz. |
| pnpm workspaces | Instalación más rápida y ahorro de disco, pero cambia el gestor de paquetes que ya usan los comandos documentados; beneficio marginal para 2 apps y un solo desarrollador. |
| Turborepo / Nx | Aportan caché de build y ejecución paralela entre paquetes; valioso con muchos paquetes o CI con matriz de builds. Aquí hay 2 apps, sprints secuenciales y un solo desarrollador: la config adicional no se paga a sí misma todavía. |

**Decisión:** npm workspaces, root `package.json` con `"workspaces": ["apps/*"]`. Revisar esta decisión si en el futuro aparece un paquete compartido (por ejemplo `packages/shared` con esquemas Zod reutilizados entre `apps/api` y `apps/web`) y los tiempos de build lo justifican.

### Estructura de carpetas

```
/
├── apps/
│   ├── api/                        # NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── perfil/
│   │   │   │   ├── proyectos/
│   │   │   │   ├── tecnologias/
│   │   │   │   ├── certificaciones/
│   │   │   │   ├── logros/
│   │   │   │   ├── redes-sociales/
│   │   │   │   ├── media/
│   │   │   │   ├── secciones/
│   │   │   │   ├── tema/
│   │   │   │   ├── versiones-sitio/
│   │   │   │   └── publico/         # agregador de endpoints de visitante
│   │   │   ├── common/              # guards, decorators, filters, pipes
│   │   │   ├── prisma/              # PrismaModule/PrismaService
│   │   │   └── main.ts
│   │   ├── test/                    # Supertest e2e
│   │   └── package.json
│   └── web/                         # React + Vite
│       ├── src/
│       │   ├── pages/
│       │   │   ├── admin/
│       │   │   └── public/
│       │   ├── features/            # auth, perfil, proyectos, certificaciones,
│       │   │                        # logros, redes, media, editor-secciones, tema, versiones
│       │   ├── components/          # ui/ shadcn, compartidos
│       │   ├── lib/                 # api-client, query-client, puck-config
│       │   ├── store/                # zustand
│       │   └── main.tsx
│       ├── e2e/                     # Playwright
│       └── package.json
├── docs/
│   ├── plan-portafolio.md
│   └── plan-tecnico.md
├── .github/workflows/ci.yml
├── .husky/
├── docker-compose.yml               # Postgres local (+ opcional adminer)
├── .env.example
├── package.json                     # workspaces root
└── CLAUDE.md
```

Prisma vive **solo dentro de `apps/api`** — un único consumidor de la base de datos, según la regla del subagente `backend-nestjs` de que el acceso a datos pasa siempre por Prisma. Ningún otro paquete accede a la base de datos directo.

## 2. Desglose técnico por sprint

Para cada sprint: objetivo, orden de tareas, endpoints, entidades Prisma, frontend y pruebas.

### Sprint 0 — Cimientos

Orden estricto (hay dependencias reales entre pasos):

1. Scaffold del monorepo (workspaces root, `.gitignore`, README stub).
2. Scaffold `apps/api` (Nest CLI) y `apps/web` (Vite `react-ts`).
3. `docker-compose.yml` con Postgres local.
4. `.env.example` con todas las variables necesarias (ver Sección 5).
5. `schema.prisma` completo con las 14 entidades del ER (subagente `db-schema`) + primera migración.
6. Seed de administrador único (`ADMIN_EMAIL`/`ADMIN_PASSWORD_SEED` desde variables de entorno, hash con bcrypt/argon2 en el script de seed, nunca en texto plano en el repo).
7. Módulo `auth`: `POST /auth/login` (DTO `email`, `password`, `class-validator`), `JwtStrategy`, `JwtAuthGuard`, bloqueo tras 3 intentos fallidos.
8. Husky + lint-staged + commitlint (Conventional Commits) en la raíz.
9. GitHub Actions (`ci.yml`): install, lint, test, build para ambos `apps/*`.
10. Frontend: página de login (React Hook Form + Zod), cliente TanStack Query, wrapper de ruta protegida.

**Decisiones técnicas a fijar antes de empezar (no están resueltas en `plan-portafolio.md`):**

- El criterio de aceptación de UC-01 exige bloqueo tras 3 intentos fallidos, pero `USUARIO_ADMIN` no tiene columna para contar intentos. Tarea de `db-schema`: agregar `intentos_fallidos` y `bloqueado_hasta` a `USUARIO_ADMIN` en el bloque `mermaid` de `docs/plan-portafolio.md` (con la justificación) antes de tocar `schema.prisma`, siguiendo la propia regla del subagente.
- Almacenamiento del JWT en frontend: **cookie httpOnly** (+ `SameSite`) si `apps/web` y `apps/api` comparten origen/subdominio en producción, evitando exposición a XSS. Si no comparten origen, usar refresh token + access token corto en memoria. Decidir esto antes de escribir el guard y el cliente HTTP.

Pruebas: Jest unitario de `AuthService` (hash, comparación, conteo de intentos); Supertest e2e de `POST /auth/login` (éxito, credenciales inválidas, bloqueo).

### Sprint 1 — Contenido base (API), UC-02 a UC-06

Patrón repetido por cada una de las 5 entidades: módulo Nest dedicado, DTOs `class-validator` (create/update) que reflejan exactamente los campos de la tabla de UC en `plan-portafolio.md`, rutas admin protegidas con `JwtAuthGuard`, rutas públicas equivalentes sin guard donde aplica (proyectos y certificaciones tienen vista pública, UC-13).

Endpoints:

- **Perfil:** `GET/PUT /admin/perfil` (fila única, upsert).
- **Proyectos:** `GET /proyectos`, `GET /proyectos/:id` (público); `GET/POST/PATCH/DELETE /admin/proyectos`; `PATCH /admin/proyectos/reordenar`; `POST/DELETE /admin/proyectos/:id/tecnologias/:tecnologiaId`; `POST/DELETE/PATCH /admin/proyectos/:id/imagenes`; `GET/POST /admin/tecnologias` (catálogo).
- **Certificaciones:** `GET /certificaciones`, `GET /certificaciones/:id` (público); CRUD `/admin/certificaciones`.
- **Logros:** `GET /logros` (público); CRUD `/admin/logros`.
- **Redes:** `GET /redes` (público, UC-14); CRUD `/admin/redes-sociales`; `GET /admin/plataformas-red` (catálogo seedeado).

**Ajuste técnico:** `PERFIL` referencia `MEDIA` (`imagen_perfil_id`, `cv_media_id`) y `CERTIFICACION` referencia `MEDIA` (`logo_media_id`), pero la biblioteca completa (UC-09) está agendada recién en el Sprint 3. Se incluye aquí un módulo `media` **mínimo**: entidad + `POST /admin/media`, sin galería ni gestión de "usado en". La biblioteca completa (listado, reemplazo seguro, validación de referencias) se cierra en Sprint 3.

**Excepción temporal aprobada (Sprint 1):** todavía no hay credenciales de AWS configuradas en `.env`, así que `POST /admin/media` no integra `@aws-sdk/client-s3`/multer-s3 todavía. Se implementó detrás de una interfaz `MediaStorageService` (un solo método `upload`) con un `LocalMediaStorageService` que guarda en `apps/api/uploads/` (gitignorado) como stub temporal, dejando el reemplazo por `S3MediaStorageService` como cambio de una línea en `media.module.ts` sin tocar `MediaService` ni los controladores. Ningún criterio de aceptación de UC-02/03/04 depende de que el archivo esté físicamente en S3, solo de que `Media` tenga una URL/key coherente. Reemplazar por S3 real en cuanto existan credenciales — antes de Sprint 3 (biblioteca de media) o de desplegar a producción, lo que ocurra primero.

Pruebas: Jest por servicio (validaciones, orden); Supertest e2e por endpoint contra el criterio de aceptación exacto del UC; un test que confirme 401 en rutas admin sin token.

### Sprint 2 — Panel de administración (pantallas de UC-02 a UC-06)

Por entidad: página de listado, formulario crear/editar (React Hook Form + Zod espejando el DTO del backend), diálogo de confirmación de borrado (shadcn/ui), hooks de TanStack Query (`useQuery`/`useMutation` con query keys por entidad). El widget de subida usa el endpoint `POST /admin/media` del Sprint 1 — la subida siempre pasa por el servidor Nest (multer-s3), nunca por una URL pre-firmada llamada directo desde el navegador.

Pruebas: Vitest + React Testing Library por formulario (errores de validación, llamada a mutación); Playwright smoke opcional (login → crear proyecto → aparece en lista).

### Sprint 3 — Editor visual y tema (UC-07, UC-08, UC-09 completo)

- **`secciones`:** CRUD, `PATCH /admin/secciones/reordenar`, `PATCH /admin/secciones/:id/visibilidad`, `PATCH /admin/secciones/:id/configuracion` con validación **por tipo de sección** (un DTO/schema distinto por `tipo_seccion`, nunca un JSON libre sin validar).
- **`tema`:** CRUD, `PATCH /admin/temas/:id/activar`. Prisma no soporta índices únicos parciales de forma declarativa: el flujo correcto es `prisma migrate dev --create-only` y editar a mano el SQL generado agregando `CREATE UNIQUE INDEX ... ON tema (usuario_admin_id) WHERE activo = true;` — tarea explícita de `db-schema`. Reforzar además en `TemaService` con una transacción que desactive el tema previo antes de activar el nuevo, según la regla de negocio de `plan-portafolio.md` sección 4.
- **Biblioteca de media completa:** galería, edición de alt text, filtro por tipo, verificación de "usado en" antes de permitir borrar/reemplazar (chequeo contra `proyecto_imagen`, `certificacion.logo_media_id`, `perfil.imagen_perfil_id`/`cv_media_id`).
- **Frontend:** configuración de Puck con un componente por `tipo_seccion` (hero, sobre-mí, proyectos, certificaciones, logros, contacto), cada uno leyendo su forma de `SECCION.configuracion`; selector de tema con variables CSS, sin colores hardcodeados en ningún componente.

Pruebas: Jest de exclusividad de tema activo (incluyendo activación concurrente); Supertest de validación de `configuracion` por tipo; Vitest/RTL renderizando cada bloque de Puck con datos de prueba. No automatizar el drag-and-drop pixel a pixel en Playwright (frágil); testear el reordenamiento llamando al endpoint y verificando el resultado, reservando Playwright solo para un smoke visual.

### Sprint 4 — Publicación y sitio público (UC-10 a UC-14)

**Decisión de arquitectura central:** el sitio público (UC-12) debe leer siempre de `VERSION_SITIO.snapshot` (jsonb) marcado como publicado, **nunca** de las tablas de contenido en vivo — de lo contrario cualquier edición del admin se filtraría al público antes de publicar, violando el criterio de aceptación de UC-12 literalmente.

- `POST /admin/versiones/preview`: arma el snapshot desde el estado actual de secciones + tema + contenido, `estado='borrador'`.
- `POST /admin/versiones/publicar`: `estado='publicado'`, `publicado_en=now()`.
- `POST /admin/versiones/:id/revertir`: crea una **nueva fila** de versión copiando el `snapshot` de la versión publicada anterior (no muta la fila vieja), preservando el historial.
- Público: `GET /sitio` (snapshot publicado completo), `GET /proyectos/:id` y `GET /certificaciones/:id` resolviendo contra el contenido del snapshot (no la tabla viva), `GET /cv` (redirección a la URL S3 del `cv_media_id` del snapshot publicado).
- Frontend público: home renderizando secciones del snapshot en orden y visibilidad, detalle de proyecto/certificación, enlaces de redes, descarga de CV. La vista previa de borrador (UC-10) sigue leyendo de los endpoints admin normales (contenido en vivo), no del snapshot.

Pruebas: Supertest de la transición borrador → publicado → revertido, y de que `GET /sitio` nunca exponga un borrador; Playwright end-to-end completo: login → editar → preview → publicar → verificar sitio público → revertir → verificar que el público vuelve al estado anterior.

### Sprint 5 — Despliegue

Dockerfiles multi-stage para `apps/api` y `apps/web`; definición de servicios en Dokploy/Coolify; paso de CD en GitHub Actions (build de imágenes o webhook de despliegue); cron de `pg_dump` con copia a S3; checklist de variables de entorno de producción; smoke test post-despliegue (login + `GET /sitio`).

### Sprint 8 — Fase 2: foto de perfil en el hero, skills y fondo de página animado (UC-07 ext., UC-15, UC-16)

Continuación del rediseño visual aprobado en las rondas de `/design` tras la Fase 1 (sidebar admin, modales). El botón de CV y el bloque "Sobre mí" ya se implementaron en Sprint 7 y no se tocan aquí.

- **`skills`:** módulo Nest nuevo, patrón "contenido propio del admin" (como `logros`, sin catálogo compartido): CRUD completo (`GET/POST/PATCH/DELETE /admin/skills`), campo `icono` como string libre (mismo patrón que `PLATAFORMA_RED.icono_defecto`, resuelto a un ícono real en el frontend vía `simple-icons`/`lucide-react`).
- **`fondo-sitio`:** módulo Nest nuevo, mismo patrón que `tema` (índice único parcial en SQL manual + transacción de activación exclusiva en el servicio): CRUD + `PATCH /admin/fondos/:id/activar`. `tipo` es uno de `solido | degradado_animado | aurora_animada | particulas | cuadricula_animada`; `configuracion` (jsonb) solo guarda `velocidad` y `opacidad`, compartidos por los 5 tipos.
- **`secciones`:** `HeroConfiguracionDto` gana `mostrar_foto_perfil`, `posicion_foto`, `estilo_foto` (reutiliza `PERFIL.imagen_perfil_id`, no crea un `media_id` propio del hero); nuevo `SkillsConfiguracionDto` (`direccion`, `velocidad`) para el nuevo `tipo_seccion='skills'`.
- **`versiones-sitio`:** `SnapshotSitio` gana `skills` (lista completa del catálogo) y `fondo` (el `FondoSitio` activo o `null`); `VersionesSitioService.armarSnapshot()` los arma junto al resto vía `Promise.all`.
- **Frontend:** nuevo bloque `skills` en la config de Puck; `RenderizadorSecciones` gana `BloqueSkills` (marquesina infinita CSS) y extiende `BloqueHero` con la foto de perfil; `PublicHomePage` gana un layer de fondo animado (`FondoAnimado`), independiente del wrapper de variables CSS de `TEMA`; nuevos `@keyframes` en `index.css`; páginas admin `SkillsListPage` y `FondoSitioPage` (esta última calco de `TemaPage`, pero independiente — nunca una pestaña dentro de ella).
- **Pruebas:** Jest de exclusividad de `FONDO_SITIO.activo` (mismo test que ya existe para `TEMA`); Supertest de validación de los DTOs nuevos; Vitest/RTL del bloque `skills` (marquesina) y del hero con foto.

### Fase 3.1 — Editor visual con render real del sitio (WYSIWYG)

Solo frontend (`apps/web`), sin cambios de esquema ni de API. El lienzo de `/admin/editor` mostraba placeholders esquemáticos de admin (tarjetas grises tipo "Carrusel hacia la izquierda, velocidad media.") en vez del sitio real — Puck ya copia todo el CSS del host al iframe y renderiza vía `createPortal` (`@measured/puck@0.20.2`), así que el contexto de React (`QueryClientProvider`, `BrowserRouter`) sigue disponible dentro del iframe sin configuración extra.

- **`bloques/`:** los 7 bloques de `RenderizadorSecciones` (antes funciones privadas sin exportar) se extraen a `components/publico/bloques/Bloque*.tsx`, uno por archivo, exportados y reutilizados tal cual por el sitio público y por el lienzo del editor — un solo lugar de verdad para cómo se ve cada `tipo_seccion`.
- **`EnvoltorioSeccion`:** el `<section className="border-b px-6 py-12">` + aviso "Oculta · no se publicará" de `RenderizadorSecciones`, extraído para que lo compartan el sitio público y `puck-config.tsx` — mismo espaciado por construcción.
- **`contexto-renderizado.tsx`:** `ProveedorModoRenderizado`/`useModoRenderizado` (`'publico' | 'editor'`, default `'publico'`) + `EnlaceBloque`, que reemplaza `<Link>`/`<a>` dentro de los bloques y de `RedesSociales`: en modo `'editor'` no navega (el `Router` de react-router sigue vivo dentro del iframe vía `createPortal`, así que un enlace real navegaría fuera del editor).
- **`useDatosEditor`:** compone los 9 hooks admin (`usePerfil`, `useProyectos`, `useCertificaciones`, `useLogros`, `useRedesSociales`, `useSkills`, `useTemas`, `useFondosSitio`, `useMediaList` sin filtro) y resuelve los 3 huecos de media que esos endpoints admin no traen resueltos (a diferencia del snapshot publicado): `perfil.imagen_perfil`/`cv_media` y `certificacion.logo`. `hero.imagen_fondo` se resuelve aparte, en el `render` del bloque `hero`, porque vive en la `configuracion` de cada sección, no en estas 9 fuentes.
- **`puck-config.tsx`:** cada `render` compone `EnvoltorioSeccion` + el bloque real, leyendo el contenido de `puck.metadata.datos` (`DatosEditor`, inyectado una sola vez por `EditorSeccionesPage` vía la prop `metadata` de `<Puck>` — memoizado, es el riesgo de performance más probable de esta fase: una identidad nueva de `metadata` en cada render re-renderiza todo el lienzo). Nuevo `config.root.render` (`PuckRoot`) replica el árbol raíz de `PublicHomePage` (variables CSS del tema, `FondoAnimado`) y limpia la fuga de `.dark` del panel hacia el iframe (`CopyHostStyles` de Puck copia `class="dark"` del `<html>` padre al montar; el tema del panel y el tema del sitio público son conceptos independientes).
- **`AdminLayout`:** la sidebar se colapsa automáticamente al entrar a `/admin/editor` (reusa `esRutaDeAnchoCompleto`), para maximizar el ancho del lienzo.
- **`DialogVistaPrevia`:** vista previa a pantalla casi completa reusando `usePreviewVersion` (mismo endpoint que ya usa `PanelVersiones`, sin duplicarlo), accesible desde la barra de acciones del editor — antes la única previsualización vivía encogida (`max-h-[24rem]`) dentro del diálogo de "Historial de versiones".
- **Corrección de bug preexistente:** `temaComoVariablesCss` declaraba `--color-fondo` pero nunca lo aplicaba como `background-color` en ningún consumidor; ahora se aplica ahí mismo, beneficiando a `PublicHomePage`, `PanelVersiones` y `PuckRoot` a la vez.

Pruebas: Vitest/RTL mockeando `useDatosEditor` completo (no los 9 hooks sueltos) en `EditorSeccionesPage.test.tsx`; test dedicado de `useDatosEditor` para los 3 huecos de media (id presente, id roto, logo PDF); tests de `BloqueProyectos`/`BloqueCertificaciones` verificando que no rendericen `<a>` en modo `'editor'`.

## 3. Índice UC → tareas → subagente → sprint

`code-reviewer` y `release-manager` aplican a **toda** fila antes de cerrar la tarea o hacer commit — no se repiten en cada celda.

| UC | Tareas técnicas clave | Subagente(s) | Sprint |
|---|---|---|---|
| UC-01 | Seed admin, columnas `intentos_fallidos`/`bloqueado_hasta`, módulo auth, `JwtStrategy`/Guard, pantalla de login | db-schema → backend-nestjs → frontend-react | 0 |
| UC-02 | Módulo `perfil`, endpoint upsert, módulo `media` mínimo, pantalla de edición de perfil | backend-nestjs → frontend-react | 1, 2 |
| UC-03 | Módulo `proyectos` + `tecnologias` + `proyecto_imagen`, endpoints CRUD/reordenar, pantallas CRUD | backend-nestjs → frontend-react | 1, 2 |
| UC-04 | Módulo `certificaciones`, endpoints CRUD, pantalla CRUD | backend-nestjs → frontend-react | 1, 2 |
| UC-05 | Módulo `logros`, endpoints CRUD, pantalla CRUD | backend-nestjs → frontend-react | 1, 2 |
| UC-06 | Módulo `redes-sociales` + catálogo `plataformas-red`, endpoints CRUD, pantalla CRUD | backend-nestjs → frontend-react | 1, 2 |
| UC-07 | Módulo `secciones`, validación por `tipo_seccion`, reordenar/visibilidad, integración Puck (Sprint 8: + campos de foto en `hero`, nuevo bloque `skills`) | backend-nestjs → frontend-react | 3, 8 |
| UC-08 | Módulo `tema`, índice único parcial (SQL manual), transacción de activación exclusiva, selector de tema en UI | db-schema → backend-nestjs → frontend-react | 3 |
| UC-09 | Biblioteca de media completa, chequeo de "usado en", galería en UI | backend-nestjs → frontend-react | 3 |
| UC-10 | Endpoint de preview (borrador), vista previa en UI leyendo contenido en vivo | backend-nestjs → frontend-react | 4 |
| UC-11 | Módulo `versiones-sitio`, publicar/revertir, snapshot jsonb | db-schema → backend-nestjs → frontend-react | 4 |
| UC-12 | Módulo `publico`, `GET /sitio` resolviendo contra snapshot publicado, home pública | backend-nestjs → frontend-react | 4 |
| UC-13 | `GET /proyectos/:id` y `GET /certificaciones/:id` contra snapshot, páginas de detalle público | backend-nestjs → frontend-react | 4 |
| UC-14 | `GET /redes` y `GET /cv` públicos, componente de redes + descarga de CV | backend-nestjs → frontend-react | 4 |
| UC-15 | Módulo `fondo-sitio`, índice único parcial (SQL manual), transacción de activación exclusiva, página de configuración en UI | db-schema → backend-nestjs → frontend-react | 8 |
| UC-16 | Módulo `skills`, endpoints CRUD, bloque `skills` en Puck (marquesina), pantalla CRUD | db-schema → backend-nestjs → frontend-react | 8 |

## 4. Reglas consolidadas (checklist de referencia rápida)

**Fuente de verdad y alcance**
- `docs/plan-portafolio.md` es la única fuente de UC, campos y ER. Nada se inventa fuera de ahí; si falta algo, se agrega primero al plan (mermaid o tabla de UC) y luego se codea.

**Esquema de datos**
- Nombres de tabla/columna en español y snake_case.
- Verificar 3FN en cada cambio: nada de listas en una sola columna, ni datos repetidos que deberían ser catálogo.
- Las tres columnas JSONB (`SECCION.configuracion`, `VERSION_SITIO.snapshot`, `FONDO_SITIO.configuracion`) son las únicas excepciones deliberadas.
- Solo un `TEMA.activo = true` y un `FONDO_SITIO.activo = true` por administrador (índice único parcial + transacción en el servicio, mismo patrón para ambos).
- Todo cambio de esquema pasa por el subagente `db-schema`, que genera la migración.

**Backend**
- Un módulo Nest por entidad principal.
- DTOs con `class-validator`, cero campos fuera del DTO.
- Acceso a datos exclusivamente vía Prisma.
- Rutas admin con `JwtAuthGuard`; rutas de visitante (UC-12 a UC-14) siempre públicas.
- Subida de archivos solo por `@aws-sdk/client-s3` + multer-s3 (+ sharp para miniaturas), nunca a disco local. **Excepción temporal Sprint 1:** sin credenciales de AWS todavía, `media` usa un stub local (`LocalMediaStorageService`) detrás de la interfaz `MediaStorageService` — ver Sección 2, Sprint 1. Reemplazar por S3 real antes de Sprint 3 o de producción.

**Frontend**
- Tailwind CSS + shadcn/ui; el tema se lee dinámicamente del tema activo, nunca hardcodeado.
- El editor de secciones se construye sobre Puck, ligado a un `tipo_seccion` ya definido en el plan.
- TanStack Query para datos de servidor; Zustand solo para el estado de edición en curso.
- Formularios con React Hook Form + Zod.
- Toda pantalla se valida contra el criterio de aceptación de su UC antes de darse por terminada.

**Seguridad**
- Ninguna credencial ni clave (AWS, JWT, Postgres) en el código: solo variables de entorno, `.env` nunca commiteado.
- Contraseña con bcrypt/argon2; bloqueo tras 3 intentos fallidos.

**Control de versiones**
- `main` protegida, sin push directo; una rama por historia/UC (`feature/uc-XX-nombre`).
- Niveles de criticidad: bajo (commits libres en la rama de la historia) / moderado (PR hacia `main` al cerrar un UC) / crítico — esquema, autenticación, cambios multi-módulo — (nunca merge directo: exige `code-reviewer` + aprobación explícita del usuario).
- Husky + lint-staged local, repetido en GitHub Actions al abrir PR; si algo falla no se pushea.
- Conventional Commits, referenciando UC-XX cuando aplique.
- Tag de versión (`vX.Y.0`) al cerrar cada sprint.

**Flujo con subagentes**
- `db-schema` para el esquema; `backend-nestjs` para la API; `frontend-react` para pantallas y el editor visual.
- `code-reviewer` siempre antes de cerrar una tarea de código (solo lectura, revisa diff, secretos y guards faltantes).
- `release-manager` siempre antes de cualquier commit/push y al cerrar sprint (clasifica criticidad, corre pruebas/build, exige Conventional Commits, arma resumen de cierre).
- `isolation: worktree` en el frontmatter si dos subagentes de código corren en paralelo.

**Gobernanza de sprint**
- Ningún sprint avanza al siguiente sin el visto bueno explícito del usuario sobre el resumen de cierre de `release-manager`.

## 5. Tareas de arranque pendientes (Sprint 0 / siguientes pasos)

En orden:

1. Confirmar el gestor de paquetes/monorepo: **npm workspaces** (ya decidido en la Sección 1).
2. `git init`, `.gitignore`, commit inicial con la estructura vacía y este documento.
3. Crear el repositorio en GitHub (privado), push inicial, proteger `main` (exigir PR + checks de Actions).
4. Instalar Husky + lint-staged + commitlint en la raíz del monorepo.
5. Scaffold `apps/api` (Nest CLI) y `apps/web` (Vite `react-ts`).
6. `docker-compose.yml` local con `postgres:16` (y opcionalmente `adminer` para inspección visual).
7. `.env.example` con todas las variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`, `CLOUDFRONT_DOMAIN` (opcional), `ADMIN_EMAIL`, `ADMIN_PASSWORD_SEED`.
8. `.github/workflows/ci.yml` base: install, lint, test, build para `apps/api` y `apps/web`.
9. Definir el catálogo inicial de `TECNOLOGIA` (propuesta ajustable): React, NestJS, TypeScript, PostgreSQL, Prisma, Node.js, Tailwind CSS, Docker — más las tecnologías reales de los proyectos que se carguen.
10. Definir el catálogo inicial de `PLATAFORMA_RED` (propuesta ajustable): LinkedIn, GitHub, Twitter/X, Correo, Sitio personal — cada uno con su `icono_defecto`.
11. Definir los tipos de bloque de `SECCION.configuracion` con parámetros mínimos (propuesta ajustable):
    - `hero`: título, subtítulo, imagen de fondo (`media_id`), texto de botón, enlace de botón. Sprint 8: + `mostrar_foto_perfil: boolean`, `posicion_foto: 'ninguna'|'centrada'|'esquina_superior'|'esquina_inferior'`, `estilo_foto: 'con_marco'|'sin_fondo'` (reutiliza `PERFIL.imagen_perfil_id`, no un `media_id` propio).
    - `sobre-mi`: usa `PERFIL` directamente; único parámetro propio: `mostrar_foto: boolean`.
    - `proyectos`: `cantidad_a_mostrar`, `solo_destacados: boolean`.
    - `certificaciones`: `orden: 'fecha' | 'manual'`.
    - `logros`: `categoria_filtro` (opcional).
    - `contacto`: `mostrar_formulario: boolean` (si no hay formulario en v1, solo enlaces de redes + CV).
    - `skills` (Sprint 8): `direccion: 'izquierda'|'derecha'`, `velocidad: 'lenta'|'media'|'rapida'` — controla solo la presentación del carrusel; los skills mostrados vienen completos del catálogo `SKILL` (igual que `logros`/`proyectos` vienen completos en el snapshot y el bloque los filtra/ordena).
12. Definir la estructura de carpetas del bucket S3: `perfil/`, `proyectos/`, `certificaciones/`, `logros/`, `backups/`; convención de nombre de archivo `{uuid}.{extension}` para evitar colisiones y filtrado accidental por nombre original.
13. Fijar la estrategia de almacenamiento del JWT en frontend (cookie httpOnly vs localStorage, ver Sprint 0) antes de escribir el guard/cliente HTTP.
14. Fijar la semántica exacta de "revertir versión" (nueva fila copiando snapshot antiguo, ver Sprint 4) antes de implementar `VersionSitioService`.
15. Recién entonces: `schema.prisma` inicial → primera migración → seed de admin → módulo auth, siguiendo el orden detallado en Sprint 0.
