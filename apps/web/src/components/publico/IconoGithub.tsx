import { siGithub } from 'simple-icons'
import { cn } from '@/lib/utils'

/**
 * Logo de GitHub (Fase 7l, UC-02/UC-36). lucide-react 1.x ya no incluye
 * íconos de marca: se usa el glifo de `simple-icons`, como las redes
 * sociales, pintado con `currentColor` para heredar el color del tema.
 */
export function IconoGithub({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-hidden="true"
      data-icono="github"
      fill="currentColor"
      className={cn('size-4', className)}
    >
      <path d={siGithub.path} />
    </svg>
  )
}
