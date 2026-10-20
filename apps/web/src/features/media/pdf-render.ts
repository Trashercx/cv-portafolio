/**
 * Fase 7m (#66, #68), UC-04/UC-09: cargador lazy de `pdfjs-dist` y render de la
 * primera página de un PDF a imagen dentro del navegador. Extraído de
 * `features/insignias/pdf-a-imagen.ts` (Fase 7e) para compartirlo con las
 * miniaturas de la biblioteca, los formularios y el sitio público.
 *
 * `pdfjs-dist` pesa mucho: se carga con `import()` dinámico para que viva en un
 * chunk aparte que solo se descarga al necesitar un PDF. El worker sale del
 * propio bundle (`?url` de Vite), nunca de un CDN: la CSP no lo permite.
 */
import { LADO_MAXIMO_PX } from './limites-lienzo'

/** Documento de pdf.js, tipado sin importar el paquete en el bundle inicial. */
export type DocumentoPdf = Awaited<
  ReturnType<Awaited<typeof import('pdfjs-dist')>['getDocument']>['promise']
>

/**
 * Abre un PDF desde una URL (pdf.js lo descarga con `fetch`: el origen debe
 * permitir CORS `GET` y estar en `connect-src`) o desde un `File` local.
 */
export async function abrirDocumentoPdf(origen: string | File): Promise<DocumentoPdf> {
  const [pdfjs, { default: urlWorker }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = urlWorker
  const fuente =
    typeof origen === 'string'
      ? { url: origen, isEvalSupported: false }
      : { data: await origen.arrayBuffer(), isEvalSupported: false }
  return pdfjs.getDocument(fuente).promise
}

export type OpcionesRenderPdf = {
  /** Lado mayor del resultado en píxeles (por defecto 480). */
  ladoMaximo?: number
}

/** Renderiza la primera página del PDF y devuelve un PNG con el lado mayor acotado. */
export async function renderizarPrimeraPagina(
  origen: string | File,
  { ladoMaximo = 480 }: OpcionesRenderPdf = {},
): Promise<Blob> {
  const lado = Math.min(ladoMaximo, LADO_MAXIMO_PX)
  const documento = await abrirDocumentoPdf(origen)
  try {
    const pagina = await documento.getPage(1)
    const base = pagina.getViewport({ scale: 1 })
    const escala = lado / Math.max(base.width, base.height)
    const viewport = pagina.getViewport({ scale: escala })

    const canvas = window.document.createElement('canvas')
    canvas.width = Math.max(1, Math.min(Math.ceil(viewport.width), LADO_MAXIMO_PX))
    canvas.height = Math.max(1, Math.min(Math.ceil(viewport.height), LADO_MAXIMO_PX))
    const contexto = canvas.getContext('2d')
    if (!contexto) throw new Error('No se pudo preparar el lienzo para la miniatura del PDF.')

    await pagina.render({ canvas, canvasContext: contexto, viewport }).promise

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (resultado) =>
          resultado ? resolve(resultado) : reject(new Error('No se pudo generar la miniatura del PDF.')),
        'image/png',
      )
    })
  } finally {
    await documento.destroy()
  }
}
