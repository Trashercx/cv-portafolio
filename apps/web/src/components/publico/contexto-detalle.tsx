import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { CertificacionPublica } from '@/features/publico/types'
import type { Logro } from '@/features/logros/types'
import type { Proyecto } from '@/features/proyectos/types'
import { DetalleCertificacionContenido } from './detalle/DetalleCertificacionContenido'
import { DetalleLogroContenido } from './detalle/DetalleLogroContenido'
import { DetalleProyectoContenido } from './detalle/DetalleProyectoContenido'
import { DialogDetalle } from './DialogDetalle'

type ItemDetalle =
  | { tipo: 'proyecto'; item: Proyecto }
  | { tipo: 'certificacion'; item: CertificacionPublica }
  | { tipo: 'logro'; item: Logro }

type AbrirDetalle = <T extends ItemDetalle['tipo']>(
  tipo: T,
  item: Extract<ItemDetalle, { tipo: T }>['item'],
) => void

/**
 * Sin `ProveedorDetallePublico` (por ejemplo, algún consumidor futuro de
 * `bloques/` que no lo monte), `useAbrirDetalle` devuelve un no-op en vez de
 * tirar error — mismo criterio que `ContextoModoRenderizado`
 * (`contexto-renderizado.tsx`), que default a `'publico'` en vez de exigir
 * un Provider explícito.
 */
const ContextoAbrirDetalle = createContext<AbrirDetalle>(() => {})

/**
 * Abre el detalle de un proyecto/certificación/logro en un modal (Fase 4.3,
 * UC-13) en vez de navegar a `/proyecto/:id` etc. El objeto completo
 * (`item`) ya viene en memoria desde el `SnapshotSitio` que cargó el
 * consumidor (home pública o vista previa del panel) — no hace ningún
 * fetch propio, a diferencia de `ProyectoDetallePage`/
 * `CertificacionDetallePage`, que sí lo hacen para el acceso directo por
 * URL.
 */
export function ProveedorDetallePublico({ children }: { children: ReactNode }) {
  const [detalle, setDetalle] = useState<ItemDetalle | null>(null)

  const abrirDetalle = useCallback<AbrirDetalle>((tipo, item) => {
    setDetalle({ tipo, item } as ItemDetalle)
  }, [])

  const handleOpenChange = (open: boolean) => {
    if (!open) setDetalle(null)
  }

  const contenido = useMemo(() => {
    if (!detalle) return null
    switch (detalle.tipo) {
      case 'proyecto':
        return <DetalleProyectoContenido proyecto={detalle.item} />
      case 'certificacion':
        return <DetalleCertificacionContenido certificacion={detalle.item} />
      case 'logro':
        return <DetalleLogroContenido logro={detalle.item} />
      default:
        return null
    }
  }, [detalle])

  return (
    <ContextoAbrirDetalle.Provider value={abrirDetalle}>
      {children}
      <DialogDetalle open={detalle !== null} onOpenChange={handleOpenChange}>
        {contenido}
      </DialogDetalle>
    </ContextoAbrirDetalle.Provider>
  )
}

export function useAbrirDetalle(): AbrirDetalle {
  return useContext(ContextoAbrirDetalle)
}
