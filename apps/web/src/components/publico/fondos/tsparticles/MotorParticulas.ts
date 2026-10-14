import { tsParticles, type Engine } from '@tsparticles/engine'
import { loadSlim } from '@tsparticles/slim'

/**
 * Motor compartido de tsparticles (Fase 7c, UC-15). Una sola carga de
 * `loadSlim` por página (promesa a nivel de módulo): la galería con seis
 * miniaturas, la vista previa y el fondo del sitio reutilizan el mismo motor.
 * Si la carga falla, la promesa se descarta para permitir reintentar.
 */
let promesaMotor: Promise<Engine> | null = null

export function motorParticulasListo(): Promise<Engine> {
  promesaMotor ??= loadSlim(tsParticles)
    .then(() => tsParticles)
    .catch((error: unknown) => {
      promesaMotor = null
      throw error
    })
  return promesaMotor
}
