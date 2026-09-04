import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

/** Componente de prueba que explota en el render (nunca en un handler de evento: `componentDidCatch` solo captura errores de render/commit). */
function Explota(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('renderiza los children normalmente cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <p>Todo bien</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('Todo bien')).toBeInTheDocument()
  })

  it('muestra el fallback genérico ("Algo salió mal" + Recargar) cuando un hijo crashea en el render, sin fallback custom', () => {
    // El error real sigue logueándose vía `componentDidCatch` (`console.error`):
    // se silencia acá para no ensuciar la salida del test runner con el
    // stack trace esperado.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Explota />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Algo salió mal')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /recargar/i }),
    ).toBeInTheDocument()

    consoleError.mockRestore()
  })

  it('usa el fallback custom (render-prop) en vez del genérico, cuando se pasa uno', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    const reintentarSpy = vi.fn()

    render(
      <ErrorBoundary
        fallback={(reintentar) => (
          <button
            onClick={() => {
              reintentarSpy()
              reintentar()
            }}
          >
            Fallback custom
          </button>
        )}
      >
        <Explota />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Fallback custom')).toBeInTheDocument()
    expect(screen.queryByText('Algo salió mal')).not.toBeInTheDocument()

    // `reintentar()` limpia el estado de error, pero como `Explota` vuelve a
    // tirar el mismo error al remontarse, el fallback vuelve a mostrarse —
    // alcanza con confirmar que se invocó el callback pasado por el caller.
    await user.click(screen.getByText('Fallback custom'))
    expect(reintentarSpy).toHaveBeenCalledTimes(1)

    consoleError.mockRestore()
  })
})
