import type { PerfilPublico } from '@/features/publico/types'
import type { HeroConfiguracion } from '@/features/secciones/types'
import { cn } from '@/lib/utils'
import { EnlaceBloque, useModoRenderizado } from '../contexto-renderizado'

type BloqueHeroProps = {
  config: HeroConfiguracion
  perfil: PerfilPublico | null
  /**
   * Clase ya resuelta de `ALINEACION_TEXTO_CLASE` (Fase 3.4,
   * `config.alineacion_texto`), aplicada solo al `<h1>` del título — el
   * subtítulo y el botón mantienen su centrado propio, sin depender de este
   * campo (mismo criterio que el resto de los `Bloque*.tsx`).
   */
  alineacionTitulo?: string
}

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

/** Bloque `hero` (portada), compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1, extendido Fase 3.4). */
export function BloqueHero({ config, perfil, alineacionTitulo }: BloqueHeroProps) {
  const modoRenderizado = useModoRenderizado()
  const mostrarFoto =
    config.mostrar_foto_perfil &&
    config.posicion_foto !== 'ninguna' &&
    Boolean(perfil?.imagen_perfil)

  const claseFoto =
    config.estilo_foto === 'con_marco'
      ? 'rounded-full border-4 object-cover'
      : 'object-contain drop-shadow-lg'

  const fotoPerfil =
    mostrarFoto && perfil?.imagen_perfil ? (
      <img
        src={perfil.imagen_perfil.url}
        alt={perfil.imagen_perfil.alt_text ?? perfil.nombre_completo}
        style={{
          ...(config.estilo_foto === 'con_marco'
            ? { borderColor: 'var(--color-primario)' }
            : undefined),
          // `width`/`height` fijos en píxeles y, en el branch de esquina,
          // `position: absolute` con el offset correspondiente: fallback
          // defensivo, SOLO en modo `'editor'` (lienzo de Puck), para una
          // condición de carrera propia de `@measured/puck` (`AutoFrame
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
                // 96px = equivalente a `size-24` (caso centrada); 80px =
                // equivalente a `sm:size-20`, el tamaño más grande de las
                // clases responsive del caso esquina, usado como piso
                // seguro — no replica el breakpoint exacto acá, pero es
                // solo un fallback defensivo dentro del editor, no
                // necesita ser pixel-perfect.
                width: config.posicion_foto === 'centrada' ? 96 : 80,
                height: config.posicion_foto === 'centrada' ? 96 : 80,
                ...(config.posicion_foto !== 'centrada'
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
          config.posicion_foto === 'centrada'
            ? `relative z-10 mx-auto size-24 ${claseFoto}`
            : `absolute z-10 size-16 sm:size-20 ${claseFoto} ${
                config.posicion_foto === 'esquina_superior'
                  ? 'top-4 right-4'
                  : 'bottom-4 right-4'
              }`
        }
      />
    ) : null

  const overlayClase = OVERLAY_CLASE[config.overlay_fondo ?? 'ninguno']

  return (
    <div
      style={
        config.imagen_fondo
          ? {
              backgroundImage: `url(${config.imagen_fondo.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
      className={cn(
        'relative grid gap-4 rounded-lg p-8 text-center',
        ALTURA_CLASE[config.altura ?? 'normal'],
      )}
    >
      {/*
        Overlay semi-transparente entre la imagen de fondo (`background-image`
        del propio contenedor) y el contenido (texto/foto): un `<div>`
        absoluto sin `z-index` explícito que, al ir ANTES en el DOM que el
        contenido, pinta por debajo de este sin necesidad de coordinar
        z-index — el contenido de abajo sí lleva `relative z-10` por
        explicitud, no porque sea estrictamente necesario contra este overlay.
      */}
      {overlayClase ? (
        <div className={cn('absolute inset-0 rounded-lg', overlayClase)} aria-hidden="true" />
      ) : null}
      {config.posicion_foto === 'centrada' ? fotoPerfil : null}
      <h1
        className={cn(
          'relative z-10 font-bold',
          TAMANO_TITULO_CLASE[config.tamano_titulo ?? 'normal'],
          alineacionTitulo,
        )}
        style={{ color: 'var(--color-texto)' }}
      >
        {config.titulo}
      </h1>
      <p
        className="relative z-10 text-center text-lg"
        style={{ color: 'var(--color-texto)' }}
      >
        {config.subtitulo}
      </p>
      {config.texto_boton && config.enlace_boton ? (
        <EnlaceBloque
          href={config.enlace_boton}
          target="_blank"
          rel="noreferrer"
          style={{
            backgroundColor: 'var(--color-primario)',
            color: 'var(--color-texto)',
          }}
          className="relative z-10 mx-auto rounded-md px-6 py-2.5 text-center text-sm font-medium"
        >
          {config.texto_boton}
        </EnlaceBloque>
      ) : null}
      {config.posicion_foto === 'esquina_superior' ||
      config.posicion_foto === 'esquina_inferior'
        ? fotoPerfil
        : null}
    </div>
  )
}
