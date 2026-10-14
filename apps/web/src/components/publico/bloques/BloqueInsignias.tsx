import { useState, type PointerEvent, type ReactNode } from 'react'
import type { InsigniaPublica } from '@/features/insignias/types'
import type { InsigniasConfiguracion } from '@/features/secciones/types'
import { usePrefiereMovimientoReducido } from '@/lib/animaciones'
import { resolverEnlaceSeguro } from '@/lib/enlaces'
import { CLASES_BORDE_BLOQUE } from '@/lib/escalas-bloque'
import { formatearFecha } from '@/lib/formato'
import { SIZES_POR_CONTEXTO } from '@/lib/imagenes'
import { cn } from '@/lib/utils'
import { useModoRenderizado } from '../contexto-renderizado'
import { ImagenResponsive } from '../ImagenResponsive'
import { ItemAnimado } from '../ItemAnimado'
import { TarjetaInteractiva } from '../TarjetaInteractiva'

type EfectoInsignia = NonNullable<InsigniasConfiguracion['efecto_hover']>

type BloqueInsigniasProps = {
  titulo: string
  config: InsigniasConfiguracion
  /** `datos.insignias ?? []`: los snapshots anteriores a la Fase 7d no las traen. */
  insignias: InsigniaPublica[]
  /** Clase ya resuelta de `ALINEACION_TEXTO_CLASE`, aplicada al `<h2>`. */
  alineacionTitulo?: string
}

// Fase 7d (UC-35): tablas literales (Tailwind no ve clases armadas en runtime).
/** Rejilla por `columnas` numéricas; `auto` usa `GRID_AUTO_POR_TAMANO` (ancho mínimo por `tamano`). */
const GRID_COLS_INSIGNIAS = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
} as const

const GRID_AUTO_POR_TAMANO = {
  compacto: 'grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))]',
  normal: 'grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]',
  grande: 'grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]',
} as const

/** Lado de la imagen por `tamano` (`grande` = 13 rem, ver `SIZES_POR_CONTEXTO.insignia`). */
const TAMANO_IMAGEN_INSIGNIA = {
  compacto: 'size-24',
  normal: 'size-36',
  grande: 'size-52',
} as const

/** Brillo especular que sigue al puntero: lee `--mx`/`--my` fijadas en `alMover`. */
const CLASE_BRILLO =
  'pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/insignia:opacity-100 bg-[radial-gradient(circle_at_var(--mx,50%)_var(--my,50%),color-mix(in_oklab,var(--background)_60%,transparent),transparent_60%)]'

const CLASE_TARJETA = cn('relative overflow-hidden rounded-xl bg-card p-4', CLASES_BORDE_BLOQUE)

/** Fecha de emisión/expiración legible, o `null` si no hay ninguna. */
function textoFechas(insignia: InsigniaPublica): string | null {
  const emision = formatearFecha(insignia.fecha_emision)
  const expira = formatearFecha(insignia.fecha_expiracion)
  const partes = [emision ? `Emitida ${emision}` : null, expira ? `Expira ${expira}` : null]
  const texto = partes.filter(Boolean).join(' · ')
  return texto || null
}

function Imagen({ insignia, tamano }: { insignia: InsigniaPublica; tamano: keyof typeof TAMANO_IMAGEN_INSIGNIA }) {
  return (
    <ImagenResponsive
      media={insignia.imagen}
      alt={insignia.imagen?.alt_text || insignia.nombre}
      sizes={SIZES_POR_CONTEXTO.insignia}
      className={cn('mx-auto object-contain', TAMANO_IMAGEN_INSIGNIA[tamano])}
    />
  )
}

/** Emisor, fechas, habilidades y enlace "Verificar", según los `mostrar_*`. */
function Detalles({ insignia, config }: { insignia: InsigniaPublica; config: InsigniasConfiguracion }) {
  const mostrarEmisor = config.mostrar_emisor ?? true
  const mostrarFecha = config.mostrar_fecha ?? true
  const mostrarHabilidades = config.mostrar_habilidades ?? false
  const mostrarEnlace = config.mostrar_enlace ?? true
  const modo = useModoRenderizado()

  const fechas = mostrarFecha ? textoFechas(insignia) : null
  const enlace = mostrarEnlace ? resolverEnlaceSeguro(insignia.url_verificacion ?? undefined) : null
  const habilidades = mostrarHabilidades ? (insignia.habilidades ?? []) : []

  return (
    <>
      {mostrarEmisor ? <p className="text-sm text-muted-foreground">{insignia.emisor}</p> : null}
      {fechas ? <p className="text-xs text-muted-foreground">{fechas}</p> : null}
      {habilidades.length > 0 ? (
        <ul className="flex flex-wrap justify-center gap-1" aria-label="Habilidades">
          {habilidades.map((habilidad) => (
            <li key={habilidad} className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {habilidad}
            </li>
          ))}
        </ul>
      ) : null}
      {enlace && 'href' in enlace ? (
        modo === 'editor' ? (
          <span className="w-fit text-sm underline underline-offset-4" aria-disabled="true">
            Verificar
          </span>
        ) : (
          <a
            href={enlace.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Verificar ${insignia.nombre}`}
            className="w-fit text-sm underline underline-offset-4"
          >
            Verificar
          </a>
        )
      ) : null}
    </>
  )
}

/** Tarjeta con inclinación 3D (`TarjetaInteractiva`) y brillo especular que sigue al puntero. */
function TarjetaInclinarBrillo({ children }: { children: ReactNode }) {
  const reducido = usePrefiereMovimientoReducido()

  function alMover(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'touch') return
    const caja = event.currentTarget.getBoundingClientRect()
    if (caja.width === 0 || caja.height === 0) return
    event.currentTarget.style.setProperty('--mx', `${((event.clientX - caja.left) / caja.width) * 100}%`)
    event.currentTarget.style.setProperty('--my', `${((event.clientY - caja.top) / caja.height) * 100}%`)
  }

  return (
    <TarjetaInteractiva efecto="inclinar">
      <div
        onPointerMove={reducido ? undefined : alMover}
        className={cn('group/insignia grid justify-items-center gap-2 text-center', CLASE_TARJETA)}
      >
        {children}
        {reducido ? null : <span aria-hidden="true" data-brillo className={CLASE_BRILLO} />}
      </div>
    </TarjetaInteractiva>
  )
}

/**
 * Volteo 3D (`rotateY(180deg)`) al pasar el puntero o al enfocar; en
 * punteros sin hover (`(hover: none)`) el toque lo alterna. La cara trasera
 * muestra emisor, fechas y habilidades. Ambas caras comparten celda de
 * rejilla para que la altura sea la de la más alta.
 */
function TarjetaGirar({
  insignia,
  config,
  tamano,
}: {
  insignia: InsigniaPublica
  config: InsigniasConfiguracion
  tamano: keyof typeof TAMANO_IMAGEN_INSIGNIA
}) {
  const [volteada, setVolteada] = useState(false)

  function alTocar() {
    // Con ratón el volteo lo gobierna el hover/focus (CSS); solo el toque lo alterna.
    if (window.matchMedia('(hover: none)').matches) setVolteada((valor) => !valor)
  }

  return (
    <div className="group/insignia [perspective:1000px]">
      <div
        data-volteada={volteada}
        tabIndex={0}
        aria-label={`${insignia.nombre}. Pulsa para ver los detalles`}
        onClick={alTocar}
        className="grid transition-transform duration-500 [transform-style:preserve-3d] group-hover/insignia:[transform:rotateY(180deg)] focus-within:[transform:rotateY(180deg)] focus-visible:[transform:rotateY(180deg)] data-[volteada=true]:[transform:rotateY(180deg)]"
      >
        <div
          className={cn(
            'col-start-1 row-start-1 grid content-center justify-items-center gap-2 text-center [backface-visibility:hidden]',
            CLASE_TARJETA,
          )}
        >
          <Imagen insignia={insignia} tamano={tamano} />
          <h3 className="font-semibold">{insignia.nombre}</h3>
        </div>
        <div
          className={cn(
            'col-start-1 row-start-1 grid content-center justify-items-center gap-2 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]',
            CLASE_TARJETA,
          )}
        >
          <h3 className="font-semibold">{insignia.nombre}</h3>
          <Detalles insignia={insignia} config={config} />
        </div>
      </div>
    </div>
  )
}

function TarjetaInsignia({
  insignia,
  config,
  efecto,
}: {
  insignia: InsigniaPublica
  config: InsigniasConfiguracion
  efecto: EfectoInsignia
}) {
  const reducido = usePrefiereMovimientoReducido()
  const tamano = config.tamano ?? 'normal'

  const contenido = (
    <>
      <Imagen insignia={insignia} tamano={tamano} />
      <h3 className="font-semibold">{insignia.nombre}</h3>
      <Detalles insignia={insignia} config={config} />
    </>
  )

  // `girar` sin movimiento: tarjeta estática con todos los detalles a la vista.
  if (efecto === 'girar' && !reducido) {
    return <TarjetaGirar insignia={insignia} config={config} tamano={tamano} />
  }
  if (efecto === 'inclinar_brillo') {
    return <TarjetaInclinarBrillo>{contenido}</TarjetaInclinarBrillo>
  }

  return (
    <TarjetaInteractiva efecto={efecto === 'elevar' ? 'elevar' : 'ninguno'}>
      <div className={cn('grid justify-items-center gap-2 text-center', CLASE_TARJETA)}>
        {contenido}
      </div>
    </TarjetaInteractiva>
  )
}

/**
 * Bloque `insignias` (Fase 7d, UC-35), compartido entre el sitio público y el
 * lienzo del editor. Tolera claves ausentes y snapshots sin `insignias`: sin
 * datos muestra "Sin insignias" solo en el editor y nada en el sitio público.
 */
export function BloqueInsignias({ titulo, config, insignias, alineacionTitulo }: BloqueInsigniasProps) {
  const modo = useModoRenderizado()
  const efecto = config.efecto_hover ?? 'inclinar_brillo'
  const columnas = config.columnas ?? 'auto'
  const tamano = config.tamano ?? 'normal'

  const visibles = [...insignias].sort((a, b) => a.orden - b.orden)
  const mostradas = config.limite ? visibles.slice(0, config.limite) : visibles
  const encabezado = config.titulo || titulo

  if (mostradas.length === 0 && modo !== 'editor') return null

  return (
    <div className="grid gap-6">
      <div className={cn('grid gap-1', alineacionTitulo)}>
        <h2 className="text-2xl font-semibold">{encabezado}</h2>
        {config.subtitulo ? <p className="text-muted-foreground">{config.subtitulo}</p> : null}
      </div>
      {mostradas.length === 0 ? (
        <p className="text-muted-foreground">Sin insignias</p>
      ) : (
        <ul
          className={cn(
            'grid gap-4',
            columnas === 'auto' ? GRID_AUTO_POR_TAMANO[tamano] : GRID_COLS_INSIGNIAS[columnas],
          )}
        >
          {mostradas.map((insignia, indice) => (
            <li key={insignia.id} data-efecto-insignia={efecto}>
              <ItemAnimado indice={indice}>
                <TarjetaInsignia insignia={insignia} config={config} efecto={efecto} />
              </ItemAnimado>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
