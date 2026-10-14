/**
 * Respuesta de `GET /admin/metricas?periodo=7|30|90` (Fase 8, 8.4; UC-27).
 * Forma exacta del contrato de `docs/plan-tecnico.md`. El API nunca responde
 * 5xx: cuando Umami no está disponible devuelve `disponible: false` + motivo.
 */
export type PeriodoMetricas = 7 | 30 | 90

export type MotivoNoDisponible = 'no_configurado' | 'sin_respuesta' | 'no_autorizado'

export type MetricasDisponibles = {
  disponible: true
  periodo: number
  desde: string
  hasta: string
  resumen: {
    paginas_vistas: number
    visitas: number
    visitantes: number
    rebote_pct: number
    duracion_media_s: number
  }
  paginas: { ruta: string; vistas: number }[]
  referidos: { origen: string; visitas: number }[]
  paises: { pais: string; visitas: number }[]
  eventos: { descargar_cv: number; clic_red: number }
  eventos_detalle: { nombre: string; total: number }[]
}

export type MetricasNoDisponibles = {
  disponible: false
  motivo: MotivoNoDisponible
}

export type RespuestaMetricas = MetricasDisponibles | MetricasNoDisponibles
