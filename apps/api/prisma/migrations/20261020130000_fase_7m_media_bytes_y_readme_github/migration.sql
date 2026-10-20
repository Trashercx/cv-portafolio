-- AlterTable
ALTER TABLE "integracion_github" ADD COLUMN     "readme_actualizado_en" TIMESTAMP(3),
ADD COLUMN     "readme_error" TEXT,
ADD COLUMN     "readme_etag" TEXT,
ADD COLUMN     "readme_markdown" TEXT,
ADD COLUMN     "readme_rama" TEXT,
ADD COLUMN     "readme_repositorio" TEXT;

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "bytes" INTEGER;
