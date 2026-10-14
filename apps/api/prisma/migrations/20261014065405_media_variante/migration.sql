-- CreateTable
CREATE TABLE "media_variante" (
    "id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "formato" TEXT NOT NULL,
    "ancho" INTEGER NOT NULL,
    "alto" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_variante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "media_variante_media_id_formato_ancho_key" ON "media_variante"("media_id", "formato", "ancho");

-- AddForeignKey
ALTER TABLE "media_variante" ADD CONSTRAINT "media_variante_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
