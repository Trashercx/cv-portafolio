import { useAuthStore } from '@/store/auth-store'

export function AdminHomePage() {
  const nombre = useAuthStore((state) => state.admin?.nombre)

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <h1 className="text-2xl font-medium">Panel — bienvenido, {nombre}</h1>
    </div>
  )
}
