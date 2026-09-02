import { FileIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import type {
  CertificacionesConfiguracion,
  ContactoConfiguracion,
  HeroConfiguracion,
  LogrosConfiguracion,
  ProyectosConfiguracion,
  Seccion,
  SobreMiConfiguracion,
} from '@/features/secciones/types'
import { formatearFecha } from '@/lib/formato'
import { RedesSociales } from './RedesSociales'
import type { SnapshotSitio } from '@/features/publico/types'

type RenderizadorSeccionesProps = {
  snapshot: SnapshotSitio
  /**
   * `true` (por defecto) en el sitio público (UC-12): oculta por completo
   * las secciones con `visible=false`. `false` en la vista previa del panel
   * (UC-10): el admin también necesita ver qué secciones NO se publicarían,
   * así que se muestran atenuadas en vez de ocultarse — mismo criterio ya
   * documentado en `VersionesSitioService.armarSnapshot`.
   */
  soloVisibles?: boolean
}

/**
 * Pinta las `secciones` de un `SnapshotSitio` según su `tipo_seccion`, en su
 * `orden`. Componente compartido entre la vista previa del panel (UC-10,
 * `PanelVersiones`, incrustado en `EditorSeccionesPage` desde Sprint 7) y la
 * home pública (UC-12, `PublicHomePage`) para no duplicar cómo se
 * interpreta cada bloque.
 */
export function RenderizadorSecciones({
  snapshot,
  soloVisibles = true,
}: RenderizadorSeccionesProps) {
  const secciones = [...snapshot.secciones].sort((a, b) => a.orden - b.orden)

  return (
    <div className="grid gap-0">
      {secciones.map((seccion) => {
        if (soloVisibles && !seccion.visible) return null

        return (
          <section
            key={seccion.id}
            id={seccion.id}
            aria-hidden={!seccion.visible}
            className={
              seccion.visible
                ? 'border-b px-6 py-12'
                : 'border-b border-dashed px-6 py-12 opacity-40'
            }
          >
            {!seccion.visible ? (
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Oculta · no se publicará
              </p>
            ) : null}
            <BloqueSeccion seccion={seccion} snapshot={snapshot} />
          </section>
        )
      })}
    </div>
  )
}

function BloqueSeccion({
  seccion,
  snapshot,
}: {
  seccion: Seccion
  snapshot: SnapshotSitio
}) {
  switch (seccion.tipo_seccion) {
    case 'hero':
      return <BloqueHero config={seccion.configuracion as HeroConfiguracion} />
    case 'sobre-mi':
      return (
        <BloqueSobreMi
          titulo={seccion.titulo_visible}
          config={seccion.configuracion as SobreMiConfiguracion}
          perfil={snapshot.perfil}
        />
      )
    case 'proyectos':
      return (
        <BloqueProyectos
          titulo={seccion.titulo_visible}
          config={seccion.configuracion as ProyectosConfiguracion}
          proyectos={snapshot.proyectos}
        />
      )
    case 'certificaciones':
      return (
        <BloqueCertificaciones
          titulo={seccion.titulo_visible}
          config={seccion.configuracion as CertificacionesConfiguracion}
          certificaciones={snapshot.certificaciones}
        />
      )
    case 'logros':
      return (
        <BloqueLogros
          titulo={seccion.titulo_visible}
          config={seccion.configuracion as LogrosConfiguracion}
          logros={snapshot.logros}
        />
      )
    case 'contacto':
      return (
        <BloqueContacto
          titulo={seccion.titulo_visible}
          config={seccion.configuracion as ContactoConfiguracion}
          perfil={snapshot.perfil}
          redesSociales={snapshot.redes_sociales}
        />
      )
    default:
      return null
  }
}

function BloqueHero({ config }: { config: HeroConfiguracion }) {
  return (
    <div
      style={
        config.imagen_fondo
          ? {
              backgroundImage: `url(${config.imagen_fondo.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
      className="grid gap-4 rounded-lg p-8 text-center"
    >
      <h1
        className="text-4xl font-bold"
        style={{ color: 'var(--color-texto)' }}
      >
        {config.titulo}
      </h1>
      <p
        className="text-lg"
        style={{ color: 'var(--color-texto)' }}
      >
        {config.subtitulo}
      </p>
      {config.texto_boton && config.enlace_boton ? (
        <a
          href={config.enlace_boton}
          target="_blank"
          rel="noreferrer"
          style={{
            backgroundColor: 'var(--color-primario)',
            color: 'var(--color-texto)',
          }}
          className="mx-auto rounded-md px-6 py-2.5 text-sm font-medium"
        >
          {config.texto_boton}
        </a>
      ) : null}
    </div>
  )
}

function BloqueSobreMi({
  titulo,
  config,
  perfil,
}: {
  titulo: string
  config: SobreMiConfiguracion
  perfil: SnapshotSitio['perfil']
}) {
  if (!perfil) return null

  return (
    <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
      {config.mostrar_foto && perfil.imagen_perfil ? (
        <img
          src={perfil.imagen_perfil.url}
          alt={perfil.imagen_perfil.alt_text ?? perfil.nombre_completo}
          className="size-32 rounded-full object-cover"
        />
      ) : null}
      <div className="grid gap-2">
        <h2 className="text-2xl font-semibold">{titulo}</h2>
        <p className="font-medium text-muted-foreground">
          {perfil.titulo_profesional} · {perfil.ubicacion}
        </p>
        <p className="whitespace-pre-line">{perfil.resumen_bio}</p>
      </div>
    </div>
  )
}

function BloqueProyectos({
  titulo,
  config,
  proyectos,
}: {
  titulo: string
  config: ProyectosConfiguracion
  proyectos: SnapshotSitio['proyectos']
}) {
  const filtrados = [...proyectos]
    .filter((proyecto) => !config.solo_destacados || proyecto.destacado)
    .sort((a, b) => a.orden - b.orden)
    .slice(0, config.cantidad_a_mostrar)

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <h2 className="text-2xl font-semibold">{titulo}</h2>
      {filtrados.length === 0 ? (
        <p className="text-muted-foreground">Todavía no hay proyectos.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((proyecto) => (
            <Link
              key={proyecto.id}
              to={`/proyecto/${proyecto.id}`}
              className="grid gap-2 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              {proyecto.imagenes[0] ? (
                <img
                  src={proyecto.imagenes[0].media.url}
                  alt={proyecto.imagenes[0].media.alt_text ?? proyecto.titulo}
                  className="aspect-video rounded-md object-cover"
                />
              ) : null}
              <h3 className="font-semibold">{proyecto.titulo}</h3>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {proyecto.descripcion}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function BloqueCertificaciones({
  titulo,
  config,
  certificaciones,
}: {
  titulo: string
  config: CertificacionesConfiguracion
  certificaciones: SnapshotSitio['certificaciones']
}) {
  const ordenadas = [...certificaciones].sort((a, b) =>
    config.orden === 'fecha'
      ? new Date(b.fecha_emision).getTime() - new Date(a.fecha_emision).getTime()
      : a.orden - b.orden,
  )

  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <h2 className="text-2xl font-semibold">{titulo}</h2>
      {ordenadas.length === 0 ? (
        <p className="text-muted-foreground">
          Todavía no hay certificaciones.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ordenadas.map((certificacion) => (
            <Link
              key={certificacion.id}
              to={`/certificacion/${certificacion.id}`}
              className="grid gap-2 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              {certificacion.logo ? (
                // Tarjeta clicable (navega al detalle, UC-13): el zoom/lightbox
                // del logo o documento vive en `CertificacionDetallePage`, no
                // acá — anidar el `Dialog` de `MediaPreview` dentro de este
                // `Link` interceptaría el click de navegación. Si el logo es
                // un PDF (feedback externo, UC-04) se muestra un ícono en vez
                // de un `<img>` roto.
                certificacion.logo.tipo === 'imagen' ? (
                  <img
                    src={certificacion.logo.url}
                    alt={certificacion.logo.alt_text ?? certificacion.nombre}
                    className="size-12 object-contain"
                  />
                ) : (
                  <FileIcon
                    className="size-12 text-muted-foreground"
                    aria-label="Documento del certificado"
                  />
                )
              ) : null}
              <h3 className="font-semibold">{certificacion.nombre}</h3>
              <p className="text-sm text-muted-foreground">
                {certificacion.institucion}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatearFecha(certificacion.fecha_emision)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function BloqueLogros({
  titulo,
  config,
  logros,
}: {
  titulo: string
  config: LogrosConfiguracion
  logros: SnapshotSitio['logros']
}) {
  const filtrados = [...logros]
    .filter(
      (logro) =>
        !config.categoria_filtro || logro.categoria === config.categoria_filtro,
    )
    .sort((a, b) => a.orden - b.orden)

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <h2 className="text-2xl font-semibold">{titulo}</h2>
      {filtrados.length === 0 ? (
        <p className="text-muted-foreground">Todavía no hay logros.</p>
      ) : (
        <ul className="grid gap-4">
          {filtrados.map((logro) => (
            <li key={logro.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{logro.titulo}</h3>
                <span className="text-xs text-muted-foreground">
                  {formatearFecha(logro.fecha)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {logro.descripcion}
              </p>
              {logro.url_referencia ? (
                <a
                  href={logro.url_referencia}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline underline-offset-4"
                >
                  Ver referencia
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BloqueContacto({
  titulo,
  config,
  perfil,
  redesSociales,
}: {
  titulo: string
  config: ContactoConfiguracion
  perfil: SnapshotSitio['perfil']
  redesSociales: SnapshotSitio['redes_sociales']
}) {
  return (
    <div className="mx-auto grid max-w-2xl gap-4 text-center">
      <h2 className="text-2xl font-semibold">{titulo}</h2>
      {config.mostrar_formulario ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay un formulario de contacto disponible: escríbeme
          directamente por cualquiera de estos medios.
        </p>
      ) : null}
      <RedesSociales redes={redesSociales} cvMedia={perfil?.cv_media ?? null} />
    </div>
  )
}
