import { normalizarTipoFondo, type TipoFondo } from './catalogo-fondos'
import type { FondoSitio } from './types'

type Configuracion = FondoSitio['configuracion']

/**
 * Un fondo por tipo (Fase 7b/7l, UC-15): el activo o, si no hay, el último del
 * listado; el resto de los del mismo tipo (duplicados heredados de datos
 * anteriores) se devuelve aparte. Lo usan la galería y los ajustes.
 */
export function agruparFondosPorTipo(fondos: FondoSitio[] | undefined) {
  const grupos = new Map<TipoFondo, FondoSitio[]>()
  for (const fondo of fondos ?? []) {
    const tipo = normalizarTipoFondo(fondo.tipo)
    grupos.set(tipo, [...(grupos.get(tipo) ?? []), fondo])
  }
  const porTipo = new Map<TipoFondo, FondoSitio>()
  const duplicados: FondoSitio[] = []
  for (const [tipo, lista] of grupos) {
    const elegido = lista.find((f) => f.activo) ?? lista[lista.length - 1]
    porTipo.set(tipo, elegido)
    duplicados.push(...lista.filter((f) => f.id !== elegido.id))
  }
  return { porTipo, duplicados }
}

/** Fondo "de borrador": lo que ve el lienzo mientras se elige o ajusta (id vacío si aún no existe en el servidor). */
export function fondoDeBorrador(
  tipo: TipoFondo,
  existente: FondoSitio | undefined,
  configuracion: Configuracion,
): FondoSitio {
  return {
    id: existente?.id ?? '',
    usuario_admin_id: existente?.usuario_admin_id ?? '',
    tipo,
    configuracion,
    activo: existente?.activo ?? false,
  }
}
