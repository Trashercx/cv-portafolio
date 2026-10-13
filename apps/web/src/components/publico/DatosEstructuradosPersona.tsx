import type { SnapshotSitio } from '@/features/publico/types'
import { recortarDescripcion, urlAbsoluta, urlCanonicaActual } from '@/lib/seo'

type DatosEstructuradosPersonaProps = {
  perfil: NonNullable<SnapshotSitio['perfil']>
  redes: SnapshotSitio['redes_sociales']
  /** Imagen representativa ya resuelta (foto de perfil o fondo del hero). */
  imagen?: string | null
}

/**
 * JSON-LD `Person` de schema.org para la home (Fase 6, UC-12). No incluye
 * `email`: el perfil público del snapshot no lo expone. `sameAs` lleva las
 * URLs de las redes sociales del snapshot.
 */
export function DatosEstructuradosPersona({
  perfil,
  redes,
  imagen,
}: DatosEstructuradosPersonaProps) {
  const datos = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: perfil.nombre_completo,
    jobTitle: perfil.titulo_profesional,
    description: recortarDescripcion(perfil.resumen_bio),
    ...(imagen ? { image: urlAbsoluta(imagen) } : {}),
    url: urlCanonicaActual(),
    ...(redes.length > 0 ? { sameAs: redes.map((red) => red.url) } : {}),
  }

  // `<` escapado para que ningún texto del perfil pueda cerrar el `<script>`.
  const json = JSON.stringify(datos).replace(/</g, '\\u003c')

  return <script type="application/ld+json">{json}</script>
}
