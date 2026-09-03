import type { PerfilPublico } from '@/features/publico/types'
import type { SobreMiConfiguracion } from '@/features/secciones/types'

type BloqueSobreMiProps = {
  titulo: string
  config: SobreMiConfiguracion
  perfil: PerfilPublico | null
}

/** Bloque `sobre-mi`, compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1). */
export function BloqueSobreMi({ titulo, config, perfil }: BloqueSobreMiProps) {
  if (!perfil) return null

  return (
    <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
      {config.mostrar_foto && perfil.imagen_perfil ? (
        <img
          src={perfil.imagen_perfil.url}
          alt={perfil.imagen_perfil.alt_text ?? perfil.nombre_completo}
          className="size-32 rounded-full object-cover"
        />
      ) : null}
      <div className="grid gap-2">
        <h2 className="text-2xl font-semibold">{titulo}</h2>
        <p className="font-medium text-muted-foreground">
          {perfil.titulo_profesional} · {perfil.ubicacion}
        </p>
        <p className="whitespace-pre-line">{perfil.resumen_bio}</p>
      </div>
    </div>
  )
}
