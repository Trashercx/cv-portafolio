const API_URL = import.meta.env.VITE_API_URL as string | undefined

if (!API_URL) {
  // Ayuda a detectar temprano un `apps/web/.env.local` faltante en desarrollo.
  console.warn(
    'VITE_API_URL no está definida. Crea apps/web/.env.local con VITE_API_URL="http://localhost:3000".',
  )
}

export class ApiError extends Error {
  status: number
  /**
   * Ruta solicitada (p. ej. "/admin/proyectos"). Permite distinguir, en un
   * manejador global de errores, un 401 de una ruta admin (sesión expirada)
   * de un 401 de `/auth/login` (credenciales inválidas, no debe redirigir).
   */
  path: string

  constructor(message: string, status: number, path: string = '') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.path = path
  }
}

async function extraerError(response: Response, path: string): Promise<ApiError> {
  const isJson = response.headers
    .get('content-type')
    ?.includes('application/json')
  const data = isJson ? await response.json().catch(() => undefined) : undefined

  const message =
    (data && typeof data === 'object' && 'message' in data
      ? String((data as { message: unknown }).message)
      : undefined) ?? 'Ocurrió un error inesperado. Intenta de nuevo.'

  return new ApiError(message, response.status, path)
}

type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

/**
 * Cliente HTTP mínimo para hablar con `apps/api`.
 *
 * La sesión del administrador vive en una cookie httpOnly (`access_token`)
 * seteada por el backend: este cliente nunca lee ni guarda el token, solo
 * garantiza `credentials: 'include'` en cada request para que la cookie
 * viaje de ida y vuelta.
 */
export async function apiFetch<T>(
  path: string,
  { body, headers, ...options }: ApiFetchOptions = {},
): Promise<T> {
  const response = await fetch(`${API_URL ?? ''}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw await extraerError(response, path)
  }

  const isJson = response.headers
    .get('content-type')
    ?.includes('application/json')
  const data = isJson ? await response.json() : undefined

  return data as T
}

/**
 * Variante de `apiFetch` para `multipart/form-data` (subida de archivos).
 * No fija `Content-Type`: el navegador debe generarlo con el boundary
 * correcto a partir del `FormData`. Usada por `MediaUploadField` para
 * `POST /admin/media`.
 */
export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_URL ?? ''}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  if (!response.ok) {
    throw await extraerError(response, path)
  }

  const isJson = response.headers
    .get('content-type')
    ?.includes('application/json')
  const data = isJson ? await response.json() : undefined

  return data as T
}
