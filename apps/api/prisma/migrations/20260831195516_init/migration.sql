-- CreateTable
CREATE TABLE "usuario_admin" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'admin',
    "intentos_fallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_hasta" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil" (
    "id" UUID NOT NULL,
    "usuario_admin_id" UUID NOT NULL,
    "nombre_completo" TEXT NOT NULL,
    "titulo_profesional" TEXT NOT NULL,
    "resumen_bio" TEXT NOT NULL,
    "imagen_perfil_id" UUID,
    "cv_media_id" UUID,
    "ubicacion" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL,
    "usuario_admin_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "ancho" INTEGER,
    "alto" INTEGER,
    "alt_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto" (
    "id" UUID NOT NULL,
    "usuario_admin_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "url_demo" TEXT,
    "url_repositorio" TEXT,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "estado" TEXT NOT NULL,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_imagen" (
    "proyecto_id" UUID NOT NULL,
    "media_id" UUID NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "proyecto_imagen_pkey" PRIMARY KEY ("proyecto_id","media_id")
);

-- CreateTable
CREATE TABLE "tecnologia" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "tecnologia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proyecto_tecnologia" (
    "proyecto_id" UUID NOT NULL,
    "tecnologia_id" UUID NOT NULL,

    CONSTRAINT "proyecto_tecnologia_pkey" PRIMARY KEY ("proyecto_id","tecnologia_id")
);

-- CreateTable
CREATE TABLE "certificacion" (
    "id" UUID NOT NULL,
    "usuario_admin_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "institucion" TEXT NOT NULL,
    "fecha_emision" DATE NOT NULL,
    "fecha_expiracion" DATE,
    "url_verificacion" TEXT NOT NULL,
    "credencial_id" TEXT,
    "logo_media_id" UUID,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "certificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logro" (
    "id" UUID NOT NULL,
    "usuario_admin_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "categoria" TEXT NOT NULL,
    "url_referencia" TEXT,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "logro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plataforma_red" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "icono_defecto" TEXT NOT NULL,

    CONSTRAINT "plataforma_red_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "red_social" (
    "id" UUID NOT NULL,
    "usuario_admin_id" UUID NOT NULL,
    "plataforma_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "red_social_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seccion" (
    "id" UUID NOT NULL,
    "usuario_admin_id" UUID NOT NULL,
    "tipo_seccion" TEXT NOT NULL,
    "titulo_visible" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "configuracion" JSONB NOT NULL,

    CONSTRAINT "seccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tema" (
    "id" UUID NOT NULL,
    "usuario_admin_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "color_primario" TEXT NOT NULL,
    "color_secundario" TEXT NOT NULL,
    "color_fondo" TEXT NOT NULL,
    "color_texto" TEXT NOT NULL,
    "fuente_principal" TEXT NOT NULL,
    "modo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "version_sitio" (
    "id" UUID NOT NULL,
    "usuario_admin_id" UUID NOT NULL,
    "estado" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "publicado_en" TIMESTAMP(3),

    CONSTRAINT "version_sitio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_admin_email_key" ON "usuario_admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "perfil_usuario_admin_id_key" ON "perfil"("usuario_admin_id");

-- CreateIndex
CREATE UNIQUE INDEX "tecnologia_nombre_key" ON "tecnologia"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "plataforma_red_nombre_key" ON "plataforma_red"("nombre");

-- AddForeignKey
ALTER TABLE "perfil" ADD CONSTRAINT "perfil_usuario_admin_id_fkey" FOREIGN KEY ("usuario_admin_id") REFERENCES "usuario_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil" ADD CONSTRAINT "perfil_imagen_perfil_id_fkey" FOREIGN KEY ("imagen_perfil_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil" ADD CONSTRAINT "perfil_cv_media_id_fkey" FOREIGN KEY ("cv_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_usuario_admin_id_fkey" FOREIGN KEY ("usuario_admin_id") REFERENCES "usuario_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto" ADD CONSTRAINT "proyecto_usuario_admin_id_fkey" FOREIGN KEY ("usuario_admin_id") REFERENCES "usuario_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_imagen" ADD CONSTRAINT "proyecto_imagen_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_imagen" ADD CONSTRAINT "proyecto_imagen_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_tecnologia" ADD CONSTRAINT "proyecto_tecnologia_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proyecto_tecnologia" ADD CONSTRAINT "proyecto_tecnologia_tecnologia_id_fkey" FOREIGN KEY ("tecnologia_id") REFERENCES "tecnologia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificacion" ADD CONSTRAINT "certificacion_usuario_admin_id_fkey" FOREIGN KEY ("usuario_admin_id") REFERENCES "usuario_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificacion" ADD CONSTRAINT "certificacion_logo_media_id_fkey" FOREIGN KEY ("logo_media_id") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logro" ADD CONSTRAINT "logro_usuario_admin_id_fkey" FOREIGN KEY ("usuario_admin_id") REFERENCES "usuario_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "red_social" ADD CONSTRAINT "red_social_usuario_admin_id_fkey" FOREIGN KEY ("usuario_admin_id") REFERENCES "usuario_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "red_social" ADD CONSTRAINT "red_social_plataforma_id_fkey" FOREIGN KEY ("plataforma_id") REFERENCES "plataforma_red"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seccion" ADD CONSTRAINT "seccion_usuario_admin_id_fkey" FOREIGN KEY ("usuario_admin_id") REFERENCES "usuario_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tema" ADD CONSTRAINT "tema_usuario_admin_id_fkey" FOREIGN KEY ("usuario_admin_id") REFERENCES "usuario_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "version_sitio" ADD CONSTRAINT "version_sitio_usuario_admin_id_fkey" FOREIGN KEY ("usuario_admin_id") REFERENCES "usuario_admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex (manual)
-- Regla de negocio de docs/plan-portafolio.md, sección 4: solo un TEMA por administrador
-- puede tener activo = true a la vez. Prisma no soporta índices únicos parciales de forma
-- declarativa (no hay cláusula WHERE en @@unique de schema.prisma), así que este índice se
-- agrega a mano en el SQL generado por `prisma migrate dev --create-only`, tal como documenta
-- el comentario sobre el modelo Tema en prisma/schema.prisma. Reforzar además en TemaService
-- con una transacción que desactive el tema previo antes de activar el nuevo.
CREATE UNIQUE INDEX tema_admin_activo_unico ON tema (usuario_admin_id) WHERE activo = true;
