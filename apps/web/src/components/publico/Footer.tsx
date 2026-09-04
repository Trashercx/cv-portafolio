import type { PerfilPublico } from '@/features/publico/types'

type FooterProps = {
  perfil: PerfilPublico | null
}

/**
 * Pie de página del sitio público (Fase 4.4): nombre del perfil y año
 * actual. Montado en `PublicHomePage` como hermano de
 * `RenderizadorSecciones`, dentro del contenedor que ya trae las variables
 * CSS del tema aplicadas.
 *
 * Ya NO incluye enlaces de redes sociales/CV (fix 5ta ronda): eso duplicaba
 * exactamente el mismo contenido que ya muestra la sección `contacto`
 * (`BloqueContacto`, que reusa `RedesSociales`) cuando el admin la agrega.
 *
 * `ToggleModoTema` (Fase 4.6) YA NO vive acá (fix de visibilidad, Fase 4.7):
 * como botón "de página" al fondo del scroll pasaba fácilmente
 * desapercibido. Ahora se monta como botón flotante fijo directamente en
 * `PublicHomePage`, hermano de este `Footer`.
 */
export function Footer({ perfil }: FooterProps) {
  const anioActual = new Date().getFullYear()

  return (
    <footer className="border-t px-4 py-8 text-center">
      <div className="mx-auto grid max-w-3xl gap-4">
        <p className="text-sm text-muted-foreground">
          {perfil?.nombre_completo ? `${perfil.nombre_completo} © ${anioActual}` : `© ${anioActual}`}
        </p>
      </div>
    </footer>
  )
}
