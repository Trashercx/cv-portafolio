import type { Config, CustomField, Slot } from '@measured/puck'
import { EnvoltorioSeccion } from '@/components/publico/EnvoltorioSeccion'
import {
  BloqueCertificaciones,
  BloqueContacto,
  BloqueHero,
  BloqueLogros,
  BloqueProyectos,
  BloqueSkills,
  BloqueSobreMi,
} from '@/components/publico/bloques'
import { leerMetadata } from '@/features/editor/useDatosEditor'
import { PuckRoot } from '@/features/editor/PuckRoot'
import { useMediaList } from '@/features/media/useMediaLibrary'
import { ALINEACION_TEXTO_CLASE } from '@/lib/escalas-bloque'
import type {
  AlineacionVerticalColumnas,
  BloqueConfiguracionBase,
  CertificacionesConfiguracion,
  ColumnasConfiguracion,
  ContactoConfiguracion,
  DistribucionColumnas,
  EspaciadoColumnas,
  HeroConfiguracion,
  LogrosConfiguracion,
  ProyectosConfiguracion,
  SkillsConfiguracion,
  SobreMiConfiguracion,
  TipoSeccionAnidable,
} from '@/features/secciones/types'

/**
 * Tipos de bloque que se pueden soltar dentro de una columna (UC-17), en el
 * mismo orden/valores que `allow` de cada slot más abajo — mismo criterio
 * reforzado en el DTO del backend (`docs/plan-portafolio.md` §4): nunca
 * `'hero'` (la portada ocupa todo el ancho por diseño) ni `'columnas'`
 * (evita anidamiento sin límite).
 */
const BLOQUES_ANIDABLES: TipoSeccionAnidable[] = [
  'sobre-mi',
  'proyectos',
  'certificaciones',
  'logros',
  'contacto',
  'skills',
]

// Clases Tailwind literales para el layout de columnas (nunca construidas en
// runtime concatenando fragmentos dinámicos) — misma tabla que usa
// `BloqueColumnas` (`@/components/publico/bloques/BloqueColumnas`) para que
// el lienzo del editor se vea idéntico al sitio público.
const GRID_COLS_POR_DISTRIBUCION: Record<DistribucionColumnas, string> = {
  '1-1': 'grid-cols-1 sm:grid-cols-2',
  '1-2': 'grid-cols-1 sm:grid-cols-[1fr_2fr]',
  '2-1': 'grid-cols-1 sm:grid-cols-[2fr_1fr]',
  '1-1-1': 'grid-cols-1 sm:grid-cols-3',
}

const ALINEACION_VERTICAL_CLASE: Record<AlineacionVerticalColumnas, string> = {
  inicio: 'items-start',
  centro: 'items-center',
  fin: 'items-end',
  estirado: 'items-stretch',
}

const ESPACIADO_CLASE: Record<EspaciadoColumnas, string> = {
  compacto: 'gap-4',
  normal: 'gap-8',
  amplio: 'gap-12',
}

/**
 * Props internas que agregamos a cada bloque de Puck, con prefijo `_` para
 * distinguirlas de los campos reales de `Seccion.configuracion` (que sí
 * viajan tal cual a `PATCH /admin/secciones/:id/configuracion`). Ver
 * `EditorSeccionesPage` para la estrategia completa de sincronización.
 *
 * - `_seccionId`: id de la fila en el backend; ausente si el bloque fue
 *   arrastrado en esta sesión y todavía no se guardó (`POST` pendiente).
 * - `_visible`: reemplaza el panel de visibilidad separado — se edita como
 *   un campo más del bloque y se guarda con `PATCH .../visibilidad`.
 * - `_tituloVisible`: el único campo editable vía `PATCH /admin/secciones/:id`.
 */
type ConInternos<T> = T & {
  _seccionId?: string
  _visible: boolean
  _tituloVisible: string
}

const VISIBLE_FIELD = {
  type: 'radio',
  label: 'Visibilidad',
  options: [
    { label: 'Visible', value: true },
    { label: 'Oculta', value: false },
  ],
} as const

const TITULO_VISIBLE_FIELD = {
  type: 'text',
  label: 'Título visible (menú/sección)',
} as const

/**
 * Fase 3.4 (personalización visual por bloque): los 5 campos de
 * `BloqueConfiguracionBase`, compartidos por los 8 tipos de bloque — se
 * definen una sola vez acá y se hace spread en el `fields` de cada
 * componente, en vez de repetir las mismas 5 definiciones 8 veces. Los
 * valores (`'compacto'|'normal'|'amplio'`, etc.) son exactamente los mismos
 * tokens que `apps/web/src/lib/escalas-bloque.ts` traduce a clases Tailwind
 * literales — este archivo nunca construye una clase, solo persiste el
 * token elegido.
 */
const CAMPOS_BASE_BLOQUE = {
  espaciado_vertical: {
    type: 'select',
    label: 'Espaciado vertical',
    options: [
      { label: 'Compacto', value: 'compacto' },
      { label: 'Normal', value: 'normal' },
      { label: 'Amplio', value: 'amplio' },
    ],
  },
  ancho_contenido: {
    type: 'select',
    label: 'Ancho del contenido',
    options: [
      { label: 'Estrecho', value: 'estrecho' },
      { label: 'Normal', value: 'normal' },
      { label: 'Amplio', value: 'amplio' },
      { label: 'Completo', value: 'completo' },
    ],
  },
  alineacion_texto: {
    type: 'select',
    label: 'Alineación del título',
    options: [
      { label: 'Izquierda', value: 'izquierda' },
      { label: 'Centro', value: 'centro' },
    ],
  },
  fondo_bloque: {
    type: 'select',
    label: 'Fondo del bloque',
    options: [
      { label: 'Ninguno', value: 'ninguno' },
      { label: 'Sutil', value: 'sutil' },
      { label: 'Tarjeta', value: 'tarjeta' },
    ],
  },
  separador_inferior: {
    type: 'radio',
    label: 'Separador inferior',
    options: [
      { label: 'Sí', value: true },
      { label: 'No', value: false },
    ],
  },
} as const

/** `defaultProps` de los 5 campos base, iguales para los 8 tipos de bloque (ver comentario de `CAMPOS_BASE_BLOQUE`). */
const DEFAULT_PROPS_BASE_BLOQUE: Required<BloqueConfiguracionBase> = {
  espaciado_vertical: 'normal',
  ancho_contenido: 'normal',
  alineacion_texto: 'izquierda',
  fondo_bloque: 'ninguno',
  separador_inferior: true,
}

/**
 * Field personalizado de Puck para `hero.imagen_fondo_media_id`: en vez de
 * duplicar el flujo de subida de `MediaUploadField`, deja elegir entre las
 * imágenes ya existentes en la biblioteca (UC-09) — más simple de integrar
 * dentro del sidebar de Puck que reusar un input de archivo ahí mismo.
 *
 * `useMediaList()` se llama **sin** filtro de tipo (`GET /admin/media`, sin
 * `?tipo=`) y el filtro a `tipo === 'imagen'` se hace en cliente: así esta
 * entrada de caché es la misma que ya usa `useDatosEditor` para resolver
 * `mediaPorId` (una sola petición de red compartida en vez de dos).
 */
const imagenFondoField: CustomField<string | undefined> = {
  type: 'custom',
  label: 'Imagen de fondo (biblioteca de medios)',
  render: ({ value, onChange }) => (
    <SelectorImagenFondo value={value} onChange={onChange} />
  ),
}

function SelectorImagenFondo({
  value,
  onChange,
}: {
  value: string | undefined
  onChange: (value: string | undefined) => void
}) {
  const { data: media, isLoading } = useMediaList()
  const imagenes = (media ?? []).filter((item) => item.tipo === 'imagen')

  return (
    <select
      className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm"
      value={value ?? ''}
      disabled={isLoading}
      onChange={(event) => onChange(event.target.value || undefined)}
    >
      <option value="">Sin imagen de fondo</option>
      {imagenes.map((imagen) => (
        <option key={imagen.id} value={imagen.id}>
          {imagen.alt_text || imagen.url}
        </option>
      ))}
    </select>
  )
}

/**
 * Props por componente de Puck, exportado para que `EditorSeccionesPage`
 * tipe su `Data`/`Content` exactamente contra esta config (un solo lugar de
 * verdad para la forma de cada bloque).
 */
export type PuckSeccionesComponents = {
  hero: ConInternos<HeroConfiguracion>
  'sobre-mi': ConInternos<SobreMiConfiguracion>
  proyectos: ConInternos<ProyectosConfiguracion>
  certificaciones: ConInternos<CertificacionesConfiguracion>
  logros: ConInternos<LogrosConfiguracion>
  contacto: ConInternos<ContactoConfiguracion>
  skills: ConInternos<SkillsConfiguracion>
  /**
   * A diferencia de los demás bloques, `columna_1/2/3` NO reutilizan
   * `ColumnasConfiguracion` tal cual (ahí son `BloqueColumnaHijo[]`, la forma
   * persistida en el backend): mientras el bloque vive en el lienzo de Puck,
   * cada columna es un `Slot` (marcador de la Slots API de Puck) — a nivel de
   * `Data.content` eso se resuelve a `ComponentData[]` reales (con `id`/
   * `type`/props propios de cada bloque hijo registrado en este mismo
   * `Config`), y dentro de `render()` se resuelve a un `SlotComponent`
   * (función-componente que Puck reemplaza por su propia zona de
   * drag-and-drop). Ver `EditorSeccionesPage.sanearSlots` para la conversión
   * a `BloqueColumnaHijo[]` recién al guardar.
   */
  columnas: ConInternos<
    Omit<ColumnasConfiguracion, 'columna_1' | 'columna_2' | 'columna_3'> & {
      columna_1: Slot
      columna_2: Slot
      columna_3: Slot
    }
  >
}

/**
 * Config de Puck (UC-07, rediseñada en Fase 3.1; personalización visual por
 * bloque agregada en Fase 3.4): un componente por `tipo_seccion`, con
 * `fields` que reflejan exactamente el DTO de `configuracion` de cada tipo
 * (ver `apps/api/src/modules/secciones/dto/configuracion/`) — los 5 campos
 * compartidos de `CAMPOS_BASE_BLOQUE` más los propios de cada tipo. Cada
 * `render` compone el mismo bloque real que usa el sitio público (`bloques/`,
 * vía `EnvoltorioSeccion` para el espaciado/ancho/fondo/separador) en vez de
 * un placeholder esquemático: el lienzo de Puck es así un WYSIWYG genuino.
 * Los datos de contenido (perfil, proyectos, certificaciones, etc.) no
 * viajan como prop de cada bloque de Puck — se leen de `puck.metadata.datos`
 * (`DatosEditor`, ver `useDatosEditor`), inyectado una sola vez por
 * `EditorSeccionesPage` vía la prop `metadata` de `<Puck>`.
 */
export const puckConfig: Config<PuckSeccionesComponents, Record<string, never>> = {
  categories: {
    diseno: {
      title: 'Diseño',
      components: ['hero', 'columnas'],
    },
    contenido: {
      title: 'Contenido',
      components: [
        'sobre-mi',
        'proyectos',
        'certificaciones',
        'logros',
        'contacto',
        'skills',
      ],
    },
  },
  root: {
    render: PuckRoot,
  },
  components: {
    hero: {
      label: 'Portada (hero)',
      defaultProps: {
        titulo: 'Tu nombre',
        subtitulo: 'Tu título profesional',
        mostrar_foto_perfil: true,
        posicion_foto: 'centrada',
        estilo_foto: 'con_marco',
        altura: 'normal',
        overlay_fondo: 'ninguno',
        tamano_titulo: 'normal',
        ...DEFAULT_PROPS_BASE_BLOQUE,
        // El hero siempre fue a sangre completa y con el título centrado —
        // los defaults compartidos ('normal'/'izquierda') romperían ese
        // aspecto para cualquier hero nuevo. Ver el mismo override en su
        // `render` (fallback cuando `ancho_contenido`/`alineacion_texto`
        // faltan en una `Seccion` guardada antes de esta fase).
        ancho_contenido: 'completo',
        alineacion_texto: 'centro',
        _visible: true,
        _tituloVisible: 'Portada',
      },
      fields: {
        titulo: { type: 'text', label: 'Título' },
        subtitulo: { type: 'textarea', label: 'Subtítulo' },
        imagen_fondo_media_id: imagenFondoField,
        texto_boton: { type: 'text', label: 'Texto del botón (opcional)' },
        enlace_boton: { type: 'text', label: 'Enlace del botón (opcional)' },
        mostrar_foto_perfil: {
          type: 'radio',
          label: 'Mostrar foto de perfil',
          options: [
            { label: 'Sí', value: true },
            { label: 'No', value: false },
          ],
        },
        posicion_foto: {
          type: 'select',
          label: 'Posición de la foto',
          options: [
            { label: 'Ninguna', value: 'ninguna' },
            { label: 'Centrada', value: 'centrada' },
            { label: 'Esquina superior', value: 'esquina_superior' },
            { label: 'Esquina inferior', value: 'esquina_inferior' },
          ],
        },
        estilo_foto: {
          type: 'select',
          label: 'Estilo de la foto',
          options: [
            { label: 'Con marco', value: 'con_marco' },
            { label: 'Sin fondo', value: 'sin_fondo' },
          ],
        },
        altura: {
          type: 'select',
          label: 'Altura',
          options: [
            { label: 'Normal', value: 'normal' },
            { label: 'Grande', value: 'grande' },
            { label: 'Pantalla completa', value: 'pantalla_completa' },
          ],
        },
        overlay_fondo: {
          type: 'select',
          label: 'Overlay sobre la imagen de fondo',
          options: [
            { label: 'Ninguno', value: 'ninguno' },
            { label: 'Oscuro', value: 'oscuro' },
            { label: 'Claro', value: 'claro' },
          ],
        },
        tamano_titulo: {
          type: 'select',
          label: 'Tamaño del título',
          options: [
            { label: 'Normal', value: 'normal' },
            { label: 'Grande', value: 'grande' },
          ],
        },
        ...CAMPOS_BASE_BLOQUE,
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      render: ({
        titulo,
        subtitulo,
        imagen_fondo_media_id,
        texto_boton,
        enlace_boton,
        mostrar_foto_perfil,
        posicion_foto,
        estilo_foto,
        altura,
        overlay_fondo,
        tamano_titulo,
        espaciado_vertical,
        ancho_contenido,
        alineacion_texto,
        fondo_bloque,
        separador_inferior,
        _visible,
        puck,
      }) => {
        const { datos } = leerMetadata(puck)
        const config: HeroConfiguracion = {
          titulo,
          subtitulo,
          imagen_fondo_media_id,
          imagen_fondo: imagen_fondo_media_id
            ? datos.mediaPorId.get(imagen_fondo_media_id)
            : undefined,
          texto_boton,
          enlace_boton,
          mostrar_foto_perfil,
          posicion_foto,
          estilo_foto,
          altura,
          overlay_fondo,
          tamano_titulo,
        }
        return (
          <EnvoltorioSeccion
            visible={_visible}
            espaciado_vertical={espaciado_vertical}
            // Fallback propio del hero ('completo'/'centro'), no el genérico
            // de `escalas-bloque.ts` ('normal'/'izquierda'): una `Seccion`
            // hero guardada antes de esta fase no tiene estos campos en su
            // `configuracion`, y el hero siempre fue a sangre completa con
            // el título centrado — usar el default compartido rompería ese
            // aspecto en cualquier hero ya publicado.
            ancho_contenido={ancho_contenido ?? 'completo'}
            fondo_bloque={fondo_bloque}
            separador_inferior={separador_inferior}
          >
            <BloqueHero
              config={config}
              perfil={datos.perfil}
              alineacionTitulo={ALINEACION_TEXTO_CLASE[alineacion_texto ?? 'centro']}
            />
          </EnvoltorioSeccion>
        )
      },
    },
    'sobre-mi': {
      label: 'Sobre mí',
      defaultProps: {
        mostrar_foto: true,
        posicion_foto: 'izquierda',
        forma_foto: 'circular',
        ...DEFAULT_PROPS_BASE_BLOQUE,
        _visible: true,
        _tituloVisible: 'Sobre mí',
      },
      fields: {
        mostrar_foto: {
          type: 'radio',
          label: 'Mostrar foto de perfil',
          options: [
            { label: 'Sí', value: true },
            { label: 'No', value: false },
          ],
        },
        posicion_foto: {
          type: 'select',
          label: 'Posición de la foto',
          options: [
            { label: 'Izquierda', value: 'izquierda' },
            { label: 'Derecha', value: 'derecha' },
          ],
        },
        forma_foto: {
          type: 'select',
          label: 'Forma de la foto',
          options: [
            { label: 'Circular', value: 'circular' },
            { label: 'Cuadrada', value: 'cuadrada' },
          ],
        },
        ...CAMPOS_BASE_BLOQUE,
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      render: ({
        mostrar_foto,
        posicion_foto,
        forma_foto,
        espaciado_vertical,
        ancho_contenido,
        alineacion_texto,
        fondo_bloque,
        separador_inferior,
        _visible,
        _tituloVisible,
        puck,
      }) => {
        const { datos } = leerMetadata(puck)
        return (
          <EnvoltorioSeccion
            visible={_visible}
            espaciado_vertical={espaciado_vertical}
            ancho_contenido={ancho_contenido}
            fondo_bloque={fondo_bloque}
            separador_inferior={separador_inferior}
          >
            <BloqueSobreMi
              titulo={_tituloVisible}
              config={{ mostrar_foto, posicion_foto, forma_foto }}
              perfil={datos.perfil}
              alineacionTitulo={ALINEACION_TEXTO_CLASE[alineacion_texto ?? 'izquierda']}
            />
          </EnvoltorioSeccion>
        )
      },
    },
    proyectos: {
      label: 'Proyectos',
      defaultProps: {
        cantidad_a_mostrar: 3,
        solo_destacados: false,
        columnas: 3,
        estilo_tarjeta: 'simple',
        mostrar_descripcion: true,
        ...DEFAULT_PROPS_BASE_BLOQUE,
        _visible: true,
        _tituloVisible: 'Proyectos',
      },
      fields: {
        cantidad_a_mostrar: {
          type: 'number',
          label: 'Cantidad a mostrar',
          min: 1,
        },
        solo_destacados: {
          type: 'radio',
          label: 'Solo destacados',
          options: [
            { label: 'Sí', value: true },
            { label: 'No', value: false },
          ],
        },
        columnas: {
          type: 'select',
          label: 'Columnas',
          options: [
            { label: '2', value: 2 },
            { label: '3', value: 3 },
          ],
        },
        estilo_tarjeta: {
          type: 'select',
          label: 'Estilo de tarjeta',
          options: [
            { label: 'Simple', value: 'simple' },
            { label: 'Con sombra', value: 'con_sombra' },
          ],
        },
        mostrar_descripcion: {
          type: 'radio',
          label: 'Mostrar descripción',
          options: [
            { label: 'Sí', value: true },
            { label: 'No', value: false },
          ],
        },
        ...CAMPOS_BASE_BLOQUE,
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      render: ({
        cantidad_a_mostrar,
        solo_destacados,
        columnas,
        estilo_tarjeta,
        mostrar_descripcion,
        espaciado_vertical,
        ancho_contenido,
        alineacion_texto,
        fondo_bloque,
        separador_inferior,
        _visible,
        _tituloVisible,
        puck,
      }) => {
        const { datos } = leerMetadata(puck)
        return (
          <EnvoltorioSeccion
            visible={_visible}
            espaciado_vertical={espaciado_vertical}
            ancho_contenido={ancho_contenido}
            fondo_bloque={fondo_bloque}
            separador_inferior={separador_inferior}
          >
            <BloqueProyectos
              titulo={_tituloVisible}
              config={{
                cantidad_a_mostrar,
                solo_destacados,
                columnas,
                estilo_tarjeta,
                mostrar_descripcion,
              }}
              proyectos={datos.proyectos}
              alineacionTitulo={ALINEACION_TEXTO_CLASE[alineacion_texto ?? 'izquierda']}
            />
          </EnvoltorioSeccion>
        )
      },
    },
    certificaciones: {
      label: 'Certificaciones',
      defaultProps: {
        orden: 'fecha',
        columnas: 3,
        estilo_tarjeta: 'simple',
        mostrar_fecha: true,
        ...DEFAULT_PROPS_BASE_BLOQUE,
        _visible: true,
        _tituloVisible: 'Certificaciones',
      },
      fields: {
        orden: {
          type: 'select',
          label: 'Orden',
          options: [
            { label: 'Por fecha', value: 'fecha' },
            { label: 'Manual', value: 'manual' },
          ],
        },
        columnas: {
          type: 'select',
          label: 'Columnas',
          options: [
            { label: '2', value: 2 },
            { label: '3', value: 3 },
          ],
        },
        estilo_tarjeta: {
          type: 'select',
          label: 'Estilo de tarjeta',
          options: [
            { label: 'Simple', value: 'simple' },
            { label: 'Con sombra', value: 'con_sombra' },
          ],
        },
        mostrar_fecha: {
          type: 'radio',
          label: 'Mostrar fecha',
          options: [
            { label: 'Sí', value: true },
            { label: 'No', value: false },
          ],
        },
        ...CAMPOS_BASE_BLOQUE,
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      render: ({
        orden,
        columnas,
        estilo_tarjeta,
        mostrar_fecha,
        espaciado_vertical,
        ancho_contenido,
        alineacion_texto,
        fondo_bloque,
        separador_inferior,
        _visible,
        _tituloVisible,
        puck,
      }) => {
        const { datos } = leerMetadata(puck)
        return (
          <EnvoltorioSeccion
            visible={_visible}
            espaciado_vertical={espaciado_vertical}
            ancho_contenido={ancho_contenido}
            fondo_bloque={fondo_bloque}
            separador_inferior={separador_inferior}
          >
            <BloqueCertificaciones
              titulo={_tituloVisible}
              config={{ orden, columnas, estilo_tarjeta, mostrar_fecha }}
              certificaciones={datos.certificaciones}
              alineacionTitulo={ALINEACION_TEXTO_CLASE[alineacion_texto ?? 'izquierda']}
            />
          </EnvoltorioSeccion>
        )
      },
    },
    logros: {
      label: 'Logros',
      defaultProps: {
        estilo_lista: 'tarjetas',
        ...DEFAULT_PROPS_BASE_BLOQUE,
        _visible: true,
        _tituloVisible: 'Logros',
      },
      fields: {
        categoria_filtro: { type: 'text', label: 'Filtrar por categoría (opcional)' },
        estilo_lista: {
          type: 'select',
          label: 'Estilo de lista',
          options: [
            { label: 'Tarjetas', value: 'tarjetas' },
            { label: 'Línea de tiempo', value: 'linea_tiempo' },
          ],
        },
        ...CAMPOS_BASE_BLOQUE,
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      render: ({
        categoria_filtro,
        estilo_lista,
        espaciado_vertical,
        ancho_contenido,
        alineacion_texto,
        fondo_bloque,
        separador_inferior,
        _visible,
        _tituloVisible,
        puck,
      }) => {
        const { datos } = leerMetadata(puck)
        return (
          <EnvoltorioSeccion
            visible={_visible}
            espaciado_vertical={espaciado_vertical}
            ancho_contenido={ancho_contenido}
            fondo_bloque={fondo_bloque}
            separador_inferior={separador_inferior}
          >
            <BloqueLogros
              titulo={_tituloVisible}
              config={{ categoria_filtro, estilo_lista }}
              logros={datos.logros}
              alineacionTitulo={ALINEACION_TEXTO_CLASE[alineacion_texto ?? 'izquierda']}
            />
          </EnvoltorioSeccion>
        )
      },
    },
    contacto: {
      label: 'Contacto',
      defaultProps: {
        mostrar_formulario: false,
        estilo_redes: 'iconos',
        ...DEFAULT_PROPS_BASE_BLOQUE,
        // El título de contacto siempre estuvo centrado (mismo criterio que
        // hero/skills) — ver el mismo override en su `render`.
        alineacion_texto: 'centro',
        _visible: true,
        _tituloVisible: 'Contacto',
      },
      fields: {
        mostrar_formulario: {
          type: 'radio',
          label: 'Mostrar formulario de contacto',
          options: [
            { label: 'Sí', value: true },
            { label: 'No (solo enlaces/CV)', value: false },
          ],
        },
        estilo_redes: {
          type: 'select',
          label: 'Estilo de las redes sociales',
          options: [
            { label: 'Íconos', value: 'iconos' },
            { label: 'Botones', value: 'botones' },
          ],
        },
        ...CAMPOS_BASE_BLOQUE,
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      render: ({
        mostrar_formulario,
        estilo_redes,
        espaciado_vertical,
        ancho_contenido,
        alineacion_texto,
        fondo_bloque,
        separador_inferior,
        _visible,
        _tituloVisible,
        puck,
      }) => {
        const { datos } = leerMetadata(puck)
        return (
          <EnvoltorioSeccion
            visible={_visible}
            espaciado_vertical={espaciado_vertical}
            ancho_contenido={ancho_contenido}
            fondo_bloque={fondo_bloque}
            separador_inferior={separador_inferior}
          >
            <BloqueContacto
              titulo={_tituloVisible}
              config={{ mostrar_formulario, estilo_redes }}
              perfil={datos.perfil}
              redesSociales={datos.redes_sociales}
              alineacionTitulo={ALINEACION_TEXTO_CLASE[alineacion_texto ?? 'centro']}
            />
          </EnvoltorioSeccion>
        )
      },
    },
    skills: {
      label: 'Skills',
      defaultProps: {
        direccion: 'izquierda',
        velocidad: 'media',
        tamano_icono: 'lg',
        mostrar_nombres: true,
        pausar_al_pasar: true,
        ...DEFAULT_PROPS_BASE_BLOQUE,
        // El título de skills siempre estuvo centrado (mismo criterio que
        // hero/contacto) — ver el mismo override en su `render`.
        alineacion_texto: 'centro',
        _visible: true,
        _tituloVisible: 'Skills',
      },
      fields: {
        direccion: {
          type: 'select',
          label: 'Dirección del carrusel',
          options: [
            { label: 'Izquierda', value: 'izquierda' },
            { label: 'Derecha', value: 'derecha' },
          ],
        },
        velocidad: {
          type: 'select',
          label: 'Velocidad',
          options: [
            { label: 'Lenta', value: 'lenta' },
            { label: 'Media', value: 'media' },
            { label: 'Rápida', value: 'rapida' },
          ],
        },
        tamano_icono: {
          type: 'select',
          label: 'Tamaño del ícono',
          options: [
            { label: 'Pequeño', value: 'sm' },
            { label: 'Mediano', value: 'md' },
            { label: 'Grande', value: 'lg' },
          ],
        },
        mostrar_nombres: {
          type: 'radio',
          label: 'Mostrar nombres',
          options: [
            { label: 'Sí', value: true },
            { label: 'No', value: false },
          ],
        },
        pausar_al_pasar: {
          type: 'radio',
          label: 'Pausar al pasar el mouse',
          options: [
            { label: 'Sí', value: true },
            { label: 'No', value: false },
          ],
        },
        ...CAMPOS_BASE_BLOQUE,
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      render: ({
        direccion,
        velocidad,
        tamano_icono,
        mostrar_nombres,
        pausar_al_pasar,
        espaciado_vertical,
        ancho_contenido,
        alineacion_texto,
        fondo_bloque,
        separador_inferior,
        _visible,
        _tituloVisible,
        puck,
      }) => {
        const { datos } = leerMetadata(puck)
        return (
          <EnvoltorioSeccion
            visible={_visible}
            espaciado_vertical={espaciado_vertical}
            ancho_contenido={ancho_contenido}
            fondo_bloque={fondo_bloque}
            separador_inferior={separador_inferior}
          >
            <BloqueSkills
              titulo={_tituloVisible}
              config={{ direccion, velocidad, tamano_icono, mostrar_nombres, pausar_al_pasar }}
              skills={datos.skills}
              alineacionTitulo={ALINEACION_TEXTO_CLASE[alineacion_texto ?? 'centro']}
            />
          </EnvoltorioSeccion>
        )
      },
    },
    /**
     * Contenedor "Columnas" (UC-17, Fase 3.3): layout multi-columna con la
     * Slots API de Puck. NO es un placeholder — cada zona `columna_1/2/3` es
     * una zona de drag-and-drop real donde se pueden soltar los 6 tipos de
     * bloque anidables (`BLOQUES_ANIDABLES`), reforzado con `allow` (nunca
     * `hero` ni `columnas`, ver comentario de `BLOQUES_ANIDABLES`). A
     * diferencia de los demás bloques, este SÍ es una `Seccion` cuya
     * `configuracion` guarda además el contenido de sus hijos (ver
     * `docs/plan-portafolio.md` §4 y `EditorSeccionesPage.sanearSlots`).
     * Fase 3.4: solo gana los 5 campos base (sin campos propios nuevos) —
     * el contenedor en sí no tiene título propio, así que no recibe
     * `alineacion_texto` resuelto hacia ningún `<h2>`.
     */
    columnas: {
      label: 'Columnas',
      defaultProps: {
        distribucion: '1-1',
        alineacion_vertical: 'inicio',
        espaciado: 'normal',
        columna_1: [],
        columna_2: [],
        columna_3: [],
        ...DEFAULT_PROPS_BASE_BLOQUE,
        _visible: true,
        _tituloVisible: 'Columnas',
      },
      fields: {
        distribucion: {
          type: 'select',
          label: 'Distribución',
          options: [
            { label: 'Dos columnas iguales (1-1)', value: '1-1' },
            { label: 'Angosta + ancha (1-2)', value: '1-2' },
            { label: 'Ancha + angosta (2-1)', value: '2-1' },
            { label: 'Tres columnas (1-1-1)', value: '1-1-1' },
          ],
        },
        alineacion_vertical: {
          type: 'select',
          label: 'Alineación vertical',
          options: [
            { label: 'Arriba', value: 'inicio' },
            { label: 'Centro', value: 'centro' },
            { label: 'Abajo', value: 'fin' },
            { label: 'Estirado (misma altura)', value: 'estirado' },
          ],
        },
        espaciado: {
          type: 'select',
          label: 'Espaciado',
          options: [
            { label: 'Compacto', value: 'compacto' },
            { label: 'Normal', value: 'normal' },
            { label: 'Amplio', value: 'amplio' },
          ],
        },
        columna_1: {
          type: 'slot',
          label: 'Columna 1',
          allow: BLOQUES_ANIDABLES,
        },
        columna_2: {
          type: 'slot',
          label: 'Columna 2',
          allow: BLOQUES_ANIDABLES,
        },
        columna_3: {
          type: 'slot',
          label: 'Columna 3',
          allow: BLOQUES_ANIDABLES,
        },
        ...CAMPOS_BASE_BLOQUE,
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      // Oculta el campo "Columna 3" en el sidebar cuando la distribución
      // elegida es de 2 columnas — mejora de UX, no la fuente de verdad de
      // qué se renderiza (esa la decide `render` de abajo, no este campo:
      // si `columna_3` ya tenía contenido de una distribución anterior,
      // simplemente deja de mostrarse hasta volver a elegir '1-1-1').
      resolveFields: (data, { fields }) => {
        if (data.props.distribucion === '1-1-1') return fields
        return Object.fromEntries(
          Object.entries(fields).filter(([nombreCampo]) => nombreCampo !== 'columna_3'),
        ) as typeof fields
      },
      render: ({
        distribucion,
        alineacion_vertical,
        espaciado,
        columna_1: Columna1,
        columna_2: Columna2,
        columna_3: Columna3,
        espaciado_vertical,
        ancho_contenido,
        fondo_bloque,
        separador_inferior,
        _visible,
      }) => {
        const tresColumnas = distribucion === '1-1-1'
        return (
          <EnvoltorioSeccion
            visible={_visible}
            espaciado_vertical={espaciado_vertical}
            ancho_contenido={ancho_contenido}
            fondo_bloque={fondo_bloque}
            separador_inferior={separador_inferior}
          >
            <div
              className={`grid ${GRID_COLS_POR_DISTRIBUCION[distribucion]} ${ALINEACION_VERTICAL_CLASE[alineacion_vertical]} ${ESPACIADO_CLASE[espaciado]}`}
            >
              <div className="grid gap-6">
                <Columna1 />
              </div>
              <div className="grid gap-6">
                <Columna2 />
              </div>
              {tresColumnas ? (
                <div className="grid gap-6">
                  <Columna3 />
                </div>
              ) : null}
            </div>
          </EnvoltorioSeccion>
        )
      },
    },
  },
}
