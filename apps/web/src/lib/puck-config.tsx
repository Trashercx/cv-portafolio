import type { Config, CustomField } from '@measured/puck'
import { useMediaList } from '@/features/media/useMediaLibrary'
import type {
  CertificacionesConfiguracion,
  ContactoConfiguracion,
  HeroConfiguracion,
  LogrosConfiguracion,
  ProyectosConfiguracion,
  SkillsConfiguracion,
  SobreMiConfiguracion,
} from '@/features/secciones/types'

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
 * Field personalizado de Puck para `hero.imagen_fondo_media_id`: en vez de
 * duplicar el flujo de subida de `MediaUploadField`, deja elegir entre las
 * imágenes ya existentes en la biblioteca (`GET /admin/media?tipo=imagen`,
 * UC-09) — más simple de integrar dentro del sidebar de Puck que reusar un
 * input de archivo ahí mismo.
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
  const { data: imagenes, isLoading } = useMediaList('imagen')

  return (
    <select
      className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm"
      value={value ?? ''}
      disabled={isLoading}
      onChange={(event) => onChange(event.target.value || undefined)}
    >
      <option value="">Sin imagen de fondo</option>
      {(imagenes ?? []).map((imagen) => (
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
}

/**
 * Config de Puck (UC-07): un componente por `tipo_seccion`, con `fields`
 * que reflejan exactamente el DTO de `configuracion` de cada tipo (ver
 * `apps/api/src/modules/secciones/dto/configuracion/`). Los `render` son
 * previsualizaciones simples con Tailwind — el sitio público real llega en
 * Sprint 4 y leerá el snapshot publicado, no este editor.
 */
export const puckConfig: Config<PuckSeccionesComponents> = {
  components: {
    hero: {
      label: 'Portada (hero)',
      defaultProps: {
        titulo: 'Tu nombre',
        subtitulo: 'Tu título profesional',
        mostrar_foto_perfil: true,
        posicion_foto: 'centrada',
        estilo_foto: 'con_marco',
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
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      render: ({
        titulo,
        subtitulo,
        texto_boton,
        enlace_boton,
        mostrar_foto_perfil,
        posicion_foto,
        estilo_foto,
        _visible,
      }) => (
        <BloquePreview visible={_visible} etiqueta="Portada">
          <h1 className="text-2xl font-bold text-foreground">{titulo}</h1>
          <p className="text-muted-foreground">{subtitulo}</p>
          {texto_boton ? (
            <span className="inline-block rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
              {texto_boton}
              {enlace_boton ? ` → ${enlace_boton}` : ''}
            </span>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Foto de perfil:{' '}
            {mostrar_foto_perfil
              ? `${posicion_foto} · ${estilo_foto}`
              : 'oculta'}
            .
          </p>
        </BloquePreview>
      ),
    },
    'sobre-mi': {
      label: 'Sobre mí',
      defaultProps: {
        mostrar_foto: true,
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
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      render: ({ mostrar_foto, _visible }) => (
        <BloquePreview visible={_visible} etiqueta="Sobre mí">
          <p className="text-sm text-muted-foreground">
            Contenido tomado del perfil (UC-02). Foto:{' '}
            {mostrar_foto ? 'visible' : 'oculta'}.
          </p>
        </BloquePreview>
      ),
    },
    proyectos: {
      label: 'Proyectos',
      defaultProps: {
        cantidad_a_mostrar: 3,
        solo_destacados: false,
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
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      render: ({ cantidad_a_mostrar, solo_destacados, _visible }) => (
        <BloquePreview visible={_visible} etiqueta="Proyectos">
          <p className="text-sm text-muted-foreground">
            Muestra {cantidad_a_mostrar} proyecto(s)
            {solo_destacados ? ' (solo destacados)' : ''}.
          </p>
        </BloquePreview>
      ),
    },
    certificaciones: {
      label: 'Certificaciones',
      defaultProps: {
        orden: 'fecha',
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
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      render: ({ orden, _visible }) => (
        <BloquePreview visible={_visible} etiqueta="Certificaciones">
          <p className="text-sm text-muted-foreground">Orden: {orden}.</p>
        </BloquePreview>
      ),
    },
    logros: {
      label: 'Logros',
      defaultProps: {
        _visible: true,
        _tituloVisible: 'Logros',
      },
      fields: {
        categoria_filtro: { type: 'text', label: 'Filtrar por categoría (opcional)' },
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      render: ({ categoria_filtro, _visible }) => (
        <BloquePreview visible={_visible} etiqueta="Logros">
          <p className="text-sm text-muted-foreground">
            {categoria_filtro
              ? `Filtrado por categoría: ${categoria_filtro}`
              : 'Sin filtro de categoría.'}
          </p>
        </BloquePreview>
      ),
    },
    contacto: {
      label: 'Contacto',
      defaultProps: {
        mostrar_formulario: false,
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
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      render: ({ mostrar_formulario, _visible }) => (
        <BloquePreview visible={_visible} etiqueta="Contacto">
          <p className="text-sm text-muted-foreground">
            {mostrar_formulario
              ? 'Con formulario de contacto.'
              : 'Solo enlaces de redes y descarga de CV.'}
          </p>
        </BloquePreview>
      ),
    },
    skills: {
      label: 'Skills',
      defaultProps: {
        direccion: 'izquierda',
        velocidad: 'media',
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
        _visible: VISIBLE_FIELD,
        _tituloVisible: TITULO_VISIBLE_FIELD,
      },
      render: ({ direccion, velocidad, _visible }) => (
        <BloquePreview visible={_visible} etiqueta="Skills">
          <p className="text-sm text-muted-foreground">
            Carrusel hacia la {direccion}, velocidad {velocidad}.
          </p>
        </BloquePreview>
      ),
    },
  },
}

function BloquePreview({
  etiqueta,
  visible,
  children,
}: {
  etiqueta: string
  visible: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`rounded-md border bg-card p-4 ${visible ? '' : 'opacity-40'}`}
    >
      <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {etiqueta}
        {!visible ? ' · oculta' : ''}
      </p>
      <div className="grid gap-2">{children}</div>
    </div>
  )
}
