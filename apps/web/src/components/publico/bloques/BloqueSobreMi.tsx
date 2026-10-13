import type { PerfilPublico } from '@/features/publico/types'
import type { SobreMiConfiguracion } from '@/features/secciones/types'
import { cn } from '@/lib/utils'

type BloqueSobreMiProps = {
  titulo: string
  config: SobreMiConfiguracion
  perfil: PerfilPublico | null
  /** Clase ya resuelta de `ALINEACION_TEXTO_CLASE` (Fase 3.4), aplicada al `<h2>`. */
  alineacionTitulo?: string
}

/** Bloque `sobre-mi`, compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1, extendido Fase 3.4). */
export function BloqueSobreMi({
  titulo,
  config,
  perfil,
  alineacionTitulo,
}: BloqueSobreMiProps) {
  if (!perfil) return null

  const mostrarFoto = config.mostrar_foto && Boolean(perfil.imagen_perfil)
  const fotoPrimero = (config.posicion_foto ?? 'izquierda') === 'izquierda'
  const claseForma =
    (config.forma_foto ?? 'circular') === 'circular' ? 'rounded-full' : 'rounded-lg'
  const claseGrid = mostrarFoto
    ? fotoPrimero
      ? 'sm:grid-cols-[auto_1fr]'
      : 'sm:grid-cols-[1fr_auto]'
    : 'sm:grid-cols-[auto_1fr]'

  const foto =
    mostrarFoto && perfil.imagen_perfil ? (
      <img
        src={perfil.imagen_perfil.url}
        alt={perfil.imagen_perfil.alt_text ?? perfil.nombre_completo}
        loading="lazy"
        decoding="async"
        className={cn('size-32 object-cover', claseForma)}
      />
    ) : null

  const texto = (
    <div className="grid gap-2">
      <h2 className={cn('text-2xl font-semibold', alineacionTitulo)}>{titulo}</h2>
      <p className="font-medium text-muted-foreground">
        {perfil.titulo_profesional} · {perfil.ubicacion}
      </p>
      <p className="whitespace-pre-line">{perfil.resumen_bio}</p>
    </div>
  )

  return (
    <div className={cn('grid gap-4 sm:items-start', claseGrid)}>
      {mostrarFoto && fotoPrimero ? foto : null}
      {texto}
      {mostrarFoto && !fotoPrimero ? foto : null}
    </div>
  )
}
