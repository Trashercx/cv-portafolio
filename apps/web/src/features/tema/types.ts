/** UC-08 (Personalizar tema visual). Forma exacta devuelta por `GET /admin/temas`. */
export type Tema = {
  id: string
  usuario_admin_id: string
  nombre: string
  color_primario: string
  color_secundario: string
  color_fondo: string
  color_texto: string
  fuente_principal: string
  modo: 'claro' | 'oscuro'
  activo: boolean
}
