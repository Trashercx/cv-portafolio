import { siDocker, siGit, siNodedotjs, siPostgresql, siReact } from 'simple-icons'
import { Code2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Mapea `Skill.icono` (elegido por el admin al crear cada skill, UC-16) al
 * ícono renderizado en el carrusel público y en el listado del panel.
 *
 * - `nodejs`, `react`, `postgresql`, `docker`, `git` usan el glifo de marca
 *   real de `simple-icons` (mismo paquete de solo datos ya usado en
 *   `features/redes-sociales/iconos-plataforma.tsx`).
 * - `aws`, `azure` y `java`: esta versión de `simple-icons` (v16) no expone
 *   ningún ícono para estas marcas (verificado contra sus exports reales,
 *   sin ningún `siAmazon*`/`siMicrosoftazure*`/`siJava` disponible) — mismo
 *   caso que LinkedIn en `iconos-plataforma.tsx`. Se usa un monograma
 *   tipográfico con el color de marca en vez de reconstruir a mano un logo
 *   registrado.
 */
type IconoConfig =
  | { tipo: 'lucide'; Icono: typeof Code2 }
  | { tipo: 'simple-icons'; path: string; hex: string }
  | { tipo: 'monograma'; texto: string; hex: string }

const ICONOS_SKILL: Record<string, IconoConfig> = {
  nodejs: { tipo: 'simple-icons', path: siNodedotjs.path, hex: siNodedotjs.hex },
  java: { tipo: 'monograma', texto: 'Java', hex: 'E76F00' },
  aws: { tipo: 'monograma', texto: 'AWS', hex: 'FF9900' },
  azure: { tipo: 'monograma', texto: 'Az', hex: '0078D4' },
  react: { tipo: 'simple-icons', path: siReact.path, hex: siReact.hex },
  postgresql: { tipo: 'simple-icons', path: siPostgresql.path, hex: siPostgresql.hex },
  docker: { tipo: 'simple-icons', path: siDocker.path, hex: siDocker.hex },
  git: { tipo: 'simple-icons', path: siGit.path, hex: siGit.hex },
}

const ICONO_POR_DEFECTO: IconoConfig = { tipo: 'lucide', Icono: Code2 }

/**
 * Catálogo de claves sugeridas para el selector del formulario
 * (`SkillFormDialog`): cualquier otra clave de texto libre igual se
 * renderiza, con el ícono genérico de `lucide-react` como fallback.
 */
export const CLAVES_ICONO_SKILL = [
  'nodejs',
  'java',
  'aws',
  'azure',
  'react',
  'postgresql',
  'docker',
  'git',
] as const

function obtenerIconoSkill(icono: string): IconoConfig {
  return ICONOS_SKILL[icono] ?? ICONO_POR_DEFECTO
}

type IconoSkillProps = {
  icono: string
  className?: string
}

/** Ícono de marca (o fallback genérico) para un `Skill.icono` dado. */
export function IconoSkill({ icono, className }: IconoSkillProps) {
  const config = obtenerIconoSkill(icono)

  if (config.tipo === 'lucide') {
    return (
      <config.Icono
        className={cn('size-6 text-muted-foreground', className)}
        aria-hidden="true"
      />
    )
  }

  if (config.tipo === 'simple-icons') {
    return (
      <svg
        viewBox="0 0 24 24"
        className={cn('size-6', className)}
        fill={`#${config.hex}`}
        aria-hidden="true"
      >
        <path d={config.path} />
      </svg>
    )
  }

  return (
    <span
      className={cn(
        'flex items-center justify-center text-[10px] leading-none font-black',
        className,
      )}
      style={{ color: `#${config.hex}` }}
      aria-hidden="true"
    >
      {config.texto}
    </span>
  )
}
