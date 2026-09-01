/** Catálogo de solo lectura `GET /admin/plataformas-red` (sembrado, sin `POST`). */
export type PlataformaRed = {
  id: string
  nombre: string
  icono_defecto: string
}

/** `RedSocial` (UC-06), siempre con la plataforma incluida. */
export type RedSocial = {
  id: string
  usuario_admin_id: string
  plataforma_id: string
  url: string
  orden: number
  plataforma: PlataformaRed
}
