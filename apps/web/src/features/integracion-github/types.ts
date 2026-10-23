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
>

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
