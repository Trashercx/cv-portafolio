import type { ReactNode } from 'react'
import type { EfectoHoverTarjeta } from '@/features/secciones/types'
import { ESTILO_TARJETA_CLASE } from '@/lib/escalas-bloque'
import { cn } from '@/lib/utils'
import { TarjetaClicable } from './contexto-renderizado'
import { TarjetaInteractiva } from './TarjetaInteractiva'

type PosicionMedio = 'arriba' | 'izquierda' | 'fila_md' | 'fila_md_inversa'

type TarjetaContenidoProps = {
  /** Imagen, logo o icono de la tarjeta (siempre con `ImagenResponsive` si es media). */
  medio?: ReactNode
  /** `arriba` (portada), `izquierda` (logo, fila siempre) o `fila_md`/`fila_md_inversa` (apilada en móvil, en fila desde md: vitrina). */
  posicionMedio?: PosicionMedio
  /** Clases del contenedor del medio (ancho cuando va a un lado). */
  claseMedio?: string
  /** Clases extra del cuerpo de texto (relleno, centrado vertical...). */
  claseCuerpo?: string
  titulo: string
  /** Línea meta (emisor, fechas, lenguaje...). */
  meta?: ReactNode
  descripcion?: ReactNode
  /** Chips (estado, tecnologías, vigencia). */
  chips?: ReactNode
  /** Botones o enlaces; quedan por encima del área clicable de la tarjeta. */
  acciones?: ReactNode
  estiloTarjeta?: keyof typeof ESTILO_TARJETA_CLASE
  efectoHover?: EfectoHoverTarjeta
  /** Clic en la tarjeta (abre el detalle). Inerte en el lienzo (`TarjetaClicable`). */
  onAbrir: () => void
  className?: string
}

/**
 * Anatomía común de las tarjetas de contenido (Fase 7l, UC-02, UC-04): medio
 * arriba o a un lado, título, línea meta, descripción, chips y acciones.
 * Reutiliza `TarjetaInteractiva` (efecto al pasar el cursor) y el contorno
 * variable `CLASES_BORDE_BLOQUE`. Como las acciones son enlaces y no pueden ir
 * dentro de un `<button>`, el clic de la tarjeta es una capa transparente
 * (`TarjetaClicable`, con el título como nombre accesible) que cubre la tarjeta;
 * el contenido va encima sin capturar el puntero y solo `acciones` lo recupera.
 */
export function TarjetaContenido({
  medio,
  posicionMedio = 'arriba',
  claseMedio,
  claseCuerpo,
  titulo,
  meta,
  descripcion,
  chips,
  acciones,
  estiloTarjeta = 'simple',
  efectoHover,
  onAbrir,
  className,
}: TarjetaContenidoProps) {
  return (
    <TarjetaInteractiva efecto={efectoHover} className={cn('h-full', className)}>
      <article
        data-medio={medio ? posicionMedio : undefined}
        className={cn(
          'group/tarjeta relative flex h-full overflow-hidden rounded-lg',
          posicionMedio === 'arriba' && 'flex-col',
          posicionMedio === 'fila_md' && 'flex-col md:flex-row',
          posicionMedio === 'fila_md_inversa' && 'flex-col md:flex-row-reverse',
          posicionMedio === 'izquierda' && 'flex-row',
          ESTILO_TARJETA_CLASE[estiloTarjeta],
        )}
      >
        <TarjetaClicable
          onClick={onAbrir}
          aria-label={titulo}
          className="absolute inset-0 z-0 cursor-pointer rounded-[inherit] transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-[var(--color-primario)] focus-visible:outline-none"
        >
          {null}
        </TarjetaClicable>
        {medio ? (
          <div className={cn('pointer-events-none relative z-[1] shrink-0', claseMedio)}>{medio}</div>
        ) : null}
        <div
          className={cn(
            'pointer-events-none relative z-[1] flex min-w-0 flex-1 flex-col gap-2 p-4',
            claseCuerpo,
          )}
        >
          <h3 className="font-semibold leading-snug">{titulo}</h3>
          {meta ? <div className="text-xs text-muted-foreground">{meta}</div> : null}
          {descripcion}
          {chips}
          {acciones ? (
            <div className="pointer-events-auto mt-auto flex flex-wrap gap-2 pt-1">{acciones}</div>
          ) : null}
        </div>
      </article>
    </TarjetaInteractiva>
  )
}
