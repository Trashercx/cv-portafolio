import { useEffect, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEditorPanelStore, type PestanaPanel } from '@/store/editor-panel-store'
import { PanelBloqueSeleccionado } from './PanelBloqueSeleccionado'
import { PanelFondoEditor } from './PanelFondoEditor'
import { PanelTemaEditor } from './PanelTemaEditor'
import { usePuckEditor } from './usePuckEditor'

/**
 * Panel lateral derecho persistente del editor unificado (Fase 5): 3
 * pestañas (Bloque seleccionado / Tema / Fondo) que reemplazan las 3
 * pantallas separadas de antes (`/admin/editor`, `/admin/tema`,
 * `/admin/fondo`). La pestaña activa vive en `useEditorPanelStore`
 * (Zustand), no acá — así `EditorSeccionesPage` puede fijarla desde el query
 * param `?panel=` al montar sin necesitar levantar más estado.
 *
 * Cambiar a "Bloque" cuando el admin selecciona un bloque en el lienzo:
 * SOLO en la transición sin-selección → selección concreta (comparado con
 * el `id` anterior vía `ref`, no con el `state` de Zustand) — nunca en
 * sentido contrario. Si el admin está mirando Tema/Fondo y deselecciona un
 * bloque (p. ej. hace click fuera del lienzo), no lo saca de esa pestaña.
 * Tampoco fuerza la pestaña si ya había un bloque seleccionado y el admin
 * selecciona uno distinto (esa transición no está cubierta por el criterio
 * "sin-selección → selección concreta").
 *
 * El valor inicial del `ref` se toma del propio `idSeleccionado` en el
 * primer render (no `false` a secas): si el panel se monta con un bloque ya
 * seleccionado (poco común en la práctica, pero posible), eso no debe
 * contarse como una transición y forzar la pestaña "Bloque" — el efecto solo
 * debe reaccionar a cambios posteriores al montaje.
 */
export function PanelLateralEditor() {
  const pestanaActiva = useEditorPanelStore((state) => state.pestanaActiva)
  const setPestanaActiva = useEditorPanelStore((state) => state.setPestanaActiva)
  const idSeleccionado = usePuckEditor((state) => state.selectedItem?.props.id)
  const habiaSeleccionPrevia = useRef(Boolean(idSeleccionado))

  useEffect(() => {
    if (idSeleccionado && !habiaSeleccionPrevia.current) {
      setPestanaActiva('bloque')
    }
    habiaSeleccionPrevia.current = Boolean(idSeleccionado)
  }, [idSeleccionado, setPestanaActiva])

  return (
    <Tabs
      value={pestanaActiva}
      onValueChange={(value) => setPestanaActiva(value as PestanaPanel)}
      className="h-full gap-0"
    >
      <TabsList className="m-2">
        <TabsTrigger value="bloque">Bloque</TabsTrigger>
        <TabsTrigger value="tema">Tema</TabsTrigger>
        <TabsTrigger value="fondo">Fondo</TabsTrigger>
      </TabsList>
      <TabsContent value="bloque" className="overflow-y-auto">
        <PanelBloqueSeleccionado />
      </TabsContent>
      <TabsContent value="tema" className="overflow-y-auto">
        <PanelTemaEditor />
      </TabsContent>
      <TabsContent value="fondo" className="overflow-y-auto">
        <PanelFondoEditor />
      </TabsContent>
    </Tabs>
  )
}
