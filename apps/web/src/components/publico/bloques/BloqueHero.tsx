import type { PerfilPublico } from '@/features/publico/types'
import type { HeroConfiguracion } from '@/features/secciones/types'
import { EnlaceBloque } from '../contexto-renderizado'

type BloqueHeroProps = {
  config: HeroConfiguracion
  perfil: PerfilPublico | null
}

/** Bloque `hero` (portada), compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1). */
export function BloqueHero({ config, perfil }: BloqueHeroProps) {
  const mostrarFoto =
    config.mostrar_foto_perfil &&
    config.posicion_foto !== 'ninguna' &&
    Boolean(perfil?.imagen_perfil)

  // `esquina_*` se posiciona `absolute` respecto de este contenedor: solo
  // hace falta `position: relative` cuando hay foto en una esquina (en
  // `centrada` la imagen ya sigue el flujo normal del documento).
  const contenedorRelativo =
    mostrarFoto &&
    (config.posicion_foto === 'esquina_superior' ||
      config.posicion_foto === 'esquina_inferior')

  const claseFoto =
    config.estilo_foto === 'con_marco'
      ? 'rounded-full border-4 object-cover'
      : 'object-contain drop-shadow-lg'

  const fotoPerfil =
    mostrarFoto && perfil?.imagen_perfil ? (
      <img
        src={perfil.imagen_perfil.url}
        alt={perfil.imagen_perfil.alt_text ?? perfil.nombre_completo}
        style={
          config.estilo_foto === 'con_marco'
            ? { borderColor: 'var(--color-primario)' }
            : undefined
        }
        className={
          config.posicion_foto === 'centrada'
            ? `mx-auto size-24 ${claseFoto}`
            : `absolute size-16 sm:size-20 ${claseFoto} ${
                config.posicion_foto === 'esquina_superior'
                  ? 'top-4 right-4'
                  : 'bottom-4 right-4'
              }`
        }
      />
    ) : null

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
      className={
        contenedorRelativo
          ? 'relative grid gap-4 rounded-lg p-8 text-center'
          : 'grid gap-4 rounded-lg p-8 text-center'
      }
    >
      {config.posicion_foto === 'centrada' ? fotoPerfil : null}
      <h1
        className="text-4xl font-bold"
        style={{ color: 'var(--color-texto)' }}
      >
        {config.titulo}
      </h1>
      <p
        className="text-lg"
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
          className="mx-auto rounded-md px-6 py-2.5 text-sm font-medium"
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
