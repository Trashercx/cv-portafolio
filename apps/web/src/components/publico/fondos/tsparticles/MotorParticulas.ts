import { loadSlim } from '@tsparticles/slim'
import type { ParticlesPluginRegistrar } from '@tsparticles/react'

/**
 * Registro del motor de tsparticles (Fase 7c, UC-15). La versión 4 del
 * wrapper de React ya no expone `initParticlesEngine`: el motor se inicializa
 * con `<ParticlesProvider init={...}>`, que guarda una única promesa a nivel
 * de módulo y la comparte entre todas las instancias (galería con seis
 * miniaturas + vista previa + fondo del sitio = una sola carga de `loadSlim`).
 * El callback debe ser estable (por eso vive aquí, a nivel de módulo): el
 * proveedor lanza un error si cambia entre renders.
 */
export const registrarMotorParticulas: ParticlesPluginRegistrar = async (engine) => {
  await loadSlim(engine)
}
