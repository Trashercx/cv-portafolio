import type { Logro } from '@/features/logros/types'
import type { Proyecto } from '@/features/proyectos/types'
import type { CertificacionPublica, PerfilPublico } from '@/features/publico/types'
import type { RedSocial } from '@/features/redes-sociales/types'
import type {
  BloqueConfiguracionBase,
  CertificacionesConfiguracion,
  ContactoConfiguracion,
  GaleriaConfiguracion,
  LogrosConfiguracion,
  ProyectosConfiguracion,
  SkillsConfiguracion,
  SobreMiConfiguracion,
  TipoSeccionAnidable,
} from '@/features/secciones/types'
import type { Skill } from '@/features/skills/types'
import { ALINEACION_TEXTO_CLASE } from '@/lib/escalas-bloque'
import { BloqueCertificaciones } from './BloqueCertificaciones'
import { BloqueContacto } from './BloqueContacto'
import { BloqueGaleria } from './BloqueGaleria'
import { BloqueLogros } from './BloqueLogros'
import { BloqueProyectos } from './BloqueProyectos'
import { BloqueSkills } from './BloqueSkills'
import { BloqueSobreMi } from './BloqueSobreMi'

/**
 * Subconjunto de `SnapshotSitio`/`DatosEditor` (`@/features/publico/types`,
 * `@/features/editor/useDatosEditor`) que necesita cualquier bloque de
 * contenido "anidable" (los tipos que no son `hero` ni `columnas`, ver
 * `TipoSeccionAnidable`) para renderizarse. Ambos tipos de origen son
 * estructuralmente compatibles con este (tienen estos campos de sobra, más
 * `tema`/`secciones`/`fondo`/`mediaPorId` que este dispatcher no necesita) —
 * TypeScript los acepta tal cual, sin adaptador intermedio. `galeria` (UC-18)
 * es el único tipo anidable que NO necesita nada de acá: sus fotos ya vienen
 * resueltas contra `media` dentro de la propia `configuracion.fotos`.
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
 * Despacha un bloque de contenido según su `tipo_seccion` (los tipos
 * anidables de UC-17/UC-18 — nunca `hero` ni `columnas`, que tienen su propio
 * tratamiento en cada consumidor). Extraído de `RenderizadorSecciones`
 * (Fase 3.3, UC-17) porque el mismo despacho ahora hace falta en dos
 * lugares: el nivel superior de `RenderizadorSecciones` (sitio público +
 * vista previa) y dentro de cada columna de `BloqueColumnas` — mismo
 * criterio de "un solo lugar de verdad" que ya aplica `EnvoltorioSeccion`
 * para el espaciado.
 */
/**
 * Resuelve la alineación del `<h2>` (Fase 3.4, `alineacion_texto`) desde una
 * `configuracion` genérica sin castear al tipo completo de cada bloque —
 * `alineacion_texto` es parte de `BloqueConfiguracionBase`, compartida por
 * los 8 tipos, así que se puede leer con este cast acotado.
 *
 * Falta el campo (sección guardada antes de esta fase, o hijo de una
 * `columnas` que nunca lo tuvo) → usa el aspecto que ese TIPO de bloque ya
 * tenía hardcodeado antes de esta fase, no un default único para los 8:
 * `contacto`/`skills` siempre tuvieron el título centrado (mismo criterio
 * que `hero`, que no pasa por este dispatcher — ver su propio fallback en
 * `puck-config.tsx`/`RenderizadorSecciones.tsx`); el resto ya era
 * izquierda. Sin este caso especial, publicar esta fase descentraría el
 * título de contacto/skills en cualquier sitio ya existente.
 */
function resolverAlineacionTitulo(
  configuracion: object,
  tipoSeccion: TipoSeccionAnidable,
): string {
  const { alineacion_texto } = configuracion as BloqueConfiguracionBase
  const defaultDelTipo =
    tipoSeccion === 'contacto' || tipoSeccion === 'skills' ? 'centro' : 'izquierda'
  return ALINEACION_TEXTO_CLASE[alineacion_texto ?? defaultDelTipo]
}

export function DespachoBloqueSeccion({
  tipo_seccion,
  titulo_visible,
  configuracion,
  datos,
}: DespachoBloqueSeccionProps) {
  const alineacionTitulo = resolverAlineacionTitulo(configuracion, tipo_seccion)

  switch (tipo_seccion) {
    case 'sobre-mi':
      return (
        <BloqueSobreMi
          titulo={titulo_visible}
          alineacionTitulo={alineacionTitulo}
          config={configuracion as SobreMiConfiguracion}
          perfil={datos.perfil}
        />
      )
    case 'proyectos':
      return (
        <BloqueProyectos
          titulo={titulo_visible}
          alineacionTitulo={alineacionTitulo}
          config={configuracion as ProyectosConfiguracion}
          proyectos={datos.proyectos}
        />
      )
    case 'certificaciones':
      return (
        <BloqueCertificaciones
          titulo={titulo_visible}
          alineacionTitulo={alineacionTitulo}
          config={configuracion as CertificacionesConfiguracion}
          certificaciones={datos.certificaciones}
        />
      )
    case 'logros':
      return (
        <BloqueLogros
          titulo={titulo_visible}
          alineacionTitulo={alineacionTitulo}
          config={configuracion as LogrosConfiguracion}
          logros={datos.logros}
        />
      )
    case 'contacto':
      return (
        <BloqueContacto
          titulo={titulo_visible}
          alineacionTitulo={alineacionTitulo}
          config={configuracion as ContactoConfiguracion}
          perfil={datos.perfil}
          redesSociales={datos.redes_sociales}
        />
      )
    case 'skills':
      return (
        <BloqueSkills
          titulo={titulo_visible}
          alineacionTitulo={alineacionTitulo}
          config={configuracion as SkillsConfiguracion}
          skills={datos.skills}
        />
      )
    case 'galeria':
      // A diferencia de los demás casos, no necesita nada de `datos`: las
      // fotos ya vienen resueltas contra `media` en `configuracion.fotos`
      // (snapshot público) o se resuelven en el propio `render` del bloque
      // en `puck-config.tsx` (lienzo del editor) — ver `GaleriaFoto`.
      return (
        <BloqueGaleria
          titulo={titulo_visible}
          alineacionTitulo={alineacionTitulo}
          config={configuracion as GaleriaConfiguracion}
        />
      )
    default:
      return null
  }
}
