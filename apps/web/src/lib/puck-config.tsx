import { FieldLabel } from '@puckeditor/core'
import type { Config, CustomField, Slot } from '@puckeditor/core'
import { Image as ImageIcon, List as ListIcon } from 'lucide-react'
import { EnvoltorioSeccion } from '@/components/publico/EnvoltorioSeccion'
import { ProveedorEnColumna } from '@/components/publico/contexto-renderizado'
import {
  BloqueCertificaciones,
  BloqueContacto,
  BloqueGaleria,
  BloqueHero,
  BloqueExperiencia,
  BloqueInsignias,
  BloqueLogros,
  BloqueProyectos,
  BloqueSkills,
  BloqueSobreMi,
} from '@/components/publico/bloques'
import { ListaTextos, TITULOS_ROTATIVOS_MAX } from '@/features/editor/ListaTextos'
import { NavegacionEnLienzo } from '@/features/editor/NavegacionEnLienzo'
import { leerMetadata } from '@/features/editor/useDatosEditor'
import { CampoImagenPuck } from '@/features/editor/CampoImagenPuck'
import { PuckRoot } from '@/features/editor/PuckRoot'
import { ALINEACION_TEXTO_CLASE } from '@/lib/escalas-bloque'
import type {
  AlineacionVerticalColumnas,
  BloqueConfiguracionBase,
  CertificacionesConfiguracion,
  ColumnasConfiguracion,
  ContactoConfiguracion,
  DistribucionColumnas,
  EspaciadoColumnas,
  GaleriaConfiguracion,
  GaleriaFoto,
  HeroConfiguracion,
  InsigniasConfiguracion,
  ExperienciaConfiguracion,
  LogrosConfiguracion,
  NavegacionConfiguracion,
  ProyectosConfiguracion,
  SkillsConfiguracion,
  SobreMiConfiguracion,
  TipoSeccionAnidable,
} from '@/features/secciones/types'

/**
 * Tipos de bloque que se pueden soltar dentro de una columna (UC-17), en el
 * mismo orden/valores que `allow` de cada slot más abajo — mismo criterio
 * reforzado en el DTO del backend (`docs/plan-portafolio.md` §4): nunca
 * `'columnas'` (evita anidamiento sin límite) ni `'navegacion'` (Fase 7: la
 * barra de navegación es del sitio, no de una columna; el DTO la rechaza).
 * `'galeria'` (UC-18, Fase 4.5) se suma acá igual que cualquier otro bloque
 * de contenido; desde la Fase 7j también la portada (`'hero'`). Está tipado
 * como `TipoSeccionAnidable`, que ya excluye esos dos: agregar `'navegacion'`
 * aquí no compilaría.
 */
const BLOQUES_ANIDABLES: TipoSeccionAnidable[] = [
  // Fase 7j (UC-17): la portada también, adaptada al ancho de la columna.
  'hero',
  'sobre-mi',
  'proyectos',
  'certificaciones',
  'logros',
  'contacto',
  'skills',
  'galeria',
  'insignias',
  // Fase 7l (UC-19).
  'experiencia',
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

/** Radio Sí/No (valores booleanos) con la etiqueta dada. */
const campoSiNo = (label: string) =>
  ({
    type: 'radio',
    label,
    options: [
      { label: 'Sí', value: true },
      { label: 'No', value: false },
    ],
  }) as const

/** Opciones de `efecto_hover` de proyectos/certificaciones/logros (Fase 7, 7.2). */
const CAMPO_EFECTO_HOVER_TARJETA = {
  type: 'select',
  label: 'Efecto al pasar el cursor',
  options: [
    { label: 'Ninguno', value: 'ninguno' },
    { label: 'Elevar', value: 'elevar' },
    { label: 'Inclinar (3D sutil)', value: 'inclinar' },
  ],
} as const

/**
 * Fase 3.4 (personalización visual por bloque) + Fase 7 (7.2): los campos de
 * `BloqueConfiguracionBase`, compartidos por los tipos de bloque con
 * contenido — se definen una sola vez acá y se hace spread en el `fields` de
 * cada componente, siempre AL FINAL (orden de la Fase 7: contenido →
 * disposición/variantes → efectos → personalización base). Puck 0.23 no tiene
 * separadores de sección sin cambiar la forma de los datos (`object`
 * anidaría las props), así que la agrupación visual es el orden de las
 * claves. Los valores son exactamente los tokens que
 * `apps/web/src/lib/escalas-bloque.ts` y `lib/animaciones.ts` traducen a
 * clases/animaciones literales — este archivo nunca construye una clase,
 * solo persiste el token elegido.
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
      { label: 'Degradado', value: 'degradado' },
      { label: 'Vidrio', value: 'vidrio' },
    ],
  },
  // Fase 7c (UC-12): contorno opcional de contenedores y tarjetas del bloque.
  borde_bloque: {
    type: 'radio',
    label: 'Borde del bloque',
    options: [
      { label: 'Ninguno', value: 'ninguno' },
      { label: 'Sutil', value: 'sutil' },
      { label: 'Marcado', value: 'marcado' },
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
  separador_forma: {
    type: 'select',
    label: 'Forma del separador',
    options: [
      { label: 'Ninguna', value: 'ninguno' },
      { label: 'Onda', value: 'onda' },
      { label: 'Diagonal', value: 'diagonal' },
      { label: 'Curva', value: 'curva' },
    ],
  },
  animacion_entrada: {
    type: 'select',
    label: 'Animación de entrada',
    options: [
      { label: 'Ninguna', value: 'ninguna' },
      { label: 'Aparecer', value: 'aparecer' },
      { label: 'Deslizar hacia arriba', value: 'deslizar_arriba' },
      { label: 'Deslizar desde el lado', value: 'deslizar_lateral' },
      { label: 'Escalar', value: 'escalar' },
    ],
  },
  // Fase 7j (UC-07): el título es obligatorio como dato (lo usa la
  // navegación), pero se puede ocultar en la página. Va al final para quedar
  // junto a "Visible" y "Título", que cada bloque agrega después.
  mostrar_titulo: {
    type: 'radio',
    label: 'Título en la página',
    options: [
      { label: 'Visible', value: true },
      { label: 'Oculto', value: false },
    ],
  },
} as const

/**
 * Fase 7j (UC-18): valores con que nace una galería nueva (vía `resolveData`
 * al insertar, no `defaultProps`: ver el comentario del bloque `galeria`).
 */
const PROPS_GALERIA_NUEVA = {
  proporcion: 'horizontal',
  separacion: 'normal',
  esquinas: 'suaves',
  mostrar_titulos: 'al_pasar',
  aparicion_fotos: 'escalonada',
  reproduccion_automatica: false,
  intervalo_segundos: 5,
  velocidad_cinta: 'normal',
  ampliar_al_clic: true,
} as const satisfies Partial<GaleriaConfiguracion>

/**
 * Fase 7l (UC-02, UC-04, UC-35): valores con que nacen los bloques de
 * proyectos, certificaciones e insignias nuevos (vía `resolveData` al insertar,
 * no `defaultProps`: los bloques ya guardados no los traen y mantienen su
 * aspecto previo, y el API no persiste defaults).
 */
const PROPS_PROYECTOS_NUEVOS = {
  mostrar_estado: true,
  mostrar_enlaces: true,
  mostrar_github: true,
  mostrar_fechas: false,
} as const satisfies Partial<ProyectosConfiguracion>

const PROPS_CERTIFICACIONES_NUEVAS = {
  disposicion: 'tarjetas',
  mostrar_emisor: true,
  mostrar_vigencia: true,
  mostrar_enlace: true,
} as const satisfies Partial<CertificacionesConfiguracion>

const PROPS_INSIGNIAS_NUEVAS = {
  disposicion: 'rejilla',
  reproduccion_automatica: false,
  intervalo_segundos: 5,
  velocidad_cinta: 'normal',
} as const satisfies Partial<InsigniasConfiguracion>

/** `defaultProps` de los campos base, iguales para todos los tipos de bloque (ver comentario de `CAMPOS_BASE_BLOQUE`). Coinciden con los defaults del API. */
const DEFAULT_PROPS_BASE_BLOQUE: Required<BloqueConfiguracionBase> = {
  espaciado_vertical: 'normal',
  ancho_contenido: 'normal',
  alineacion_texto: 'izquierda',
  fondo_bloque: 'ninguno',
  separador_inferior: true,
  animacion_entrada: 'aparecer',
  separador_forma: 'ninguno',
  borde_bloque: 'sutil',
  mostrar_titulo: true,
}

/**
 * Quita campos del sidebar (`resolveFields`, Fase 7): mejora de UX para no
 * mostrar opciones que no aplican a la variante elegida. No es la fuente de
 * verdad de qué se renderiza (eso lo decide cada `Bloque*.tsx`): un valor ya
 * guardado de un campo oculto se conserva.
 */
function sinCampos<F extends object>(fields: F, nombres: string[]): F {
  return Object.fromEntries(
    Object.entries(fields).filter(([nombre]) => !nombres.includes(nombre)),
  ) as F
}

/** Props del `EnvoltorioSeccion` comunes a todos los bloques con contenido. */
function propsEnvoltorio(
  props: ConInternos<BloqueConfiguracionBase> & { id: string },
): Omit<React.ComponentProps<typeof EnvoltorioSeccion>, 'children'> {
  return {
    // Fase 7 (7.3): ancla `#seccion-{id}`; sin fila guardada aún, el `id` de Puck.
    id: props._seccionId ?? props.id,
    visible: props._visible,
    espaciado_vertical: props.espaciado_vertical,
    ancho_contenido: props.ancho_contenido,
    fondo_bloque: props.fondo_bloque,
    separador_inferior: props.separador_inferior,
    animacion_entrada: props.animacion_entrada,
    separador_forma: props.separador_forma,
    borde_bloque: props.borde_bloque,
  }
}

/**
 * Field personalizado de Puck para elegir UNA imagen de la biblioteca de
 * medios (UC-09) con `CampoImagenPuck` (Fase 7k: miniatura + diálogo de la
 * biblioteca con miniaturas, búsqueda y subida; antes era un `<select>` de
 * texto). Usado por `hero.imagen_fondo_media_id` desde su
 * creación y, desde Fase 4.5 (UC-18), reusado tal cual dentro de
 * `arrayFields.media_id` del bloque `galeria` (una foto a la vez por cada
 * ítem del array) — de ahí el nombre neutro (ya no exclusivo del hero).
 *
 * `useMediaList()` se llama **sin** filtro de tipo (`GET /admin/media`, sin
 * `?tipo=`) y el filtro a `tipo === 'imagen'` se hace en cliente: así esta
 * entrada de caché es la misma que ya usa `useDatosEditor` para resolver
 * `mediaPorId` (una sola petición de red compartida en vez de dos).
 */
const selectorMediaField: CustomField<string | undefined> = {
  type: 'custom',
  label: 'Imagen (biblioteca de medios)',
  // Octava ronda (UC-07): Puck solo pinta la etiqueta de los campos nativos;
  // en los `custom` el render debe envolverse en `FieldLabel`.
  render: ({ field, name, value, onChange, readOnly }) => (
    <FieldLabel
      el="div"
      label={field.label ?? name}
      icon={<ImageIcon className="size-4" />}
      readOnly={readOnly}
    >
      <CampoImagenPuck value={value} onChange={onChange} opcional readOnly={readOnly} />
    </FieldLabel>
  ),
}

/**
 * Variante de `selectorMediaField` para `arrayFields.media_id` del bloque
 * `galeria` (Fase 4.5, UC-18): a diferencia de `hero.imagen_fondo_media_id`
 * (opcional), `GaleriaFoto.media_id` es obligatorio — mismo componente
 * `SelectorMedia`, solo cambia el tipo del field para que Puck no permita
 * `undefined` en cada ítem del array (mapea a `''` mientras no se eligió
 * ninguna imagen todavía).
 */
const selectorMediaRequeridoField: CustomField<string> = {
  type: 'custom',
  label: 'Imagen (biblioteca de medios)',
  render: ({ field, name, value, onChange, readOnly }) => (
    <FieldLabel
      el="div"
      label={field.label ?? name}
      icon={<ImageIcon className="size-4" />}
      readOnly={readOnly}
    >
      <CampoImagenPuck
        value={value || undefined}
        onChange={(nuevoValor) => onChange(nuevoValor ?? '')}
        readOnly={readOnly}
      />
    </FieldLabel>
  ),
}

const listaTextosField: CustomField<string[] | undefined> = {
  type: 'custom',
  label: `Títulos rotativos (máx. ${TITULOS_ROTATIVOS_MAX})`,
  // Octava ronda (UC-07): etiqueta visible vía `FieldLabel` (ver arriba).
  render: ({ field, name, value, onChange, readOnly }) => (
    <FieldLabel
      el="div"
      label={field.label ?? name}
      icon={<ListIcon className="size-4" />}
      readOnly={readOnly}
    >
      <ListaTextos value={value ?? []} onChange={onChange} />
    </FieldLabel>
  ),
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
  galeria: ConInternos<GaleriaConfiguracion>
  insignias: ConInternos<InsigniasConfiguracion>
  experiencia: ConInternos<ExperienciaConfiguracion>
  navegacion: ConInternos<NavegacionConfiguracion>
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
 * bloque agregada en Fase 3.4; opciones de la Fase 7): un componente por
 * `tipo_seccion`, con `fields` que reflejan exactamente el DTO de
 * `configuracion` de cada tipo (ver `apps/api/src/modules/secciones/dto/configuracion/`)
 * — los campos propios de cada tipo (contenido → disposición/variantes →
 * efectos) más los de `CAMPOS_BASE_BLOQUE`. Cada `render` compone el mismo
 * bloque real que usa el sitio público (`bloques/`, vía `EnvoltorioSeccion`
 * para el espaciado/ancho/fondo/separador/animación) en vez de un
 * placeholder esquemático: el lienzo de Puck es así un WYSIWYG genuino. Los
 * datos de contenido (perfil, proyectos, certificaciones, etc.) no viajan
 * como prop de cada bloque de Puck — se leen de `puck.metadata.datos`
 * (`DatosEditor`, ver `useDatosEditor`), inyectado una sola vez por
 * `EditorSeccionesPage` vía la prop `metadata` de `<Puck>`.
 */
export const puckConfig: Config<PuckSeccionesComponents, Record<string, never>> = {
  categories: {
    diseno: {
      title: 'Diseño',
      components: ['hero', 'columnas', 'navegacion'],
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
        'galeria',
        'insignias',
        'experiencia',
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
        titulos_rotativos: [],
        mostrar_foto_perfil: true,
        posicion_foto: 'centrada',
        estilo_foto: 'con_marco',
        altura: 'normal',
        overlay_fondo: 'ninguno',
        tamano_titulo: 'normal',
        disposicion: 'centrado',
        mostrar_redes: false,
        mostrar_indicador_scroll: false,
        efecto_titulo: 'ninguno',
        decoracion_fondo: 'ninguna',
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
        // Contenido
        titulo: { type: 'text', label: 'Título' },
        subtitulo: { type: 'textarea', label: 'Subtítulo' },
        titulos_rotativos: listaTextosField,
        imagen_fondo_media_id: selectorMediaField,
        texto_boton: { type: 'text', label: 'Texto del botón (opcional)' },
        enlace_boton: { type: 'text', label: 'Enlace del botón (opcional)' },
        texto_boton_secundario: {
          type: 'text',
          label: 'Texto del segundo botón (opcional)',
        },
        enlace_boton_secundario: {
          type: 'text',
          label: 'Enlace del segundo botón (URL o ruta)',
        },
        // Disposición y variantes
        disposicion: {
          type: 'select',
          label: 'Disposición',
          options: [
            { label: 'Centrado', value: 'centrado' },
            { label: 'Dividido (texto + foto)', value: 'dividido' },
            { label: 'Editorial (título enorme)', value: 'editorial' },
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
        tamano_titulo: {
          type: 'select',
          label: 'Tamaño del título',
          options: [
            { label: 'Normal', value: 'normal' },
            { label: 'Grande', value: 'grande' },
          ],
        },
        mostrar_foto_perfil: campoSiNo('Mostrar foto de perfil'),
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
        mostrar_redes: campoSiNo('Mostrar redes sociales'),
        mostrar_indicador_scroll: campoSiNo('Mostrar indicador de scroll'),
        // Efectos
        efecto_titulo: {
          type: 'select',
          label: 'Efecto del título',
          options: [
            { label: 'Ninguno', value: 'ninguno' },
            { label: 'Degradado', value: 'degradado' },
            { label: 'Resaltado (última palabra)', value: 'resaltado' },
          ],
        },
        decoracion_fondo: {
          type: 'select',
          label: 'Decoración de fondo',
          options: [
            { label: 'Ninguna', value: 'ninguna' },
            { label: 'Manchas difuminadas', value: 'manchas' },
            { label: 'Cuadrícula', value: 'cuadricula' },
            { label: 'Puntos', value: 'puntos' },
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
        // Personalización base
        ...CAMPOS_BASE_BLOQUE,
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      // Fase 7: oculta lo que no aplica. Los enlaces solo tienen sentido con
      // su texto, y la posición/estilo de la foto solo si se muestra la foto.
      // Los valores ya guardados de un campo oculto se conservan.
      resolveFields: (data, { fields }) => {
        const ocultos: string[] = []
        if (!data.props.texto_boton) ocultos.push('enlace_boton')
        if (!data.props.texto_boton_secundario) ocultos.push('enlace_boton_secundario')
        if (!data.props.mostrar_foto_perfil) ocultos.push('posicion_foto', 'estilo_foto')
        // Fase 7j: la portada no pinta un título de sección (su título es el nombre).
        ocultos.push('mostrar_titulo')
        return sinCampos(fields, ocultos)
      },
      render: ({ puck, id: _id, _seccionId, _visible, _tituloVisible, ...config }) => {
        const { datos } = leerMetadata(puck)
        return (
          <EnvoltorioSeccion
            {...propsEnvoltorio({ ...config, id: _id, _seccionId, _visible, _tituloVisible })}
            // Fallback propio del hero ('completo'/'centro'), no el genérico
            // de `escalas-bloque.ts` ('normal'/'izquierda'): una `Seccion`
            // hero guardada antes de esta fase no tiene estos campos en su
            // `configuracion`, y el hero siempre fue a sangre completa con
            // el título centrado — usar el default compartido rompería ese
            // aspecto en cualquier hero ya publicado.
            ancho_contenido={config.ancho_contenido ?? 'completo'}
          >
            <BloqueHero
              config={{
                ...config,
                imagen_fondo: config.imagen_fondo_media_id
                  ? datos.mediaPorId[config.imagen_fondo_media_id]
                  : undefined,
              }}
              perfil={datos.perfil}
              redesSociales={datos.redes_sociales}
              alineacionTitulo={ALINEACION_TEXTO_CLASE[config.alineacion_texto ?? 'centro']}
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
        estilo_foto: 'simple',
        estadisticas: [],
        ...DEFAULT_PROPS_BASE_BLOQUE,
        // Antes de esta fase este bloque era `max-w-3xl` (más angosto que
        // el default compartido `max-w-5xl`) — no hay token exacto para
        // 3xl en la escala de 4 valores de `ancho_contenido`, así que se
        // aproxima con el más cercano disponible ('estrecho' = `max-w-2xl`)
        // en vez de dejarlo caer en el default genérico, que lo ensancharía
        // de verdad en cualquier sitio ya publicado.
        ancho_contenido: 'estrecho',
        _visible: true,
        _tituloVisible: 'Sobre mí',
      },
      fields: {
        // Contenido
        estadisticas: {
          type: 'array',
          label: 'Estadísticas (máx. 4)',
          max: 4,
          defaultItemProps: { etiqueta: 'Años de experiencia', valor: '5+' },
          getItemSummary: (item) => `${item.valor} · ${item.etiqueta}`,
          arrayFields: {
            etiqueta: { type: 'text', label: 'Etiqueta (máx. 30)' },
            valor: { type: 'text', label: 'Valor (máx. 12, ej. 15+ o 98%)' },
          },
        },
        // Disposición y variantes
        mostrar_foto: campoSiNo('Mostrar foto de perfil'),
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
        // Efectos
        estilo_foto: {
          type: 'select',
          label: 'Estilo de la foto',
          options: [
            { label: 'Simple', value: 'simple' },
            { label: 'Marco con degradado', value: 'marco_degradado' },
            { label: 'Flotante (sombra y levitación)', value: 'flotante' },
          ],
        },
        ...CAMPOS_BASE_BLOQUE,
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      resolveFields: (data, { fields }) =>
        data.props.mostrar_foto
          ? fields
          : sinCampos(fields, ['posicion_foto', 'forma_foto', 'estilo_foto']),
      render: ({ puck, id: _id, _seccionId, _visible, _tituloVisible, ...config }) => {
        const { datos } = leerMetadata(puck)
        return (
          <EnvoltorioSeccion
            {...propsEnvoltorio({ ...config, id: _id, _seccionId, _visible, _tituloVisible })}
            // Fallback propio ('estrecho'), no el genérico ('normal'): ver
            // el comentario del `defaultProps` de este mismo bloque.
            ancho_contenido={config.ancho_contenido ?? 'estrecho'}
          >
            <BloqueSobreMi
              titulo={_tituloVisible}
              config={config}
              perfil={datos.perfil}
              alineacionTitulo={ALINEACION_TEXTO_CLASE[config.alineacion_texto ?? 'izquierda']}
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
        disposicion: 'tarjetas',
        efecto_hover: 'elevar',
        mostrar_tecnologias: true,
        ...DEFAULT_PROPS_BASE_BLOQUE,
        _visible: true,
        _tituloVisible: 'Proyectos',
      },
      fields: {
        // Contenido
        cantidad_a_mostrar: {
          type: 'number',
          label: 'Cantidad a mostrar',
          min: 1,
        },
        solo_destacados: campoSiNo('Solo destacados'),
        mostrar_descripcion: campoSiNo('Mostrar descripción'),
        mostrar_tecnologias: campoSiNo('Mostrar tecnologías'),
        // Fase 7l (UC-02): estado, enlaces, datos de GitHub y fechas.
        mostrar_estado: campoSiNo('Mostrar estado (En curso, Finalizado...)'),
        mostrar_enlaces: campoSiNo('Mostrar botones Demo y Código'),
        mostrar_github: campoSiNo('Mostrar lenguaje y estrellas (GitHub)'),
        mostrar_fechas: campoSiNo('Mostrar fechas'),
        // Disposición y variantes
        disposicion: {
          type: 'select',
          label: 'Disposición',
          options: [
            { label: 'Tarjetas', value: 'tarjetas' },
            { label: 'Bento (uno destacado grande)', value: 'bento' },
            { label: 'Lista', value: 'lista' },
            { label: 'Vitrina (filas alternas con imagen grande)', value: 'vitrina' },
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
            { label: 'Vidrio', value: 'vidrio' },
          ],
        },
        // Efectos
        efecto_hover: CAMPO_EFECTO_HOVER_TARJETA,
        ...CAMPOS_BASE_BLOQUE,
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      // `columnas` solo aplica a la disposición `tarjetas` (bento, lista y
      // vitrina tienen su propia rejilla).
      resolveData: (data, { trigger }) =>
        trigger === 'insert'
          ? { ...data, props: { ...data.props, ...PROPS_PROYECTOS_NUEVOS } }
          : data,
      resolveFields: (data, { fields }) => {
        const disposicion = data.props.disposicion ?? 'tarjetas'
        return disposicion === 'tarjetas' ? fields : sinCampos(fields, ['columnas'])
      },
      render: ({ puck, id: _id, _seccionId, _visible, _tituloVisible, ...config }) => {
        const { datos } = leerMetadata(puck)
        return (
          <EnvoltorioSeccion
            {...propsEnvoltorio({ ...config, id: _id, _seccionId, _visible, _tituloVisible })}
          >
            <BloqueProyectos
              titulo={_tituloVisible}
              config={config}
              proyectos={datos.proyectos}
              alineacionTitulo={ALINEACION_TEXTO_CLASE[config.alineacion_texto ?? 'izquierda']}
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
        efecto_hover: 'elevar',
        ...DEFAULT_PROPS_BASE_BLOQUE,
        _visible: true,
        _tituloVisible: 'Certificaciones',
      },
      fields: {
        // Contenido
        orden: {
          type: 'select',
          label: 'Orden',
          options: [
            { label: 'Por fecha', value: 'fecha' },
            { label: 'Manual', value: 'manual' },
          ],
        },
        mostrar_fecha: campoSiNo('Mostrar fecha'),
        // Fase 7l (UC-04): emisor, vigencia y enlace a la credencial.
        mostrar_emisor: campoSiNo('Mostrar emisor'),
        mostrar_vigencia: campoSiNo('Mostrar vigencia (Vigente, Vencida...)'),
        mostrar_enlace: campoSiNo('Mostrar "Ver credencial"'),
        // Disposición y variantes
        disposicion: {
          type: 'select',
          label: 'Disposición',
          options: [
            { label: 'Tarjetas', value: 'tarjetas' },
            { label: 'Línea de tiempo (por año)', value: 'linea_tiempo' },
            { label: 'Muro de logos', value: 'logos' },
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
            { label: 'Vidrio', value: 'vidrio' },
          ],
        },
        // Efectos
        efecto_hover: CAMPO_EFECTO_HOVER_TARJETA,
        ...CAMPOS_BASE_BLOQUE,
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      // Fase 7l: `columnas` y `estilo_tarjeta` solo aplican a las tarjetas; el
      // muro de logos no tiene texto que mostrar ni tarjeta, y la línea de
      // tiempo tiene su propia rejilla por año.
      resolveData: (data, { trigger }) =>
        trigger === 'insert'
          ? { ...data, props: { ...data.props, ...PROPS_CERTIFICACIONES_NUEVAS } }
          : data,
      resolveFields: (data, { fields }) => {
        const disposicion = data.props.disposicion ?? 'tarjetas'
        if (disposicion === 'logos') {
          return sinCampos(fields, [
            'columnas',
            'estilo_tarjeta',
            'mostrar_fecha',
            'mostrar_emisor',
            'mostrar_vigencia',
            'mostrar_enlace',
          ])
        }
        if (disposicion === 'linea_tiempo') return sinCampos(fields, ['columnas'])
        return fields
      },
      render: ({ puck, id: _id, _seccionId, _visible, _tituloVisible, ...config }) => {
        const { datos } = leerMetadata(puck)
        return (
          <EnvoltorioSeccion
            {...propsEnvoltorio({ ...config, id: _id, _seccionId, _visible, _tituloVisible })}
          >
            <BloqueCertificaciones
              titulo={_tituloVisible}
              config={config}
              certificaciones={datos.certificaciones}
              alineacionTitulo={ALINEACION_TEXTO_CLASE[config.alineacion_texto ?? 'izquierda']}
            />
          </EnvoltorioSeccion>
        )
      },
    },
    logros: {
      label: 'Logros',
      defaultProps: {
        estilo_lista: 'tarjetas',
        efecto_hover: 'elevar',
        ...DEFAULT_PROPS_BASE_BLOQUE,
        // Mismo caso que `sobre-mi`: era `max-w-3xl`, sin token exacto en
        // la escala de 4 valores — se aproxima con 'estrecho' (`max-w-2xl`)
        // en vez del default genérico, que lo ensancharía en cualquier
        // sitio ya publicado.
        ancho_contenido: 'estrecho',
        _visible: true,
        _tituloVisible: 'Logros',
      },
      fields: {
        // Contenido
        categoria_filtro: { type: 'text', label: 'Filtrar por categoría (opcional)' },
        // Disposición y variantes
        estilo_lista: {
          type: 'select',
          label: 'Estilo de lista',
          options: [
            { label: 'Tarjetas', value: 'tarjetas' },
            { label: 'Línea de tiempo', value: 'linea_tiempo' },
          ],
        },
        // Efectos
        efecto_hover: CAMPO_EFECTO_HOVER_TARJETA,
        ...CAMPOS_BASE_BLOQUE,
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      // La línea de tiempo no tiene tarjetas: el efecto hover solo aplica a `tarjetas`.
      resolveFields: (data, { fields }) =>
        data.props.estilo_lista === 'linea_tiempo' ? sinCampos(fields, ['efecto_hover']) : fields,
      render: ({ puck, id: _id, _seccionId, _visible, _tituloVisible, ...config }) => {
        const { datos } = leerMetadata(puck)
        return (
          <EnvoltorioSeccion
            {...propsEnvoltorio({ ...config, id: _id, _seccionId, _visible, _tituloVisible })}
            ancho_contenido={config.ancho_contenido ?? 'estrecho'}
          >
            <BloqueLogros
              titulo={_tituloVisible}
              config={config}
              logros={datos.logros}
              alineacionTitulo={ALINEACION_TEXTO_CLASE[config.alineacion_texto ?? 'izquierda']}
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
        estilo: 'simple',
        ...DEFAULT_PROPS_BASE_BLOQUE,
        // El título de contacto siempre estuvo centrado (mismo criterio que
        // hero/skills), y el bloque era `max-w-2xl` (el token exacto
        // 'estrecho') — ver el mismo override en su `render`.
        alineacion_texto: 'centro',
        ancho_contenido: 'estrecho',
        _visible: true,
        _tituloVisible: 'Contacto',
      },
      fields: {
        // Contenido
        texto_llamada: {
          type: 'text',
          label: 'Texto de llamada a la acción (máx. 120)',
        },
        mostrar_formulario: {
          type: 'radio',
          label: 'Mostrar formulario de contacto',
          options: [
            { label: 'Sí', value: true },
            { label: 'No (solo enlaces/CV)', value: false },
          ],
        },
        // Disposición y variantes
        estilo: {
          type: 'select',
          // "Tarjeta destacada" fuerza las redes sociales en botones
          // (ignora `estilo_redes`).
          label: 'Estilo del bloque (Tarjeta destacada fuerza redes en botones)',
          options: [
            { label: 'Simple', value: 'simple' },
            { label: 'Tarjeta destacada', value: 'tarjeta_destacada' },
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
      // La llamada solo existe en la tarjeta destacada, que además fuerza el
      // estilo de botones (`estilo_redes` no aplica).
      resolveFields: (data, { fields }) =>
        data.props.estilo === 'tarjeta_destacada'
          ? sinCampos(fields, ['estilo_redes'])
          : sinCampos(fields, ['texto_llamada']),
      render: ({ puck, id: _id, _seccionId, _visible, _tituloVisible, ...config }) => {
        const { datos } = leerMetadata(puck)
        return (
          <EnvoltorioSeccion
            {...propsEnvoltorio({ ...config, id: _id, _seccionId, _visible, _tituloVisible })}
            ancho_contenido={config.ancho_contenido ?? 'estrecho'}
          >
            <BloqueContacto
              titulo={_tituloVisible}
              config={config}
              perfil={datos.perfil}
              redesSociales={datos.redes_sociales}
              alineacionTitulo={ALINEACION_TEXTO_CLASE[config.alineacion_texto ?? 'centro']}
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
        disposicion: 'marquesina',
        estilo_chip: 'simple',
        ...DEFAULT_PROPS_BASE_BLOQUE,
        // El título de skills siempre estuvo centrado (mismo criterio que
        // hero/contacto) — ver el mismo override en su `render`.
        alineacion_texto: 'centro',
        _visible: true,
        _tituloVisible: 'Skills',
      },
      fields: {
        // Contenido
        mostrar_nombres: campoSiNo('Mostrar nombres'),
        tamano_icono: {
          type: 'select',
          label: 'Tamaño del ícono',
          options: [
            { label: 'Pequeño', value: 'sm' },
            { label: 'Mediano', value: 'md' },
            { label: 'Grande', value: 'lg' },
          ],
        },
        // Disposición y variantes
        disposicion: {
          type: 'select',
          label: 'Disposición',
          options: [
            { label: 'Marquesina (carrusel)', value: 'marquesina' },
            { label: 'Cuadrícula', value: 'cuadricula' },
            { label: 'Nube', value: 'nube' },
          ],
        },
        estilo_chip: {
          type: 'select',
          label: 'Estilo del chip',
          options: [
            { label: 'Simple', value: 'simple' },
            { label: 'Vidrio', value: 'vidrio' },
            { label: 'Contorno', value: 'contorno' },
          ],
        },
        // Efectos (solo de la marquesina)
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
        pausar_al_pasar: campoSiNo('Pausar al pasar el mouse'),
        ...CAMPOS_BASE_BLOQUE,
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      // Dirección/velocidad/pausa son del carrusel; el estilo de chip solo
      // aplica a cuadrícula y nube.
      resolveFields: (data, { fields }) =>
        (data.props.disposicion ?? 'marquesina') === 'marquesina'
          ? sinCampos(fields, ['estilo_chip'])
          : sinCampos(fields, ['direccion', 'velocidad', 'pausar_al_pasar']),
      render: ({ puck, id: _id, _seccionId, _visible, _tituloVisible, ...config }) => {
        const { datos } = leerMetadata(puck)
        return (
          <EnvoltorioSeccion
            {...propsEnvoltorio({ ...config, id: _id, _seccionId, _visible, _tituloVisible })}
          >
            <BloqueSkills
              titulo={_tituloVisible}
              config={config}
              skills={datos.skills}
              alineacionTitulo={ALINEACION_TEXTO_CLASE[config.alineacion_texto ?? 'centro']}
            />
          </EnvoltorioSeccion>
        )
      },
    },
    /**
     * Galería de fotos (UC-18, Fase 4.5): `fields.fotos` usa el campo nativo
     * `type: 'array'` de Puck (`ArrayField`) — cada ítem reusa
     * `selectorMediaRequeridoField` (variante obligatoria de
     * `selectorMediaField`) para elegir la foto, misma biblioteca de medios
     * que `hero.imagen_fondo_media_id`, más un título opcional. El array
     * guardado en `Seccion.configuracion.fotos` nunca trae `media` resuelta
     * (eso solo lo agrega el backend en el snapshot público, o este mismo
     * `render` contra `datos.mediaPorId` para el lienzo) — ver `GaleriaFoto`.
     */
    galeria: {
      label: 'Galería',
      // Fase 7j (UC-18): las opciones nuevas NO van en `defaultProps`: el
      // editor mezcla `defaultProps` bajo la configuración guardada y una
      // galería anterior se vería distinta en el lienzo que en el sitio. Los
      // bloques nuevos reciben sus valores al insertarse (`resolveData`).
      defaultProps: {
        fotos: [],
        disposicion: 'carousel',
        columnas_grid: 3,
        efecto_hover: 'zoom',
        ...DEFAULT_PROPS_BASE_BLOQUE,
        _visible: true,
        _tituloVisible: 'Galería',
      },
      fields: {
        // Contenido
        fotos: {
          type: 'array',
          label: 'Fotos',
          defaultItemProps: { media_id: '', titulo: '' },
          // Fase 7j: cada foto se reconoce en la lista por su título.
          getItemSummary: (foto, indice) =>
            foto.titulo?.trim() || `Foto ${(indice ?? 0) + 1}`,
          arrayFields: {
            media_id: selectorMediaRequeridoField,
            titulo: { type: 'text', label: 'Título (opcional)' },
          },
        },
        mostrar_titulos: {
          type: 'select',
          label: 'Título sobre cada foto',
          options: [
            { label: 'Nunca', value: 'nunca' },
            { label: 'Al pasar el cursor', value: 'al_pasar' },
            { label: 'Siempre visible', value: 'siempre' },
          ],
        },
        ampliar_al_clic: campoSiNo('Ampliar la foto al hacer clic'),
        // Disposición y variantes
        disposicion: {
          type: 'select',
          label: 'Disposición',
          options: [
            { label: 'Carrusel', value: 'carousel' },
            { label: 'Grilla', value: 'grid' },
            { label: 'Mosaico (bento)', value: 'mosaico' },
            { label: 'Masonry (proporción natural)', value: 'masonry' },
            { label: 'Cinta en movimiento', value: 'cinta' },
          ],
        },
        columnas_grid: {
          type: 'select',
          label: 'Columnas',
          options: [
            { label: '2', value: 2 },
            { label: '3', value: 3 },
            { label: '4', value: 4 },
          ],
        },
        proporcion: {
          type: 'select',
          label: 'Proporción de las fotos',
          // La primera opción es la que vale con la clave ausente.
          options: [
            { label: 'Según la disposición', value: 'automatica' },
            { label: 'Horizontal (4:3)', value: 'horizontal' },
            { label: 'Panorámica (16:9)', value: 'panoramica' },
            { label: 'Cuadrada', value: 'cuadrada' },
            { label: 'Vertical (3:4)', value: 'vertical' },
          ],
        },
        separacion: {
          type: 'select',
          label: 'Separación entre fotos',
          options: [
            { label: 'Normal', value: 'normal' },
            { label: 'Ninguna', value: 'ninguna' },
            { label: 'Compacta', value: 'compacta' },
            { label: 'Amplia', value: 'amplia' },
          ],
        },
        esquinas: {
          type: 'radio',
          label: 'Esquinas',
          options: [
            { label: 'Rectas', value: 'rectas' },
            { label: 'Suaves', value: 'suaves' },
            { label: 'Redondeadas', value: 'redondeadas' },
          ],
        },
        reproduccion_automatica: campoSiNo('Avanzar solo'),
        intervalo_segundos: {
          type: 'number',
          label: 'Segundos por foto',
          min: 2,
          max: 15,
        },
        velocidad_cinta: {
          type: 'radio',
          label: 'Velocidad de la cinta',
          options: [
            { label: 'Lenta', value: 'lenta' },
            { label: 'Normal', value: 'normal' },
            { label: 'Rápida', value: 'rapida' },
          ],
        },
        // Efectos
        aparicion_fotos: {
          type: 'select',
          label: 'Aparición de las fotos',
          options: [
            { label: 'Sin animación', value: 'ninguna' },
            { label: 'Una tras otra', value: 'escalonada' },
            { label: 'Zoom suave', value: 'zoom_suave' },
          ],
        },
        efecto_hover: {
          type: 'select',
          label: 'Efecto al pasar el cursor',
          options: [
            { label: 'Zoom', value: 'zoom' },
            { label: 'Elevar', value: 'elevar' },
            { label: 'Inclinar en 3D', value: 'inclinar' },
            { label: 'De gris a color', value: 'grises' },
            { label: 'Ninguno', value: 'ninguno' },
          ],
        },
        ...CAMPOS_BASE_BLOQUE,
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      // Fase 7j: valores de partida solo para galerías recién insertadas.
      resolveData: (data, { trigger }) =>
        trigger === 'insert'
          ? { ...data, props: { ...data.props, ...PROPS_GALERIA_NUEVA } }
          : data,
      // Fase 7j: cada disposición muestra solo sus opciones (mejora del
      // sidebar, no la fuente de verdad: `BloqueGaleria` decide qué pinta).
      resolveFields: (data, { fields }) => {
        const disposicion = data.props.disposicion ?? 'carousel'
        const ocultos: string[] = []
        if (disposicion !== 'grid' && disposicion !== 'masonry') ocultos.push('columnas_grid')
        if (disposicion === 'mosaico' || disposicion === 'masonry') ocultos.push('proporcion')
        if (disposicion !== 'carousel') ocultos.push('reproduccion_automatica', 'intervalo_segundos')
        if (disposicion === 'carousel' && !data.props.reproduccion_automatica) {
          ocultos.push('intervalo_segundos')
        }
        if (disposicion !== 'cinta') ocultos.push('velocidad_cinta')
        // La cinta ya se mueve: no lleva aparición escalonada.
        if (disposicion === 'cinta' || disposicion === 'carousel') ocultos.push('aparicion_fotos')
        return sinCampos(fields, ocultos)
      },
      render: ({ puck, id: _id, _seccionId, _visible, _tituloVisible, ...config }) => {
        const { datos } = leerMetadata(puck)
        const fotosResueltas: GaleriaFoto[] = config.fotos.map((foto) => ({
          ...foto,
          media: foto.media_id ? datos.mediaPorId[foto.media_id] : undefined,
        }))
        return (
          <EnvoltorioSeccion
            {...propsEnvoltorio({ ...config, id: _id, _seccionId, _visible, _tituloVisible })}
          >
            <BloqueGaleria
              titulo={_tituloVisible}
              config={{ ...config, fotos: fotosResueltas }}
              alineacionTitulo={ALINEACION_TEXTO_CLASE[config.alineacion_texto ?? 'izquierda']}
            />
          </EnvoltorioSeccion>
        )
      },
    },
    /**
     * Insignias importables (Fase 7d, UC-35): muestra las insignias visibles
     * de la entidad `insignia` (no viven en la configuración; el lienzo las
     * lee de `datos.insignias`, cargadas por `useDatosEditor`). Permitido
     * dentro de `columnas`. Los `defaultProps` coinciden con los fallbacks de
     * render de `BloqueInsignias` y con los defaults del API. Fase 7h: estilo
     * `medalla` (por defecto) con animación en reposo, marco y etiqueta; los
     * campos de una presentación se ocultan en la otra (`resolveFields`).
     */
    insignias: {
      label: 'Insignias',
      defaultProps: {
        estilo: 'medalla',
        animacion_reposo: 'flotar',
        marco_medalla: 'halo',
        etiqueta_medalla: 'al_pasar',
        columnas: 'auto',
        tamano: 'normal',
        efecto_hover: 'inclinar_brillo',
        mostrar_emisor: true,
        mostrar_fecha: true,
        mostrar_habilidades: false,
        mostrar_enlace: true,
        ...DEFAULT_PROPS_BASE_BLOQUE,
        _visible: true,
        _tituloVisible: 'Insignias',
      },
      fields: {
        // Contenido
        titulo: { type: 'text', label: 'Título (opcional)' },
        subtitulo: { type: 'text', label: 'Subtítulo (opcional)' },
        limite: { type: 'number', label: 'Máximo de insignias (vacío = todas)', min: 1, max: 50 },
        mostrar_emisor: campoSiNo('Mostrar emisor'),
        mostrar_fecha: campoSiNo('Mostrar fecha'),
        mostrar_habilidades: campoSiNo('Mostrar habilidades'),
        mostrar_enlace: campoSiNo('Enlazar a la verificación'),
        // Disposición y variantes
        disposicion: {
          type: 'select',
          label: 'Disposición',
          options: [
            { label: 'Rejilla', value: 'rejilla' },
            { label: 'Carrusel (con flechas y puntos)', value: 'carrusel' },
            { label: 'Cinta continua', value: 'cinta' },
          ],
        },
        reproduccion_automatica: campoSiNo('Avanzar solo (carrusel)'),
        intervalo_segundos: {
          type: 'number',
          label: 'Segundos entre avances (2 a 15)',
          min: 2,
          max: 15,
        },
        velocidad_cinta: {
          type: 'select',
          label: 'Velocidad de la cinta',
          options: [
            { label: 'Lenta', value: 'lenta' },
            { label: 'Normal', value: 'normal' },
            { label: 'Rápida', value: 'rapida' },
          ],
        },
        estilo: {
          type: 'radio',
          label: 'Presentación',
          options: [
            { label: 'Medallas', value: 'medalla' },
            { label: 'Tarjetas', value: 'tarjeta' },
          ],
        },
        animacion_reposo: {
          type: 'select',
          label: 'Movimiento de las medallas',
          options: [
            { label: 'Flotar', value: 'flotar' },
            { label: 'Balanceo (colgante)', value: 'balanceo' },
            { label: 'Destello de luz', value: 'destello' },
            { label: 'Sin movimiento', value: 'ninguna' },
          ],
        },
        marco_medalla: {
          type: 'select',
          label: 'Marco de la medalla',
          options: [
            { label: 'Halo de luz', value: 'halo' },
            { label: 'Aro metálico', value: 'aro' },
            { label: 'Cinta', value: 'cinta' },
            { label: 'Ninguno', value: 'ninguno' },
          ],
        },
        etiqueta_medalla: {
          type: 'select',
          label: 'Nombre de la insignia',
          options: [
            { label: 'Al pasar el cursor', value: 'al_pasar' },
            { label: 'Siempre visible', value: 'siempre' },
            { label: 'Oculto', value: 'nunca' },
          ],
        },
        columnas: {
          type: 'select',
          label: 'Columnas',
          options: [
            { label: 'Automático', value: 'auto' },
            { label: '2', value: 2 },
            { label: '3', value: 3 },
            { label: '4', value: 4 },
          ],
        },
        tamano: {
          type: 'select',
          label: 'Tamaño de la insignia',
          options: [
            { label: 'Compacto', value: 'compacto' },
            { label: 'Normal', value: 'normal' },
            { label: 'Grande', value: 'grande' },
          ],
        },
        // Efectos
        efecto_hover: {
          type: 'select',
          label: 'Efecto al pasar el cursor',
          options: [
            { label: 'Inclinar con brillo', value: 'inclinar_brillo' },
            { label: 'Girar (muestra los detalles)', value: 'girar' },
            { label: 'Elevar', value: 'elevar' },
            { label: 'Ninguno', value: 'ninguno' },
          ],
        },
        ...CAMPOS_BASE_BLOQUE,
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      // Fase 7l: valores de partida solo para bloques recién insertados.
      resolveData: (data, { trigger }) =>
        trigger === 'insert' ? { ...data, props: { ...data.props, ...PROPS_INSIGNIAS_NUEVAS } } : data,
      // Fase 7h: cada presentación muestra solo sus opciones. En medallas el
      // texto largo (emisor, fechas, habilidades) no se pinta: la insignia ya
      // lo dice y el clic lleva a la verificación. Fase 7l: `columnas` solo
      // aplica a la rejilla; el carrusel automático y la cinta tienen sus
      // propios ajustes.
      resolveFields: (data, { fields }) => {
        const disposicion = data.props.disposicion ?? 'rejilla'
        const ocultosDisposicion: string[] = []
        if (disposicion !== 'rejilla') ocultosDisposicion.push('columnas')
        if (disposicion !== 'carrusel') ocultosDisposicion.push('reproduccion_automatica', 'intervalo_segundos')
        if (disposicion === 'carrusel' && !data.props.reproduccion_automatica) {
          ocultosDisposicion.push('intervalo_segundos')
        }
        if (disposicion !== 'cinta') ocultosDisposicion.push('velocidad_cinta')
        if ((data.props.estilo ?? 'medalla') === 'tarjeta') {
          return sinCampos(fields, [
            'animacion_reposo',
            'marco_medalla',
            'etiqueta_medalla',
            ...ocultosDisposicion,
          ])
        }
        const campos = sinCampos(fields, [
          'mostrar_emisor',
          'mostrar_fecha',
          'mostrar_habilidades',
          ...ocultosDisposicion,
        ])
        return {
          ...campos,
          efecto_hover: {
            type: 'select',
            label: 'Efecto al pasar el cursor',
            options: [
              { label: 'Inclinar con brillo', value: 'inclinar_brillo' },
              { label: 'Girar como moneda', value: 'girar' },
              { label: 'Elevar', value: 'elevar' },
              { label: 'Ninguno', value: 'ninguno' },
            ],
          },
        }
      },
      render: ({ puck, id: _id, _seccionId, _visible, _tituloVisible, ...config }) => {
        const { datos } = leerMetadata(puck)
        return (
          <EnvoltorioSeccion
            {...propsEnvoltorio({ ...config, id: _id, _seccionId, _visible, _tituloVisible })}
          >
            <BloqueInsignias
              titulo={_tituloVisible}
              config={config}
              insignias={datos.insignias ?? []}
              alineacionTitulo={ALINEACION_TEXTO_CLASE[config.alineacion_texto ?? 'izquierda']}
            />
          </EnvoltorioSeccion>
        )
      },
    },
    /**
     * Experiencia laboral (Fase 7l, UC-19): muestra las experiencias visibles
     * de la entidad `experiencia_laboral` (no viven en la configuración; el
     * lienzo las lee de `datos.experiencias`, cargadas por `useDatosEditor`).
     * Permitido dentro de `columnas`. Los `defaultProps` coinciden con los
     * defaults del API y con los fallbacks de `BloqueExperiencia`; en
     * `compacta` (una línea por puesto) no hay logos, así que `mostrar_logos`
     * se oculta (`resolveFields`).
     */
    experiencia: {
      label: 'Experiencia',
      defaultProps: {
        disposicion: 'linea_tiempo',
        mostrar_duracion: true,
        mostrar_tecnologias: true,
        mostrar_logos: true,
        mostrar_ubicacion: true,
        efecto_hover: 'elevar',
        ...DEFAULT_PROPS_BASE_BLOQUE,
        _visible: true,
        _tituloVisible: 'Experiencia',
      },
      fields: {
        // Contenido
        titulo: { type: 'text', label: 'Título (opcional)' },
        subtitulo: { type: 'text', label: 'Subtítulo (opcional)' },
        limite: { type: 'number', label: 'Máximo de puestos (vacío = todos)', min: 1, max: 50 },
        mostrar_duracion: campoSiNo('Mostrar la duración'),
        mostrar_tecnologias: campoSiNo('Mostrar tecnologías'),
        mostrar_logos: campoSiNo('Mostrar logos de las empresas'),
        mostrar_ubicacion: campoSiNo('Mostrar la ubicación'),
        // Disposición y variantes
        disposicion: {
          type: 'select',
          label: 'Disposición',
          options: [
            { label: 'Línea de tiempo', value: 'linea_tiempo' },
            { label: 'Tarjetas', value: 'tarjetas' },
            { label: 'Compacta (una línea por puesto)', value: 'compacta' },
          ],
        },
        // Efectos
        efecto_hover: {
          type: 'select',
          label: 'Efecto al pasar el cursor (tarjetas)',
          options: [
            { label: 'Elevar', value: 'elevar' },
            { label: 'Inclinar', value: 'inclinar' },
            { label: 'Ninguno', value: 'ninguno' },
          ],
        },
        ...CAMPOS_BASE_BLOQUE,
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      resolveFields: (data, { fields }) => {
        const disposicion = data.props.disposicion ?? 'linea_tiempo'
        // Solo las tarjetas tienen efecto al pasar el cursor; la compacta no lleva logos.
        if (disposicion === 'compacta') return sinCampos(fields, ['mostrar_logos', 'efecto_hover'])
        if (disposicion === 'linea_tiempo') return sinCampos(fields, ['efecto_hover'])
        return fields
      },
      render: ({ puck, id: _id, _seccionId, _visible, _tituloVisible, ...config }) => {
        const { datos } = leerMetadata(puck)
        return (
          <EnvoltorioSeccion
            {...propsEnvoltorio({ ...config, id: _id, _seccionId, _visible, _tituloVisible })}
          >
            <BloqueExperiencia
              titulo={_tituloVisible}
              config={config}
              experiencias={datos.experiencias ?? []}
              alineacionTitulo={ALINEACION_TEXTO_CLASE[config.alineacion_texto ?? 'izquierda']}
            />
          </EnvoltorioSeccion>
        )
      },
    },
    /**
     * Barra de navegación del sitio (Fase 7, 7.2/7.3, UC-07 y UC-12). Sus
     * enlaces no se configuran: se generan con las secciones visibles con
     * título (`NavegacionEnLienzo`). Como `hero`, no se puede soltar dentro
     * de `columnas` (`BLOQUES_ANIDABLES`). No usa `EnvoltorioSeccion` ni
     * muestra los campos base (espaciado, ancho, fondo, separador,
     * animación) ni el título: su posición (`fixed` en el sitio, `sticky` en
     * el lienzo) no depende de ellos y un ancestro animado rompería el
     * `fixed`; la config solo necesita los campos propios de abajo.
     */
    navegacion: {
      label: 'Navegación',
      defaultProps: {
        estilo: 'flotante',
        fijo: true,
        mostrar_nombre: true,
        mostrar_cv: true,
        mostrar_toggle_modo: true,
        mostrar_progreso_scroll: false,
        ...DEFAULT_PROPS_BASE_BLOQUE,
        _visible: true,
        _tituloVisible: 'Navegación',
      },
      fields: {
        estilo: {
          type: 'select',
          label: 'Estilo',
          options: [
            { label: 'Flotante (píldora centrada)', value: 'flotante' },
            { label: 'Barra de ancho completo', value: 'barra' },
          ],
        },
        fijo: campoSiNo('Fija arriba al hacer scroll'),
        mostrar_nombre: campoSiNo('Mostrar mi nombre'),
        mostrar_cv: campoSiNo('Mostrar botón del CV'),
        mostrar_toggle_modo: campoSiNo('Mostrar interruptor claro/oscuro'),
        mostrar_progreso_scroll: campoSiNo('Mostrar progreso de lectura'),
        ...CAMPOS_BASE_BLOQUE,
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      resolveFields: (_data, { fields }) =>
        sinCampos(fields, [...Object.keys(CAMPOS_BASE_BLOQUE), '_tituloVisible']),
      render: ({ puck, id: _id, _seccionId, _visible, _tituloVisible, ...config }) => {
        const { datos } = leerMetadata(puck)
        return <NavegacionEnLienzo config={config} visible={_visible} perfil={datos.perfil} />
      },
    },
    /**
     * Contenedor "Columnas" (UC-17, Fase 3.3): layout multi-columna con la
     * Slots API de Puck. NO es un placeholder — cada zona `columna_1/2/3` es
     * una zona de drag-and-drop real donde se pueden soltar los tipos de
     * bloque anidables (`BLOQUES_ANIDABLES`, incluye `galeria` desde UC-18),
     * reforzado con `allow` (nunca `hero`, `columnas` ni `navegacion`, ver
     * comentario de `BLOQUES_ANIDABLES`). A diferencia de los demás bloques,
     * este SÍ es una `Seccion` cuya `configuracion` guarda además el
     * contenido de sus hijos (ver `docs/plan-portafolio.md` §4 y
     * `EditorSeccionesPage.sanearSlots`). Fase 3.4: solo gana los campos base
     * (sin campos propios nuevos) — el contenedor en sí no tiene título
     * propio, así que no recibe `alineacion_texto` resuelto hacia ningún
     * `<h2>`.
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
        // El contenedor de columnas (UC-17, Fase 3.3) nunca tuvo `max-w`
        // propio — igual que `hero`, el default compartido lo angostaría en
        // cualquier sitio ya publicado. Ver el mismo override en su
        // `render`.
        ancho_contenido: 'completo',
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
      resolveFields: (data, { fields }) =>
        data.props.distribucion === '1-1-1' ? fields : sinCampos(fields, ['columna_3']),
      render: (props) => {
        const {
          distribucion,
          alineacion_vertical,
          espaciado,
          columna_1: Columna1,
          columna_2: Columna2,
          columna_3: Columna3,
          ancho_contenido,
        } = props
        const tresColumnas = distribucion === '1-1-1'
        return (
          <EnvoltorioSeccion
            {...propsEnvoltorio(props)}
            ancho_contenido={ancho_contenido ?? 'completo'}
          >
            <div
              className={`grid ${GRID_COLS_POR_DISTRIBUCION[distribucion]} ${ALINEACION_VERTICAL_CLASE[alineacion_vertical]} ${ESPACIADO_CLASE[espaciado]}`}
            >
              <div className="grid gap-6">
                <ProveedorEnColumna>
                  <Columna1 />
                </ProveedorEnColumna>
              </div>
              <div className="grid gap-6">
                <ProveedorEnColumna>
                  <Columna2 />
                </ProveedorEnColumna>
              </div>
              {tresColumnas ? (
                <div className="grid gap-6">
                  <ProveedorEnColumna>
                  <Columna3 />
                </ProveedorEnColumna>
                </div>
              ) : null}
            </div>
          </EnvoltorioSeccion>
        )
      },
    },
  },
}
