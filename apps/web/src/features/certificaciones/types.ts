/** `Certificacion` (UC-04). Ver `docs/plan-portafolio.md`. */
export type Certificacion = {
  id: string
  usuario_admin_id: string
  nombre: string
  institucion: string
  fecha_emision: string
  fecha_expiracion: string | null
  url_verificacion: string
  credencial_id: string | null
  logo_media_id: string | null
  orden: number
}
