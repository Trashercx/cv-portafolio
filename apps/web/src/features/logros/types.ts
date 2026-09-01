/** `Logro` (UC-05). Ver `docs/plan-portafolio.md`. */
export type Logro = {
  id: string
  usuario_admin_id: string
  titulo: string
  descripcion: string
  fecha: string
  categoria: string
  url_referencia: string | null
  orden: number
}
