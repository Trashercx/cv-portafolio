import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { AdminHomePage } from '@/pages/admin/AdminHomePage'
import { LoginPage } from '@/pages/admin/LoginPage'
import { PublicHomePage } from '@/pages/public/PublicHomePage'

function App() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<PublicHomePage />} />

      {/* Zona de administración */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminHomePage />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
