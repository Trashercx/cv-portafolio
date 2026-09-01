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
 * Implementación actual: `LocalMediaStorageService` (stub temporal, ver ese
 * archivo). Implementación pendiente para producción: `S3MediaStorageService`
 * con `@aws-sdk/client-s3` + `sharp` (no hay credenciales de AWS todavía,
 * ver `docs/plan-tecnico.md` Sprint 1).
 */
export interface MediaStorageService {
  upload(file: Express.Multer.File): Promise<UploadedMediaResult>;
}

/** Token de inyección: `MediaStorageService` es una interfaz, no una clase. */
export const MEDIA_STORAGE_SERVICE = Symbol('MEDIA_STORAGE_SERVICE');
