import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from '@/components/ui/sonner'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { CertificacionesListPage } from '@/pages/admin/CertificacionesListPage'
import { EditorSeccionesPage } from '@/pages/admin/EditorSeccionesPage'
import { LoginPage } from '@/pages/admin/LoginPage'
import { LogrosListPage } from '@/pages/admin/LogrosListPage'
import { MediaLibraryPage } from '@/pages/admin/MediaLibraryPage'
import { PerfilPage } from '@/pages/admin/PerfilPage'
import { ProyectosListPage } from '@/pages/admin/ProyectosListPage'
import { RedesListPage } from '@/pages/admin/RedesListPage'
import { SkillsListPage } from '@/pages/admin/SkillsListPage'
import { CertificacionDetallePage } from '@/pages/public/CertificacionDetallePage'
import { LogroDetallePage } from '@/pages/public/LogroDetallePage'
import { ProyectoDetallePage } from '@/pages/public/ProyectoDetallePage'
import { PublicHomePage } from '@/pages/public/PublicHomePage'

function App() {
  return (
    <>
      <Toaster />
      {/* Fase 4.1, punto 5: red de seguridad general — un error de render en
          cualquier ruta ya no tumba React entero dejando una pantalla en
          blanco sin ningún mensaje. Ver `EditorSeccionesPage` para la
          instancia más acotada alrededor del lienzo de Puck. */}
      <ErrorBoundary>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<PublicHomePage />} />
          <Route path="/proyecto/:id" element={<ProyectoDetallePage />} />
          <Route
            path="/certificacion/:id"
            element={<CertificacionDetallePage />}
          />
          <Route path="/logro/:id" element={<LogroDetallePage />} />

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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </>
  )
}

export default App
