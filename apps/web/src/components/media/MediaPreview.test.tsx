import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MediaPreview } from './MediaPreview'

describe('MediaPreview', () => {
  it('imagen: la miniatura es un <img> y el diálogo de zoom muestra la imagen ampliada', async () => {
    const user = userEvent.setup()
    render(
      <MediaPreview
        tipo="imagen"
        url="https://cdn.example.com/logo.png"
        alt="Logo AWS"
      />,
    )

    const miniaturas = screen.getAllByRole('img')
    expect(miniaturas).toHaveLength(1)
    expect(miniaturas[0]).toHaveAttribute('src', 'https://cdn.example.com/logo.png')

    await user.click(screen.getByRole('button', { name: /ampliar imagen/i }))

    // Radix marca el resto del árbol como `aria-hidden` mientras el diálogo
    // está abierto, así que la miniatura original deja de contar para
    // `getAllByRole` — solo queda visible la imagen ampliada del diálogo.
    const imagenAmpliada = screen.getByRole('img')
    expect(imagenAmpliada).toHaveAttribute('src', 'https://cdn.example.com/logo.png')
    expect(
      screen.queryByRole('link', { name: /abrir en pestaña nueva/i }),
    ).not.toBeInTheDocument()
  })

  it('pdf: la miniatura es MiniaturaPdf y el visor embebe el documento con nombre, tamaño y acciones (Fase 7m)', async () => {
    const user = userEvent.setup()
    render(
      <MediaPreview
        tipo="pdf"
        url="https://cdn.example.com/certificado.pdf"
        nombre="certificado.pdf"
        bytes={1258291}
      />,
    )

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(document.querySelector('[data-estado]')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /ver documento/i }))
    expect(screen.getByRole('heading', { name: 'certificado.pdf' })).toBeInTheDocument()
    expect(screen.getByText('PDF · 1,2 MB')).toBeInTheDocument()

    // El embed usa `<object data type="application/pdf">` (no `<iframe
    // sandbox>`): el visor nativo de PDF de Chrome ya corre aislado desde
    // Chrome 78, y sandboxear un iframe adicional entra en conflicto con
    // ese aislamiento (ver comentario en MediaPreview.tsx). `<object>` no
    // se consulta por rol de accesibilidad, así que se verifica su
    // atributo `data` directamente.
    const objeto = document.querySelector('object[type="application/pdf"]')
    expect(objeto).toHaveAttribute('data', 'https://cdn.example.com/certificado.pdf')

    // Puede haber dos enlaces "Abrir en pestaña nueva": el que siempre está
    // visible debajo del embed, y el del contenido de fallback DENTRO del
    // `<object>` (jsdom no simula la carga real del recurso, así que ese
    // fallback también queda presente en el DOM de prueba). Ambos deben
    // apuntar al mismo PDF.
    const enlaces = screen.getAllByRole('link', { name: /abrir en pestaña nueva/i })
    expect(enlaces.length).toBeGreaterThanOrEqual(1)
    enlaces.forEach((enlace) =>
      expect(enlace).toHaveAttribute('href', 'https://cdn.example.com/certificado.pdf'),
    )
  })
})
