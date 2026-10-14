/**
 * Fase 7e, UC-35: convierte la primera página de un PDF en un PNG dentro del
 * navegador (DataCamp y otros emiten el certificado en PDF). `pdfjs-dist` pesa
 * mucho: se carga con `import()` dinámico para que viva en un chunk aparte que
 * solo se descarga al elegir un PDF. El worker sale del propio bundle (`?url`
 * de Vite), nunca de un CDN: la CSP no lo permite.
 */
import { AREA_MAXIMA_PX, LADO_MAXIMO_PX } from '@/features/media/limites-lienzo'

export type OpcionesPdfAImagen = {
  /** Escala mínima de render (por defecto 2). */
  escala?: number
  /** Ancho mínimo del PNG en píxeles; si la escala no alcanza, se sube (por defecto 1600). */
  anchoMinimo?: number
}

export type ImagenDePdf = { blob: Blob; ancho: number; alto: number }

export async function pdfAImagenPng(
  file: File,
  { escala = 2, anchoMinimo = 1600 }: OpcionesPdfAImagen = {},
): Promise<ImagenDePdf> {
  const [pdfjs, { default: urlWorker }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = urlWorker

  const documento = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise
  try {
    const pagina = await documento.getPage(1)
    const base = pagina.getViewport({ scale: 1 })
    const escalaDeseada = Math.max(escala, anchoMinimo / base.width)
    // Se reduce la escala si el resultado pasaría de 4000 px por lado o de 16 MP.
    const escalaMaxima = Math.min(
      LADO_MAXIMO_PX / Math.max(base.width, base.height),
      Math.sqrt(AREA_MAXIMA_PX / (base.width * base.height)),
    )
    const escalaFinal =
      escalaDeseada > escalaMaxima ? escalaMaxima * 0.999 : escalaDeseada
    const viewport = pagina.getViewport({ scale: escalaFinal })

    const canvas = document.createElement('canvas')
    canvas.width = Math.min(Math.ceil(viewport.width), LADO_MAXIMO_PX)
    canvas.height = Math.min(Math.ceil(viewport.height), LADO_MAXIMO_PX)
    const contexto = canvas.getContext('2d')
    if (!contexto) throw new Error('No se pudo preparar el lienzo para convertir el PDF.')

    await pagina.render({ canvas, canvasContext: contexto, viewport }).promise

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (resultado) =>
          resultado ? resolve(resultado) : reject(new Error('No se pudo generar la imagen del PDF.')),
        'image/png',
      )
    })
    return { blob, ancho: canvas.width, alto: canvas.height }
  } finally {
    await documento.destroy()
  }
}
