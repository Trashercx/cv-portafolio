-- CreateTable
CREATE TABLE "skill" (
    "id" UUID NOT NULL,
    "usuario_admin_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "icono" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fondo_sitio" (
    "id" UUID NOT NULL,
    "usuario_admin_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "configuracion" JSONB NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "fondo_sitio_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "skill" ADD CONSTRAINT "skill_usuario_admin_id_fkey" FOREIGN KEY ("usuario_admin_id") REFERENCES "usuario_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fondo_sitio" ADD CONSTRAINT "fondo_sitio_usuario_admin_id_fkey" FOREIGN KEY ("usuario_admin_id") REFERENCES "usuario_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex (manual)
-- Regla de negocio de docs/plan-portafolio.md, sección 4: solo un FONDO_SITIO por administrador
-- puede tener activo = true a la vez. Prisma no soporta índices únicos parciales de forma
-- declarativa (no hay cláusula WHERE en @@unique de schema.prisma), así que este índice se
-- agrega a mano en el SQL generado por `prisma migrate dev --create-only`, tal como documenta
-- el comentario sobre el modelo FondoSitio en prisma/schema.prisma (mismo mecanismo que
-- tema_admin_activo_unico en la migración init). Reforzar además en FondoSitioService con una
-- transacción que desactive el fondo previo antes de activar el nuevo.
CREATE UNIQUE INDEX fondo_sitio_admin_activo_unico ON fondo_sitio (usuario_admin_id) WHERE activo = true;
