import type { PerfilPublico } from '@/features/publico/types'
import type { RedSocial } from '@/features/redes-sociales/types'
import type { ContactoConfiguracion } from '@/features/secciones/types'
import { cn } from '@/lib/utils'
import { RedesSociales } from '../RedesSociales'

type BloqueContactoProps = {
  titulo: string
  config: ContactoConfiguracion
  perfil: PerfilPublico | null
  redesSociales: RedSocial[]
  /** Clase ya resuelta de `ALINEACION_TEXTO_CLASE` (Fase 3.4), aplicada al `<h2>`. */
  alineacionTitulo?: string
}

/** Tarjeta grande con degradado de la variante `tarjeta_destacada` (Fase 7, 7.3, UC-12). */
const TARJETA_DESTACADA_CLASE =
  'grid gap-6 rounded-3xl border bg-linear-to-br from-[var(--color-primario)]/15 to-[var(--color-secundario)]/15 p-8 text-center shadow-lg sm:p-12'

/** Bloque `contacto`, compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1, extendido Fase 3.4 y Fase 7). */
export function BloqueContacto({
  titulo,
  config,
  perfil,
  redesSociales,
  alineacionTitulo,
}: BloqueContactoProps) {
  const destacada = config.estilo === 'tarjeta_destacada'
  const llamada = config.texto_llamada?.trim()

  const aviso = config.mostrar_formulario ? (
    <p className="text-center text-sm text-muted-foreground">
      Todavía no hay un formulario de contacto disponible: escríbeme
      directamente por cualquiera de estos medios.
    </p>
  ) : null

  if (destacada) {
    return (
      <div data-estilo-contacto="tarjeta_destacada" className={TARJETA_DESTACADA_CLASE}>
        <div className="grid gap-2">
          <h2
            className={cn(
              llamada
                ? 'text-sm font-semibold uppercase tracking-wide text-muted-foreground'
                : 'text-3xl font-bold',
              'text-center',
            )}
          >
            {titulo}
          </h2>
          {llamada ? (
            <p className="text-3xl font-bold text-balance sm:text-4xl">{llamada}</p>
          ) : null}
        </div>
        {aviso}
        {/* Botones de color primario + descarga del CV, centrados. */}
        <RedesSociales
          redes={redesSociales}
          cvMedia={perfil?.cv_media ?? null}
          estilo="botones"
        />
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <h2 className={cn('text-2xl font-semibold', alineacionTitulo)}>{titulo}</h2>
      {aviso}
      <RedesSociales
        redes={redesSociales}
        cvMedia={perfil?.cv_media ?? null}
        estilo={config.estilo_redes ?? 'iconos'}
      />
    </div>
  )
}
