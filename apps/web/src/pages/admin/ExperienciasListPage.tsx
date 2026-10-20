import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExperienciaFormDialog } from '@/features/experiencias/ExperienciaFormDialog'
import { ListaExperiencias } from '@/features/experiencias/ListaExperiencias'
import type { Experiencia } from '@/features/experiencias/types'
import { useExperiencias } from '@/features/experiencias/useExperiencias'
import { useComandosContextuales } from '@/features/paleta-comandos/contexto-paleta'
import { ApiError } from '@/lib/api-client'

/** UC-19 (Gestionar experiencia laboral, Fase 7l): listado reordenable, alta/edición/borrado inmediatos. */
export function ExperienciasListPage() {
  const { data: experiencias, isLoading, error } = useExperiencias()
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [itemEditando, setItemEditando] = useState<Experiencia | null>(null)

  const abrirNuevo = () => {
    setItemEditando(null)
    setDialogoAbierto(true)
  }

  const abrirEdicion = (experiencia: Experiencia) => {
    setItemEditando(experiencia)
    setDialogoAbierto(true)
  }

  useComandosContextuales([
    { id: 'nueva-experiencia', etiqueta: 'Nueva experiencia', accion: abrirNuevo },
  ])

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Experiencia laboral</h1>
        <Button onClick={abrirNuevo}>Nueva experiencia</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando experiencias…</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error instanceof ApiError
            ? error.message
            : 'No se pudieron cargar las experiencias.'}
        </p>
      ) : null}
      {experiencias && experiencias.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay experiencias cargadas.
        </p>
      ) : null}

      {experiencias && experiencias.length > 0 ? (
        <ListaExperiencias experiencias={experiencias} onEditar={abrirEdicion} />
      ) : null}

      <ExperienciaFormDialog
        experiencia={itemEditando}
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
      />
    </div>
  )
}
