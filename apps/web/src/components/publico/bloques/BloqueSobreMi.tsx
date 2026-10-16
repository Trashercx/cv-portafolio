import { useEffect, useRef, useState } from 'react'
import { animate, useInView } from 'motion/react'
import type { PerfilPublico } from '@/features/publico/types'
import type { Estadistica, SobreMiConfiguracion } from '@/features/secciones/types'
import { useAnimacionesActivas } from '@/lib/animaciones'
import { analizarValorEstadistica } from '@/lib/estadisticas'
import { SIZES_POR_CONTEXTO } from '@/lib/imagenes'
import { cn } from '@/lib/utils'
import { ImagenResponsive } from '../ImagenResponsive'
import { ItemAnimado } from '../ItemAnimado'
import { CLASES_BORDE_BLOQUE, GROSOR_BORDE_X4_CLASE } from '@/lib/escalas-bloque'
import { TituloBloque } from './TituloBloque'

type BloqueSobreMiProps = {
  titulo: string
  config: SobreMiConfiguracion
  perfil: PerfilPublico | null
  /** Clase ya resuelta de `ALINEACION_TEXTO_CLASE` (Fase 3.4), aplicada al `<h2>`. */
  alineacionTitulo?: string
}

type EstiloFoto = NonNullable<SobreMiConfiguracion['estilo_foto']>

/**
 * Fase 7 (7.3, UC-12): `estilo_foto`. `envoltura` rodea la `<img>`;
 * `marco_degradado` es un anillo primario → secundario (el `p-1` deja ver el
 * degradado), `flotante` suma sombra grande y levitación suave
 * (`.foto-flotante`, `index.css`, apagada con movimiento reducido).
 */
const ESTILO_FOTO_ENVOLTURA_CLASE: Record<EstiloFoto, string> = {
  simple: '',
  marco_degradado:
    'p-1 bg-linear-to-br from-[var(--color-primario)] to-[var(--color-secundario)]',
  flotante: 'shadow-2xl foto-flotante',
}

/** Borde interior de la foto con `marco_degradado`, para separarla del anillo. */
const ESTILO_FOTO_IMAGEN_CLASE: Record<EstiloFoto, string> = {
  simple: '',
  marco_degradado: `${GROSOR_BORDE_X4_CLASE} border-background`,
  flotante: '',
}

/** Valor de una estadística; cuenta de 0 al número al entrar en el viewport si hay animaciones. */
function ValorEstadistica({ valor }: { valor: string }) {
  const analizado = analizarValorEstadistica(valor)
  const animaciones = useAnimacionesActivas()
  const referencia = useRef<HTMLSpanElement>(null)
  const visible = useInView(referencia, { once: true, amount: 0.5 })
  const contar = animaciones && analizado !== null
  const [mostrado, setMostrado] = useState(0)

  const numeroObjetivo = analizado ? analizado.numero : null

  useEffect(() => {
    if (!contar || !visible || numeroObjetivo === null) return
    const control = animate(0, numeroObjetivo, {
      duration: 1.4,
      ease: 'easeOut',
      onUpdate: (actual) => setMostrado(actual),
    })
    return () => control.stop()
  }, [contar, visible, numeroObjetivo])

  const textoVisible =
    contar && analizado
      ? `${mostrado.toFixed(analizado.decimales)}${analizado.sufijo}`
      : valor

  return (
    <span ref={referencia}>
      {/* Los lectores de pantalla leen el valor final, no la cuenta. */}
      <span className="sr-only">{valor}</span>
      <span aria-hidden="true">{textoVisible}</span>
    </span>
  )
}

/** Bloque `sobre-mi`, compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1, extendido Fase 3.4 y Fase 7). */
export function BloqueSobreMi({
  titulo,
  config,
  perfil,
  alineacionTitulo,
}: BloqueSobreMiProps) {
  if (!perfil) return null

  const mostrarFoto = config.mostrar_foto && Boolean(perfil.imagen_perfil)
  const fotoPrimero = (config.posicion_foto ?? 'izquierda') === 'izquierda'
  const circular = (config.forma_foto ?? 'circular') === 'circular'
  const claseForma = circular ? 'rounded-full' : 'rounded-lg'
  const estiloFoto: EstiloFoto = config.estilo_foto ?? 'simple'
  const estadisticas: Estadistica[] = (config.estadisticas ?? []).slice(0, 4)
  const claseGrid = mostrarFoto
    ? fotoPrimero
      ? 'sm:grid-cols-[auto_1fr]'
      : 'sm:grid-cols-[1fr_auto]'
    : 'sm:grid-cols-[auto_1fr]'

  const foto =
    mostrarFoto && perfil.imagen_perfil ? (
      <div
        data-estilo-foto={estiloFoto}
        className={cn(
          'w-fit',
          claseForma,
          ESTILO_FOTO_ENVOLTURA_CLASE[estiloFoto],
        )}
      >
        <ImagenResponsive
          media={perfil.imagen_perfil}
          alt={perfil.imagen_perfil.alt_text ?? perfil.nombre_completo}
          sizes={SIZES_POR_CONTEXTO.sobre_mi}
          className={cn('size-32 object-cover', claseForma, ESTILO_FOTO_IMAGEN_CLASE[estiloFoto])}
        />
      </div>
    ) : null

  const texto = (
    <div className="grid gap-2">
      <TituloBloque titulo={titulo} alineacion={alineacionTitulo} mostrar={config.mostrar_titulo} />
      <p className="font-medium text-muted-foreground">
        {perfil.titulo_profesional} · {perfil.ubicacion}
      </p>
      <p className="whitespace-pre-line">{perfil.resumen_bio}</p>
    </div>
  )

  return (
    <div className="grid gap-6">
      <div className={cn('grid gap-4 sm:items-start', claseGrid)}>
        {mostrarFoto && fotoPrimero ? foto : null}
        {texto}
        {mostrarFoto && !fotoPrimero ? foto : null}
      </div>
      {estadisticas.length > 0 ? (
        <ul
          data-estadisticas="true"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {estadisticas.map((estadistica, indice) => (
            <li key={`${estadistica.etiqueta}-${indice}`} className="min-w-0">
              <ItemAnimado indice={indice} className="h-full">
                <div className={cn('h-full rounded-xl bg-card/60 p-4 text-center', CLASES_BORDE_BLOQUE)}>
                  <p
                    className="text-3xl font-bold"
                    style={{ color: 'var(--color-primario)' }}
                  >
                    <ValorEstadistica valor={estadistica.valor} />
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{estadistica.etiqueta}</p>
                </div>
              </ItemAnimado>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
