import { FondoAnimado } from '@/components/publico/FondoAnimado'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { Button } from '@/components/ui/button'
import { FondoSitioFormDialog } from '@/features/fondo-sitio/FondoSitioFormDialog'
import type { FondoSitio } from '@/features/fondo-sitio/types'
import {
  useActivarFondoSitio,
  useEliminarFondoSitio,
  useFondosSitio,
} from '@/features/fondo-sitio/useFondosSitio'
import { ApiError } from '@/lib/api-client'
import { cn } from '@/lib/utils'

const TIPO_LABEL: Record<FondoSitio['tipo'], string> = {
  solido: 'Sólido',
  degradado_animado: 'Degradado animado',
  aurora_animada: 'Aurora animada',
  particulas: 'Partículas',
  cuadricula_animada: 'Cuadrícula animada',
  ondas: 'Ondas',
  malla_difusa: 'Malla difusa',
  lineas_diagonales: 'Líneas diagonales',
}

const VELOCIDAD_LABEL: Record<FondoSitio['configuracion']['velocidad'], string> = {
  lenta: 'Lenta',
  media: 'Media',
  rapida: 'Rápida',
}

/**
 * Plugin "Fondo" del rail de Puck en el editor unificado (Fase 5, plugin desde Fase 7): mismo
 * listado/creación/activación exclusiva/borrado que la extinta
 * `FondoSitioPage` (UC-15) — se reusan tal cual `useFondosSitio`/
 * `useActivarFondoSitio`/`useEliminarFondoSitio` y `FondoSitioFormDialog`,
 * sin ninguna lógica de mutación nueva ni duplicada. Único cambio: el grid
 * ancho de la página independiente pasa a una lista vertical compacta, para
 * caber en la columna angosta del panel lateral.
 */
export function PanelFondoEditor() {
  const { data: fondos, isLoading, error } = useFondosSitio()
  const activar = useActivarFondoSitio()
  const eliminar = useEliminarFondoSitio()

  const fondoActivo = fondos?.find((fondo) => fondo.activo)

  return (
    <div className="grid gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Fondo del sitio</h3>
        <FondoSitioFormDialog />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando fondos…</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error instanceof ApiError
            ? error.message
            : 'No se pudieron cargar los fondos.'}
        </p>
      ) : null}

      <section className="grid gap-2">
        <h4 className="text-xs font-medium text-muted-foreground">
          Vista previa del fondo activo
        </h4>
        {fondoActivo ? (
          <div className="relative min-h-32 overflow-hidden rounded-lg border p-3">
            <FondoAnimado fondo={fondoActivo} />
            <div className="relative z-10 grid gap-1 text-sm">
              <p className="font-semibold">{TIPO_LABEL[fondoActivo.tipo]}</p>
              <p className="text-xs text-muted-foreground">
                {VELOCIDAD_LABEL[fondoActivo.configuracion.velocidad]} ·
                Opacidad {fondoActivo.configuracion.opacidad}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Todavía no hay ningún fondo activo.
          </p>
        )}
      </section>

      <section className="grid gap-3">
        {(fondos ?? []).map((fondo) => (
          <div
            key={fondo.id}
            className={cn(
              'grid gap-2 rounded-lg border p-3',
              fondo.activo && 'border-primary',
            )}
          >
            <div className="flex items-center justify-between gap-2 text-sm font-medium">
              <span>{TIPO_LABEL[fondo.tipo]}</span>
              {fondo.activo ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                  Activo
                </span>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {VELOCIDAD_LABEL[fondo.configuracion.velocidad]} · Opacidad{' '}
              {fondo.configuracion.opacidad}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={fondo.activo || activar.isPending}
                onClick={() => activar.mutate(fondo.id)}
              >
                {fondo.activo ? 'Activo' : 'Activar'}
              </Button>
              <ConfirmDeleteDialog
                trigger={
                  <Button variant="destructive" size="sm">
                    Eliminar
                  </Button>
                }
                title={`¿Eliminar el fondo "${TIPO_LABEL[fondo.tipo]}"?`}
                description="Esta acción no se puede deshacer."
                isPending={eliminar.isPending}
                onConfirm={() => eliminar.mutate(fondo.id)}
              />
            </div>
          </div>
        ))}
      </section>

      {fondos && fondos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no hay fondos creados.
        </p>
      ) : null}
    </div>
  )
}
