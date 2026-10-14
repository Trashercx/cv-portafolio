import type { Media } from '@/features/media/types'
import { PlataformaIcono } from '@/features/redes-sociales/iconos-plataforma'
import type { RedSocial } from '@/features/redes-sociales/types'
import { API_BASE_URL } from '@/lib/api-client'
import { CLASES_BORDE_BLOQUE } from '@/lib/escalas-bloque'
import { registrarEvento } from '@/lib/analitica'
import { cn } from '@/lib/utils'
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
  /**
   * `ContactoConfiguracion.estilo_redes` (Fase 3.4). `'iconos'` (default):
   * el look que ya existía — insignia + nombre en una píldora con borde.
   * `'botones'`: variante más marcada, con fondo sólido de `--color-primario`,
   * pensada para llamar más la atención sobre cada red.
   */
  estilo?: 'iconos' | 'botones'
  /**
   * Fase 7 (7.3, hero `mostrar_redes`): solo el ícono en un botón circular
   * (el nombre queda como `aria-label`), sin botón de CV.
   */
  compacto?: boolean
  /** Alineación de la fila de redes. @default 'centro' */
  alineacion?: 'centro' | 'inicio'
}

/**
 * Enlaces de redes sociales + descarga del CV (UC-14). Compartido entre la
 * sección "contacto" del sitio público, el hero (Fase 7) y la vista previa
 * del panel.
 */
export function RedesSociales({
  redes,
  cvMedia,
  estilo = 'iconos',
  compacto = false,
  alineacion = 'centro',
}: RedesSocialesProps) {
  const ordenadas = [...redes].sort((a, b) => a.orden - b.orden)
  const esBotones = estilo === 'botones'

  return (
    <div className="grid gap-4">
      {ordenadas.length > 0 ? (
        <ul
          className={cn(
            'flex flex-wrap gap-3',
            alineacion === 'centro' ? 'justify-center' : 'justify-start',
          )}
        >
          {ordenadas.map((red) => (
            <li key={red.id}>
              <EnlaceBloque
                href={red.url}
                target="_blank"
                rel="noreferrer"
                // Fase 8 (UC-27): `clic_red`; registra y deja seguir el enlace.
                onClick={() => registrarEvento('clic_red', { red: red.plataforma.nombre })}
                aria-label={compacto ? red.plataforma.nombre : undefined}
                style={
                  esBotones && !compacto
                    ? { backgroundColor: 'var(--color-primario)', color: 'var(--color-texto)' }
                    : undefined
                }
                className={cn(
                  'inline-flex items-center gap-2 rounded-md text-sm font-medium transition-colors',
                  compacto
                    ? `size-10 justify-center rounded-full ${CLASES_BORDE_BLOQUE} hover:bg-accent`
                    : esBotones
                      ? 'px-4 py-2.5 hover:opacity-90'
                      : `${CLASES_BORDE_BLOQUE} px-3 py-2 hover:bg-accent`,
                )}
              >
                <PlataformaIcono iconoDefecto={red.plataforma.icono_defecto} />
                {compacto ? null : red.plataforma.nombre}
              </EnlaceBloque>
            </li>
          ))}
        </ul>
      ) : null}

      {cvMedia && !compacto ? (
        <EnlaceBloque
          href={`${API_BASE_URL}/cv`}
          // Fase 8 (UC-27): `descargar_cv`.
          onClick={() => registrarEvento('descargar_cv')}
          style={{ backgroundColor: 'var(--color-primario)' }}
          className="mx-auto inline-block rounded-md px-6 py-2.5 text-sm font-medium text-white"
        >
          Descargar CV
        </EnlaceBloque>
      ) : null}
    </div>
  )
}
