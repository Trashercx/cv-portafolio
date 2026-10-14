import type { TipoFondo } from './catalogo-fondos'

export type VelocidadFondo = 'lenta' | 'media' | 'rapida'
export type IntensidadFondo = 'sutil' | 'media' | 'alta'

/** UC-15 (Configurar fondo animado del sitio). Forma exacta devuelta por `GET /admin/fondos`. */
export type FondoSitio = {
  id: string
  usuario_admin_id: string
  tipo: TipoFondo
  configuracion: {
    velocidad: VelocidadFondo
    opacidad: number
    /** Fase 7b: opcional (el API no persiste defaults); ausente = `media`. */
    intensidad?: IntensidadFondo
    /** Fase 7b: opcional; ausente = `true`. */
    interactivo?: boolean
  }
  activo: boolean
}
