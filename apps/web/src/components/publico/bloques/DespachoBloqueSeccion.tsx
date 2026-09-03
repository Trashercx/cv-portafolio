import type { Logro } from '@/features/logros/types'
import type { Proyecto } from '@/features/proyectos/types'
import type { CertificacionPublica, PerfilPublico } from '@/features/publico/types'
import type { RedSocial } from '@/features/redes-sociales/types'
import type {
  CertificacionesConfiguracion,
  ContactoConfiguracion,
  LogrosConfiguracion,
  ProyectosConfiguracion,
  SkillsConfiguracion,
  SobreMiConfiguracion,
  TipoSeccionAnidable,
} from '@/features/secciones/types'
import type { Skill } from '@/features/skills/types'
import { BloqueCertificaciones } from './BloqueCertificaciones'
import { BloqueContacto } from './BloqueContacto'
import { BloqueLogros } from './BloqueLogros'
import { BloqueProyectos } from './BloqueProyectos'
import { BloqueSkills } from './BloqueSkills'
import { BloqueSobreMi } from './BloqueSobreMi'

/**
 * Subconjunto de `SnapshotSitio`/`DatosEditor` (`@/features/publico/types`,
 * `@/features/editor/useDatosEditor`) que necesita cualquier bloque de
 * contenido "anidable" (los 6 tipos que no son `hero` ni `columnas`, ver
 * `TipoSeccionAnidable`) para renderizarse. Ambos tipos de origen son
 * estructuralmente compatibles con este (tienen estos campos de sobra, más
 * `tema`/`secciones`/`fondo`/`mediaPorId` que este dispatcher no necesita) —
 * TypeScript los acepta tal cual, sin adaptador intermedio.
 */
export type DatosDespachoBloque = {
  perfil: PerfilPublico | null
  proyectos: Proyecto[]
  certificaciones: CertificacionPublica[]
  logros: Logro[]
  redes_sociales: RedSocial[]
  skills: Skill[]
}

type DespachoBloqueSeccionProps = {
  tipo_seccion: TipoSeccionAnidable
  titulo_visible: string
  configuracion: object
  datos: DatosDespachoBloque
}

/**
 * Despacha un bloque de contenido según su `tipo_seccion` (los 6 tipos
 * anidables de UC-17 — nunca `hero` ni `columnas`, que tienen su propio
 * tratamiento en cada consumidor). Extraído de `RenderizadorSecciones`
 * (Fase 3.3, UC-17) porque el mismo despacho ahora hace falta en dos
 * lugares: el nivel superior de `RenderizadorSecciones` (sitio público +
 * vista previa) y dentro de cada columna de `BloqueColumnas` — mismo
 * criterio de "un solo lugar de verdad" que ya aplica `EnvoltorioSeccion`
 * para el espaciado.
 */
export function DespachoBloqueSeccion({
  tipo_seccion,
  titulo_visible,
  configuracion,
  datos,
}: DespachoBloqueSeccionProps) {
  switch (tipo_seccion) {
    case 'sobre-mi':
      return (
        <BloqueSobreMi
          titulo={titulo_visible}
          config={configuracion as SobreMiConfiguracion}
          perfil={datos.perfil}
        />
      )
    case 'proyectos':
      return (
        <BloqueProyectos
          titulo={titulo_visible}
          config={configuracion as ProyectosConfiguracion}
          proyectos={datos.proyectos}
        />
      )
    case 'certificaciones':
      return (
        <BloqueCertificaciones
          titulo={titulo_visible}
          config={configuracion as CertificacionesConfiguracion}
          certificaciones={datos.certificaciones}
        />
      )
    case 'logros':
      return (
        <BloqueLogros
          titulo={titulo_visible}
          config={configuracion as LogrosConfiguracion}
          logros={datos.logros}
        />
      )
    case 'contacto':
      return (
        <BloqueContacto
          titulo={titulo_visible}
          config={configuracion as ContactoConfiguracion}
          perfil={datos.perfil}
          redesSociales={datos.redes_sociales}
        />
      )
    case 'skills':
      return (
        <BloqueSkills
          titulo={titulo_visible}
          config={configuracion as SkillsConfiguracion}
          skills={datos.skills}
        />
      )
    default:
      return null
  }
}
