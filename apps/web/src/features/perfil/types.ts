/** Fila única `Perfil` (UC-02). Ver `docs/plan-portafolio.md`. */
export type Perfil = {
  id: string
  usuario_admin_id: string
  nombre_completo: string
  titulo_profesional: string
  resumen_bio: string
  imagen_perfil_id: string | null
  cv_media_id: string | null
  ubicacion: string
  updated_at: string
}
