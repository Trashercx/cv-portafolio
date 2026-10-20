import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Analitica } from '@/components/publico/Analitica'
import { CargandoPagina } from '@/components/CargandoPagina'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { LayoutPublico } from '@/components/publico/LayoutPublico'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { PublicHomePage } from '@/pages/public/PublicHomePage'

/**
 * Fase 6 (code splitting): las páginas del panel admin (entre ellas
 * `EditorSeccionesPage`, que arrastra Puck) y los detalles públicos (UC-13)
 * se cargan bajo demanda. `PublicHomePage` sigue eager (LCP del sitio); `AdminLayout`,
 * `LoginPage` y `Toaster` (Fase 8.3) tambien son lazy. Los módulos exportan por nombre, de ahí el
 * `.then` que los adapta al `default` que exige `React.lazy`.
 */
const AdminLayout = lazy(() =>
  import('@/components/layout/AdminLayout').then((m) => ({ default: m.AdminLayout })),
)
const LoginPage = lazy(() =>
  import('@/pages/admin/LoginPage').then((m) => ({ default: m.LoginPage })),
)
// Fase 8 (8.3, UC-34): sonner solo se descarga en rutas /admin/*; los toasts
// de mutaciones se cargan de forma diferida en `query-client.ts`.
const Toaster = lazy(() =>
  import('@/components/ui/sonner').then((m) => ({ default: m.Toaster })),
)
const CertificacionesListPage = lazy(() =>
  import('@/pages/admin/CertificacionesListPage').then((m) => ({ default: m.CertificacionesListPage })),
)
// Fase 7d (UC-35): el panel de insignias va lazy, fuera del chunk inicial.
const InsigniasListPage = lazy(() =>
  import('@/pages/admin/InsigniasListPage').then((m) => ({ default: m.InsigniasListPage })),
)
const EditorSeccionesPage = lazy(() =>
  import('@/pages/admin/EditorSeccionesPage').then((m) => ({ default: m.EditorSeccionesPage })),
)
// Fase 7l (UC-19): experiencia laboral, lazy como el resto de páginas del panel.
const ExperienciasListPage = lazy(() =>
  import('@/pages/admin/ExperienciasListPage').then((m) => ({ default: m.ExperienciasListPage })),
)
const LogrosListPage = lazy(() =>
  import('@/pages/admin/LogrosListPage').then((m) => ({ default: m.LogrosListPage })),
)
const MediaLibraryPage = lazy(() =>
  import('@/pages/admin/MediaLibraryPage').then((m) => ({ default: m.MediaLibraryPage })),
)
const MetricasPage = lazy(() =>
  import('@/pages/admin/MetricasPage').then((m) => ({ default: m.MetricasPage })),
)
const PerfilPage = lazy(() =>
  import('@/pages/admin/PerfilPage').then((m) => ({ default: m.PerfilPage })),
)
const ProyectosListPage = lazy(() =>
  import('@/pages/admin/ProyectosListPage').then((m) => ({ default: m.ProyectosListPage })),
)
const RedesListPage = lazy(() =>
  import('@/pages/admin/RedesListPage').then((m) => ({ default: m.RedesListPage })),
)
const SkillsListPage = lazy(() =>
  import('@/pages/admin/SkillsListPage').then((m) => ({ default: m.SkillsListPage })),
)
const CertificacionDetallePage = lazy(() =>
  import('@/pages/public/CertificacionDetallePage').then((m) => ({ default: m.CertificacionDetallePage })),
)
const LogroDetallePage = lazy(() =>
  import('@/pages/public/LogroDetallePage').then((m) => ({ default: m.LogroDetallePage })),
)
const ProyectoDetallePage = lazy(() =>
  import('@/pages/public/ProyectoDetallePage').then((m) => ({ default: m.ProyectoDetallePage })),
)
const NoEncontradoPage = lazy(() =>
  import('@/pages/public/NoEncontradoPage').then((m) => ({ default: m.NoEncontradoPage })),
)

function App() {
  const { pathname } = useLocation()
  const esAdmin = pathname === '/admin' || pathname.startsWith('/admin/')

  return (
    <>
      {esAdmin ? (
        <Suspense fallback={null}>
          <Toaster />
        </Suspense>
      ) : null}
      {/* Fase 8 (8.4, UC-27): tracker de Umami solo en rutas públicas. */}
      {esAdmin ? null : <Analitica />}
      {/* Fase 4.1, punto 5: red de seguridad general — un error de render en
          cualquier ruta ya no tumba React entero dejando una pantalla en
          blanco sin ningún mensaje. Ver `EditorSeccionesPage` para la
          instancia más acotada alrededor del lienzo de Puck. */}
      <ErrorBoundary>
        <Suspense fallback={<CargandoPagina />}>
        <Routes>
          {/* Rutas públicas. La home arma su propio `<main>` dentro del
              contenedor temado; los detalles (UC-13) y la 404 comparten
              `LayoutPublico` (skip link + `<main id="contenido">`, Fase 6). */}
          <Route path="/" element={<PublicHomePage />} />
          <Route element={<LayoutPublico />}>
            <Route path="/proyecto/:id" element={<ProyectoDetallePage />} />
            <Route
              path="/certificacion/:id"
              element={<CertificacionDetallePage />}
            />
            <Route path="/logro/:id" element={<LogroDetallePage />} />
            {/* Fase 6: 404 real del sitio público (antes redirigía a `/`). */}
            <Route path="*" element={<NoEncontradoPage />} />
          </Route>

          {/* Zona de administración */}
          <Route path="/admin/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="perfil" replace />} />

            <Route path="perfil" element={<PerfilPage />} />

            <Route path="proyectos" element={<ProyectosListPage />} />

            <Route
              path="certificaciones"
              element={<CertificacionesListPage />}
            />

            <Route path="insignias" element={<InsigniasListPage />} />

            <Route path="experiencias" element={<ExperienciasListPage />} />

            <Route path="logros" element={<LogrosListPage />} />

            <Route path="redes" element={<RedesListPage />} />

            <Route path="skills" element={<SkillsListPage />} />

            <Route path="editor" element={<EditorSeccionesPage />} />
            {/*
              Fase 5 (panel unificado): `TemaPage`/`FondoSitioPage` (UC-08,
              UC-15) se fusionaron como pestañas del panel lateral de
              "Editor visual" (`PanelTemaEditor`/`PanelFondoEditor`, ver
              `EditorSeccionesPage`) — ya no son páginas independientes, así
              que estas rutas redirigen en vez de eliminarse por completo,
              para no romper enlaces/marcadores que el admin pueda tener
              guardados. El query param `panel` hace que el panel lateral
              arranque en esa pestaña en vez de "Bloque" (ver el `useEffect`
              correspondiente en `EditorSeccionesPage`).
            */}
            <Route
              path="tema"
              element={<Navigate to="/admin/editor?panel=tema" replace />}
            />
            <Route
              path="fondo"
              element={<Navigate to="/admin/editor?panel=fondo" replace />}
            />
            <Route path="media" element={<MediaLibraryPage />} />
            {/* Fase 8 (8.4, UC-27): métricas de Umami. */}
            <Route path="metricas" element={<MetricasPage />} />
            {/*
              UC-10/UC-11 (Publicación) se fusionaron dentro de "Editor
              visual" (Sprint 7): ya no hay una página independiente, así que
              esta ruta redirige en vez de eliminarse por completo, para no
              romper enlaces/marcadores que el admin pueda tener guardados
              hacia `/admin/publicacion`.
            */}
            <Route
              path="publicacion"
              element={<Navigate to="/admin/editor" replace />}
            />
          </Route>

          {/* Fase 6: rutas /admin/* desconocidas siguen yendo al panel
              (`RequireAuth` manda al login si no hay sesión). */}
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

export default App
