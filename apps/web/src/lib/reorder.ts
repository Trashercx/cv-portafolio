export type ItemConOrdenYId = { id: string; orden: number }

/**
 * Calcula el intercambio de `orden` entre un elemento (`id`) y su vecino
 * anterior/siguiente dentro de una lista ordenada por `orden`. Devuelve los
 * dos pares `{ id, orden }` a aplicar (uno por cada `PATCH .../:id` o fila
 * del `PATCH .../reordenar` bulk), o `null` si el elemento ya está en el
 * extremo de la lista en esa dirección.
 *
 * Reusado por las listas de proyectos, certificaciones, logros y redes
 * sociales (UC-03 a UC-06) para el botón subir/bajar.
 */
export function calcularIntercambioOrdenPorId(
  items: ItemConOrdenYId[],
  id: string,
  direccion: 'subir' | 'bajar',
): [ItemConOrdenYId, ItemConOrdenYId] | null {
  const ordenados = [...items].sort((a, b) => a.orden - b.orden)
  const index = ordenados.findIndex((item) => item.id === id)
  if (index === -1) return null

  const indiceVecino = direccion === 'subir' ? index - 1 : index + 1
  if (indiceVecino < 0 || indiceVecino >= ordenados.length) return null

  const actual = ordenados[index]
  const vecino = ordenados[indiceVecino]

  return [
    { id: actual.id, orden: vecino.orden },
    { id: vecino.id, orden: actual.orden },
  ]
}

export type ItemConOrdenYMediaId = { media_id: string; orden: number }

/** Misma idea que `calcularIntercambioOrdenPorId`, para la galería de imágenes de un proyecto (clave `media_id`). */
export function calcularIntercambioOrdenPorMediaId(
  items: ItemConOrdenYMediaId[],
  mediaId: string,
  direccion: 'subir' | 'bajar',
): [ItemConOrdenYMediaId, ItemConOrdenYMediaId] | null {
  const ordenados = [...items].sort((a, b) => a.orden - b.orden)
  const index = ordenados.findIndex((item) => item.media_id === mediaId)
  if (index === -1) return null

  const indiceVecino = direccion === 'subir' ? index - 1 : index + 1
  if (indiceVecino < 0 || indiceVecino >= ordenados.length) return null

  const actual = ordenados[index]
  const vecino = ordenados[indiceVecino]

  return [
    { media_id: actual.media_id, orden: vecino.orden },
    { media_id: vecino.media_id, orden: actual.orden },
  ]
}
