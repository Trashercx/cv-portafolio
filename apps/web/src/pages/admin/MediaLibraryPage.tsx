import {
  FolderInput,
  ImagePlus,
  LayoutGrid,
  List,
  Loader2,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BarraCarpetas } from '@/features/media/BarraCarpetas'
import { ACCEPT_IMAGENES_Y_PDF } from '@/features/media/formatos-imagen'
import { EliminarLoteDialog } from '@/features/media/EliminarLoteDialog'
import { MediaDetailDialog } from '@/features/media/MediaDetailDialog'
import { PanelColaSubida } from '@/features/media/PanelColaSubida'
import { TarjetaMedia, type VistaBiblioteca } from '@/features/media/TarjetaMedia'
import type {
  Media,
  OrdenMedia,
  ResultadoEliminarLote,
} from '@/features/media/types'
import { useCarpetasMedia, useMoverMedia } from '@/features/media/useCarpetasMedia'
import { useColaSubida } from '@/features/media/useColaSubida'
import {
  useEliminarMediaLote,
  useMediaList,
  useMediaUsos,
  useRegenerarVariantes,
} from '@/features/media/useMediaLibrary'
import { nombreArchivo } from '@/features/media/utilidades-media'
import { ApiError } from '@/lib/api-client'

const TIPOS_FILTRO = [
  { value: 'todos', label: 'Todos los tipos' },
  { value: 'imagen', label: 'Imágenes' },
  { value: 'pdf', label: 'PDF' },
  { value: 'archivo', label: 'Otros archivos' },
]

const ORDENES: { value: OrdenMedia; label: string }[] = [
  { value: 'reciente', label: 'Más recientes' },
  { value: 'antiguo', label: 'Más antiguos' },
  { value: 'nombre', label: 'Nombre' },
]

const CLAVE_VISTA = 'biblioteca-vista'
const RETARDO_BUSQUEDA_MS = 300

function leerVistaGuardada(): VistaBiblioteca {
  try {
    return localStorage.getItem(CLAVE_VISTA) === 'lista' ? 'lista' : 'cuadricula'
  } catch {
    return 'cuadricula'
  }
}

function esOrden(valor: string | null): valor is OrdenMedia {
  return valor === 'reciente' || valor === 'antiguo' || valor === 'nombre'
}

function tieneArchivos(evento: DragEvent): boolean {
  return Array.from(evento.dataTransfer?.types ?? []).includes('Files')
}

function esCampoDeTexto(destino: EventTarget | null): boolean {
  return (
    destino instanceof HTMLElement &&
    (destino.tagName === 'INPUT' ||
      destino.tagName === 'TEXTAREA' ||
      destino.isContentEditable)
  )
}

/**
 * UC-09 (Gestionar biblioteca multimedia), Fase 7d: subida múltiple por
 * arrastrar y soltar con cola y progreso, filtros `tipo`/`q`/`orden` en la URL,
 * vista cuadrícula o lista, modo selección con borrado en lote, usos de cada
 * archivo, copiar URL y edición en línea del texto alternativo.
 * Fase 7e (UC-09): carpetas planas (`BarraCarpetas`, `?carpeta=` en la URL),
 * subidas a la carpeta activa, "Mover a…" en la selección y arrastre de
 * tarjetas a una carpeta.
 */
export function MediaLibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tipo = searchParams.get('tipo') || 'todos'
  const q = searchParams.get('q') ?? ''
  const ordenParam = searchParams.get('orden')
  const orden: OrdenMedia = esOrden(ordenParam) ? ordenParam : 'reciente'

  const [busqueda, setBusqueda] = useState(q)
  const [vista, setVista] = useState<VistaBiblioteca>(leerVistaGuardada)
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null)
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [loteAbierto, setLoteAbierto] = useState(false)
  const [resultadoLote, setResultadoLote] = useState<ResultadoEliminarLote | null>(null)
  const [nombresLote, setNombresLote] = useState<Record<string, string>>({})
  const [arrastrando, setArrastrando] = useState(false)
  const contadorArrastre = useRef(0)
  const inputArchivos = useRef<HTMLInputElement>(null)

  const regenerar = useRegenerarVariantes()
  const eliminarLote = useEliminarMediaLote()
  const cola = useColaSubida(3)
  const { agregar } = cola
  const moverMedia = useMoverMedia()
  const { data: carpetasData } = useCarpetasMedia()
  const carpetas = useMemo(() => carpetasData ?? [], [carpetasData])
  const nombrePorCarpeta = useMemo(
    () => new Map(carpetas.map((c) => [c.id, c.nombre])),
    [carpetas],
  )

  // Fase 7e (UC-09): la carpeta activa vive en la URL (`?carpeta=<id>|ninguna`; ausente = todos).
  const carpetaParam = searchParams.get('carpeta') || undefined
  // Destino de las subidas: el elegido en el panel de cola o, por defecto, la carpeta activa.
  const [destinoElegido, setDestinoElegido] = useState<string | undefined>(undefined)
  const carpetaDestino = destinoElegido ?? carpetaParam ?? 'ninguna'
  const agregarEnDestino = useCallback(
    (archivos: File[]) =>
      agregar(archivos, carpetaDestino === 'ninguna' ? undefined : carpetaDestino),
    [agregar, carpetaDestino],
  )

  const { data: media, isLoading, error } = useMediaList({
    tipo: tipo === 'todos' ? undefined : tipo,
    q,
    orden,
    carpeta_id: carpetaParam,
  })
  const { data: usosPorMedia } = useMediaUsos()

  const actualizarParametro = useCallback(
    (clave: string, valor: string | undefined) => {
      setSearchParams(
        (previos) => {
          const siguientes = new URLSearchParams(previos)
          if (valor) siguientes.set(clave, valor)
          else siguientes.delete(clave)
          return siguientes
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const elegirCarpeta = (valor: string | undefined) => {
    // Cambiar de carpeta vuelve el destino de subida a "la carpeta activa".
    setDestinoElegido(undefined)
    actualizarParametro('carpeta', valor)
  }

  // Debounce de 300 ms de la búsqueda hacia `?q=`.
  useEffect(() => {
    if (busqueda === q) return
    const temporizador = setTimeout(
      () => actualizarParametro('q', busqueda.trim() || undefined),
      RETARDO_BUSQUEDA_MS,
    )
    return () => clearTimeout(temporizador)
  }, [busqueda, q, actualizarParametro])

  const elegirVista = (siguiente: VistaBiblioteca) => {
    setVista(siguiente)
    try {
      localStorage.setItem(CLAVE_VISTA, siguiente)
    } catch {
      // Sin almacenamiento disponible: la preferencia solo dura la sesión.
    }
  }

  // Arrastrar y soltar en toda la ventana. `dragenter`/`dragleave` se cuentan
  // porque se disparan también al cruzar elementos hijos (evita parpadeo).
  useEffect(() => {
    const alEntrar = (evento: DragEvent) => {
      if (!tieneArchivos(evento)) return
      evento.preventDefault()
      contadorArrastre.current += 1
      setArrastrando(true)
    }
    const alSalir = (evento: DragEvent) => {
      if (!tieneArchivos(evento)) return
      contadorArrastre.current = Math.max(0, contadorArrastre.current - 1)
      if (contadorArrastre.current === 0) setArrastrando(false)
    }
    const alPasar = (evento: DragEvent) => {
      if (!tieneArchivos(evento)) return
      // Requerido para que el navegador permita el `drop`.
      evento.preventDefault()
    }
    const alSoltar = (evento: DragEvent) => {
      if (!tieneArchivos(evento)) return
      evento.preventDefault()
      contadorArrastre.current = 0
      setArrastrando(false)
      agregarEnDestino(Array.from(evento.dataTransfer?.files ?? []))
    }
    window.addEventListener('dragenter', alEntrar)
    window.addEventListener('dragleave', alSalir)
    window.addEventListener('dragover', alPasar)
    window.addEventListener('drop', alSoltar)
    return () => {
      window.removeEventListener('dragenter', alEntrar)
      window.removeEventListener('dragleave', alSalir)
      window.removeEventListener('dragover', alPasar)
      window.removeEventListener('drop', alSoltar)
    }
  }, [agregarEnDestino])

  const lista = useMemo(() => media ?? [], [media])
  // La selección se acota a lo visible: un filtro nuevo no deja ids ocultos marcados.
  const idsSeleccionados = useMemo(
    () => lista.filter((item) => seleccion.has(item.id)).map((item) => item.id),
    [lista, seleccion],
  )

  const salirDeSeleccion = useCallback(() => {
    setModoSeleccion(false)
    setSeleccion(new Set())
  }, [])

  // Fase 7e (UC-09): una tarjeta arrastra toda la selección si forma parte de ella.
  const idsAlArrastrar = (id: string) =>
    modoSeleccion && seleccion.has(id) ? idsSeleccionados : [id]

  // "Mover a…" de la selección: limpia la selección al terminar.
  const moverSeleccion = (carpeta_id: string | null) =>
    moverMedia.mutate(
      { ids: idsSeleccionados, carpeta_id },
      { onSuccess: salirDeSeleccion },
    )

  const abrirLote = useCallback(() => {
    setResultadoLote(null)
    setLoteAbierto(true)
  }, [])

  // Teclado: `Supr` con selección abre la confirmación; `Esc` sale del modo selección.
  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if (loteAbierto || seleccionadoId || esCampoDeTexto(evento.target)) return
      if (evento.key === 'Delete' && modoSeleccion && idsSeleccionados.length > 0) {
        evento.preventDefault()
        abrirLote()
      } else if (evento.key === 'Escape' && modoSeleccion) {
        salirDeSeleccion()
      }
    }
    document.addEventListener('keydown', alPulsar)
    return () => document.removeEventListener('keydown', alPulsar)
  }, [
    loteAbierto,
    seleccionadoId,
    modoSeleccion,
    idsSeleccionados.length,
    abrirLote,
    salirDeSeleccion,
  ])

  const alternar = (id: string) =>
    setSeleccion((previa) => {
      const siguiente = new Set(previa)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })

  const todoSeleccionado = lista.length > 0 && idsSeleccionados.length === lista.length
  const alternarTodo = () =>
    setSeleccion(todoSeleccionado ? new Set() : new Set(lista.map((item) => item.id)))

  const confirmarLote = () => {
    const nombres: Record<string, string> = {}
    for (const item of lista) nombres[item.id] = nombreArchivo(item)
    setNombresLote(nombres)
    eliminarLote.mutate(idsSeleccionados, {
      onSuccess: (resultado) => {
        setResultadoLote(resultado)
        // Quedan marcados solo los omitidos, para poder reintentar tras liberarlos.
        setSeleccion(new Set(resultado.omitidos.map((o) => o.id)))
        if (resultado.eliminados.length > 0) {
          toast.success(
            `${resultado.eliminados.length} ${resultado.eliminados.length === 1 ? 'archivo eliminado' : 'archivos eliminados'}.`,
          )
        }
      },
    })
  }

  // Deriva el elemento seleccionado de la lista fresca (no de una copia
  // local) para que el diálogo refleje `alt_text`/archivo actualizados tras
  // cada mutación.
  const detalle: Media | null =
    lista.find((item) => item.id === seleccionadoId) ?? null

  const hayFiltros = tipo !== 'todos' || q !== '' || carpetaParam !== undefined

  return (
    <TooltipProvider>
      <div className="grid gap-4">
        {arrastrando ? (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <p className="rounded-lg border-2 border-dashed border-primary px-8 py-6 text-lg font-medium">
              Suelta para subir
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-heading text-xl font-semibold">Biblioteca de medios</h1>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <input
              ref={inputArchivos}
              type="file"
              multiple
              accept={ACCEPT_IMAGENES_Y_PDF}
              className="sr-only"
              aria-label="Seleccionar archivos para subir"
              tabIndex={-1}
              onChange={(evento) => {
                agregarEnDestino(Array.from(evento.target.files ?? []))
                // Permite volver a elegir el mismo archivo.
                evento.target.value = ''
              }}
            />
            <Button type="button" onClick={() => inputArchivos.current?.click()}>
              <Upload />
              Subir archivos
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={regenerar.isPending}
              onClick={() =>
                regenerar.mutate(undefined, {
                  // Fase 8 (8.2, UC-09): resumen del relleno de variantes.
                  onSuccess: (r) => {
                    // Revisión Fase 8: con errores el aviso es de advertencia, no de éxito.
                    const avisar = r.errores.length > 0 ? toast.warning : toast.success
                    avisar(
                      `Variantes generadas: ${r.procesadas} procesadas, ${r.omitidas} omitidas, ${r.errores.length} con error.`,
                    )
                  },
                })
              }
            >
              {regenerar.isPending ? <Loader2 className="animate-spin" /> : <ImagePlus />}
              Generar variantes faltantes
            </Button>
          </div>
        </div>

        <PanelColaSubida
          items={cola.items}
          onCancelar={cola.cancelar}
          onReintentar={cola.reintentar}
          onLimpiar={cola.limpiar}
          carpetas={carpetas}
          destino={carpetaDestino}
          onCambiarDestino={setDestinoElegido}
        />

        <div className="grid gap-4 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-start">
        <BarraCarpetas
          carpetas={carpetas}
          activa={carpetaParam}
          onSeleccionar={elegirCarpeta}
          onMovidos={salirDeSeleccion}
        />
        <div className="grid min-w-0 gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar por nombre o texto alternativo"
              aria-label="Buscar archivos"
              className="pl-8"
            />
          </div>
          <Select
            value={tipo}
            onValueChange={(valor) =>
              actualizarParametro('tipo', valor === 'todos' ? undefined : valor)
            }
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Filtrar por tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS_FILTRO.map((opcion) => (
                <SelectItem key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={orden}
            onValueChange={(valor) =>
              actualizarParametro('orden', valor === 'reciente' ? undefined : valor)
            }
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Ordenar por">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDENES.map((opcion) => (
                <SelectItem key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1" role="group" aria-label="Vista">
            <Button
              type="button"
              variant={vista === 'cuadricula' ? 'secondary' : 'outline'}
              size="icon"
              aria-label="Vista de cuadrícula"
              aria-pressed={vista === 'cuadricula'}
              onClick={() => elegirVista('cuadricula')}
            >
              <LayoutGrid />
            </Button>
            <Button
              type="button"
              variant={vista === 'lista' ? 'secondary' : 'outline'}
              size="icon"
              aria-label="Vista de lista"
              aria-pressed={vista === 'lista'}
              onClick={() => elegirVista('lista')}
            >
              <List />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={modoSeleccion ? 'secondary' : 'outline'}
            size="sm"
            aria-pressed={modoSeleccion}
            onClick={() => (modoSeleccion ? salirDeSeleccion() : setModoSeleccion(true))}
          >
            {modoSeleccion ? 'Salir de la selección' : 'Seleccionar'}
          </Button>
          {modoSeleccion ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={alternarTodo}>
                {todoSeleccionado ? 'Quitar selección' : 'Seleccionar todo lo visible'}
              </Button>
              <span aria-live="polite" className="text-sm text-muted-foreground">
                {idsSeleccionados.length} seleccionados
              </span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={idsSeleccionados.length === 0}
                onClick={abrirLote}
              >
                <Trash2 />
                Eliminar seleccionados
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={idsSeleccionados.length === 0 || moverMedia.isPending}
                  >
                    <FolderInput />
                    Mover a…
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onSelect={() => moverSeleccion(null)}>
                    Sin carpeta
                  </DropdownMenuItem>
                  {carpetas.map((carpeta) => (
                    <DropdownMenuItem
                      key={carpeta.id}
                      onSelect={() => moverSeleccion(carpeta.id)}
                    >
                      {carpeta.nombre}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando biblioteca…</p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error instanceof ApiError
              ? error.message
              : 'No se pudo cargar la biblioteca de medios.'}
          </p>
        ) : null}
        {media && media.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {hayFiltros
              ? 'Ningún archivo coincide con los filtros.'
              : 'No hay archivos en la biblioteca. Arrastra archivos aquí o usa "Subir archivos".'}
          </p>
        ) : null}

        <ul
          className={
            vista === 'lista'
              ? 'grid gap-2'
              : 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'
          }
        >
          {lista.map((item) => (
            <TarjetaMedia
              key={item.id}
              media={item}
              vista={vista}
              usos={usosPorMedia?.[item.id] ?? []}
              modoSeleccion={modoSeleccion}
              seleccionado={seleccion.has(item.id)}
              onAlternar={alternar}
              onAbrir={setSeleccionadoId}
              nombreCarpeta={nombrePorCarpeta.get(item.carpeta_id ?? '') ?? 'Sin carpeta'}
              idsAlArrastrar={idsAlArrastrar}
            />
          ))}
        </ul>
        </div>
        </div>

        {detalle ? (
          <MediaDetailDialog
            key={detalle.id}
            media={detalle}
            usos={usosPorMedia?.[detalle.id] ?? []}
            open
            onOpenChange={(open) => {
              if (!open) setSeleccionadoId(null)
            }}
          />
        ) : null}

        <EliminarLoteDialog
          open={loteAbierto}
          onOpenChange={setLoteAbierto}
          cantidad={idsSeleccionados.length}
          isPending={eliminarLote.isPending}
          resultado={resultadoLote}
          nombres={nombresLote}
          onConfirmar={confirmarLote}
        />
      </div>
    </TooltipProvider>
  )
}
