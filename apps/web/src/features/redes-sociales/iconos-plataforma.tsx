import { siGithub, siX } from 'simple-icons'
import { Link, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlataformaRed } from './types'

/**
 * Mapea `PlataformaRed.icono_defecto` (sembrado en el backend, ver
 * `apps/api/prisma/seed.ts`) al ícono que se muestra para cada plataforma.
 *
 * - `github` y `twitter` (X) usan el glifo de marca real de `simple-icons`
 *   (paquete de solo datos: nombre + color + `path` SVG, sin dependencias de
 *   React). `twitter` renderiza el logo de X (`siX`), ya que Twitter se
 *   renombró y `simple-icons` solo conserva el logo actual.
 * - `linkedin`: `simple-icons` (v16) ya NO incluye el logo de LinkedIn — el
 *   propio paquete documenta en `DISCLAIMER.md` que retira íconos a pedido de
 *   la marca, y LinkedIn es justamente uno de los que pidió su remoción. Por
 *   la misma razón no lo reconstruimos a mano (sería recalcar el mismo logo
 *   registrado que la marca pidió no distribuir). En su lugar usamos un
 *   monograma tipográfico "in" con el azul de marca de LinkedIn, que es
 *   reconocible sin trazar el isotipo registrado.
 * - `mail` y `link` no representan una marca concreta, así que se quedan con
 *   los íconos genéricos de lucide-react (`Mail`, `Link`).
 */
type IconoConfig =
  | { tipo: 'lucide'; Icono: typeof Mail }
  | { tipo: 'simple-icons'; path: string; hex: string }
  | { tipo: 'monograma'; texto: string; hex: string }

const ICONOS_POR_DEFECTO: Record<string, IconoConfig> = {
  linkedin: { tipo: 'monograma', texto: 'in', hex: '0A66C2' },
  github: { tipo: 'simple-icons', path: siGithub.path, hex: siGithub.hex },
  twitter: { tipo: 'simple-icons', path: siX.path, hex: siX.hex },
  mail: { tipo: 'lucide', Icono: Mail },
  link: { tipo: 'lucide', Icono: Link },
}

const ICONO_POR_DEFECTO: IconoConfig = { tipo: 'lucide', Icono: Link }

/** Configuración de ícono para un `icono_defecto` dado, con `link` como fallback. */
function obtenerIconoPlataforma(iconoDefecto: string): IconoConfig {
  return ICONOS_POR_DEFECTO[iconoDefecto] ?? ICONO_POR_DEFECTO
}

/** Clases de fondo suave (`/10`) a partir del color de marca de cada plataforma. */
const COLORES_POR_DEFECTO: Record<string, string> = {
  linkedin: 'bg-[#0A66C2]/10 text-[#0A66C2]',
  github: 'bg-foreground/10 text-foreground',
  twitter: 'bg-foreground/10 text-foreground',
  mail: 'bg-amber-500/10 text-amber-600',
  link: 'bg-muted text-muted-foreground',
}

const COLOR_POR_DEFECTO = 'bg-muted text-muted-foreground'

function obtenerColorPlataforma(iconoDefecto: string): string {
  return COLORES_POR_DEFECTO[iconoDefecto] ?? COLOR_POR_DEFECTO
}

type PlataformaIconoProps = {
  iconoDefecto: string
  className?: string
}

/** Insignia circular con el ícono de la plataforma y su color de marca. */
export function PlataformaIcono({ iconoDefecto, className }: PlataformaIconoProps) {
  const icono = obtenerIconoPlataforma(iconoDefecto)

  return (
    <span
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
        obtenerColorPlataforma(iconoDefecto),
        className,
      )}
    >
      {icono.tipo === 'lucide' && <icono.Icono className="size-4" aria-hidden="true" />}
      {icono.tipo === 'simple-icons' && (
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d={icono.path} />
        </svg>
      )}
      {icono.tipo === 'monograma' && (
        <span
          className="text-[10px] leading-none font-black"
          style={{ color: `#${icono.hex}` }}
          aria-hidden="true"
        >
          {icono.texto}
        </span>
      )}
    </span>
  )
}

type PlataformaBadgeProps = {
  plataforma: PlataformaRed
  className?: string
}

/** Tarjeta/badge con el ícono + nombre de la plataforma (UC-06: "respeta... el ícono configurado"). */
export function PlataformaBadge({ plataforma, className }: PlataformaBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1 text-sm font-medium',
        className,
      )}
    >
      <PlataformaIcono iconoDefecto={plataforma.icono_defecto} />
      {plataforma.nombre}
    </span>
  )
}
