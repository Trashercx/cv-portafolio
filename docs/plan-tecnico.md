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

### Fase 3.2 — Carrusel, contraste, duplicados y fechas

Incluye una migración (`skill_admin_nombre_unico`); el resto es backend + frontend sin cambios de esquema adicionales.

- **Carrusel de skills** (`BloqueSkills.tsx` + `index.css`): el track único duplicado una sola vez (`translateX(-50%)` sobre un `flex gap-8`) tenía dos bugs — hueco visible con pocas skills (una copia no llegaba a cubrir 1280px) y un micro-salto en cada vuelta con cualquier cantidad de skills (el `gap` desalinea el punto medio real del track respecto al `-50%` de la animación). Se reemplaza por dos pistas hermanas idénticas (cada una repetida internamente lo necesario para cubrir el viewport de escritorio, sin `gap` — espaciado con `px-4` por ítem), animadas juntas con la misma técnica; la duración se escala por la cantidad de repeticiones internas para no cambiar la velocidad percibida. La animación pasa de `style` inline a una clase CSS (`prefers-reduced-motion` y pausa en `:hover` no se pueden expresar con la prop `style`).
- **Contraste de íconos** (`iconos-skill.tsx`, `iconos-plataforma.tsx`): ambos fijaban `fill={'#'+hex}` en el `<svg>`, que siempre gana sobre cualquier clase `dark:` — se cambia a `fill="currentColor"`. En `iconos-plataforma.tsx` esto solo revela una clase adaptativa (`text-foreground`) que ya existía pero nunca surtía efecto (arregla GitHub/X invisibles en modo oscuro). `iconos-skill.tsx` no tenía ningún contenedor ni `Record` de color — se le agrega uno (`COLORES_ICONO_SKILL`, badge circular tintado por marca, mismo patrón que `iconos-plataforma.tsx`) y una escala cerrada `tamano: 'sm'|'md'|'lg'` que reemplaza el `className` libre (arreglaba también el monograma con `text-[10px]` fijo que se veía chico a `size-10`).
- **Skills duplicados**: índice único funcional case-insensitive `skill_admin_nombre_unico ON skill (usuario_admin_id, lower(nombre))`, migración editada a mano (mismo patrón que `tema_admin_activo_unico`/`fondo_sitio_admin_activo_unico`) — **no se pudo aplicar contra una base de desarrollo real en este entorno** (sin Docker/Postgres disponible); antes de aplicarla contra una base con datos, correr la consulta de detección de duplicados que documenta el propio archivo de migración. `SkillsService.crear`/`actualizar` rechazan duplicados (case-insensitive, `trim`) con `ConflictException` legible, y capturan el P2002 del índice como red de seguridad ante condiciones de carrera. En el frontend, `skill-schema.ts` valida el duplicado en vivo contra `useSkills()` (excluyendo la fila editada) y `SkillFormDialog` autocompleta el nombre sugerido al elegir un ícono preestablecido (si el campo todavía está vacío).
- **Fechas**: no había validación temporal real en ninguna capa (`@IsDateString()`/regex solo validaban forma, no calendario real ni relaciones entre fechas). Nuevos validadores reutilizables en `apps/api/src/common/validators/` — `@EsFechaIso({ noFutura? })` (fecha de calendario real, rechaza desbordes tipo `2026-02-30`) y `@EsPosteriorA(propiedad, { oIgual? })` (validación cruzada entre dos campos del mismo DTO; solo actúa cuando ambos vienen en el payload — un `PATCH` parcial con un solo campo no cruza contra el valor ya persistido, limitación conocida y aceptada de v1). Aplicados a `fecha_emision`/`fecha_expiracion` de certificaciones (expiración posterior, no igual, a la emisión), `fecha` de logros, y `fecha_inicio`/`fecha_fin` de proyectos (fin posterior o igual al inicio). En el frontend, los 3 esquemas de Zod pasan de un regex de forma a `z.iso.date()` + las mismas reglas de no-futura y cruce, con `max`/`min` en los `<Input type="date">` como ayuda adicional del navegador.

Pruebas: `skills.service.spec.ts` (duplicado por casing, actualizar al propio nombre, P2002 de carrera); specs dedicados de `@EsFechaIso`/`@EsPosteriorA` más tests de integración sobre los DTOs reales de certificaciones/proyectos (incluido el caso de `PATCH` parcial); Vitest de `skill-schema`/`SkillFormDialog` (duplicado, autocompletar nombre) y de los 3 `*FormDialog` (regla cruzada de fechas en el campo correcto).

### Fase 3.3 — Layouts multi-columna con Slots API (UC-17)

Sin migración: `Seccion.tipo_seccion` ya es un `string` libre en la base, así que agregar `'columnas'` es solo un cambio de aplicación. Fase de mayor riesgo del rediseño del editor porque cambia el modelo de persistencia — decisión documentada primero en `docs/plan-portafolio.md` §3 (UC-17) y §4 antes de tocar código.

- **Contenedor `columnas` = una `Seccion` más**, sin entidad ni columna nueva: su `configuracion` guarda `distribucion` (`1-1|1-2|2-1|1-1-1`), `alineacion_vertical` (`inicio|centro|fin|estirado`), `espaciado` (`compacto|normal|amplio`) y 3 arrays (`columna_1`/`columna_2`/`columna_3`) de bloques hijos con la misma forma que tendrían como fila propia (`tipo_seccion`, `titulo_visible`, `visible`, `configuracion`), sin `id` — nunca tienen identidad propia. Solo un nivel de anidamiento: un hijo no puede ser `hero` (portada a sangre completa) ni `columnas` (evita anidamiento sin límite), reforzado en dos capas — el `allow` del slot de Puck (UX) y el validador `@EsListaDeBloques` del backend (integridad real).
- **Backend**: `ColumnasConfiguracionDto` + nuevo `@EsListaDeBloques()` en `apps/api/src/common/validators/` (valida cada hijo contra el mismo DTO por tipo que usaría como fila, vía `obtenerErroresConfiguracion` — extraída de `SeccionesService.validarConfiguracion` para reutilizarla sin cambiar su comportamiento observable). `resolverImagenesFondoHero` (`versiones-sitio.service.ts`) se hizo recursivo: entra en `columna_1/2/3` para resolver `hero.imagen_fondo` también si estuviera anidado — aunque hoy nunca puede estarlo, así la prohibición es una decisión del validador, no una dependencia oculta del resolver; sigue siendo una sola consulta batch a `Media` incluso con secciones anidadas.
- **Frontend**: nuevo componente `columnas` en `puck-config.tsx` con 3 campos `type:'slot'` (`allow` restringido a los 6 tipos anidables) y un `render` que solo pinta las columnas que corresponden a `distribucion`, usando el mismo mapeo de clases Tailwind literales que `BloqueColumnas.tsx` (sitio público/vista previa) — ambos comparten `DespachoBloqueSeccion`, el switch por `tipo_seccion` extraído de `RenderizadorSecciones`. `sanearSlots` (`EditorSeccionesPage.tsx`) convierte los hijos de Puck (`ComponentData[]`) a la forma persistida al guardar, descartando siempre `_seccionId` — consecuencia deliberada: anidar una sección existente borra su fila (el diff de nivel superior ya la trata como eliminada, sin tocar esa lógica) y sacarla crea una fila nueva. La carga inicial hace el camino inverso, generando un `id` de Puck nuevo por hijo en cada sesión de edición (nunca reutiliza uno persistido, porque nunca tuvieron uno).

Pruebas: `columnas-configuracion.dto.spec.ts`/`es-lista-de-bloques.decorator.spec.ts` (hero y columnas anidados rechazados, hijo con configuración inválida rechazado con mensaje diagnosticable, layout válido con tipos mixtos aceptado); `versiones-sitio.service.spec.ts` (recolección recursiva de ids en una sola consulta batch); `EditorSeccionesPage.columnas.test.ts` (`sanearSlots` descarta `_seccionId`/`id` siempre; reconstrucción genera `id` nuevo por hijo); `BloqueColumnas.test.tsx` (solo renderiza las columnas de la `distribucion` correspondiente).

### Fase 3.4 — Personalización por bloque, fondos y tipografía

Sin migraciones: todo son campos nuevos en columnas `JSONB`/`string` ya existentes. Se implementó con 3 tareas en paralelo (backend + 2 tramos de frontend, cada uno en worktree aislado) sobre un contrato de nombres/valores fijado de antemano.

- **`BloqueConfiguracionBaseDto`** (`espaciado_vertical`, `ancho_contenido`, `alineacion_texto`, `fondo_bloque`, `separador_inferior`), extendido por los 8 DTOs de configuración de sección — todos `@IsOptional()` con default de propiedad, mismo criterio ya corregido una vez en Fase 2 (commit `0cd07c7`). En el frontend, `EnvoltorioSeccion` centraliza espaciado/ancho/fondo/separador para los 8 tipos (cada `Bloque*.tsx` dejó de tener su propio `mx-auto max-w-*` hardcodeado); `alineacion_texto` tiene alcance acotado a propósito, solo controla el `<h2>`/`<h1>` de cada bloque, no cualquier elemento interno. Nuevo `lib/escalas-bloque.ts`: único lugar token → clase Tailwind literal.
- **Excepción documentada**: antes de esta fase cada bloque tenía su propio `mx-auto max-w-*` (o ninguno) hardcodeado, distinto entre sí, y `hero`/`contacto`/`skills` tenían el título centrado — el default único y compartido (`ancho_contenido: 'normal'` → `max-w-5xl`, `alineacion_texto: 'izquierda'`) solo coincidía con el aspecto previo de `proyectos`/`certificaciones`/`skills` (alineación) y de `proyectos`/`certificaciones` (ancho). Los otros 5 tipos conservan su propio fallback en vez de caer en el genérico, tanto en el lienzo de Puck (`puck-config.tsx`) como en el despacho público (`RenderizadorSecciones`/`DespachoBloqueSeccion`), para que el sitio publicado y el lienzo no diverjan: `hero`/`columnas` → `ancho_contenido: 'completo'` (no tenían `max-w`); `sobre-mi`/`logros`/`contacto` → `ancho_contenido: 'estrecho'` (aproximación al `max-w-3xl`/`max-w-2xl` que tenían — no existe un token exacto de 3xl en la escala de 4 valores, se documenta como aproximación deliberada, no como preservación exacta); `hero`/`contacto`/`skills` → `alineacion_texto: 'centro'`. Hallazgo de `code-reviewer`: la primera versión de esta fase solo cubría la alineación de los 3 bloques y el ancho de `hero`, dejando `sobre-mi`/`logros`/`contacto`/`columnas` con el ancho genérico sin corregir — ya está resuelto y cubierto por `RenderizadorSecciones.test.tsx`.
- **Campos propios por tipo**: hero (`altura`, `overlay_fondo`, `tamano_titulo`), sobre-mi (`posicion_foto`, `forma_foto`), proyectos/certificaciones (`columnas`, `estilo_tarjeta`, `mostrar_descripcion`/`mostrar_fecha`), logros (`estilo_lista`: tarjetas o línea de tiempo), contacto (`estilo_redes`: íconos o botones), skills (`tamano_icono` con default `'lg'` — el carrusel ya usaba ese tamaño desde Fase 3.2, `mostrar_nombres`, `pausar_al_pasar`, ahora condicional vía una clase modificadora en vez de la regla `:hover` incondicional que tenía el CSS).
- **3 fondos animados nuevos** (`ondas`, `malla_difusa`, `lineas_diagonales`) en `FondoAnimado.tsx`, mismo patrón CSS puro que los 5 existentes (variables del tema, sin colores hardcodeados, `@keyframes` + entrada en `DURACIONES`); UC-15 actualizado primero en `docs/plan-portafolio.md`.
- **Tipografía**: `Tema.fuente_principal` pasa de texto libre roto (`Inter`/`Poppins`/`Merriweather` nunca resolvían, no hay webfont instalada — solo Georgia, fuente del sistema, se veía distinta de verdad) a un `Select` cerrado de 4 stacks que sí resuelven (`manrope` + sans/serif/mono del sistema). El `@IsIn` del backend acepta esos 4 tokens **más** los 4 valores legados (`Inter`/`Poppins`/`Merriweather`/`Georgia`), para que un `PATCH` sobre un tema ya guardado no dé 400; `tema-css.ts` traduce los tokens nuevos con passthrough para los legados (sin migrarlos, sin romperlos). Las 6 plantillas de tema se remapearon a los tokens nuevos.

Pruebas: `personalizacion-bloque.dto.spec.ts` (defaults rellenados por `plainToInstance` para los 8 tipos, valores fuera de catálogo rechazados); `create-fondo-sitio.dto.spec.ts`/`create-tema.dto.spec.ts` (los tipos/tokens nuevos aceptados, los legados de tema siguen aceptándose); `EnvoltorioSeccion.test.tsx` (clases correctas por combinación de props, default GENÉRICO cuando no vienen); `RenderizadorSecciones.test.tsx` (el fallback de `ancho_contenido` propio de cada uno de los 5 tipos que no eran `max-w-5xl`, no el genérico); specs de `BloqueContacto`/`BloqueLogros`/`BloqueSkills`; `tema-css.test.ts` (token nuevo resuelve al stack correcto, valor legado pasa sin traducir).

### Fase 3.5 — Navegación del panel y paleta de comandos

Sin backend: solo frontend. Única dependencia nueva de todo el rediseño (`cmdk@^1.1.1`, instalada exclusivamente en el workspace `apps/web`).

- **`AppSidebar.tsx`**: los mismos 10 ítems de siempre (rutas y etiquetas sin cambios), reagrupados en 3 `SidebarGroup` — "Contenido" (Perfil, Proyectos, Certificaciones, Logros, Skills, Redes sociales), "Diseño" (Editor visual, Tema, Fondo del sitio), "Recursos" (Biblioteca de medios) — más un link "Ver sitio público" (`target="_blank"`) en el `SidebarFooter`, que antes no existía. `esRutaActiva` se corrigió de un `startsWith(item.to)` crudo (marcaría activo `/admin/tema` ante una futura ruta `/admin/tema-avanzado`) a comparar por límite de segmento (`pathname === to || pathname.startsWith(to + '/')`).
- **`components/ui/command.tsx`**: wrapper estilo shadcn sobre `cmdk`, con `CommandDialog` montado dentro del `Dialog`/`DialogContent` ya existentes del proyecto — no introduce un segundo sistema de overlay.
- **Comandos contextuales sin store global**, por decisión explícita del plan: `features/paleta-comandos/contexto-paleta.tsx` expone `ProveedorPaletaComandos` (Context + `useState`) y el hook `useComandosContextuales(comandos)`, que registra al montar y desregistra al desmontar — así un comando como "Nuevo proyecto" solo aparece en la paleta mientras esa página está montada. Se registran por `id` en un `Record`, no en un array, para que registrar/desregistrar sea idempotente.
- **`PaletaComandos.tsx`**: listener global de `Ctrl+K`/`⌘K` en `document`, 3 grupos — "Navegar" (las 10 rutas admin + "Ver sitio público"), "Acciones" (cambiar tema, cerrar sesión) y "Página actual" (comandos contextuales, el grupo no se renderiza si está vacío). Sin conflicto con los atajos de teclado internos de Puck: el lienzo se monta con `iframe={{ enabled: true }}` (Fase 3.1), así que sus eventos de teclado ocurren en el `document` del iframe y no burbujean al `document` del panel. Montado en `AdminLayout.tsx`, dentro de `ThemeProvider`.
- Wiring de ejemplo en `ProyectosListPage.tsx` y `SkillsListPage.tsx` ("Nuevo proyecto"/"Nuevo skill", reusando el mismo handler que ya abría el diálogo de creación).
- Explícitamente fuera de alcance (documentado en el plan, no implementado): búsqueda de contenido por nombre dentro de la paleta, y consolidar Certificaciones+Logros o Tema+Fondo en `Tabs` — Tema y Fondo son entidades independientes por decisión de Fase 2.

Pruebas: `AppSidebar.test.tsx` (los 10 ítems presentes y agrupados, atributos del link "Ver sitio público", ruta exacta activa, sub-ruta real activa, caso de colisión de prefijo `/admin/tema-avanzado` NO activa "Tema"); `PaletaComandos.test.tsx` (abre/cierra con `Ctrl+K`, navega al hacer click, abre el sitio público en pestaña nueva, cierra sesión desde la paleta, un comando contextual aparece mientras su página está montada y desaparece al desmontarla).

### Fase 4.1 — Correcciones críticas de UX en el editor y los modales

Sin backend, sin dependencias nuevas. Primera de una ronda de 6 fases post-rediseño del editor, motivada por uso real del panel.

- **Guard de "¿descartar cambios?"** en los 7 `*FormDialog.tsx` (proyectos, certificaciones, logros, skills, redes sociales, fondo del sitio, tema): nuevo hook `hooks/useConfirmarDescarte.ts` — no cierra nada por sí mismo, intercepta `onOpenChange(false)` cuando `form.formState.isDirty` es `true` y muestra un `AlertDialog` (ya existente, `components/ui/alert-dialog.tsx`) antes de descartar; abrir el diálogo nunca pide confirmación. Hallazgo de `code-reviewer` en la primera pasada: `ProyectoFormDialog.tsx` tiene un flujo de dos pasos ("Crear y continuar" persiste el proyecto sin cerrar el modal) y el primer `onSuccess` no reseteaba la baseline del form — `isDirty` quedaba en `true` con datos ya guardados, disparando un falso "Descartar cambios" al cerrar antes del segundo guardado. Corregido con `form.reset(values)` en ese `onSuccess`, cubierto por un test de regresión que reproduce exactamente ese cierre intermedio.
- **"Vista previa" del editor se cerraba sola**: causa raíz — `DialogVistaPrevia.tsx` manejaba su propio `useState`, montado dentro de `overrides.headerActions` de Puck (`EditorSeccionesPage.tsx`), un objeto/función literal nuevo en cada render sin memoizar; al abrir el diálogo se invalida `VERSIONES_QUERY_KEY` (misma query que el badge Borrador/Publicado), el refetch re-renderiza la página, cambia la identidad de `overrides` y Puck remonta el subárbol de `headerActions` — perdiendo el estado local. Arreglado levantando `open`/`previewVersion` a `EditorSeccionesPage` (que nunca se remonta), convirtiendo `DialogVistaPrevia` en componente controlado.
- **Botón de vista previa duplicado** eliminado de `PanelVersiones.tsx` (dentro de "Historial de versiones"): el único que queda es el de la barra del editor.
- **PDF bloqueado por Chrome**: `MediaPreview.tsx` tenía `<iframe sandbox="">` (el más restrictivo posible, impide el visor PDF nativo de Chrome); cambiado a `sandbox="allow-same-origin"` — verificado que las 4 URLs que recibe ese componente siempre son del bucket S3/CloudFront propio o un `URL.createObjectURL` local, nunca contenido de terceros.
- **`ErrorBoundary`** (`components/ErrorBoundary.tsx`, nuevo — no existía ninguno en toda la app): una instancia amplia envolviendo `<Routes>` en `App.tsx`, otra acotada alrededor de `<Puck>` en `EditorSeccionesPage.tsx` cuyo fallback fuerza un remount vía `editorKey` en vez de recargar toda la página. El crash reportado (pantalla en blanco al asignar imagen de fondo al hero) no se pudo reproducir en este entorno (sin Docker/Postgres/S3 disponibles); se agregó un test dirigido sobre el campo de imagen de fondo del hero sin encontrar el bug — el `ErrorBoundary` queda como red de seguridad genuina para este y cualquier otro error de render no anticipado.
- **Señal de "cambios sin publicar"** reforzada con un banner persistente y no intrusivo en `EditorSeccionesPage.tsx` (condicionado a `hayCambiosSinPublicar`, ya existente), complementando el badge/Popover que ya había — para dejar en claro que "no veo el cambio en `/`" significa "todavía no publicaste", no un bug de sincronización (investigado a fondo: el mecanismo CSS entre el lienzo y `/` es idéntico, la única diferencia real es borrador vs. último snapshot publicado).

Pruebas: `useConfirmarDescarte.test.ts`; regresión de descarte en los 7 `*FormDialog.test.tsx` (Esc/click afuera con cambios sin guardar pide confirmar, Cancelar mantiene el modal, Descartar cierra y resetea; caso especial en `ProyectoFormDialog.test.tsx` cubriendo el cierre entre el primer y el segundo guardado); `EditorSeccionesPage.test.tsx` (vista previa sobrevive a un re-render forzado de la página, ya no aparece un botón de previsualizar dentro de "Historial de versiones", banner de cambios sin publicar aparece/desaparece con `hayCambiosSinPublicar`); `ErrorBoundary.test.tsx`.

### Fase 4.2 — Formularios: selector de fecha, estado predefinido, scrollbar consistente

Agrega `react-day-picker` (`^10.0.1`, más nueva que la v9.x anticipada al planificar — verificada contra los tipos reales del paquete instalado antes de escribir `calendar.tsx`, sin API residual de versiones anteriores). `ScrollArea` no necesitó dependencia nueva: `radix-ui` (ya instalado) la reexporta.

- **Calendario adicional, no reemplazo**: nuevo `components/ui/calendar.tsx` (shadcn sobre `react-day-picker`) y `components/shared/CampoFechaConCalendario.tsx` (botón de ícono + `Popover` + `Calendar`, escribe al mismo campo de RHF que el `<Input type="date">` existente). Aplicado en `fecha_inicio`/`fecha_fin` de Proyectos, `fecha_emision`/`fecha_expiracion` de Certificaciones, `fecha` de Logros — los límites `min`/`max` que ya tenía cada input nativo se replican en el `Calendar` vía su prop `disabled`, para que no se pueda elegir en el calendario algo que el schema Zod igual rechazaría.
- **"Estado" de Proyectos con valores cerrados**: `proyecto-schema.ts` pasa de `z.string()` a `z.enum(['en_progreso','finalizado','pausado'])`, con un `<Select>` reemplazando el `Input` libre. Backend: `create-proyecto.dto.ts` agrega `@IsIn([...])` sobre el `estado: string` ya existente — Prisma se queda como `String`, sin migración, mismo criterio ya documentado para `VersionSitio.estado`; `UpdateProyectoDto` hereda el `@IsIn` automáticamente vía `PartialType`. `ProyectoFormDialog.tsx` agrega `normalizarEstadoProyecto` como fallback defensivo ante un valor legado/fuera de rango, mismo patrón ya aceptado para la foto de hero legada (commit `dadf1ef`). Documentado en `docs/plan-portafolio.md` (fila UC-03, los 3 valores).
- **`ScrollArea` consistente**: nuevo `components/ui/scroll-area.tsx` sobre `radix-ui`. Aplicado en `CommandList` (`command.tsx`, envolviendo `CommandPrimitive.List` por fuera para no interferir con el auto-scroll-al-seleccionado de `cmdk`, que usa `scrollIntoView` nativo contra el ancestro scrolleable más cercano) y en los 4 diálogos más largos (Proyecto, Certificación, Logro, Tema) — separando el `DialogHeader` del área scrolleable, así el título queda fijo. Fuera de alcance a propósito: el lienzo de Puck (`@measured/puck`), por el costo de pelear contra su CSS interno.

Pruebas: `CampoFechaConCalendario.test.tsx` (selección de día, `min`/`max` deshabilitan los días correspondientes contra el `Calendar` real); `create-proyecto.dto.spec.ts` (los 3 valores válidos aceptados, un valor fuera de catálogo rechazado en Create y en Update); `ProyectoFormDialog.test.tsx` actualizado al nuevo `Select` de estado.

### Fase 4.3 — Detalle de Proyectos, Certificaciones y Logros: modal en vez de navegación

Sin backend, sin migraciones. UC-13 en `docs/plan-portafolio.md` ampliado para cubrir Logros (antes solo mencionaba proyecto/certificación).

- **Sin fetch adicional al abrir el modal**: `SnapshotSitio.proyectos`/`certificaciones`/`logros` (cargado una sola vez por `PublicHomePage` vía `useSitio()`) ya trae los objetos completos con sus relaciones (`tecnologias`/`imagenes`, `logo`, etc. — mismo tipo que devuelven `GET /proyectos/:id`/`GET /certificaciones/:id`), así que el modal recibe el objeto directo por props sin volver a pedirlo por red. El link directo (`/proyecto/:id`, `/certificacion/:id`, `/logro/:id`) sigue funcionando standalone con su propio fetch: `useProyectoPublico`/`useCertificacionPublica` (ya existían) para los dos primeros; para Logros, que nunca tuvo endpoint por id, la nueva `LogroDetallePage.tsx` usa `useSitio()` completo y busca el logro por id en el snapshot — sin agregar `GET /logros/:id` al backend.
- **Contenido extraído a `components/publico/detalle/`**: `DetalleProyectoContenido.tsx`/`DetalleCertificacionContenido.tsx` (el mismo JSX que antes vivía embebido en las páginas standalone, ahora puramente presentacional) y `DetalleLogroContenido.tsx` (nuevo, Logros nunca tuvo vista de detalle). Las páginas standalone (`ProyectoDetallePage.tsx`/`CertificacionDetallePage.tsx`/`LogroDetallePage.tsx` nueva) conservan su propio loading/error/link-volver y delegan el contenido a estos componentes.
- **Apertura del modal**: nuevo `components/publico/contexto-detalle.tsx` (`ProveedorDetallePublico`/`useAbrirDetalle`, default no-op — mismo criterio que `ContextoModoRenderizado`, que default a `'publico'` en vez de exigir un Provider) y `DialogDetalle.tsx` (modal casi-fullscreen, mismo patrón que `DialogVistaPrevia`). `BloqueProyectos.tsx`/`BloqueCertificaciones.tsx`/`BloqueLogros.tsx` reemplazan el `EnlaceBloque to="/proyecto/..."` de la tarjeta por el nuevo `TarjetaClicable` (`contexto-renderizado.tsx`) + `useAbrirDetalle()` — en modo `'editor'` (lienzo de Puck) la tarjeta sigue inerte exactamente como antes, el cambio de comportamiento es solo en modo `'publico'`.
- **Extensión a `DialogVistaPrevia.tsx`**: se envolvió también con `ProveedorDetallePublico` — corrige de paso un bug preexistente (`RenderizadorSecciones` ahí corre en modo `'publico'` por defecto, así que un click en una tarjeta dentro de la vista previa del panel admin literalmente navegaba fuera del panel hacia `/proyecto/:id`; ahora abre el mismo modal sin sacar al admin del editor).
- **Hallazgo de `code-reviewer`, corregido**: la primera versión anidaba el link externo "Ver referencia" de Logros DENTRO del `<button>` de la tarjeta (con `stopPropagation` para evitar que también abriera el modal) — un `<a>` anidado en contenido interactivo viola el modelo de contenido HTML5 y arriesga que lectores de pantalla podén el subárbol de accesibilidad, dejando el link inalcanzable por el rotor de enlaces aunque siguiera respondiendo a Tab. Corregido: `TarjetaLogro` (`BloqueLogros.tsx`) renderiza la tarjeta clicable y el link "Ver referencia" como **hermanos** dentro del mismo `<li>`, nunca uno dentro del otro — ya no hace falta `stopPropagation`.

Pruebas: `BloqueProyectos.test.tsx`/`BloqueCertificaciones.test.tsx` (nuevos, click en tarjeta abre el detalle correcto); `BloqueLogros.test.tsx` (click abre el modal, "Ver referencia" no lo abre y no es descendiente del botón — `tarjeta.contains(enlace) === false`); `Detalle*Contenido.test.tsx` (los 3); `LogroDetallePage.test.tsx` (nuevo); `bloques-modo-editor.test.tsx` actualizado (modo público ahora usa `<button>`, modo editor sigue inerte).

### Fase 4.4 — Aviso de expiración de sesión (con extensión) y pie de página

Sin migraciones. Backend + frontend implementados en paralelo (dos worktrees, un contrato de API fijado de antemano), fusionados sin conflictos.

- **Backend**: `POST /auth/login` ahora también devuelve `expiresAt` (ISO) en el body, calculado con el nuevo helper `calcularExpiracion()` (`parse-duration.ts`) a partir de `JWT_EXPIRES_IN` — misma fuente que ya usaba el `maxAge` de la cookie, así quedan sincronizados. Nuevo `POST /auth/refresh`, único endpoint de `AuthController` con `@UseGuards(JwtAuthGuard)` explícito (la clase no tiene guard global: `login` es pública por diseño). Exige que la cookie `access_token` actual sea válida — sin período de gracia: un token ya vencido nunca llega al handler, lo rechaza el guard. `AuthService.refrescar(userId)` busca el admin por id y firma un token nuevo con los mismos claims (`sub`/`email`) y la misma duración que `login`; `AuthController` extrae un `setCookieAcceso()` privado para no duplicar las opciones de la cookie entre ambos endpoints.
- **Frontend — aviso**: `AdminSession` (store) extendido con `expiresAt: string`. `useSesionExpirando` (`setInterval` de 1s contra `admin.expiresAt`) expone `mostrarAviso: true` a los 30s o menos del vencimiento — puramente por tiempo, sin tracking de actividad del usuario (un primer intento incluía listeners de `mousemove`/`keydown`/`click` "por si en el futuro hace falta no molestar si el usuario está inactivo"; hallazgo de `code-reviewer`: código especulativo sin ninguna decisión tomada de implementar esa extensión, tres listeners globales por cero beneficio funcional — eliminado). `AvisoSesionExpirando` (`AlertDialog`, no se cierra con click afuera) ofrece "Seguir conectado" (`useRefrescarSesion`, `POST /auth/refresh`) o "Cerrar sesión"; si el refresh falla, un toast avisa en vez de dejar el diálogo colgado indefinidamente (también hallazgo de `code-reviewer`). Montado en `AdminLayout.tsx`, junto a `PaletaComandos`.
- **Frontend — pie de página**: nuevo `components/publico/Footer.tsx` (nombre del perfil, año actual, `RedesSociales` reusado tal cual) montado en `PublicHomePage.tsx` como hermano de `RenderizadorSecciones`. Sin entidad ni columna nueva.

Pruebas: `auth.service.spec.ts`/`auth.controller.spec.ts` (`refrescar` caso feliz y admin no encontrado; `/auth/refresh` sin cookie da 401 sin llamar al service, con token expirado da 401 sin gracia, con token válido renueva la cookie y devuelve el body esperado — este último con `JwtStrategy` real, no mockeada); `auth.e2e-spec.ts` extendido; `useSesionExpirando.test.ts`/`AvisoSesionExpirando.test.tsx` (aparece a los 30s, "Seguir conectado" dispara el refresh y el aviso desaparece solo, "Cerrar sesión" limpia el store); `Footer.test.tsx`.

### Fase 4.5 — Nuevo bloque: Galería de fotos (UC-18)

**UC nuevo, docs-first**: UC-18 en `docs/plan-portafolio.md` antes de tocar código, con la justificación explícita de por qué reusa `SECCION.configuracion` JSONB en vez del patrón `PROYECTO_IMAGEN` (relación N:N) — mismo criterio ya aplicado a `columnas` en UC-17. Sin migración de tabla. Backend + frontend implementados en paralelo (dos worktrees, contrato de API fijado de antemano).

- **Contrato**: `GaleriaConfiguracion = BloqueConfiguracionBase & { fotos: GaleriaFoto[], disposicion?: 'carousel'|'grid', columnas_grid?: 2|3|4 }`, con `GaleriaFoto = { media_id, titulo? }` — `fotos` con default `[]`, todos los campos opcionales salvo `media_id` DENTRO de cada foto individual (una foto sin media no tiene sentido, mismo criterio que `hero.imagen_fondo_media_id`).
- **Backend**: `GaleriaFotoDto`/`GaleriaConfiguracionDto` (`apps/api/src/modules/secciones/dto/configuracion/`), noveno tipo en `TIPOS_SECCION`/`CONFIGURACION_DTO_POR_TIPO`. Queda automáticamente permitida como hija de `columnas` sin tocar `es-lista-de-bloques.decorator.ts`, porque ese validador calcula los tipos anidables excluyendo dinámicamente solo `hero`/`columnas` de `TIPOS_SECCION`. Los 3 métodos recursivos de resolución de media en `versiones-sitio.service.ts` (antes exclusivos de `hero.imagen_fondo_media_id`) se renombraron (`resolverImagenesFondoHero`→`resolverMediaDeSecciones`, y sus 2 helpers) y se extendieron con una rama para `galeria` (`fotos[].media_id`→`fotos[].media`) — sigue siendo una sola consulta batch a `Media` para todo el árbol, incluida una `galeria` anidada dentro de `columnas`, que queda cubierta automáticamente por la recursión existente sin código especial.
- **Frontend**: `BloqueGaleria.tsx` — `disposicion='carousel'` (default) con scroll-snap horizontal nativo + flechas + dots (respeta `prefers-reduced-motion`, sin librería nueva); `disposicion='grid'` con `columnas_grid` mapeado a clases Tailwind literales (`COLUMNAS_GRID_CLASE`, nueva entrada en `escalas-bloque.ts`). Click en una foto abre `Lightbox.tsx` (nuevo, sobre `components/ui/dialog.tsx`/Radix — focus trap y Escape gratis, navegación con flechas por teclado, nunca navega a otra página). `imagenFondoField`/`SelectorImagenFondo` (antes exclusivo del hero) se generalizaron a `selectorMediaField`/`SelectorMedia`, reusados en el picker de fotos de la galería. `'galeria'` agregada a `BLOQUES_ANIDABLES` (puede vivir dentro de una columna).

Pruebas: `galeria-configuracion.dto.spec.ts` (defaults, `fotos=[]` válido, foto sin `media_id` rechazada, catálogos cerrados); `versiones-sitio.service.spec.ts` extendido (resolución de fotos, referencia rota omitida en silencio, galería anidada dentro de columnas resuelta en una sola consulta batch junto con un hero de nivel superior); `BloqueGaleria.test.tsx`/`Lightbox.test.tsx` (carousel/grid renderizan las fotos, click abre el lightbox en el índice correcto, navegación con flechas/teclado, mensaje vacío sin fotos).

### Fase 4.6 — Modo oscuro real en el sitio público, sincronizado con el editor Puck

Última fase del plan de 6. Sin backend, sin migraciones — `Tema.modo` sigue como metadata inerte a propósito, el modo real se deriva 100% en el cliente. UC-08 actualizado en `docs/plan-portafolio.md` antes de implementar.

- **Derivación automática de la paleta oscura**: nuevo `apps/web/src/lib/tema-oscuro.ts` — `derivarPaletaOscura(tema)` convierte cada uno de los 4 colores hex a HSL (conversión implementada a mano, sin librería), invierte la luminosidad (`L' = clamp(100-L, 6, 94)`, evita negro/blanco puro), preserva hue/saturación, vuelve a hex; `fuente_principal` se copia tal cual. Matemática verificada a mano contra casos concretos en la revisión (round-trip hex→HSL→hex exacto, extremos e intermedios).
- **`tema-css.ts`**: `temaComoVariablesCss(tema, modo: ModoTema = 'claro')` aplica `derivarPaletaOscura` cuando `modo==='oscuro'`.
- **Sitio público**: nuevo `hooks/useModoTema.ts` — sigue `prefers-color-scheme` reactivamente por defecto, con un override manual persistido en `localStorage['sitio-publico-modo-tema']` (key distinta de `'panel-admin-theme'` del panel, sistemas independientes). Como `PublicHomePage` y `ToggleModoTema` (nuevo, montado dentro de `Footer.tsx`) montan cada uno su propia instancia del hook, un `CustomEvent` interno (`sitio-publico-modo-tema:cambio`) sincroniza el cambio entre instancias dentro de la misma pestaña — el evento nativo `storage` no dispara en la pestaña que originó el cambio, y cada instancia tiene su propio `useState` independiente. Cubierto por un test dedicado a esa sincronización cruzada.
- **Sincronización con Puck**: `PuckRoot.tsx` reemplaza el `useEffect` que antes cortaba la fuga de `.dark` del panel hacia el iframe (`classList.remove('dark')`) por un mapeo directo `theme` (del `ThemeProvider` del panel) → `modo`, pasado a `temaComoVariablesCss`. El lienzo ahora refleja fielmente el toggle del panel con la misma paleta derivada — el chrome del panel sigue sin filtrarse porque el lienzo nunca lee la clase `.dark` en sí, lee `modo` derivado explícitamente. Mismo tratamiento aplicado a `DialogVistaPrevia.tsx` (el modal "Vista previa" del editor, Fase 4.1) para que no diverja visualmente del lienzo — hallazgo de `code-reviewer`: la primera versión lo dejaba fijo en modo claro por un hueco de fidelidad del harness de test (`EditorSeccionesPage.test.tsx` montaba el editor sin `<ThemeProvider>`, algo que nunca pasa en producción, donde `AdminLayout` siempre lo envuelve); corregido agregando `<ThemeProvider>` al helper de test en vez de dejar la inconsistencia visual en el componente real.

Pruebas: `tema-oscuro.test.ts` (inversión de luminosidad en extremos e intermedios, preservación de hue/saturación, passthrough de tipografía); `tema-css.test.ts` extendido (`modo` aplica/no aplica la paleta derivada); `useModoTema.test.ts` (sigue el sistema, reacciona en vivo a un cambio de `prefers-color-scheme`, override persiste y gana, `setModo(null)` vuelve a seguir el sistema, sincronización entre dos instancias del hook en la misma pestaña).

### Corrección post-Fase 4.6 — modo oscuro incompleto, iframe del editor y metadatos del sitio

Rondo de fixes disparada por un reporte técnico externo sobre el sitio publicado, verificado punto por punto contra el código antes de tocar nada. Sin backend, sin migraciones.

- **Modo oscuro incompleto (regresión real de la Fase 4.6)**: la fase original solo derivaba paleta oscura para los 4 tokens de negocio del `Tema` (`temaComoVariablesCss`), pero los `Bloque*.tsx`/`Footer`/`EnvoltorioSeccion` usan además, extensamente, el sistema de tokens genérico de shadcn/Tailwind (`text-muted-foreground`, `bg-card`, etc., definidos en `index.css` bajo `.dark {}`), que nunca conmutaba porque ningún contenedor raíz aplicaba la clase `dark`. Fix: `cn('...', modo === 'oscuro' && 'dark')` en los 3 contenedores raíz que ya calculaban `modo` (`PublicHomePage.tsx`, `PuckRoot.tsx`, `DialogVistaPrevia.tsx`) — la cascada de custom properties de CSS resuelve el resto sin tocar ningún `Bloque*.tsx`. Namespace de variables verificado sin colisión con `--color-*` del `Tema`.
- **Iframe del editor Puck sin stylesheet** (`AutoFrame couldn't load a stylesheet`): investigado por código (sin reproducción en vivo) contra el bundle de `@measured/puck` — es una condición de carrera interna de la librería (porta el contenido al iframe antes de que resuelva el mirror-eo async de estilos), sin ninguna causa propia de este repo, y confirmado que no se propaga a producción. Fix acotado: fallback con `style` inline (no depende de ningún stylesheet) en los dos elementos que el reporte señalaba como rotos — tamaño de `IconoSkill` (`iconos-skill.tsx`) y tamaño/posición de la foto del hero (`BloqueHero.tsx`). El primer intento del fallback de la foto del hero no estaba gateado por modo de renderizado y sobrescribía el tamaño responsive real en producción (`style` inline gana sobre clases Tailwind) — hallazgo de `code-reviewer`, corregido gateando todo el bloque a `useModoRenderizado() === 'editor'` (mecanismo ya existente, usado por `EnlaceBloque`/`TarjetaClicable`).
- **Marquee de Skills "sobre-duplicado"**: investigado y descartado — es el diseño intencional ya documentado de la Fase 3.2 (repeticiones para evitar hueco visual + 2 pistas para el loop sin salto), no un bug. Sin cambios de código.
- **Metadatos genéricos**: `apps/web/index.html` (`lang="en"`→`"es"`, sin campo de idioma en el esquema; `<title>web</title>`→`<title>Portafolio</title>`) y `document.title` dinámico en `PublicHomePage.tsx` (`useEffect` desde `snapshot.perfil?.nombre_completo`/`titulo_profesional`, fallback `'Portafolio'`).
- **Fuera de alcance, señalado al usuario**: la tarjeta de proyecto "BSCManager" duplicada en el reporte es un problema de datos (fila duplicada con contenido de relleno), no de código — se corrige directamente en el panel de Proyectos, no en este PR. `code-reviewer` señaló además un gap preexistente (no introducido por esta rama): `ProyectoDetallePage`/`CertificacionDetallePage`/`LogroDetallePage` (acceso directo por URL) nunca aplicaron tema de negocio ni `.dark` — queda como seguimiento sugerido, no bloqueante acá.

Pruebas: `PublicHomePage.test.tsx` extendido (clase `dark` condicional al `modo`); `BloqueHero.test.tsx` nuevo (fallback de tamaño solo en modo `'editor'`, sin regresión en modo `'publico'`).

### Segunda ronda post-Fase 4.6 — columnas que no guardaban, PDF bloqueado y modales públicos sin tema

Disparada por QA manual del usuario sobre el PR anterior. 4 fixes independientes, cada uno investigado por código antes de tocar nada. Sin backend, sin migraciones.

- **Columnas no persistía (pérdida de datos real)**: `sanearSlots()` en `EditorSeccionesPage.tsx` reconstruía el payload del bloque `columnas` con una whitelist incompleta — nunca incluía los 5 campos base (`espaciado_vertical`, `ancho_contenido`, `alineacion_texto`, `fondo_bloque`, `separador_inferior`) de `BloqueConfiguracionBase`, así que se pintaban en vivo (Puck los tenía en memoria) pero se descartaban silenciosamente al guardar. El backend ya los aceptaba sin cambios (`ColumnasConfiguracionDto extends BloqueConfiguracionBaseDto`) — el bug era 100% de ese destructuring/`return` incompleto en el frontend.
- **PDF bloqueado en Chrome**: la Fase 4.1 solo agregó `allow-same-origin` al `sandbox` del iframe de preview — insuficiente, porque el visor nativo de PDF de Chrome (PDFium) también necesita `allow-scripts` para inicializarse dentro de un iframe sandboxeado. Confirmado que `Media.url` siempre viene de `S3MediaStorageService` (nunca del propio origen de la app en producción), así que agregar `allow-scripts` es seguro — el iframe sigue aislado del origen padre por la same-origin policy real del navegador, y la sesión admin vive en cookie `httpOnly` de todos modos.
- **Modales públicos de detalle sin tema/modo oscuro**: `DialogContent` (`components/ui/dialog.tsx`) portaba el modal a `document.body` (default de `DialogPrimitive.Portal` de Radix) — un nodo hermano, no ancestro, del `<div>` raíz temado de `PublicHomePage.tsx`/`DialogVistaPrevia.tsx`, así que las variables CSS del `Tema` y la clase `dark` nunca cascadeaban al modal. Fix: `container` explícito propagado en cadena (`DialogContent`→`DialogDetalle`→`ProveedorDetallePublico`) hasta el nodo DOM temado real, expuesto como estado vía callback-ref (`useState`, no `useRef`, para reaccionar una vez montado). `Lightbox.tsx` quedó fuera a propósito (usa colores hardcodeados, no depende de los tokens del tema).
- **Vista previa del editor con bajo contraste ("se ve en negro")**: no era una regresión de la clase `dark` de la ronda anterior — con el panel admin en modo oscuro, `DialogContent` (`bg-background`) y el `<div>` interior temado (`--color-fondo` derivado, también casi negro por diseño) quedaban indistinguibles entre sí. Fix: gutter exterior `bg-muted` (token perceptiblemente más claro que `--background` en oscuro) alrededor del `<div>` temado, que ahora se lee como una tarjeta/artboard independiente del chrome del modal.

Pruebas: `EditorSeccionesPage.columnas.test.ts` extendido (los 5 campos base sobreviven a `sanearSlots`); suite completa (212 tests) verde sin regresiones en el resto del flujo de modales/vista previa.

### Tercera ronda post-Fase 4.6 — crash de mediaPorId, links de redes sociales rotos y PDF (fix definitivo)

Disparada por QA manual del usuario sobre el PR anterior. Sin migraciones; toca un DTO del backend (validación, no esquema).

- **Crash `mediaPorId.get is not a function`**: `useDatosEditor.ts` definía `DatosEditor.mediaPorId` como `Map<string, Media>`, consumido con `.get(id)` ahí mismo y en `puck-config.tsx` (bloques `hero`/`galeria`). En runtime, ese `Map` terminaba llegando sin su prototipo (consistente con una serialización tipo `JSON.stringify` en algún punto de la maquinaria interna de Puck — historial de undo o el cruce de `metadata` hacia el iframe del lienzo), rompiendo el lienzo del editor al usar una foto de Hero/Galería. Fix: unificar `mediaPorId` a un objeto plano `Record<string, Media>` (mismo criterio que ya usa el snapshot público, que nunca tuvo este problema porque aplana la media directamente en cada campo) — elimina la clase de bug de raíz sin depender de entender el mecanismo exacto interno de Puck. Este mismo crash probablemente explicaba también "la vista previa no se muestra" reportado en paralelo: el `ErrorBoundary` de `EditorSeccionesPage` tumbaba todo el árbol, incluido el modal de Vista Previa que vive ahí mismo.
- **Links de redes sociales sin esquema** (ej. LinkedIn navegaba al panel admin en vez de abrir LinkedIn): ninguna capa exigía/normalizaba `http(s)://` en `url`, a propósito, para no romper el `mailto:` de la plataforma "Correo". Un `href` sin esquema en un `<a>` real (`EnlaceBloque`) se resuelve como ruta relativa al origen actual. Fix: normalización vía `.transform()` (Zod, `red-social-schema.ts`) y `@Transform` (backend, `create-red-social.dto.ts`, heredado por `UpdateRedSocialDto` vía `PartialType`) que antepone `https://` solo cuando el valor no matchea ya un esquema URI genérico (`/^[a-zA-Z][a-zA-Z\d+\-.]*:/`, RFC 3986 §3.1) — cubre `mailto:` sin tocarlo.
- **PDF bloqueado en Chrome (fix definitivo)**: el fix anterior (`allow-scripts allow-same-origin`) resultó insuficiente — investigado con búsqueda web explícita (issue tracker de Chromium, web.dev, comunidad): desde Chrome 78 el visor nativo de PDF corre en un iframe cross-process ya aislado por el navegador, y envolverlo en un `<iframe sandbox>` adicional entra en conflicto con ese aislamiento sin importar la combinación de flags — problema documentado y recurrente, no de configuración propia. Fix: reemplazar el `<iframe sandbox>` por `<object data type="application/pdf">` (no necesita sandboxearse, soporta contenido de fallback nativo), en `MediaPreview.tsx`.

Pruebas: `red-social-schema.test.ts`/`create-red-social.dto.spec.ts` nuevos (normalización de esquema, `mailto:` sin alterar, vacío sigue rechazado); tests existentes de `MediaPreview`/`MediaUploadField`/`CertificacionDetallePage` actualizados para el `<object>`; suite completa verde en `apps/web` (217 tests) y `apps/api` (217 tests).

### Cuarta ronda post-Fase 4.6 — convergencia visual del sitio público, carousel de galería y toggle de modo

Disparada por QA manual del usuario sobre el PR anterior. Sin backend, sin migraciones.

- **El fondo animado dejó de "converger" con el resto del sitio**: no era un bug nuevo, sino una consecuencia directa del fix de modo oscuro — el sitio público usa dos sistemas de color independientes: los 4 tokens de negocio del `Tema` (`--color-*`, los únicos que pinta `FondoAnimado`) y los tokens genéricos de shadcn/Tailwind (`--background`/`--card`/`--muted`/`--border`/etc., los que usan `EnvoltorioSeccion`/`Bloque*.tsx`). Antes de activar `.dark`, el segundo grupo quedaba siempre en sus valores claros fijos, que por casualidad combinaban con casi cualquier paleta clara del `Tema`; al activar `.dark` correctamente, ese grupo saltó a sus valores oscuros fijos de Tailwind, sin relación con el `Tema`. Fix de raíz: nuevo `apps/web/src/lib/tema-superficies.ts` (`derivarSuperficiesShadcn`, reusa los helpers hex↔HSL ya existentes en `tema-oscuro.ts`, ahora exportados) deriva los 11 tokens de superficie/texto genéricos a partir de los mismos 4 colores del `Tema`, inyectados por `temaComoVariablesCss` junto a los `--color-*` — un solo punto de entrada, sin tocar `index.css` (que sigue siendo el fallback del chrome del panel admin) ni ningún `Bloque*.tsx`.
- **Ícono de PDF plano**: `MediaPreview.tsx` reemplaza el `FileIcon` genérico por una insignia circular roja con `FileText`, mismo patrón que `IconoSkill`.
- **Scrollbar horizontal del carousel de Galería**: `BloqueGaleria.tsx` la oculta vía CSS (`scrollbar-width:none`/`-ms-overflow-style:none`/`::-webkit-scrollbar:hidden`), sin afectar el scroll táctil ni las flechas/dots existentes.
- **Confusión sobre modo claro/oscuro del sitio publicado**: investigado y descartado como bug — el editor refleja el toggle del PANEL admin (`ThemeProvider`, independiente), el sitio publicado sigue `prefers-color-scheme` del VISITANTE con override propio (`useModoTema`) — dos fuentes de modo deliberadamente independientes, exactamente lo pedido. Único hallazgo real: el toggle del sitio público (`ToggleModoTema`) vivía solo al final del `Footer`, poco visible — se movió a un botón flotante fijo (esquina inferior derecha) montado directamente en `PublicHomePage.tsx`.

Pruebas: `tema-superficies.test.ts` nuevo, `tema-css.test.ts` extendido; suite completa verde en `apps/web` (231 tests).

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
