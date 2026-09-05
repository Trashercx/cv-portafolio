import { FondoAnimado } from '@/components/publico/FondoAnimado'
import { ConfirmDeleteDialog } from '@/components/shared/ConfirmDeleteDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FondoSitioFormDialog } from '@/features/fondo-sitio/FondoSitioFormDialog'
import type { FondoSitio } from '@/features/fondo-sitio/types'
import {
  useActivarFondoSitio,
  useEliminarFondoSitio,
  useFondosSitio,
} from '@/features/fondo-sitio/useFondosSitio'
import { ApiError } from '@/lib/api-client'

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
 * UC-15 (Configurar fondo animado del sitio): listado, creación, activación
 * exclusiva y borrado. Página independiente de `TemaPage` (Fondo no es una
 * pestaña de Tema): el fondo es un concepto propio, con su propio catálogo
 * de tipos animados y su propia regla de "solo uno activo a la vez".
 */
export function FondoSitioPage() {
  const { data: fondos, isLoading, error } = useFondosSitio()
  const activar = useActivarFondoSitio()
  const eliminar = useEliminarFondoSitio()

  const fondoActivo = fondos?.find((fondo) => fondo.activo)

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-semibold">Fondo del sitio</h1>
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

      <section className="grid gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Vista previa del fondo activo
        </h2>
        {fondoActivo ? (
          <div className="relative min-h-48 overflow-hidden rounded-lg border p-6">
            <FondoAnimado fondo={fondoActivo} />
            <div className="relative z-10 grid gap-1">
              <h3 className="text-xl font-semibold">
                {TIPO_LABEL[fondoActivo.tipo]}
              </h3>
              <p className="text-sm text-muted-foreground">
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

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(fondos ?? []).map((fondo) => (
          <Card key={fondo.id} className={fondo.activo ? 'border-primary' : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {TIPO_LABEL[fondo.tipo]}
                {fondo.activo ? (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                    Activo
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-sm text-muted-foreground">
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
            </CardContent>
          </Card>
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
