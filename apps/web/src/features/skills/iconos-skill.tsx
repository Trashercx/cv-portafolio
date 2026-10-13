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

/**
 * Clases de fondo suave (`/10`) + color de texto (consumido como
 * `currentColor` por el SVG) a partir del hex de marca de cada skill —
 * mismo patrón que `COLORES_POR_DEFECTO` en `iconos-plataforma.tsx`.
 *
 * Todos los hex de este catálogo son tonos medios/vivos con suficiente
 * contraste tanto en modo claro como oscuro (verificado a mano), salvo
 * `react` (`#61DAFB`, cian muy claro): en vez de perseguir un tono
 * distinto al de marca, se apoya en el contenedor circular tintado de abajo
 * (`bg-[hex]/10`) para darle un límite visual propio y que no flote suelto
 * sobre el fondo de la página — el mismo tratamiento se aplica a los 8
 * íconos, no solo a `react`, para que el carrusel se vea consistente.
 */
const COLORES_ICONO_SKILL: Record<string, string> = {
  nodejs: 'bg-[#5FA04E]/10 text-[#5FA04E]',
  java: 'bg-[#E76F00]/10 text-[#E76F00]',
  aws: 'bg-[#FF9900]/10 text-[#FF9900]',
  azure: 'bg-[#0078D4]/10 text-[#0078D4]',
  react: 'bg-[#61DAFB]/10 text-[#61DAFB]',
  postgresql: 'bg-[#4169E1]/10 text-[#4169E1]',
  docker: 'bg-[#2496ED]/10 text-[#2496ED]',
  git: 'bg-[#F03C2E]/10 text-[#F03C2E]',
}

const COLOR_ICONO_POR_DEFECTO = 'bg-muted text-muted-foreground'

function obtenerColorIconoSkill(icono: string): string {
  return COLORES_ICONO_SKILL[icono] ?? COLOR_ICONO_POR_DEFECTO
}

/**
 * Escala cerrada de tamaños: contenedor circular + ícono/monograma
 * coherentes entre sí (a diferencia del `className` libre anterior, donde
 * el monograma quedaba con `text-[10px]` fijo sin importar el tamaño del
 * contenedor pedido por cada consumidor).
 *
 * `contenedorPx`/`iconoPx` son el equivalente en píxeles de las clases
 * Tailwind `size-*` de arriba (`size-7`=28px/`size-4`=16px,
 * `size-10`=40px/`size-5`=20px, `size-14`=56px/`size-7`=28px), aplicados
 * como `style` inline además de (no en reemplazo de) esas clases: fallback
 * defensivo para el iframe de Puck, donde una condición de carrera propia de
 * `@puckeditor/core` (`AutoFrame couldn't load a stylesheet`) puede dejar el
 * mirror de estilos del iframe sin resolver todavía cuando el ícono se
 * pinta — un `style` inline no depende de que cargue ningún stylesheet.
 */
const TAMANOS_ICONO_SKILL = {
  sm: {
    contenedor: 'size-7',
    icono: 'size-4',
    monograma: 'text-[8px]',
    contenedorPx: 28,
    iconoPx: 16,
  },
  md: {
    contenedor: 'size-10',
    icono: 'size-5',
    monograma: 'text-[10px]',
    contenedorPx: 40,
    iconoPx: 20,
  },
  lg: {
    contenedor: 'size-14',
    icono: 'size-7',
    monograma: 'text-xs',
    contenedorPx: 56,
    iconoPx: 28,
  },
} as const

type TamanoIconoSkill = keyof typeof TAMANOS_ICONO_SKILL

type IconoSkillProps = {
  icono: string
  /** @default 'md' */
  tamano?: TamanoIconoSkill
  /** Solo para clases que NO sean de tamaño (el tamaño se controla con `tamano`). */
  className?: string
}

/**
 * Insignia circular con el ícono de marca (o fallback genérico) para un
 * `Skill.icono` dado — mismo patrón que `PlataformaIcono` en
 * `iconos-plataforma.tsx`, para que el ícono tenga un límite visual propio
 * en vez de flotar suelto sobre el fondo de la página.
 */
export function IconoSkill({ icono, tamano = 'md', className }: IconoSkillProps) {
  const config = obtenerIconoSkill(icono)
  const medida = TAMANOS_ICONO_SKILL[tamano]

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full',
        medida.contenedor,
        obtenerColorIconoSkill(icono),
        className,
      )}
      style={{ width: medida.contenedorPx, height: medida.contenedorPx }}
    >
      {config.tipo === 'lucide' && (
        <config.Icono
          className={medida.icono}
          style={{ width: medida.iconoPx, height: medida.iconoPx }}
          aria-hidden="true"
        />
      )}
      {config.tipo === 'simple-icons' && (
        <svg
          viewBox="0 0 24 24"
          className={medida.icono}
          style={{ width: medida.iconoPx, height: medida.iconoPx }}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d={config.path} />
        </svg>
      )}
      {config.tipo === 'monograma' && (
        <span
          className={cn('leading-none font-black', medida.monograma)}
          aria-hidden="true"
        >
          {config.texto}
        </span>
      )}
    </span>
  )
}
