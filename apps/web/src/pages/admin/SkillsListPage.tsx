import { useState } from 'react'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { OrderButtons } from '@/components/shared/OrderButtons'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { IconoSkill } from '@/features/skills/iconos-skill'
import { SkillFormDialog } from '@/features/skills/SkillFormDialog'
import type { Skill } from '@/features/skills/types'
import {
  useEliminarSkill,
  useReordenarSkills,
  useSkills,
} from '@/features/skills/useSkills'
import { useComandosContextuales } from '@/features/paleta-comandos/contexto-paleta'
import { ApiError } from '@/lib/api-client'
import { calcularIntercambioOrdenPorId } from '@/lib/reorder'

/** UC-16 (Gestionar catálogo de skills): listado, alta/edición/borrado inmediatos. */
export function SkillsListPage() {
  const { data: skills, isLoading, error } = useSkills()
  const reordenar = useReordenarSkills()
  const eliminar = useEliminarSkill()

  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [itemEditando, setItemEditando] = useState<Skill | null>(null)

  const ordenados = [...(skills ?? [])].sort((a, b) => a.orden - b.orden)

  const mover = (id: string, direccion: 'subir' | 'bajar') => {
    if (!skills) return
    const intercambio = calcularIntercambioOrdenPorId(skills, id, direccion)
    if (!intercambio) return
    reordenar.mutate(intercambio)
  }

  const abrirNuevo = () => {
    setItemEditando(null)
    setDialogoAbierto(true)
  }

  const abrirEdicion = (skill: Skill) => {
    setItemEditando(skill)
    setDialogoAbierto(true)
  }

  useComandosContextuales([
    { id: 'nuevo-skill', etiqueta: 'Nuevo skill', accion: abrirNuevo },
  ])

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Skills</h1>
        <Button onClick={abrirNuevo}>Nuevo skill</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando skills…</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error instanceof ApiError
            ? error.message
            : 'No se pudieron cargar los skills.'}
        </p>
      ) : null}
      {skills && skills.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay skills cargados.
        </p>
      ) : null}

      {skills && skills.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Orden</TableHead>
              <TableHead>Skill</TableHead>
              <TableHead>Visible</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordenados.map((skill, index) => (
              <TableRow key={skill.id}>
                <TableCell>
                  <OrderButtons
                    disabled={reordenar.isPending}
                    disableSubir={index === 0}
                    disableBajar={index === ordenados.length - 1}
                    onSubir={() => mover(skill.id, 'subir')}
                    onBajar={() => mover(skill.id, 'bajar')}
                  />
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <IconoSkill icono={skill.icono} tamano="sm" />
                    {skill.nombre}
                  </span>
                </TableCell>
                <TableCell>{skill.visible ? 'Sí' : 'No'}</TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => abrirEdicion(skill)}
                  >
                    Editar
                  </Button>
                  <ConfirmDeleteDialog
                    trigger={
                      <Button variant="destructive" size="sm">
                        Eliminar
                      </Button>
                    }
                    title={`¿Eliminar "${skill.nombre}"?`}
                    description="Esta acción no se puede deshacer."
                    isPending={eliminar.isPending}
                    onConfirm={() => eliminar.mutate(skill.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      <SkillFormDialog
        skill={itemEditando}
        open={dialogoAbierto}
        onOpenChange={setDialogoAbierto}
      />
    </div>
  )
}
