import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api-client'
import { XhrFalso } from '@/test/xhr-falso'
import { subirMedia } from './useUploadMedia'

const archivo = () => new File(['x'], 'foto.png', { type: 'image/png' })

describe('subirMedia (Fase 7d, UC-09)', () => {
  const original = globalThis.XMLHttpRequest

  beforeEach(() => XhrFalso.instalar())
  afterEach(() => {
    ;(globalThis as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = original
  })

  it('envía multipart por POST con credenciales y reporta el progreso', async () => {
    const onProgress = vi.fn()
    const promesa = subirMedia(
      { file: archivo(), altText: 'Foto', carpeta: 'perfil' },
      { onProgress },
    )
    const xhr = XhrFalso.instancias[0]

    expect(xhr.method).toBe('POST')
    expect(xhr.url.endsWith('/admin/media')).toBe(true)
    expect(xhr.withCredentials).toBe(true)
    const form = xhr.body as FormData
    expect(form.get('alt_text')).toBe('Foto')
    expect(form.get('carpeta')).toBe('perfil')
    expect(form.get('file')).toBeInstanceOf(File)

    xhr.progreso(25, 100)
    expect(onProgress).toHaveBeenLastCalledWith(25)

    xhr.responder(201, { id: 'm1' })
    await expect(promesa).resolves.toEqual({ id: 'm1' })
    expect(onProgress).toHaveBeenLastCalledWith(100)
  })

  it('rechaza con ApiError y el mensaje del servidor', async () => {
    const promesa = subirMedia({ file: archivo() })
    XhrFalso.instancias[0].responder(413, { message: 'Archivo demasiado grande' })

    const error = await promesa.catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(413)
    expect((error as ApiError).message).toBe('Archivo demasiado grande')
  })

  it('rechaza con ApiError de estado 0 ante un fallo de red', async () => {
    const promesa = subirMedia({ file: archivo() })
    XhrFalso.instancias[0].fallarRed()
    await expect(promesa).rejects.toMatchObject({ status: 0 })
  })

  it('cancela con AbortSignal y rechaza con AbortError', async () => {
    const controlador = new AbortController()
    const promesa = subirMedia({ file: archivo() }, { signal: controlador.signal })
    controlador.abort()

    expect(XhrFalso.instancias[0].abortado).toBe(true)
    await expect(promesa).rejects.toMatchObject({ name: 'AbortError' })
  })
})
