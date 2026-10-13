import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useEditorSeccionesStore } from '@/store/editor-secciones-store'
import {
  GuardiaNavegacionEditor,
  solicitarCerrarSesion,
  useNavegarProtegido,
} from './navegacion-protegida'

function RutaActual() {
  return <p data-testid="ruta">{useLocation().pathname}</p>
}

function BotonNavegar({ destino }: { destino: string }) {
  const { navegar } = useNavegarProtegido()
  return (
    <button type="button" onClick={() => navegar(destino)}>
      Ir a {destino}
    </button>
  )
}

function renderApp(rutaInicial: string) {
  return render(
    <MemoryRouter initialEntries={[rutaInicial]}>
      <SidebarProvider>
        <AppSidebar />
        <GuardiaNavegacionEditor />
        <BotonNavegar destino="/admin/proyectos" />
        <Routes>
          <Route path="*" element={<RutaActual />} />
        </Routes>
      </SidebarProvider>
    </MemoryRouter>,
  )
}

describe('navegación protegida del editor (Fase 7, UC-08)', () => {
  beforeEach(() => {
    useEditorSeccionesStore.setState({
      hayCambiosSinGuardar: false,
      destinoPendiente: null,
    })
  })

  it('sin cambios sin guardar, el enlace de la sidebar navega directo', async () => {
    const user = userEvent.setup()
    renderApp('/admin/editor')

    await user.click(screen.getByRole('link', { name: 'Proyectos' }))

    expect(screen.getByTestId('ruta')).toHaveTextContent('/admin/proyectos')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('con cambios sin guardar, el enlace de la sidebar pide confirmación y "Seguir editando" se queda en el editor', async () => {
    const user = userEvent.setup()
    renderApp('/admin/editor')
    act(() => useEditorSeccionesStore.getState().setHayCambiosSinGuardar(true))

    await user.click(screen.getByRole('link', { name: 'Proyectos' }))

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByTestId('ruta')).toHaveTextContent('/admin/editor')

    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('ruta')).toHaveTextContent('/admin/editor')
    expect(useEditorSeccionesStore.getState().hayCambiosSinGuardar).toBe(true)
    expect(useEditorSeccionesStore.getState().destinoPendiente).toBeNull()
  })

  it('"Descartar y salir" navega al destino y apaga el flag', async () => {
    const user = userEvent.setup()
    renderApp('/admin/editor')
    act(() => useEditorSeccionesStore.getState().setHayCambiosSinGuardar(true))

    await user.click(screen.getByRole('link', { name: 'Proyectos' }))
    await user.click(
      await screen.findByRole('button', { name: 'Descartar y salir' }),
    )

    expect(screen.getByTestId('ruta')).toHaveTextContent('/admin/proyectos')
    expect(useEditorSeccionesStore.getState().hayCambiosSinGuardar).toBe(false)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('la navegación programática (paleta de comandos) también pide confirmación', async () => {
    const user = userEvent.setup()
    renderApp('/admin/editor')
    act(() => useEditorSeccionesStore.getState().setHayCambiosSinGuardar(true))

    await user.click(screen.getByRole('button', { name: 'Ir a /admin/proyectos' }))

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByTestId('ruta')).toHaveTextContent('/admin/editor')
  })

  it('fuera del editor no intercepta aunque el flag esté encendido', async () => {
    const user = userEvent.setup()
    renderApp('/admin/perfil')
    act(() => useEditorSeccionesStore.getState().setHayCambiosSinGuardar(true))

    await user.click(screen.getByRole('link', { name: 'Proyectos' }))

    expect(screen.getByTestId('ruta')).toHaveTextContent('/admin/proyectos')
  })
})

describe('Atrás del navegador y cerrar sesión con cambios sin guardar (Fase 7, UC-07)', () => {
  beforeEach(() => {
    useEditorSeccionesStore.setState({
      hayCambiosSinGuardar: false,
      destinoPendiente: null,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const simularAtras = () =>
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

  it('al haber cambios empuja una entrada centinela y la retira al guardar', () => {
    const push = vi.spyOn(window.history, 'pushState')
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    renderApp('/admin/editor')

    act(() => useEditorSeccionesStore.getState().setHayCambiosSinGuardar(true))
    expect(push).toHaveBeenCalledTimes(1)

    act(() => useEditorSeccionesStore.getState().setHayCambiosSinGuardar(false))
    expect(back).toHaveBeenCalledTimes(1)
  })

  it('sin cambios, un popstate no pide confirmación', () => {
    renderApp('/admin/editor')
    simularAtras()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('popstate con cambios pide confirmación; "Seguir editando" mantiene la ruta y vuelve a empujar la centinela', async () => {
    const user = userEvent.setup()
    const push = vi.spyOn(window.history, 'pushState')
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {})
    vi.spyOn(window.history, 'back').mockImplementation(() => {})
    renderApp('/admin/editor')
    act(() => useEditorSeccionesStore.getState().setHayCambiosSinGuardar(true))
    push.mockClear()

    simularAtras()

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(push).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByTestId('ruta')).toHaveTextContent('/admin/editor')
    expect(useEditorSeccionesStore.getState().hayCambiosSinGuardar).toBe(true)
    expect(go).not.toHaveBeenCalled()
  })

  it('popstate confirmado apaga el flag y navega hacia atrás de verdad (history.go(-2))', async () => {
    const user = userEvent.setup()
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {})
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    renderApp('/admin/editor')
    act(() => useEditorSeccionesStore.getState().setHayCambiosSinGuardar(true))

    simularAtras()
    await user.click(await screen.findByRole('button', { name: 'Descartar y salir' }))

    expect(go).toHaveBeenCalledWith(-2)
    expect(back).not.toHaveBeenCalled()
    expect(useEditorSeccionesStore.getState().hayCambiosSinGuardar).toBe(false)
  })

  it('"Cerrar sesión" con cambios pide confirmación y solo cierra al confirmar', async () => {
    const user = userEvent.setup()
    const cerrar = vi.fn()
    vi.spyOn(window.history, 'back').mockImplementation(() => {})
    render(
      <MemoryRouter initialEntries={['/admin/editor']}>
        <GuardiaNavegacionEditor alConfirmarCerrarSesion={cerrar} />
        <button type="button" onClick={() => solicitarCerrarSesion(cerrar)}>
          Salir
        </button>
      </MemoryRouter>,
    )
    act(() => useEditorSeccionesStore.getState().setHayCambiosSinGuardar(true))

    await user.click(screen.getByRole('button', { name: 'Salir' }))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(cerrar).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Descartar y salir' }))
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('"Cerrar sesión" sin cambios cierra directo', async () => {
    const user = userEvent.setup()
    const cerrar = vi.fn()
    render(
      <button type="button" onClick={() => solicitarCerrarSesion(cerrar)}>
        Salir
      </button>,
    )
    await user.click(screen.getByRole('button', { name: 'Salir' }))
    expect(cerrar).toHaveBeenCalledTimes(1)
  })
})
