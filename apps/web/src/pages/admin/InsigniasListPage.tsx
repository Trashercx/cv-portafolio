import { BadgeCheck } from 'lucide-react'
import { useState } from 'react'
import { EstadoVacio } from '@/components/shared/EstadoVacio'
import { Button } from '@/components/ui/button'
import { ImportarInsigniaDialog } from '@/features/insignias/ImportarInsigniaDialog'
import { InsigniaFormDialog } from '@/features/insignias/InsigniaFormDialog'
import { ListaInsignias } from '@/features/insignias/ListaInsignias'
import type { Insignia } from '@/features/insignias/types'
import { useInsignias } from '@/features/insignias/useInsignias'
import { useComandosContextuales } from '@/features/paleta-comandos/contexto-paleta'
import { ApiError } from '@/lib/api-client'

/** Fase 7d, UC-35 (Gestionar insignias): lista ordenable, importación por enlace/embed/archivo, edición, ocultar y borrar. */
export function InsigniasListPage() {
  const { data: insignias, isLoading, error } = useInsignias()
  const [importando, setImportando] = useState(false)
  const [editando, setEditando] = useState<Insignia | null>(null)

  useComandosContextuales([
    {
      id: 'importar-insignia',
      etiqueta: 'Importar insignia',
      accion: () => setImportando(true),
    },
  ])

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Insignias</h1>
        <Button onClick={() => setImportando(true)}>Importar insignia</Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Cargando insignias…</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : 'No se pudieron cargar las insignias.'}
        </p>
      ) : null}

      {insignias && insignias.length === 0 ? (
        <EstadoVacio
          icono={BadgeCheck}
          titulo="Todavía no hay insignias cargadas."
          descripcion="Importa tus medallas por enlace, código de embed o archivo."
          etiquetaAccion="Importar insignia"
          onAccion={() => setImportando(true)}
        />
      ) : null}

      {insignias && insignias.length > 0 ? (
        <ListaInsignias insignias={insignias} onEditar={setEditando} />
      ) : null}

      <ImportarInsigniaDialog open={importando} onOpenChange={setImportando} />
      <InsigniaFormDialog
        insignia={editando}
        open={editando !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setEditando(null)
        }}
      />
    </div>
  )
}
