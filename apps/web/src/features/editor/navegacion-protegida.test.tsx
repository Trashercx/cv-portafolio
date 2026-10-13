import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { act } from 'react'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useEditorSeccionesStore } from '@/store/editor-secciones-store'
import {
  GuardiaNavegacionEditor,
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
