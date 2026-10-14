/**
 * Resultado de subir un archivo al almacenamiento configurado.
 * `width`/`height` son opcionales porque no todo archivo es una imagen
 * (p. ej. el CV es un PDF) y porque calcularlos requiere procesar el
 * archivo (ver nota en `LocalMediaStorageService`).
 */
export interface UploadedMediaResult {
  url: string;
  key: string;
  width?: number;
  height?: number;
}

/**
 * Contrato de almacenamiento de archivos de `media` (UC-02/UC-03/UC-04
 * dependen de `Media` vía FK). El módulo `media` programa contra esta
 * interfaz, nunca contra un proveedor concreto, para poder reemplazar la
 * implementación sin tocar `MediaService` ni los controladores.
 *
 * Implementación real (Sprint 3, UC-09): `S3MediaStorageService`, usando
 * `@aws-sdk/client-s3` + `sharp` para extraer dimensiones de imágenes.
 * `LocalMediaStorageService` queda en el código como referencia/fallback
 * de desarrollo sin credenciales de AWS, y como stub inyectado en los tests
 * (ver `media.module.ts` y `test/media.e2e-spec.ts`), pero ya no es la
 * implementación por defecto.
 *
 * `carpeta` es el prefijo de "carpeta" del bucket S3 (`perfil/`,
 * `proyectos/`, `certificaciones/`, `logros/`, ver
 * `docs/plan-tecnico.md` sección 5). Es opcional porque `POST /admin/media`
 * sube el archivo antes de saber en qué entidad se usará (la asociación con
 * perfil/proyecto/certificación ocurre después, vía `media_id`); cuando no
 * se indica, la implementación usa un prefijo genérico.
 */
export interface MediaStorageService {
  upload(
    file: Express.Multer.File,
    carpeta?: string,
  ): Promise<UploadedMediaResult>;

  /**
   * Fase 8 (UC-34): sube un derivado (variante webp/avif) con una key
   * explícita y caché inmutable (la key lleva el ancho; nunca se reescribe).
   */
  subirDerivado(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<{ url: string; key: string }>;

  /** Fase 8: descarga el objeto (p. ej. el original para regenerar variantes). */
  descargar(key: string): Promise<Buffer>;

  /** Fase 8: borra objetos por key; una lista vacía no hace nada. */
  eliminar(keys: string[]): Promise<void>;
}

/** Token de inyección: `MediaStorageService` es una interfaz, no una clase. */
export const MEDIA_STORAGE_SERVICE = Symbol('MEDIA_STORAGE_SERVICE');
