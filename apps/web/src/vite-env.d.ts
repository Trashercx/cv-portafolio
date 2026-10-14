/// <reference types="vite/client" />

/**
 * Variables de build opcionales de la analítica (Fase 8, 8.4; UC-27). Si falta
 * alguna, el sitio público no inyecta el tracker de Umami.
 */
interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** Origen de Umami, sin barra final. */
  readonly VITE_UMAMI_URL?: string
  readonly VITE_UMAMI_WEBSITE_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** API global del tracker de Umami (solo existe si el script cargó). */
interface Window {
  umami?: {
    track: (evento: string, datos?: Record<string, string>) => void
  }
}
