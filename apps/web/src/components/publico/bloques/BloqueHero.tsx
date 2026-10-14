import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import type { PerfilPublico } from '@/features/publico/types'
import type { RedSocial } from '@/features/redes-sociales/types'
import type { HeroConfiguracion } from '@/features/secciones/types'
import { useAnimacionesActivas } from '@/lib/animaciones'
import { resolverEnlaceSeguro } from '@/lib/enlaces'
import { fondoImagenSet, SIZES_POR_CONTEXTO } from '@/lib/imagenes'
import { cn } from '@/lib/utils'
import { EnlaceBloque, useModoRenderizado } from '../contexto-renderizado'
import { ImagenResponsive } from '../ImagenResponsive'
import { RedesSociales } from '../RedesSociales'

type BloqueHeroProps = {
  config: HeroConfiguracion
  perfil: PerfilPublico | null
  /**
   * Clase ya resuelta de `ALINEACION_TEXTO_CLASE` (Fase 3.4,
   * `config.alineacion_texto`), aplicada solo al `<h1>` del título en la
   * disposición `centrado` — el subtítulo y el botón mantienen su centrado
   * propio, sin depender de este campo (mismo criterio que el resto de los
   * `Bloque*.tsx`). `dividido` y `editorial` alinean siempre a la izquierda.
   */
  alineacionTitulo?: string
  /**
   * Redes del sitio (Fase 7, `mostrar_redes`): en el sitio público salen del
   * snapshot (`snapshot.redes_sociales`) y en el lienzo de `datos.redes_sociales`
   * (`DatosEditor`). Sin redes, `mostrar_redes` no pinta nada.
   */
  redesSociales?: RedSocial[]
  /**
   * Ancla (`#seccion-{id}`) de la sección siguiente, destino del indicador de
   * scroll (`mostrar_indicador_scroll`). Sin ella el indicador es solo
   * decorativo (lienzo del editor).
   */
  hrefSiguiente?: string
}

type Disposicion = NonNullable<HeroConfiguracion['disposicion']>

/** Clase de altura mínima del contenedor según `config.altura` (Fase 3.4). */
const ALTURA_CLASE: Record<NonNullable<HeroConfiguracion['altura']>, string> = {
  normal: '',
  grande: 'min-h-[70vh]',
  pantalla_completa: 'min-h-screen',
}

/** Clase del overlay semi-transparente sobre la imagen de fondo según `config.overlay_fondo` (Fase 3.4). */
const OVERLAY_CLASE: Record<NonNullable<HeroConfiguracion['overlay_fondo']>, string> = {
  ninguno: '',
  oscuro: 'bg-black/40',
  claro: 'bg-white/40',
}

/** Clase de tamaño del `<h1>` según `config.tamano_titulo` (Fase 3.4). */
const TAMANO_TITULO_CLASE: Record<NonNullable<HeroConfiguracion['tamano_titulo']>, string> = {
  normal: 'text-4xl',
  grande: 'text-6xl',
}

/**
 * Fase 7 (7.3, UC-12): clases del contenedor por `disposicion`. `dividido`
 * pone el texto a la izquierda y la foto (o un visual decorativo) a la
 * derecha en `md`; `editorial` alinea todo a la izquierda con título enorme.
 */
const CONTENEDOR_DISPOSICION_CLASE: Record<Disposicion, string> = {
  centrado: 'grid gap-4 p-8 text-center',
  dividido: 'grid gap-8 p-8 text-left md:grid-cols-2 md:items-center',
  editorial: 'grid gap-6 p-8 text-left md:p-12',
}

/** Bloque de texto (título, rotativos, subtítulo, botones, redes) por disposición. */
const TEXTOS_DISPOSICION_CLASE: Record<Disposicion, string> = {
  centrado: 'relative z-10 grid min-w-0 gap-4',
  dividido: 'relative z-10 grid min-w-0 gap-4',
  editorial: 'relative z-10 grid min-w-0 gap-6',
}

/** Título editorial: enorme, apretado y siempre a la izquierda. */
const TITULO_EDITORIAL_CLASE =
  'text-6xl font-bold leading-[0.95] tracking-tight text-balance md:text-8xl'

const SUBTITULO_DISPOSICION_CLASE: Record<Disposicion, string> = {
  centrado: 'text-center text-lg',
  dividido: 'text-left text-lg',
  editorial: 'max-w-md text-left text-lg',
}

const BOTONES_DISPOSICION_CLASE: Record<Disposicion, string> = {
  centrado: 'relative z-10 flex flex-wrap justify-center gap-3',
  dividido: 'relative z-10 flex flex-wrap justify-start gap-3',
  editorial: 'relative z-10 flex flex-wrap justify-start gap-3',
}

/** `efecto_titulo` degradado: texto con degradado primario → secundario. `resaltado` se resuelve por palabra. */
const EFECTO_TITULO_CLASE: Record<NonNullable<HeroConfiguracion['efecto_titulo']>, string> = {
  ninguno: '',
  degradado:
    'bg-linear-to-r from-[var(--color-primario)] to-[var(--color-secundario)] bg-clip-text text-transparent',
  resaltado: '',
}

/** Marcador de la última palabra con `efecto_titulo: 'resaltado'`. */
const RESALTADO_CLASE = 'rounded-md bg-[var(--color-primario)]/30 px-2 box-decoration-clone'

/** `decoracion_fondo: 'manchas'`: tres blobs difuminados con animación lenta (`.hero-blob`, `index.css`). */
const MANCHAS_CLASE: string[] = [
  'hero-blob absolute -top-16 -left-16 size-64 rounded-full bg-[var(--color-primario)]/30 blur-3xl',
  'hero-blob absolute top-1/3 -right-20 size-72 rounded-full bg-[var(--color-secundario)]/30 blur-3xl [animation-delay:-6s]',
  'hero-blob absolute -bottom-20 left-1/3 size-60 rounded-full bg-[var(--color-primario)]/20 blur-3xl [animation-delay:-11s]',
]

/** `decoracion_fondo`: patrones CSS (cuadrícula y puntos), difuminados hacia los bordes. */
const PATRON_ESTILO: Record<'cuadricula' | 'puntos', CSSProperties> = {
  cuadricula: {
    backgroundImage:
      'linear-gradient(var(--color-primario) 1px, transparent 1px), linear-gradient(90deg, var(--color-primario) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  },
  puntos: {
    backgroundImage: 'radial-gradient(var(--color-primario) 1.5px, transparent 1.5px)',
    backgroundSize: '24px 24px',
  },
}

const PATRON_CLASE =
  'absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]'

/** Intervalo (ms) entre títulos rotativos. */
const INTERVALO_TITULOS_MS = 2800

/**
 * Botón del hero (Fase 7, UC-12): ruta interna (`/x`) con react-router, ancla
 * (`#x`) y `mailto:` en la misma pestaña, `http(s)` en pestaña nueva. Un
 * enlace no válido (`javascript:`, esquema desconocido; ver
 * `resolverEnlaceSeguro`) no genera `href`: el botón se muestra deshabilitado.
 */
function BotonEnlace({
  url,
  className,
  style,
  children,
}: {
  url: string | undefined
  className: string
  style: CSSProperties
  children: ReactNode
}) {
  const enlace = resolverEnlaceSeguro(url)
  if (!enlace) {
    return (
      <span
        role="link"
        aria-disabled="true"
        style={style}
        className={cn(className, 'cursor-not-allowed opacity-50')}
      >
        {children}
      </span>
    )
  }
  return (
    <EnlaceBloque {...enlace} style={style} className={className}>
      {children}
    </EnlaceBloque>
  )
}

/** Título con `efecto_titulo` (degradado por CSS, resaltado = marcador en la última palabra). */
function TextoTitulo({
  titulo,
  efecto,
}: {
  titulo: string
  efecto: NonNullable<HeroConfiguracion['efecto_titulo']>
}) {
  if (efecto !== 'resaltado') return <>{titulo}</>
  const palabras = titulo.trim().split(/\s+/)
  const ultima = palabras.pop() ?? ''
  return (
    <>
      {palabras.length > 0 ? `${palabras.join(' ')} ` : null}
      <span data-resaltado="true" className={RESALTADO_CLASE}>
        {ultima}
      </span>
    </>
  )
}

/**
 * Títulos rotativos bajo el título (Fase 7, 7.3): uno cada
 * `INTERVALO_TITULOS_MS` con entrada/salida vertical (`AnimatePresence`). Sin
 * animaciones (movimiento reducido o lienzo del editor) muestra el primero
 * fijo. Los lectores de pantalla reciben la lista completa en texto, no la
 * rotación.
 */
function TitulosRotativos({ titulos }: { titulos: string[] }) {
  const activa = useAnimacionesActivas()
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    if (!activa || titulos.length < 2) return
    const temporizador = setInterval(
      () => setIndice((actual) => (actual + 1) % titulos.length),
      INTERVALO_TITULOS_MS,
    )
    return () => clearInterval(temporizador)
  }, [activa, titulos.length])

  const actual = titulos[activa ? indice % titulos.length : 0]

  return (
    <p
      data-titulos-rotativos="true"
      className="relative z-10 min-h-[1.75em] text-xl font-semibold md:text-2xl"
      style={{ color: 'var(--color-primario)' }}
    >
      <span className="sr-only">{titulos.join(', ')}</span>
      <span aria-hidden="true">
        {activa ? (
          <AnimatePresence mode="wait" initial={false}>
            <m.span
              key={indice}
              className="inline-block"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              {actual}
            </m.span>
          </AnimatePresence>
        ) : (
          actual
        )}
      </span>
    </p>
  )
}

function DecoracionFondo({ tipo }: { tipo: NonNullable<HeroConfiguracion['decoracion_fondo']> }) {
  if (tipo === 'ninguna') return null
  return (
    <div
      aria-hidden="true"
      data-decoracion={tipo}
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg"
    >
      {tipo === 'manchas' ? (
        MANCHAS_CLASE.map((clase) => <div key={clase} className={clase} />)
      ) : (
        <div className={PATRON_CLASE} style={PATRON_ESTILO[tipo]} />
      )}
    </div>
  )
}

/** Flecha animada al pie que enlaza con la sección siguiente. */
function IndicadorScroll({ href }: { href?: string }) {
  const flecha = (
    <ChevronDown
      className="size-6 animate-bounce motion-reduce:animate-none"
      aria-hidden="true"
    />
  )
  const clase = 'absolute bottom-4 left-1/2 z-10 -translate-x-1/2'

  if (!href) {
    return (
      <span data-indicador-scroll="true" aria-hidden="true" className={clase}>
        {flecha}
      </span>
    )
  }
  return (
    <EnlaceBloque
      href={href}
      aria-label="Ir a la siguiente sección"
      className={cn(clase, 'rounded-full p-1')}
    >
      <span data-indicador-scroll="true">{flecha}</span>
    </EnlaceBloque>
  )
}

/**
 * Bloque `hero` (portada), compartido entre el sitio público y el lienzo del
 * editor de Puck (Fase 3.1, extendido Fase 3.4). Fase 7 (7.3, UC-12): tres
 * `disposicion`es, títulos rotativos, segundo botón, redes, indicador de
 * scroll, efectos de título y decoración de fondo — todos compatibles con
 * `imagen_fondo` y `overlay_fondo`.
 */
export function BloqueHero({
  config,
  perfil,
  alineacionTitulo,
  redesSociales = [],
  hrefSiguiente,
}: BloqueHeroProps) {
  const modoRenderizado = useModoRenderizado()
  const disposicion: Disposicion = config.disposicion ?? 'centrado'
  const efectoTitulo = config.efecto_titulo ?? 'ninguno'
  const decoracion = config.decoracion_fondo ?? 'ninguna'
  const titulosRotativos = (config.titulos_rotativos ?? []).filter((titulo) => titulo.trim() !== '')
  const mostrarFoto =
    config.mostrar_foto_perfil &&
    config.posicion_foto !== 'ninguna' &&
    Boolean(perfil?.imagen_perfil)
  const enColumna = disposicion === 'dividido'
  const esEsquina =
    config.posicion_foto === 'esquina_superior' || config.posicion_foto === 'esquina_inferior'

  const claseFoto =
    config.estilo_foto === 'con_marco'
      ? 'rounded-full border-4 object-cover'
      : 'object-contain drop-shadow-lg'

  const fotoPerfil =
    mostrarFoto && perfil?.imagen_perfil ? (
      <ImagenResponsive
        media={perfil.imagen_perfil}
        alt={perfil.imagen_perfil.alt_text ?? perfil.nombre_completo}
        sizes={SIZES_POR_CONTEXTO.hero_foto}
        // Fase 6/8 (UC-34): la foto del hero está above-the-fold (LCP):
        // `prioridad` = eager + fetchPriority alta, sin lazy.
        prioridad
        style={{
          ...(config.estilo_foto === 'con_marco'
            ? { borderColor: 'var(--color-primario)' }
            : undefined),
          // `width`/`height` fijos en píxeles y, en el branch de esquina,
          // `position: absolute` con el offset correspondiente: fallback
          // defensivo, SOLO en modo `'editor'` (lienzo de Puck), para una
          // condición de carrera propia de `@puckeditor/core` (`AutoFrame
          // couldn't load a stylesheet`) que puede dejar el mirror de
          // estilos del iframe sin resolver todavía cuando la imagen se
          // pinta — un `style` inline no depende de que cargue ningún
          // stylesheet. En modo `'publico'` NO se agrega nada de esto: un
          // `style` inline siempre gana sobre el shorthand de una clase
          // Tailwind con el mismo nombre (`size-24`/`size-16 sm:size-20`),
          // así que forzarlo ahí rompería el tamaño real (y el
          // comportamiento responsive del caso esquina) en producción.
          ...(modoRenderizado === 'editor'
            ? {
                // 96px = `size-24` (centrada), 80px = `sm:size-20` (esquina,
                // piso seguro), 240px = `sm:size-60` (columna de `dividido`,
                // Fase 7). No necesita ser pixel-perfect: es un fallback.
                width: enColumna ? 240 : config.posicion_foto === 'centrada' ? 96 : 80,
                height: enColumna ? 240 : config.posicion_foto === 'centrada' ? 96 : 80,
                ...(!enColumna && config.posicion_foto !== 'centrada'
                  ? {
                      position: 'absolute',
                      right: 16,
                      ...(config.posicion_foto === 'esquina_superior'
                        ? { top: 16 }
                        : { bottom: 16 }),
                    }
                  : undefined),
              }
            : undefined),
        }}
        className={
          enColumna
            ? `relative z-10 mx-auto size-48 sm:size-60 md:size-72 ${claseFoto}`
            : config.posicion_foto === 'centrada'
              ? `relative z-10 ${disposicion === 'centrado' ? 'mx-auto ' : ''}size-24 ${claseFoto}`
              : `absolute z-10 size-16 sm:size-20 ${claseFoto} ${
                  config.posicion_foto === 'esquina_superior'
                    ? 'top-4 right-4'
                    : 'bottom-4 right-4'
                }`
        }
      />
    ) : null

  const overlayClase = OVERLAY_CLASE[config.overlay_fondo ?? 'ninguno']

  const textoBoton = config.texto_boton && config.enlace_boton
  const textoBotonSecundario = config.texto_boton_secundario && config.enlace_boton_secundario
  const mostrarRedes = Boolean(config.mostrar_redes) && redesSociales.length > 0

  const textos = (
    <div className={TEXTOS_DISPOSICION_CLASE[disposicion]}>
      <h1
        className={cn(
          // `anywhere` (no `break-words`): también reduce el ancho mínimo, así que un
          // nombre largo no ensancha la rejilla ni provoca scroll horizontal a 360 px.
          'font-bold [overflow-wrap:anywhere]',
          disposicion === 'editorial'
            ? TITULO_EDITORIAL_CLASE
            : TAMANO_TITULO_CLASE[config.tamano_titulo ?? 'normal'],
          disposicion === 'centrado' && alineacionTitulo,
          EFECTO_TITULO_CLASE[efectoTitulo],
        )}
        style={efectoTitulo === 'degradado' ? undefined : { color: 'var(--color-texto)' }}
      >
        <TextoTitulo titulo={config.titulo} efecto={efectoTitulo} />
      </h1>
      {titulosRotativos.length > 0 ? <TitulosRotativos titulos={titulosRotativos} /> : null}
      <p
        className={cn('relative z-10', SUBTITULO_DISPOSICION_CLASE[disposicion])}
        style={{ color: 'var(--color-texto)' }}
      >
        {config.subtitulo}
      </p>
      {textoBoton || textoBotonSecundario ? (
        <div className={BOTONES_DISPOSICION_CLASE[disposicion]}>
          {textoBoton ? (
            <BotonEnlace
              url={config.enlace_boton}
              style={{
                backgroundColor: 'var(--color-primario)',
                color: 'var(--color-texto)',
              }}
              className="rounded-md px-6 py-2.5 text-center text-sm font-medium"
            >
              {config.texto_boton}
            </BotonEnlace>
          ) : null}
          {textoBotonSecundario ? (
            <BotonEnlace
              url={config.enlace_boton_secundario}
              style={{
                borderColor: 'var(--color-primario)',
                color: 'var(--color-texto)',
              }}
              className="rounded-md border-2 bg-transparent px-6 py-2.5 text-center text-sm font-medium transition-colors hover:bg-[var(--color-primario)]/10"
            >
              {config.texto_boton_secundario}
            </BotonEnlace>
          ) : null}
        </div>
      ) : null}
      {mostrarRedes ? (
        <div className="relative z-10">
          <RedesSociales
            redes={redesSociales}
            cvMedia={null}
            estilo="iconos"
            compacto
            alineacion={disposicion === 'centrado' ? 'centro' : 'inicio'}
          />
        </div>
      ) : null}
    </div>
  )

  return (
    <div
      style={
        config.imagen_fondo
          ? {
              // Fase 8 (8.2, UC-34): `image-set()` AVIF/WebP con el original
              // como respaldo dentro de la propia lista.
              backgroundImage: fondoImagenSet(config.imagen_fondo),
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
      className={cn(
        'relative rounded-lg',
        CONTENEDOR_DISPOSICION_CLASE[disposicion],
        ALTURA_CLASE[config.altura ?? 'normal'],
        config.mostrar_indicador_scroll && 'pb-16',
        decoracion !== 'ninguna' && 'overflow-hidden',
      )}
    >
      {/*
        Overlay semi-transparente entre la imagen de fondo (`background-image`
        del propio contenedor) y el contenido (texto/foto): un `<div>`
        absoluto sin `z-index` explícito que, al ir ANTES en el DOM que el
        contenido, pinta por debajo de este sin necesidad de coordinar
        z-index — el contenido de abajo sí lleva `relative z-10` por
        explicitud, no porque sea estrictamente necesario contra este overlay.
        La decoración (Fase 7) va entre el overlay y el contenido.
      */}
      {overlayClase ? (
        <div className={cn('absolute inset-0 rounded-lg', overlayClase)} aria-hidden="true" />
      ) : null}
      <DecoracionFondo tipo={decoracion} />
      {!enColumna && config.posicion_foto === 'centrada' ? fotoPerfil : null}
      {textos}
      {enColumna ? (
        fotoPerfil ? (
          <div className="relative z-10 flex justify-center">{fotoPerfil}</div>
        ) : (
          <div
            aria-hidden="true"
            data-visual-decorativo="true"
            className="relative z-10 mx-auto aspect-square w-full max-w-xs rounded-[2rem] border bg-linear-to-br from-[var(--color-primario)]/30 to-[var(--color-secundario)]/30 shadow-xl"
          />
        )
      ) : null}
      {!enColumna && esEsquina ? fotoPerfil : null}
      {config.mostrar_indicador_scroll ? <IndicadorScroll href={hrefSiguiente} /> : null}
    </div>
  )
}
