import type { CSSProperties } from 'react'
import { IconoSkill } from '@/features/skills/iconos-skill'
import type { Skill } from '@/features/skills/types'
import type { SkillsConfiguracion } from '@/features/secciones/types'
import { cn } from '@/lib/utils'
import { ItemAnimado } from '../ItemAnimado'
import { CLASES_BORDE_BLOQUE } from '@/lib/escalas-bloque'

type BloqueSkillsProps = {
  titulo: string
  config: SkillsConfiguracion
  skills: Skill[]
  /** Clase ya resuelta de `ALINEACION_TEXTO_CLASE` (Fase 3.4), aplicada al `<h2>`. */
  alineacionTitulo?: string
}

/**
 * Duración base del loop del carrusel de skills (UC-07 + UC-16), calibrada
 * para UNA sola repetición interna de la pista (ver `repeticiones` abajo) —
 * más rápida cuanto mayor la "velocidad" elegida.
 */
const DURACION_BASE_MARQUEE: Record<SkillsConfiguracion['velocidad'], number> = {
  lenta: 60,
  media: 35,
  rapida: 18,
}

/**
 * Ancho estimado (px) mínimo garantizado por ítem del carrusel: el ícono
 * `tamano="lg"` (contenedor circular `size-14` = 56px) más el padding
 * horizontal del ítem (`px-4` = 32px) ya suman 88px, incluso con la
 * etiqueta más corta del catálogo ("Git"). Se usa un valor deliberadamente
 * MENOR (80px) a ese mínimo real: la fórmula de `repeticiones` necesita una
 * subestimación (nunca una sobreestimación) del ancho real para garantizar
 * que la pista renderizada termine cubriendo de sobra el ancho de referencia
 * — sobreestimar el ancho por ítem calcularía menos repeticiones de las
 * necesarias y volvería a producir el hueco que este componente arregla.
 */
const ANCHO_ESTIMADO_POR_ITEM = 80

/** Ancho de referencia (px) a cubrir de sobra: viewport de escritorio típico. */
const ANCHO_MINIMO_PISTA = 1280

type ItemPistaProps = {
  skill: Skill
  tamanoIcono: NonNullable<SkillsConfiguracion['tamano_icono']>
  mostrarNombre: boolean
}

function ItemPista({ skill, tamanoIcono, mostrarNombre }: ItemPistaProps) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2 px-4">
      <IconoSkill icono={skill.icono} tamano={tamanoIcono} />
      {mostrarNombre ? (
        <span className="text-xs text-muted-foreground">{skill.nombre}</span>
      ) : null}
    </div>
  )
}

type DisposicionEstatica = Exclude<NonNullable<SkillsConfiguracion['disposicion']>, 'marquesina'>

/** Contenedor de la lista por disposición (Fase 7, 7.3): cuadrícula responsive o nube centrada. */
const DISPOSICION_LISTA_CLASE: Record<DisposicionEstatica, string> = {
  cuadricula: 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
  nube: 'flex flex-wrap items-center justify-center gap-3',
}

/** `estilo_chip` (Fase 7, 7.3): fondo suave, vidrio translúcido o solo contorno con el color primario. */
const ESTILO_CHIP_CLASE: Record<NonNullable<SkillsConfiguracion['estilo_chip']>, string> = {
  simple: 'bg-muted',
  // Fase 7c (UC-12): contorno con las variables del bloque; `contorno` sin borde (`ninguno`) quedaría invisible, es lo esperado.
  vidrio: `${CLASES_BORDE_BLOQUE} bg-card/60 backdrop-blur-sm`,
  contorno: `${CLASES_BORDE_BLOQUE} bg-transparent`,
}

/** Nube: tres tamaños de chip repartidos por posición (determinista, sin azar entre renders). */
const NUBE_TAMANO_CLASE: string[] = ['px-3 py-1.5 text-sm', 'px-4 py-2 text-base', 'px-5 py-2.5 text-lg']

/** Icono de la nube acorde al tamaño del chip. */
const NUBE_ICONO_TAMANO: Array<'sm' | 'md' | 'lg'> = ['sm', 'sm', 'md']

type ChipSkillProps = {
  skill: Skill
  disposicion: DisposicionEstatica
  estiloChip: NonNullable<SkillsConfiguracion['estilo_chip']>
  tamanoIcono: NonNullable<SkillsConfiguracion['tamano_icono']>
  mostrarNombre: boolean
  indice: number
}

function ChipSkill({
  skill,
  disposicion,
  estiloChip,
  tamanoIcono,
  mostrarNombre,
  indice,
}: ChipSkillProps) {
  const esNube = disposicion === 'nube'
  const variante = indice % NUBE_TAMANO_CLASE.length

  return (
    <div
      data-chip-skill={estiloChip}
      className={cn(
        'h-full rounded-xl',
        ESTILO_CHIP_CLASE[estiloChip],
        esNube
          ? cn('inline-flex items-center gap-2 rounded-full', NUBE_TAMANO_CLASE[variante])
          : 'flex flex-col items-center gap-2 p-3 text-center',
      )}
    >
      <IconoSkill icono={skill.icono} tamano={esNube ? NUBE_ICONO_TAMANO[variante] : tamanoIcono} />
      {mostrarNombre || esNube ? (
        <span className={cn('truncate', esNube ? undefined : 'text-xs text-muted-foreground')}>
          {skill.nombre}
        </span>
      ) : null}
    </div>
  )
}

/** Bloque `skills`, compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1, extendido Fase 3.4 y Fase 7). */
export function BloqueSkills({ titulo, config, skills, alineacionTitulo }: BloqueSkillsProps) {
  const visibles = [...skills]
    .filter((skill) => skill.visible)
    .sort((a, b) => a.orden - b.orden)

  // Fase 3.4: default `'lg'` — el carrusel ya usaba `tamano="lg"` fijo desde
  // Fase 3.2, así que preservar ese valor como default es lo que mantiene
  // idéntico el aspecto de cualquier sitio ya publicado con este bloque.
  const tamanoIcono = config.tamano_icono ?? 'lg'
  const mostrarNombres = config.mostrar_nombres ?? true
  const pausarAlPasar = config.pausar_al_pasar ?? true

  if (visibles.length === 0) {
    return (
      <div className="grid gap-6">
        <h2 className={cn('text-2xl font-semibold', alineacionTitulo)}>{titulo}</h2>
        <p className="text-center text-muted-foreground">Todavía no hay skills cargados.</p>
      </div>
    )
  }

  // Fase 7 (7.3, UC-12): cuadrícula y nube son listas estáticas de chips.
  const disposicion = config.disposicion ?? 'marquesina'
  if (disposicion !== 'marquesina') {
    const estiloChip = config.estilo_chip ?? 'simple'
    return (
      <div className="grid gap-6">
        <h2 className={cn('text-2xl font-semibold', alineacionTitulo)}>{titulo}</h2>
        <ul
          data-disposicion={disposicion}
          className={DISPOSICION_LISTA_CLASE[disposicion]}
          aria-label="Skills"
        >
          {visibles.map((skill, indice) => (
            <li key={skill.id} className={disposicion === 'cuadricula' ? 'min-w-0' : undefined}>
              <ItemAnimado indice={indice} className="h-full">
                <ChipSkill
                  skill={skill}
                  disposicion={disposicion}
                  estiloChip={estiloChip}
                  tamanoIcono={tamanoIcono}
                  mostrarNombre={mostrarNombres}
                  indice={indice}
                />
              </ItemAnimado>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // Cuántas veces hay que repetir `visibles` DENTRO de una sola pista para
  // que su ancho cubra de sobra `ANCHO_MINIMO_PISTA` (si no, con pocas
  // skills quedaría un hueco de fondo antes de que la copia siguiente
  // entre en pantalla).
  const repeticiones = Math.max(
    1,
    Math.ceil(ANCHO_MINIMO_PISTA / (ANCHO_ESTIMADO_POR_ITEM * visibles.length)),
  )
  const pista = Array.from({ length: repeticiones }, () => visibles).flat()

  // Cada pista puede ser más ancha que antes (por `repeticiones`): se
  // escala la duración en la misma proporción para que la velocidad
  // PERCIBIDA (px/segundo) no cambie.
  const duracionSegundos = DURACION_BASE_MARQUEE[config.velocidad] * repeticiones
  const direccionAnimacion = config.direccion === 'izquierda' ? 'normal' : 'reverse'

  return (
    <div className="grid gap-6 overflow-hidden">
      <h2 className={cn('text-2xl font-semibold', alineacionTitulo)}>{titulo}</h2>
      {/*
        Dos pistas hermanas con contenido IDÉNTICO (patrón estándar de
        marquee infinito), animadas juntas con `translateX(-50%)`: como
        ambas miden exactamente lo mismo, -50% del total equivale siempre
        al ancho de una sola pista, así que el loop es perfectamente
        "seamless" sin importar cuántas `repeticiones` internas tenga cada
        una (arregla el desfase de medio `gap` que tenía la versión anterior
        con un único track + `gap-8`, reemplazado acá por `px-4` por ítem).
      */}
      <div
        className={cn(
          'carrusel-skills overflow-hidden',
          // Fase 3.4 (`pausar_al_pasar`): la regla `:hover { animation-play-state:
          // paused }` de `index.css` ahora depende de este modificador — antes
          // pausaba incondicionalmente al pasar el mouse.
          pausarAlPasar && 'carrusel-skills--pausable',
        )}
      >
        <div
          className="carrusel-skills-pista flex w-max"
          style={
            {
              '--duracion-marquee': `${duracionSegundos}s`,
              animationDirection: direccionAnimacion,
            } as CSSProperties
          }
        >
          <div className="flex w-max">
            {pista.map((skill, index) => (
              <ItemPista
                key={`pista-a-${skill.id}-${index}`}
                skill={skill}
                tamanoIcono={tamanoIcono}
                mostrarNombre={mostrarNombres}
              />
            ))}
          </div>
          <div className="flex w-max" aria-hidden="true">
            {pista.map((skill, index) => (
              <ItemPista
                key={`pista-b-${skill.id}-${index}`}
                skill={skill}
                tamanoIcono={tamanoIcono}
                mostrarNombre={mostrarNombres}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
