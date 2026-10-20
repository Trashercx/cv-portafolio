import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_MINIATURAS_PDF,
  MiniaturaPdf,
  tamanoCacheMiniaturasPdf,
  vaciarCacheMiniaturasPdf,
} from './MiniaturaPdf'

/** Fase 7m (#66, #68): miniatura de PDF con pdf.js mockeado y un IntersectionObserver controlable. */

const renderizarMock = vi.fn()
vi.mock('@/features/media/pdf-render', () => ({
  renderizarPrimeraPagina: (...args: unknown[]) => renderizarMock(...args),
}))

type Observador = { callback: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn> }
let observadores: Observador[] = []
const ObserverOriginal = window.IntersectionObserver

function instalarObserver() {
  observadores = []
  window.IntersectionObserver = class {
    constructor(callback: IntersectionObserverCallback) {
      this.registro = { callback, disconnect: vi.fn() }
      observadores.push(this.registro)
    }
    registro: Observador
    observe() {}
    unobserve() {}
    disconnect() {
      this.registro.disconnect()
    }
    takeRecords() {
      return []
    }
  } as unknown as typeof window.IntersectionObserver
}

function entrarEnPantalla() {
  act(() => {
    for (const o of observadores) {
      o.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
    }
  })
}

let contador = 0
const revocar = vi.fn()

beforeEach(() => {
  vaciarCacheMiniaturasPdf()
  contador = 0
  renderizarMock.mockReset()
  renderizarMock.mockImplementation(async () => new Blob(['png'], { type: 'image/png' }))
  revocar.mockReset()
  URL.createObjectURL = vi.fn(() => `blob:miniatura-${++contador}`)
  URL.revokeObjectURL = revocar
  instalarObserver()
})

afterEach(() => {
  window.IntersectionObserver = ObserverOriginal
})

describe('MiniaturaPdf (Fase 7m)', () => {
  it('no renderiza hasta entrar en el viewport; luego muestra la miniatura con su alt', async () => {
    render(<MiniaturaPdf url="https://cdn.example.com/a.pdf" alt="Certificado A" />)

    expect(renderizarMock).not.toHaveBeenCalled()
    expect(document.querySelector('[data-estado="cargando"]')).toBeInTheDocument()

    entrarEnPantalla()

    const imagen = await screen.findByRole('img', { name: 'Certificado A' })
    expect(imagen).toHaveAttribute('src', 'blob:miniatura-1')
    expect(renderizarMock).toHaveBeenCalledWith('https://cdn.example.com/a.pdf', { ladoMaximo: 480 })
    expect(observadores[0].disconnect).toHaveBeenCalled()
  })

  it('sin IntersectionObserver renderiza de inmediato (respaldo)', async () => {
    // @ts-expect-error: simula un navegador sin la API
    delete window.IntersectionObserver
    render(<MiniaturaPdf url="https://cdn.example.com/b.pdf" alt="B" />)
    expect(await screen.findByRole('img', { name: 'B' })).toBeInTheDocument()
  })

  it('si el PDF no se puede leer muestra el icono de documento y no lanza', async () => {
    renderizarMock.mockRejectedValue(new Error('CORS'))
    render(<MiniaturaPdf url="https://cdn.example.com/roto.pdf" alt="Roto" />)
    entrarEnPantalla()

    await waitFor(() => expect(document.querySelector('[data-estado="error"]')).toBeInTheDocument())
    expect(screen.getByRole('img', { name: 'Roto' })).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })

  it('reutiliza la caché: el mismo PDF no se vuelve a renderizar', async () => {
    const primera = render(<MiniaturaPdf url="https://cdn.example.com/c.pdf" alt="C" />)
    entrarEnPantalla()
    await screen.findByRole('img', { name: 'C' })
    primera.unmount()

    render(<MiniaturaPdf url="https://cdn.example.com/c.pdf" alt="C otra vez" />)
    entrarEnPantalla()
    const imagen = await screen.findByRole('img', { name: 'C otra vez' })

    expect(renderizarMock).toHaveBeenCalledTimes(1)
    expect(imagen).toHaveAttribute('src', 'blob:miniatura-1')
  })

  it('desaloja la más antigua al pasar de 50 y revoca su object URL', async () => {
    for (let i = 0; i < MAX_MINIATURAS_PDF + 2; i++) {
      const vista = render(<MiniaturaPdf url={`https://cdn.example.com/${i}.pdf`} alt={`n${i}`} />)
      entrarEnPantalla()
      await screen.findByRole('img', { name: `n${i}` })
      vista.unmount()
    }
    expect(tamanoCacheMiniaturasPdf()).toBe(MAX_MINIATURAS_PDF)
    expect(revocar).toHaveBeenCalledWith('blob:miniatura-1')
    expect(revocar).toHaveBeenCalledWith('blob:miniatura-2')
  })
})
