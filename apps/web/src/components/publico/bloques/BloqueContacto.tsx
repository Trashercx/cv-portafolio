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

/** Bloque `contacto`, compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1, extendido Fase 3.4). */
export function BloqueContacto({
  titulo,
  config,
  perfil,
  redesSociales,
  alineacionTitulo,
}: BloqueContactoProps) {
  return (
    <div className="grid gap-4">
      <h2 className={cn('text-2xl font-semibold', alineacionTitulo)}>{titulo}</h2>
      {config.mostrar_formulario ? (
        <p className="text-center text-sm text-muted-foreground">
          Todavía no hay un formulario de contacto disponible: escríbeme
          directamente por cualquiera de estos medios.
        </p>
      ) : null}
      <RedesSociales
        redes={redesSociales}
        cvMedia={perfil?.cv_media ?? null}
        estilo={config.estilo_redes ?? 'iconos'}
      />
    </div>
  )
}
