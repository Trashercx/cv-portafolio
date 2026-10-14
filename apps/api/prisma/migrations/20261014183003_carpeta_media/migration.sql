-- AlterTable
ALTER TABLE "media" ADD COLUMN     "carpeta_id" UUID;

-- CreateTable
CREATE TABLE "carpeta_media" (
    "id" UUID NOT NULL,
    "usuario_admin_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carpeta_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "carpeta_media_usuario_admin_id_orden_idx" ON "carpeta_media"("usuario_admin_id", "orden");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_carpeta_id_fkey" FOREIGN KEY ("carpeta_id") REFERENCES "carpeta_media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpeta_media" ADD CONSTRAINT "carpeta_media_usuario_admin_id_fkey" FOREIGN KEY ("usuario_admin_id") REFERENCES "usuario_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Unicidad por administrador sin distinguir mayúsculas (Fase 7e, UC-09). Prisma no
-- soporta lower() en @@unique; mismo patrón que skill_admin_nombre_unico.
CREATE UNIQUE INDEX "carpeta_media_admin_nombre_unico" ON "carpeta_media" ("usuario_admin_id", lower("nombre"));
