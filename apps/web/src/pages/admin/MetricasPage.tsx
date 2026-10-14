import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  MetricasDisponibles,
  MotivoNoDisponible,
  PeriodoMetricas,
} from '@/features/metricas/types'
import { useMetricas } from '@/features/metricas/useMetricas'
import { ApiError } from '@/lib/api-client'

const PERIODOS: PeriodoMetricas[] = [7, 30, 90]

const MENSAJE_NO_DISPONIBLE: Record<MotivoNoDisponible, string> = {
  no_configurado: 'La analítica no está configurada; ver docs/despliegue.md §7.',
  sin_respuesta:
    'Umami no respondió. Verifica que el servicio esté en marcha y vuelve a intentarlo en unos minutos.',
  no_autorizado:
    'Credenciales de Umami inválidas. Revisa UMAMI_API_TOKEN o UMAMI_USUARIO/UMAMI_CONTRASENA en el API.',
}

/** Duración en segundos como `mm:ss`. */
function formatearDuracion(segundos: number): string {
  const total = Math.max(0, Math.round(segundos))
  const mm = Math.floor(total / 60)
  const ss = total % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

function TarjetaNumero({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-2xl font-semibold">{valor}</p>
      </CardContent>
    </Card>
  )
}

function TablaMetrica({
  titulo,
  columna,
  columnaValor,
  filas,
}: {
  titulo: string
  columna: string
  columnaValor: string
  filas: { clave: string; valor: number }[]
}) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        {filas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos en este periodo.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{columna}</TableHead>
                <TableHead className="text-right">{columnaValor}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((fila) => (
                <TableRow key={fila.clave}>
                  <TableCell className="max-w-64 truncate">{fila.clave}</TableCell>
                  <TableCell className="text-right">{fila.valor}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function Contenido({ datos }: { datos: MetricasDisponibles }) {
  const { resumen, eventos } = datos
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <TarjetaNumero titulo="Páginas vistas" valor={String(resumen.paginas_vistas)} />
        <TarjetaNumero titulo="Visitas" valor={String(resumen.visitas)} />
        <TarjetaNumero titulo="Visitantes" valor={String(resumen.visitantes)} />
        <TarjetaNumero titulo="Rebote" valor={`${Math.round(resumen.rebote_pct)} %`} />
        <TarjetaNumero
          titulo="Duración media"
          valor={formatearDuracion(resumen.duracion_media_s)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TarjetaNumero titulo="Descargas de CV" valor={String(eventos.descargar_cv)} />
        <TarjetaNumero titulo="Clics en redes" valor={String(eventos.clic_red)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <TablaMetrica
          titulo="Páginas"
          columna="Ruta"
          columnaValor="Vistas"
          filas={datos.paginas.map((p) => ({ clave: p.ruta, valor: p.vistas }))}
        />
        <TablaMetrica
          titulo="Referidos"
          columna="Origen"
          columnaValor="Visitas"
          filas={datos.referidos.map((r) => ({ clave: r.origen || 'Directo', valor: r.visitas }))}
        />
        <TablaMetrica
          titulo="Países"
          columna="País"
          columnaValor="Visitas"
          filas={datos.paises.map((p) => ({ clave: p.pais, valor: p.visitas }))}
        />
      </div>
    </>
  )
}

/**
 * UC-27 (Fase 8, 8.4): métricas de visitas leídas de Umami vía
 * `GET /admin/metricas`. Solo tarjetas y tablas. Si la analítica no está
 * disponible se explica el motivo sin afectar al resto del panel.
 */
export function MetricasPage() {
  const [periodo, setPeriodo] = useState<PeriodoMetricas>(30)
  const { data, isLoading, error } = useMetricas(periodo)

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-xl font-semibold">Métricas</h1>
        <Tabs value={String(periodo)} onValueChange={(v) => setPeriodo(Number(v) as PeriodoMetricas)}>
          <TabsList aria-label="Periodo">
            {PERIODOS.map((p) => (
              <TabsTrigger key={p} value={String(p)}>
                {p} días
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="grid gap-4" aria-busy="true" aria-label="Cargando métricas">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-48" />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error instanceof ApiError ? error.message : 'No se pudieron cargar las métricas.'}
        </p>
      ) : null}

      {data && !data.disponible ? (
        <Card>
          <CardHeader>
            <CardTitle>Analítica no disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{MENSAJE_NO_DISPONIBLE[data.motivo]}</p>
          </CardContent>
        </Card>
      ) : null}

      {data?.disponible ? <Contenido datos={data} /> : null}
    </div>
  )
}
