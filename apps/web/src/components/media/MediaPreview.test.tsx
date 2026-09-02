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

  it('pdf: la miniatura muestra un ícono de archivo y el diálogo embebe el documento con enlace externo', async () => {
    const user = userEvent.setup()
    render(
      <MediaPreview
        tipo="pdf"
        url="https://cdn.example.com/certificado.pdf"
        nombre="certificado.pdf"
      />,
    )

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('certificado.pdf')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /ver documento/i }))

    expect(screen.getByTitle('certificado.pdf')).toHaveAttribute(
      'src',
      'https://cdn.example.com/certificado.pdf',
    )
    expect(
      screen.getByRole('link', { name: /abrir en pestaña nueva/i }),
    ).toHaveAttribute('href', 'https://cdn.example.com/certificado.pdf')
  })
})
