-- CreateTable
CREATE TABLE "insignia" (
    "id" UUID NOT NULL,
    "usuario_admin_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "emisor" TEXT NOT NULL,
    "descripcion" TEXT,
    "proveedor" TEXT NOT NULL,
    "id_externo" TEXT,
    "url_verificacion" TEXT,
    "url_origen" TEXT,
    "imagen_media_id" UUID NOT NULL,
    "fecha_emision" DATE,
    "fecha_expiracion" DATE,
    "habilidades" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "orden" INTEGER NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insignia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "insignia_usuario_admin_id_orden_idx" ON "insignia"("usuario_admin_id", "orden");

-- AddForeignKey
ALTER TABLE "insignia" ADD CONSTRAINT "insignia_usuario_admin_id_fkey" FOREIGN KEY ("usuario_admin_id") REFERENCES "usuario_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insignia" ADD CONSTRAINT "insignia_imagen_media_id_fkey" FOREIGN KEY ("imagen_media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
