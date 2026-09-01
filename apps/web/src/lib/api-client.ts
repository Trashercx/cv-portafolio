const API_URL = import.meta.env.VITE_API_URL as string | undefined

if (!API_URL) {
  // Ayuda a detectar temprano un `apps/web/.env.local` faltante en desarrollo.
  console.warn(
    'VITE_API_URL no está definida. Crea apps/web/.env.local con VITE_API_URL="http://localhost:3000".',
  )
}

/**
 * Base pública de la API, para los pocos casos donde se necesita una URL
 * completa en vez de pasar por `apiFetch` (p. ej. `href` de descarga del CV,
 * `GET /cv`, que es un redirect 302 binario y nunca debe pedirse por
 * `fetch`).
 */
export const API_BASE_URL = API_URL ?? ''

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
  /**
   * `true` por defecto: manda la cookie httpOnly de sesión del admin
   * (`credentials: 'include'`), necesaria para todo `/admin/*`. Los hooks
   * del árbol `publico` (`features/publico/usePublico.ts`, UC-12/13/14)
   * deben pasar `false` explícitamente — esos endpoints son de acceso
   * anónimo por diseño y no deben filtrar la cookie de sesión del admin a
   * un visitante ni a caches intermedias.
   */
  conCredenciales?: boolean
}

/**
 * Cliente HTTP mínimo para hablar con `apps/api`.
 *
 * La sesión del administrador vive en una cookie httpOnly (`access_token`)
 * seteada por el backend: este cliente nunca lee ni guarda el token, solo
 * garantiza `credentials: 'include'` (salvo que se pida lo contrario con
 * `conCredenciales: false`) para que la cookie viaje de ida y vuelta.
 */
export async function apiFetch<T>(
  path: string,
  { body, headers, conCredenciales = true, ...options }: ApiFetchOptions = {},
): Promise<T> {
  const response = await fetch(`${API_URL ?? ''}${path}`, {
    ...options,
    credentials: conCredenciales ? 'include' : 'omit',
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
 * `POST /admin/media`, y por la biblioteca de media (UC-09) para
 * `PATCH /admin/media/:id/reemplazar`.
 */
export async function apiUpload<T>(
  path: string,
  formData: FormData,
  method: 'POST' | 'PATCH' = 'POST',
): Promise<T> {
  const response = await fetch(`${API_URL ?? ''}${path}`, {
    method,
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
