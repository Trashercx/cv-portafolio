import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { VisorPdfDialog } from './VisorPdfDialog'

/** Fase 7m (#66, #68): visor de PDF en modal. */

const URL_PDF = 'https://cdn.example.com/certificado.pdf'

function abrir(extra: Partial<React.ComponentProps<typeof VisorPdfDialog>> = {}) {
  const onOpenChange = vi.fn()
  render(
    <VisorPdfDialog
      open
      onOpenChange={onOpenChange}
      url={URL_PDF}
      nombre="certificado.pdf"
      bytes={860160}
      {...extra}
    />,
  )
  return { onOpenChange }
}

describe('VisorPdfDialog (Fase 7m)', () => {
  it('muestra nombre, tipo y tamaño, y embebe el PDF con estado de carga hasta onLoad', () => {
    abrir()

    expect(screen.getByRole('heading', { name: 'certificado.pdf' })).toBeInTheDocument()
    expect(screen.getByText('PDF · 840 KB')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/cargando documento/i)

    const objeto = document.querySelector('object[type="application/pdf"]') as HTMLObjectElement
    expect(objeto).toHaveAttribute('data', URL_PDF)

    fireEvent.load(objeto)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('sin tamaño conocido omite el dato', () => {
    abrir({ bytes: null })
    expect(screen.getByText('PDF')).toBeInTheDocument()
  })

  it('ofrece "Abrir en pestaña nueva" y "Descargar" sobre el mismo PDF', () => {
    abrir()

    // El `<object>` tiene su propio enlace de respaldo: el de la barra es el primero.
    const abrirNueva = screen.getAllByRole('link', { name: /abrir en pestaña nueva/i })[0]
    expect(abrirNueva).toHaveAttribute('href', URL_PDF)
    expect(abrirNueva).toHaveAttribute('target', '_blank')
    expect(abrirNueva).toHaveAttribute('rel', expect.stringContaining('noopener'))

    const descargar = screen.getByRole('link', { name: /descargar/i })
    expect(descargar).toHaveAttribute('href', URL_PDF)
    expect(descargar).toHaveAttribute('download', 'certificado.pdf')
  })

  it('si el documento falla, avisa y deja abrirlo aparte', () => {
    abrir()
    fireEvent.error(document.querySelector('object') as HTMLObjectElement)

    expect(screen.getByRole('alert')).toHaveTextContent(/no se pudo mostrar el documento/i)
    expect(document.querySelector('object')).toBeNull()
    expect(screen.getAllByRole('link', { name: /abrir en pestaña nueva/i }).length).toBeGreaterThan(1)
  })

  it('Escape cierra el diálogo', async () => {
    const user = userEvent.setup()
    const { onOpenChange } = abrir()
    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('cerrado no renderiza nada', () => {
    abrir({ open: false })
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})
