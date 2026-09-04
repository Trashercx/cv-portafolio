import type { Media } from '@/features/media/types'
import type { PerfilPublico } from '@/features/publico/types'
import type { RedSocial } from '@/features/redes-sociales/types'
import { RedesSociales } from './RedesSociales'
import { ToggleModoTema } from './ToggleModoTema'

type FooterProps = {
  perfil: PerfilPublico | null
  redes: RedSocial[]
  cvMedia: Media | null
}

/**
 * Pie de página del sitio público (Fase 4.4): nombre del perfil, año actual
 * y los mismos enlaces de redes sociales/CV que la sección de contacto
 * (reusa `RedesSociales`, sin duplicar esa lógica). Montado en
 * `PublicHomePage` como hermano de `RenderizadorSecciones`, dentro del
 * contenedor que ya trae las variables CSS del tema aplicadas.
 *
 * `ToggleModoTema` (Fase 4.6) vive acá, junto al resto de controles
 * "de página" del visitante (no flotante): es el lugar de menor sorpresa,
 * visible sin taparle contenido a ninguna sección, y coherente con que el
 * footer ya es el contenedor de "metadatos del sitio" (redes, CV, año).
 */
export function Footer({ perfil, redes, cvMedia }: FooterProps) {
  const anioActual = new Date().getFullYear()

  return (
    <footer className="border-t px-4 py-8 text-center">
      <div className="mx-auto grid max-w-3xl gap-4">
        <RedesSociales redes={redes} cvMedia={cvMedia} />
        <p className="text-sm text-muted-foreground">
          {perfil?.nombre_completo ? `${perfil.nombre_completo} © ${anioActual}` : `© ${anioActual}`}
        </p>
        <div className="flex justify-center">
          <ToggleModoTema />
        </div>
      </div>
    </footer>
  )
}
