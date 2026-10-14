import { afterEach, describe, expect, it, vi } from 'vitest'
import { analiticaConfigurada, registrarEvento } from './analitica'

describe('analitica (Fase 8, UC-27)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    delete window.umami
  })

  it('analiticaConfigurada exige ambas variables', () => {
    vi.stubEnv('VITE_UMAMI_URL', '')
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '')
    expect(analiticaConfigurada()).toBe(false)
    vi.stubEnv('VITE_UMAMI_URL', 'https://u.example.com')
    expect(analiticaConfigurada()).toBe(false)
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'abc')
    expect(analiticaConfigurada()).toBe(true)
  })

  it('registrarEvento delega en window.umami.track', () => {
    const track = vi.fn()
    window.umami = { track }
    registrarEvento('clic_red', { red: 'GitHub' })
    expect(track).toHaveBeenCalledWith('clic_red', { red: 'GitHub' })
  })

  it('es no-op sin tracker y no propaga errores del tracker', () => {
    expect(() => registrarEvento('descargar_cv')).not.toThrow()
    window.umami = {
      track: () => {
        throw new Error('boom')
      },
    }
    expect(() => registrarEvento('descargar_cv')).not.toThrow()
  })
})
