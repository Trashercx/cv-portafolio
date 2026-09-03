import type { Media } from '@/features/media/types'
import { PlataformaIcono } from '@/features/redes-sociales/iconos-plataforma'
import type { RedSocial } from '@/features/redes-sociales/types'
import { API_BASE_URL } from '@/lib/api-client'
import { EnlaceBloque } from './contexto-renderizado'

type RedesSocialesProps = {
  redes: RedSocial[]
  /**
   * CV ya resuelto desde el snapshot (`perfil.cv_media`). Se usa solo para
   * decidir si el botón de descarga se muestra — el `href` real siempre
   * apunta a `GET /cv` (UC-14), nunca a `cvMedia.url` directamente, porque
   * ese endpoint es el único que respeta "descarga contra el snapshot
   * publicado" en vez de la fila `Perfil` en vivo.
   */
  cvMedia: Media | null
}

/**
 * Enlaces de redes sociales + descarga del CV (UC-14). Compartido entre la
 * sección "contacto" del sitio público y la vista previa del panel.
 */
export function RedesSociales({ redes, cvMedia }: RedesSocialesProps) {
  const ordenadas = [...redes].sort((a, b) => a.orden - b.orden)

  return (
    <div className="grid gap-4">
      {ordenadas.length > 0 ? (
        <ul className="flex flex-wrap justify-center gap-3">
          {ordenadas.map((red) => (
            <li key={red.id}>
              <EnlaceBloque
                href={red.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                <PlataformaIcono iconoDefecto={red.plataforma.icono_defecto} />
                {red.plataforma.nombre}
              </EnlaceBloque>
            </li>
          ))}
        </ul>
      ) : null}

      {cvMedia ? (
        <EnlaceBloque
          href={`${API_BASE_URL}/cv`}
          style={{ backgroundColor: 'var(--color-primario)' }}
          className="mx-auto inline-block rounded-md px-6 py-2.5 text-sm font-medium text-white"
        >
          Descargar CV
        </EnlaceBloque>
      ) : null}
    </div>
  )
}
