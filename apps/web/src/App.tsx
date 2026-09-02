import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Toaster } from '@/components/ui/sonner'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { CertificacionesListPage } from '@/pages/admin/CertificacionesListPage'
import { CertificacionFormPage } from '@/pages/admin/CertificacionFormPage'
import { EditorSeccionesPage } from '@/pages/admin/EditorSeccionesPage'
import { LoginPage } from '@/pages/admin/LoginPage'
import { LogrosListPage } from '@/pages/admin/LogrosListPage'
import { LogroFormPage } from '@/pages/admin/LogroFormPage'
import { MediaLibraryPage } from '@/pages/admin/MediaLibraryPage'
import { PerfilPage } from '@/pages/admin/PerfilPage'
import { ProyectosListPage } from '@/pages/admin/ProyectosListPage'
import { ProyectoFormPage } from '@/pages/admin/ProyectoFormPage'
import { PublicacionPage } from '@/pages/admin/PublicacionPage'
import { RedesListPage } from '@/pages/admin/RedesListPage'
import { RedFormPage } from '@/pages/admin/RedFormPage'
import { TemaPage } from '@/pages/admin/TemaPage'
import { CertificacionDetallePage } from '@/pages/public/CertificacionDetallePage'
import { ProyectoDetallePage } from '@/pages/public/ProyectoDetallePage'
import { PublicHomePage } from '@/pages/public/PublicHomePage'

function App() {
  return (
    <>
      <Toaster />
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<PublicHomePage />} />
        <Route path="/proyecto/:id" element={<ProyectoDetallePage />} />
        <Route
          path="/certificacion/:id"
          element={<CertificacionDetallePage />}
        />

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
          <Route path="proyectos/nuevo" element={<ProyectoFormPage />} />
          <Route path="proyectos/:id" element={<ProyectoFormPage />} />

          <Route
            path="certificaciones"
            element={<CertificacionesListPage />}
          />
          <Route
            path="certificaciones/nuevo"
            element={<CertificacionFormPage />}
          />
          <Route
            path="certificaciones/:id"
            element={<CertificacionFormPage />}
          />

          <Route path="logros" element={<LogrosListPage />} />
          <Route path="logros/nuevo" element={<LogroFormPage />} />
          <Route path="logros/:id" element={<LogroFormPage />} />

          <Route path="redes" element={<RedesListPage />} />
          <Route path="redes/nuevo" element={<RedFormPage />} />
          <Route path="redes/:id" element={<RedFormPage />} />

          <Route path="editor" element={<EditorSeccionesPage />} />
          <Route path="tema" element={<TemaPage />} />
          <Route path="media" element={<MediaLibraryPage />} />
          <Route path="publicacion" element={<PublicacionPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
