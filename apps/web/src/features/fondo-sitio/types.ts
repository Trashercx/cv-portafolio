/** UC-15 (Configurar fondo animado del sitio). Forma exacta devuelta por `GET /admin/fondos`. */
export type FondoSitio = {
  id: string
  usuario_admin_id: string
  tipo:
    | 'solido'
    | 'degradado_animado'
    | 'aurora_animada'
    | 'particulas'
    | 'cuadricula_animada'
  configuracion: {
    velocidad: 'lenta' | 'media' | 'rapida'
    opacidad: number
  }
  activo: boolean
}
