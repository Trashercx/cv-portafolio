-- AlterTable
ALTER TABLE "proyecto" ADD COLUMN     "github_actualizado_en" TIMESTAMP(3),
ADD COLUMN     "github_estrellas" INTEGER,
ADD COLUMN     "github_lenguaje" TEXT,
ADD COLUMN     "github_nombre_completo" TEXT,
ADD COLUMN     "github_repo_id" BIGINT,
ADD COLUMN     "origen" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "sincronizar_github" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "experiencia_laboral" (
    "id" UUID NOT NULL,
    "usuario_admin_id" UUID NOT NULL,
    "empresa" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "ubicacion" TEXT,
    "modalidad" TEXT NOT NULL,
    "url_empresa" TEXT,
    "logo_media_id" UUID,
    "orden" INTEGER NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiencia_laboral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiencia_tecnologia" (
    "experiencia_id" UUID NOT NULL,
    "tecnologia_id" UUID NOT NULL,

    CONSTRAINT "experiencia_tecnologia_pkey" PRIMARY KEY ("experiencia_id","tecnologia_id")
);

-- CreateTable
CREATE TABLE "integracion_github" (
    "id" UUID NOT NULL,
    "usuario_admin_id" UUID NOT NULL,
    "usuario_github" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT false,
    "intervalo_horas" INTEGER NOT NULL DEFAULT 6,
    "publicar_automaticamente" BOOLEAN NOT NULL DEFAULT false,
    "incluir_forks" BOOLEAN NOT NULL DEFAULT false,
    "incluir_archivados" BOOLEAN NOT NULL DEFAULT false,
    "destacar_nuevos" BOOLEAN NOT NULL DEFAULT false,
    "ultima_sincronizacion_en" TIMESTAMP(3),
    "ultimo_error" TEXT,
    "etag" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integracion_github_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integracion_github_usuario_admin_id_key" ON "integracion_github"("usuario_admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "proyecto_github_repo_id_key" ON "proyecto"("github_repo_id");

-- AddForeignKey
ALTER TABLE "experiencia_laboral" ADD CONSTRAINT "experiencia_laboral_usuario_admin_id_fkey" FOREIGN KEY ("usuario_admin_id") REFERENCES "usuario_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiencia_laboral" ADD CONSTRAINT "experiencia_laboral_logo_media_id_fkey" FOREIGN KEY ("logo_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiencia_tecnologia" ADD CONSTRAINT "experiencia_tecnologia_experiencia_id_fkey" FOREIGN KEY ("experiencia_id") REFERENCES "experiencia_laboral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiencia_tecnologia" ADD CONSTRAINT "experiencia_tecnologia_tecnologia_id_fkey" FOREIGN KEY ("tecnologia_id") REFERENCES "tecnologia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integracion_github" ADD CONSTRAINT "integracion_github_usuario_admin_id_fkey" FOREIGN KEY ("usuario_admin_id") REFERENCES "usuario_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

