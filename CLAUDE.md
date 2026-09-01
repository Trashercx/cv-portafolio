# Portafolio CV — contexto del proyecto

Sitio de portafolio/CV personal con panel de administración privado. Stack: React (frontend) + NestJS (backend) + PostgreSQL vía Prisma. Un solo usuario administrador, sin registro público.

## Decisiones ya tomadas (no las vuelvas a proponer como abiertas)

- Editor de plantillas: visual, arrastrar y soltar, con Puck.
- ORM: Prisma.
- Autenticación: `@nestjs/passport` + `passport-jwt`, administrador único, sin endpoint de registro.
- Multimedia: AWS S3 (`@aws-sdk/client-s3` + multer-s3), con sharp/multer-sharp-s3 para miniaturas. CloudFront es opcional, no obligatorio en v1.
- UI: Tailwind CSS + shadcn/ui.
- Estado/formularios: TanStack Query, Zustand, React Hook Form + Zod, Tiptap para texto enriquecido.
- Hosting: VPS propio con Docker + Dokploy o Coolify.

## Dónde está el detalle

El plan completo — stack justificado, los 14 casos de uso con criterios de aceptación, y el diagrama ER normalizado a 3FN — está en `docs/plan-portafolio.md`. Antes de implementar un caso de uso o tocar el esquema, revísalo ahí. No inventes campos, entidades o endpoints que no estén en ese documento; si hace falta algo nuevo, propónlo y actualiza ese archivo primero.

El desglose técnico de ejecución — estructura de monorepo, tareas concretas por sprint y la checklist consolidada de reglas — está en `docs/plan-tecnico.md`. Revísalo antes de arrancar cualquier sprint o tarea de infraestructura.

## Convenciones

- Backend en `apps/api` (NestJS), frontend en `apps/web` (React + Vite).
- Un módulo de Nest por entidad principal: proyectos, certificaciones, logros, red-social, media, secciones, tema, auth.
- DTOs validados con `class-validator`/Zod; nunca aceptar campos no declarados en el DTO.
- Nombres de tabla y columna en español y snake_case, igual que en el diagrama ER (`usuario_admin`, `proyecto_tecnologia`, etc.), para que el esquema de Prisma coincida con `docs/plan-portafolio.md`.
- Ninguna credencial ni clave de AWS/JWT en el código: solo variables de entorno (`.env`, nunca commiteado).

## Comandos (ajustar cuando el proyecto esté scaffoldeado)

- Backend: `npm run start:dev` / `npm test` (Jest) dentro de `apps/api`.
- Frontend: `npm run dev` / `npm test` (Vitest) dentro de `apps/web`.
- Migraciones: `npx prisma migrate dev` dentro de `apps/api`.

## Control de versiones y Scrum

- El proyecto se sube a GitHub de forma escalonada por historias/casos de uso, nunca completo de una vez. Ver `docs/plan-portafolio.md`, sección "Control de versiones y flujo de trabajo", para la estrategia de ramas, los niveles de criticidad y los sprints sugeridos.
- Ningún commit o push se hace sin pasar antes por el subagente `release-manager`: es quien clasifica la criticidad del cambio, corre pruebas/build antes de pushear, y arma el resumen de cierre de sprint para que el usuario dé el visto bueno antes de seguir.

## Cómo trabajar

- Para tocar el esquema de datos, usa el subagente `db-schema`; para la API, `backend-nestjs`; para pantallas y el editor visual, `frontend-react`. Así el detalle de exploración de cada capa no llena la memoria de la conversación principal.
- Antes de dar una tarea por terminada, pide al subagente `code-reviewer` que revise el diff, y luego a `release-manager` que decida cómo y cuándo se sube.
- Si vas a correr dos subagentes de código en paralelo, dales `isolation: worktree` en su frontmatter para que no trabajen sobre los mismos archivos a la vez.
