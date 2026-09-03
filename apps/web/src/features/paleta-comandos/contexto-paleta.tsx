import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * Un comando que una página del panel admin registra mientras está montada
 * (p. ej. "Nuevo proyecto" en `ProyectosListPage`). `grupo` es opcional:
 * `PaletaComandos` los agrupa todos bajo "Página actual" sin importar su
 * valor — se deja disponible por si en el futuro hace falta subagrupar.
 */
export type ComandoContextual = {
  id: string
  etiqueta: string
  accion: () => void
  grupo?: string
}

type ContextoPaletaValue = {
  comandos: ComandoContextual[]
  registrarComandos: (comandos: ComandoContextual[]) => void
  desregistrarComandos: (ids: string[]) => void
}

const ContextoPaleta = createContext<ContextoPaletaValue | null>(null)

/**
 * Comandos contextuales activos, agrupados en un `Record<id, ComandoContextual>`
 * (no un array plano) para que registrar/desregistrar por `id` sea idempotente
 * y no dependa de la identidad de referencia de cada objeto — deliberadamente
 * SIN Zustand: es estado de UI puramente transitorio y local al árbol del
 * panel admin (nunca se lee fuera de `<ProveedorPaletaComandos>`), así que un
 * `useState` + Context alcanza y evita crear un store global para algo que
 * vive y muere con el ciclo de montaje de cada página.
 */
export function ProveedorPaletaComandos({ children }: { children: ReactNode }) {
  const [registro, setRegistro] = useState<Record<string, ComandoContextual>>({})

  const registrarComandos = useCallback((comandos: ComandoContextual[]) => {
    setRegistro((actual) => {
      const siguiente = { ...actual }
      for (const comando of comandos) {
        siguiente[comando.id] = comando
      }
      return siguiente
    })
  }, [])

  const desregistrarComandos = useCallback((ids: string[]) => {
    setRegistro((actual) => {
      const siguiente = { ...actual }
      for (const id of ids) {
        delete siguiente[id]
      }
      return siguiente
    })
  }, [])

  const comandos = useMemo(() => Object.values(registro), [registro])

  const value = useMemo(
    () => ({ comandos, registrarComandos, desregistrarComandos }),
    [comandos, registrarComandos, desregistrarComandos],
  )

  return (
    <ContextoPaleta.Provider value={value}>{children}</ContextoPaleta.Provider>
  )
}

function useContextoPaleta() {
  const context = useContext(ContextoPaleta)
  if (!context) {
    throw new Error(
      'useContextoPaleta debe usarse dentro de <ProveedorPaletaComandos>.',
    )
  }
  return context
}

/**
 * Hook que las páginas del panel llaman con sus propios comandos (p. ej.
 * `useComandosContextuales([{ id: 'nuevo-proyecto', etiqueta: 'Nuevo
 * proyecto', accion: () => setDialogoAbierto(true) }])`). Registra al montar
 * y desregistra al desmontar, para que al navegar a otra página esos
 * comandos desaparezcan de la paleta.
 *
 * No se pasa `comandos` directo como dependencia del `useEffect` (un array
 * literal nuevo en cada render de la página disparía el efecto en cada
 * render): se serializa a los `id` involucrados, que es lo único que le
 * importa a este hook para decidir si debe volver a registrar.
 */
export function useComandosContextuales(comandos: ComandoContextual[]) {
  const { registrarComandos, desregistrarComandos } = useContextoPaleta()
  const ids = comandos.map((comando) => comando.id).join('|')

  useEffect(() => {
    registrarComandos(comandos)
    return () => {
      desregistrarComandos(comandos.map((comando) => comando.id))
    }
    // Deliberadamente NO se depende de `comandos` (la referencia de array
    // cambia en cada render de la página que llama a este hook): `ids`
    // (los `id` involucrados, unidos) es la única señal real de que hace
    // falta volver a registrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, registrarComandos, desregistrarComandos])
}

/** Usado por `PaletaComandos` para leer los comandos contextuales activos. */
export function useComandosActivos() {
  return useContextoPaleta().comandos
}
