import type { PerfilPublico } from '@/features/publico/types'
import type { RedSocial } from '@/features/redes-sociales/types'
import type { ContactoConfiguracion } from '@/features/secciones/types'
import { RedesSociales } from '../RedesSociales'

type BloqueContactoProps = {
  titulo: string
  config: ContactoConfiguracion
  perfil: PerfilPublico | null
  redesSociales: RedSocial[]
}

/** Bloque `contacto`, compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1). */
export function BloqueContacto({
  titulo,
  config,
  perfil,
  redesSociales,
}: BloqueContactoProps) {
  return (
    <div className="mx-auto grid max-w-2xl gap-4 text-center">
      <h2 className="text-2xl font-semibold">{titulo}</h2>
      {config.mostrar_formulario ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay un formulario de contacto disponible: escríbeme
          directamente por cualquiera de estos medios.
        </p>
      ) : null}
      <RedesSociales redes={redesSociales} cvMedia={perfil?.cv_media ?? null} />
    </div>
  )
}
