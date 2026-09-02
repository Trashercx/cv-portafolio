export type FondoAnimadoProps = {
  fondo: {
    tipo: string
    configuracion: {
      velocidad: string
      opacidad: number
    }
  }
}

/** Duraciones por velocidad, distintas por tipo (aurora es visualmente más lenta que la cuadrícula a igual "velocidad" nominal). */
const DURACIONES: Record<string, Record<string, string>> = {
  degradado_animado: { lenta: '18s', media: '10s', rapida: '5s' },
  aurora_animada: { lenta: '40s', media: '24s', rapida: '14s' },
  particulas: { lenta: '30s', media: '18s', rapida: '9s' },
  cuadricula_animada: { lenta: '24s', media: '14s', rapida: '7s' },
}

function duracion(tipo: string, velocidad: string): string {
  return DURACIONES[tipo]?.[velocidad] ?? '20s'
}

/**
 * Fondo animado del sitio público (UC-15), compartido entre `PublicHomePage`
 * y la vista previa de `FondoSitioPage` para que ambos se vean exactamente
 * igual. Se posiciona `absolute inset-0` detrás del contenido (`z-index: 0`,
 * `pointer-events: none`): el padre debe ser `position: relative` (o
 * equivalente) y el contenido real debe ir en un hermano con `z-index`
 * mayor, como ya hace `PublicHomePage`.
 *
 * Usa las variables CSS de Tema ya inyectadas por `temaComoVariablesCss`
 * (`--color-primario`/`--color-secundario`/`--color-fondo`) en vez de
 * colores hardcodeados, para que el fondo combine con la paleta activa.
 */
export function FondoAnimado({ fondo }: FondoAnimadoProps) {
  const { tipo, configuracion } = fondo
  const dur = duracion(tipo, configuracion.velocidad)

  if (tipo === 'solido') {
    // El color de fondo ya lo aporta `--color-fondo` sobre el contenedor
    // raíz (ver `temaComoVariablesCss`): no hay nada animado que dibujar.
    return null
  }

  return (
    <div
      aria-hidden="true"
      style={{ opacity: configuracion.opacidad }}
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {tipo === 'degradado_animado' ? (
        <div
          className="size-full"
          style={{
            backgroundImage:
              'linear-gradient(120deg, var(--color-primario), var(--color-secundario), var(--color-fondo))',
            backgroundSize: '200% 200%',
            animation: `gradient-shift ${dur} ease infinite`,
          }}
        />
      ) : null}

      {tipo === 'aurora_animada' ? (
        <>
          <div
            className="absolute -top-1/4 -left-1/4 size-[70%] rounded-full"
            style={{
              backgroundColor: 'var(--color-primario)',
              filter: 'blur(80px)',
              animation: `aurora-drift-1 ${dur} ease-in-out infinite alternate`,
            }}
          />
          <div
            className="absolute -right-1/4 top-1/4 size-[60%] rounded-full"
            style={{
              backgroundColor: 'var(--color-secundario)',
              filter: 'blur(90px)',
              animation: `aurora-drift-2 ${dur} ease-in-out infinite alternate`,
            }}
          />
          <div
            className="absolute bottom-0 left-1/3 size-[50%] rounded-full"
            style={{
              backgroundColor: 'var(--color-fondo)',
              filter: 'blur(70px)',
              animation: `aurora-drift-3 ${dur} ease-in-out infinite alternate`,
            }}
          />
        </>
      ) : null}

      {tipo === 'particulas' ? (
        <div
          className="size-full"
          style={{
            backgroundImage:
              'radial-gradient(var(--color-primario) 1.5px, transparent 1.5px), radial-gradient(var(--color-secundario) 1.5px, transparent 1.5px)',
            backgroundSize: '48px 48px, 72px 72px',
            backgroundPosition: '0 0, 24px 36px',
            animation: `particles-float ${dur} linear infinite`,
          }}
        />
      ) : null}

      {tipo === 'cuadricula_animada' ? (
        <div
          className="size-full"
          style={{
            backgroundImage:
              'linear-gradient(var(--color-primario) 1px, transparent 1px), linear-gradient(90deg, var(--color-primario) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            animation: `grid-drift ${dur} linear infinite`,
          }}
        />
      ) : null}
    </div>
  )
}
