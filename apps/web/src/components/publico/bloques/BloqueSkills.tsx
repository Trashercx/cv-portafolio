import { IconoSkill } from '@/features/skills/iconos-skill'
import type { Skill } from '@/features/skills/types'
import type { SkillsConfiguracion } from '@/features/secciones/types'

type BloqueSkillsProps = {
  titulo: string
  config: SkillsConfiguracion
  skills: Skill[]
}

/** Duración del loop del carrusel de skills (UC-07 + UC-16), más rápida cuanto mayor la "velocidad" elegida. */
const DURACION_MARQUEE: Record<SkillsConfiguracion['velocidad'], string> = {
  lenta: '60s',
  media: '35s',
  rapida: '18s',
}

/** Bloque `skills`, compartido entre el sitio público y el lienzo del editor de Puck (Fase 3.1). */
export function BloqueSkills({ titulo, config, skills }: BloqueSkillsProps) {
  const visibles = [...skills]
    .filter((skill) => skill.visible)
    .sort((a, b) => a.orden - b.orden)

  if (visibles.length === 0) {
    return (
      <div className="mx-auto grid max-w-5xl gap-6 text-center">
        <h2 className="text-2xl font-semibold">{titulo}</h2>
        <p className="text-muted-foreground">Todavía no hay skills cargados.</p>
      </div>
    )
  }

  // Duplica la lista para que el loop de la animación (`translateX(-50%)`,
  // ver `@keyframes marquee` en `index.css`) no muestre ningún salto visual.
  const duplicados = [...visibles, ...visibles]
  const direccionAnimacion = config.direccion === 'izquierda' ? 'normal' : 'reverse'

  return (
    <div className="mx-auto grid max-w-5xl gap-6 overflow-hidden">
      <h2 className="text-2xl font-semibold text-center">{titulo}</h2>
      <div className="overflow-hidden">
        <div
          className="flex w-max gap-8"
          style={{
            animation: `marquee ${DURACION_MARQUEE[config.velocidad]} linear infinite`,
            animationDirection: direccionAnimacion,
          }}
        >
          {duplicados.map((skill, index) => (
            <div
              key={`${skill.id}-${index}`}
              className="flex shrink-0 flex-col items-center gap-2"
            >
              <IconoSkill icono={skill.icono} className="size-10" />
              <span className="text-xs text-muted-foreground">
                {skill.nombre}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
