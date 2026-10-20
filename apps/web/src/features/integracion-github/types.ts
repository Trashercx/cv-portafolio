/** Integración con GitHub tal como la devuelve `GET /admin/integraciones/github` (Fase 7l, UC-36). `null` si aún no se configuró. */
export type IntegracionGithub = {
  id: string
  usuario_github: string
  activa: boolean
  intervalo_horas: number
  publicar_automaticamente: boolean
  incluir_forks: boolean
  incluir_archivados: boolean
  destacar_nuevos: boolean
  ultima_sincronizacion_en: string | null
  ultimo_error: string | null
  /** README del perfil (Fase 7m, #66): `owner/repo` y rama; `null` = sin configurar (rama por defecto `main`). */
  readme_repositorio?: string | null
  readme_rama?: string | null
}

/** Campos editables, cuerpo de `PUT /admin/integraciones/github`. */
export type IntegracionGithubPayload = Pick<
  IntegracionGithub,
  | 'usuario_github'
  | 'activa'
  | 'intervalo_horas'
  | 'publicar_automaticamente'
  | 'incluir_forks'
  | 'incluir_archivados'
  | 'destacar_nuevos'
> &
  Partial<Pick<IntegracionGithub, 'readme_repositorio' | 'readme_rama'>>

/** Respuesta de `POST /admin/integraciones/github/sincronizar`. */
export type ResultadoSincronizacionGithub = {
  creados: number
  actualizados: number
  omitidos: number
  errores: string[]
  /** `true` si, por `publicar_automaticamente`, se publicó una versión nueva. */
  publicado: boolean
  sincronizado_en: string
}

/**
 * Respuesta de `GET /admin/integraciones/github/readme` y de
 * `POST .../readme/actualizar` (Fase 7m, #66, UC-36). El Markdown viene crudo:
 * el saneado es del cliente (`ReadmeGithub`).
 */
export type ReadmeGithubRespuesta = {
  repositorio: string | null
  rama: string | null
  markdown: string | null
  actualizado_en: string | null
  error: string | null
}
