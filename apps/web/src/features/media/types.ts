/**
 * Variante derivada de una imagen (Fase 8, 8.2; UC-34). El API las genera con
 * sharp al subir/reemplazar y las devuelve ordenadas por ancho. Los snapshots
 * anteriores a la Fase 8 no las traen: todo consumidor tolera `undefined`/`[]`.
 */
export type VarianteMedia = {
  formato: 'webp' | 'avif' | 'jpeg'
  ancho: number
  alto: number
  url: string
}

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
  /** Fase 8 (8.2): ausente en snapshots antiguos o en imágenes sin procesar. */
  variantes?: VarianteMedia[]
}
