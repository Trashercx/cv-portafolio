import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import type { InsigniaPublica } from '@/features/insignias/types'
import type { InsigniasConfiguracion } from '@/features/secciones/types'
import { usePrefiereMovimientoReducido } from '@/lib/animaciones'
import { resolverEnlaceSeguro } from '@/lib/enlaces'
import { SIZES_POR_CONTEXTO } from '@/lib/imagenes'
import { cn } from '@/lib/utils'
import { useModoRenderizado } from '../contexto-renderizado'
import { ImagenResponsive } from '../ImagenResponsive'

type Tamano = NonNullable<InsigniasConfiguracion['tamano']>
type Animacion = NonNullable<InsigniasConfiguracion['animacion_reposo']>
type Marco = NonNullable<InsigniasConfiguracion['marco_medalla']>
type Efecto = NonNullable<InsigniasConfiguracion['efecto_hover']>

// Fase 7h (UC-35): tablas literales (Tailwind no ve clases armadas en runtime).
/** Lado del disco de la medalla (mismo criterio que `SIZES_POR_CONTEXTO.insignia`). */
export const TAMANO_MEDALLA: Record<Tamano, string> = {
  compacto: 'size-24',
  normal: 'size-36',
  grande: 'size-52',
}

/** Con `cinta`, espacio bajo el disco para que las colas no tapen la etiqueta. */
const MARGEN_CINTA: Record<Tamano, string> = {
  compacto: 'mb-6',
  normal: 'mb-8',
  grande: 'mb-12',
}

const ANCHO_ETIQUETA: Record<Tamano, string> = {
  compacto: 'w-28',
  normal: 'w-40',
  grande: 'w-56',
}

/** Movimiento en reposo (keyframes en `index.css`); `destello` mueve la banda, no la medalla. */
const ANIMACION_REPOSO_CLASE: Record<Animacion, string> = {
  flotar: 'medalla-flotar',
  balanceo: 'medalla-balanceo',
  destello: '',
  ninguna: '',
}

/** Respuesta al pasar el cursor o enfocar con teclado. */
const EFECTO_HOVER_MEDALLA: Record<Efecto, string> = {
  inclinar_brillo:
    'transition-transform duration-200 ease-out [transform:perspective(700px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))_scale(var(--escala,1))] group-focus-visible/medalla:[--escala:1.06]',
  girar:
    'transition-transform duration-700 ease-out [transform-style:preserve-3d] group-hover/medalla:[transform:rotateY(360deg)] group-focus-visible/medalla:[transform:rotateY(360deg)]',
  elevar:
    'transition-transform duration-300 ease-out group-hover/medalla:-translate-y-2 group-hover/medalla:scale-105 group-focus-visible/medalla:-translate-y-2 group-focus-visible/medalla:scale-105',
  ninguno: '',
}

/** Retardo negativo escalonado: cada medalla arranca en otro punto del ciclo. */
function retardo(indice: number): string {
  return `${(-((indice * 0.73) % 5)).toFixed(2)}s`
}

function textoAccesible(insignia: InsigniaPublica, conEnlace: boolean): string {
  const base = insignia.emisor ? `${insignia.nombre}, emitida por ${insignia.emisor}` : insignia.nombre
  return conEnlace ? `${base}. Ver credencial (se abre en una pestaña nueva)` : base
}

/** Decoración detrás de la imagen: halo de luz, aro metálico o cinta colgante. */
function Marco({ marco, animada }: { marco: Marco; animada: boolean }) {
  if (marco === 'halo') {
    return (
      <span
        aria-hidden="true"
        data-marco="halo"
        className={cn(
          'pointer-events-none absolute -inset-[16%] rounded-full blur-xl transition-opacity duration-300 group-hover/medalla:opacity-100',
          'bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-primario)_50%,transparent),color-mix(in_oklab,var(--color-secundario)_20%,transparent)_45%,transparent_70%)]',
          animada ? 'medalla-pulso' : 'opacity-70',
        )}
      />
    )
  }
  if (marco === 'aro') {
    return (
      <span aria-hidden="true" data-marco="aro" className="pointer-events-none absolute inset-0">
        <span
          className={cn(
            'absolute inset-0 rounded-full shadow-[0_10px_30px_-8px_color-mix(in_oklab,var(--color-primario)_55%,transparent)]',
            'bg-[conic-gradient(from_0deg,var(--color-primario),var(--color-secundario),color-mix(in_oklab,var(--color-primario)_35%,white),var(--color-secundario),var(--color-primario))]',
            animada ? 'medalla-giro-aro' : null,
          )}
        />
        <span className="absolute inset-[5%] rounded-full bg-card shadow-[inset_0_2px_10px_color-mix(in_oklab,var(--foreground)_18%,transparent)]" />
      </span>
    )
  }
  if (marco === 'cinta') {
    return (
      <span aria-hidden="true" data-marco="cinta" className="pointer-events-none absolute inset-0">
        <span className="absolute left-[22%] top-[60%] h-[62%] w-[26%] origin-top rotate-[18deg] bg-[var(--color-primario)] [clip-path:polygon(0_0,100%_0,100%_100%,50%_80%,0_100%)]" />
        <span className="absolute right-[22%] top-[60%] h-[62%] w-[26%] origin-top -rotate-[18deg] bg-[var(--color-secundario)] [clip-path:polygon(0_0,100%_0,100%_100%,50%_80%,0_100%)]" />
        <span className="absolute inset-[6%] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--color-primario)_22%,transparent),transparent_70%)]" />
      </span>
    )
  }
  return null
}

type MedallaInsigniaProps = {
  insignia: InsigniaPublica
  config: InsigniasConfiguracion
  indice: number
}

/**
 * Insignia como medalla (Fase 7h, UC-35): solo la imagen oficial, con un
 * movimiento suave en reposo (`animacion_reposo`), un marco decorativo
 * (`marco_medalla`) y el nombre bajo la medalla según `etiqueta_medalla`.
 * Toda la medalla es el enlace a la verificación (`mostrar_enlace`), con el
 * nombre y el emisor en el texto accesible. En el lienzo del editor no
 * navega, pero el movimiento sí se ve para poder ajustarlo. Con
 * `prefers-reduced-motion` queda quieta y sin inclinación.
 */
export function MedallaInsignia({ insignia, config, indice }: MedallaInsigniaProps) {
  const modo = useModoRenderizado()
  const reducido = usePrefiereMovimientoReducido()

  const tamano = config.tamano ?? 'normal'
  const animacion = config.animacion_reposo ?? 'flotar'
  const marco = config.marco_medalla ?? 'halo'
  const etiqueta = config.etiqueta_medalla ?? 'al_pasar'
  const efecto = config.efecto_hover ?? 'inclinar_brillo'
  const conEnlace = config.mostrar_enlace ?? true

  const enlace = conEnlace ? resolverEnlaceSeguro(insignia.url_verificacion ?? undefined) : null
  const href = enlace && 'href' in enlace && /^https?:\/\//i.test(enlace.href) ? enlace.href : null
  const animada = !reducido

  function alMover(event: PointerEvent<HTMLElement>) {
    if (efecto !== 'inclinar_brillo' || reducido || event.pointerType === 'touch') return
    const caja = event.currentTarget.getBoundingClientRect()
    if (caja.width === 0 || caja.height === 0) return
    const x = (event.clientX - caja.left) / caja.width
    const y = (event.clientY - caja.top) / caja.height
    const estilo = event.currentTarget.style
    estilo.setProperty('--rx', `${((0.5 - y) * 22).toFixed(1)}deg`)
    estilo.setProperty('--ry', `${((x - 0.5) * 22).toFixed(1)}deg`)
    estilo.setProperty('--escala', '1.06')
    estilo.setProperty('--mx', `${(x * 100).toFixed(0)}%`)
    estilo.setProperty('--my', `${(y * 100).toFixed(0)}%`)
  }

  function alSalir(event: PointerEvent<HTMLElement>) {
    const estilo = event.currentTarget.style
    for (const propiedad of ['--rx', '--ry', '--escala']) estilo.removeProperty(propiedad)
  }

  const disco = (
    <span
      data-animacion-reposo={animada ? animacion : 'ninguna'}
      className={cn(
        'relative block',
        animada ? ANIMACION_REPOSO_CLASE[animacion] : null,
        marco === 'cinta' ? MARGEN_CINTA[tamano] : null,
      )}
    >
      <span
        onPointerMove={alMover}
        onPointerLeave={alSalir}
        data-efecto-medalla={reducido ? 'ninguno' : efecto}
        className={cn(
          'relative grid place-items-center',
          TAMANO_MEDALLA[tamano],
          reducido ? null : EFECTO_HOVER_MEDALLA[efecto],
        )}
      >
        <Marco marco={marco} animada={animada} />
        <ImagenResponsive
          media={insignia.imagen}
          alt=""
          sizes={SIZES_POR_CONTEXTO.insignia}
          className={cn(
            'relative z-10 object-contain drop-shadow-[0_10px_14px_color-mix(in_oklab,var(--foreground)_25%,transparent)]',
            marco === 'aro' ? 'size-[72%]' : 'size-full',
          )}
        />
        {animacion === 'destello' && animada ? (
          <span
            aria-hidden="true"
            data-destello
            className="pointer-events-none absolute inset-[4%] z-20 overflow-hidden rounded-full"
          >
            <span className="medalla-destello-banda absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/60 to-transparent mix-blend-soft-light" />
          </span>
        ) : null}
        {efecto === 'inclinar_brillo' && animada ? (
          <span
            aria-hidden="true"
            data-brillo
            className="pointer-events-none absolute inset-0 z-20 rounded-full opacity-0 transition-opacity duration-300 group-hover/medalla:opacity-100 bg-[radial-gradient(circle_at_var(--mx,50%)_var(--my,30%),rgb(255_255_255/0.45),transparent_55%)] mix-blend-soft-light"
          />
        ) : null}
      </span>
    </span>
  )

  const nombre =
    etiqueta === 'nunca' ? null : (
      <span
        data-etiqueta={etiqueta}
        className={cn(
          'line-clamp-2 text-center text-sm font-medium leading-snug',
          ANCHO_ETIQUETA[tamano],
          etiqueta === 'al_pasar' &&
            'pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-max max-w-56 -translate-x-1/2 translate-y-1 rounded-full bg-[var(--foreground)] px-3 py-1 text-xs text-[var(--background)] opacity-0 shadow-lg transition duration-200 group-hover/medalla:translate-y-0 group-hover/medalla:opacity-100 group-focus-visible/medalla:translate-y-0 group-focus-visible/medalla:opacity-100',
          // Sin hover (táctil) el nombre se ve siempre: no hay forma de "pasar".
          etiqueta === 'al_pasar' && '[@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100',
        )}
      >
        {insignia.nombre}
      </span>
    )

  const indicadorEnlace = href ? (
    <span
      aria-hidden="true"
      className="absolute right-0 top-0 z-30 grid size-7 scale-75 place-items-center rounded-full bg-[var(--color-primario)] text-white opacity-0 shadow-md transition duration-200 group-hover/medalla:scale-100 group-hover/medalla:opacity-100 group-focus-visible/medalla:scale-100 group-focus-visible/medalla:opacity-100"
    >
      <ArrowUpRight className="size-4" />
    </span>
  ) : null

  const contenido: ReactNode = (
    <>
      {disco}
      {indicadorEnlace}
      {nombre}
    </>
  )

  const clases = cn(
    'group/medalla relative grid justify-items-center gap-3 rounded-3xl p-3 outline-none',
    'focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]',
    href ? 'cursor-pointer' : null,
  )
  const estilo = { '--retardo-medalla': retardo(indice) } as CSSProperties
  const etiquetaAccesible = textoAccesible(insignia, Boolean(href))

  if (href && modo !== 'editor') {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={etiquetaAccesible}
        title={insignia.nombre}
        className={clases}
        style={estilo}
      >
        {contenido}
      </a>
    )
  }

  return (
    <div
      role="img"
      aria-label={etiquetaAccesible}
      title={insignia.nombre}
      data-sin-navegacion={href ? 'true' : undefined}
      className={clases}
      style={estilo}
    >
      {contenido}
    </div>
  )
}
