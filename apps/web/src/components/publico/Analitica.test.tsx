import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { Analitica } from './Analitica'

vi.mock('@/features/publico/usePublico', () => ({
  useSitio: () => ({ data: null, isLoading: false, error: null }),
}))

function scripts() {
  return document.head.querySelectorAll('script[data-website-id]')
}

describe('Analitica (Fase 8, UC-27)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    scripts().forEach((s) => s.remove())
  })

  it('con ambas variables inyecta el script una sola vez, aunque se monte dos veces', () => {
    vi.stubEnv('VITE_UMAMI_URL', 'https://analitica.example.com')
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1')
    const primero = render(<Analitica />)
    primero.unmount()
    render(<Analitica />)

    const lista = scripts()
    expect(lista).toHaveLength(1)
    expect(lista[0]).toHaveAttribute('src', 'https://analitica.example.com/script.js')
    expect(lista[0]).toHaveAttribute('data-website-id', 'site-1')
    expect((lista[0] as HTMLScriptElement).defer).toBe(true)
  })

  it('sin variables no inyecta nada', () => {
    vi.stubEnv('VITE_UMAMI_URL', '')
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', '')
    render(<Analitica />)
    expect(scripts()).toHaveLength(0)
  })

  it('App lo monta en rutas públicas pero no en /admin', async () => {
    vi.stubEnv('VITE_UMAMI_URL', 'https://analitica.example.com')
    vi.stubEnv('VITE_UMAMI_WEBSITE_ID', 'site-1')

    const admin = render(
      <MemoryRouter initialEntries={['/admin/login']}>
        <App />
      </MemoryRouter>,
    )
    expect(scripts()).toHaveLength(0)
    admin.unmount()

    render(
      <MemoryRouter initialEntries={['/no-existe']}>
        <App />
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { name: 'Página no encontrada' })
    expect(scripts()).toHaveLength(1)
  })
})
