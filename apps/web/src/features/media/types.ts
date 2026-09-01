/**
 * Respuesta de `POST /admin/media` (módulo `media` mínimo, Sprint 1).
 * `ancho`/`alto` quedan `null` con el stub local (no procesa la imagen);
 * se completarán cuando `S3MediaStorageService` use `sharp`.
 */
export type Media = {
  id: string
  url: string
  s3_key: string
  tipo: string
  ancho: number | null
  alto: number | null
  alt_text: string | null
  created_at: string
}
