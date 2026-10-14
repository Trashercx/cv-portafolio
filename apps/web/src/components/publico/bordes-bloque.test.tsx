import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CertificacionPublica } from '@/features/publico/types'
import type { Logro } from '@/features/logros/types'
import type { Proyecto } from '@/features/proyectos/types'
import type { Skill } from '@/features/skills/types'
import type { BordeBloqueBloque } from '@/features/secciones/types'
import {
  BORDE_BLOQUE_VARIABLES,
  CLASES_BORDE_BLOQUE,
  CLASES_BORDE_CHIP_CONTORNO,
  CLASES_BORDE_VIDRIO_BLOQUE,
} from '@/lib/escalas-bloque'
import { BloqueCertificaciones } from './bloques/BloqueCertificaciones'
import { BloqueContacto } from './bloques/BloqueContacto'
import { BloqueLogros } from './bloques/BloqueLogros'
import { BloqueProyectos } from './bloques/BloqueProyectos'
import { BloqueSkills } from './bloques/BloqueSkills'
import { EnvoltorioSeccion } from './EnvoltorioSeccion'
import { ProveedorDetallePublico } from './contexto-detalle'

/**
 * Fase 7c (UC-12): contornos opcionales. `EnvoltorioSeccion` fija
 * `--ancho-borde`/`--color-borde` según `borde_bloque` y las tarjetas de cada
 * bloque leen esas variables con `CLASES_BORDE_BLOQUE`. Un snapshot anterior
 * a la fase (sin el campo) se ve como `sutil`.
 */

const PROYECTO: Proyecto = {
  id: 'proyecto-1',
  usuario_admin_id: 'admin-1',
  titulo: 'Portafolio personal',
  descripcion: 'Sitio de portafolio personal',
  url_demo: null,
  url_repositorio: null,
  fecha_inicio: '2025-01-01',
  fecha_fin: null,
  estado: 'en_progreso',
  destacado: true,
  orden: 0,
  tecnologias: [],
  imagenes: [],
}

const CERTIFICACION: CertificacionPublica = {
  id: 'cert-1',
  usuario_admin_id: 'admin-1',
  nombre: 'AWS Certified Cloud Practitioner',
  institucion: 'Amazon Web Services',
  fecha_emision: '2025-01-01',
  fecha_expiracion: null,
  url_verificacion: 'https://verify.example.com/cert-1',
  credencial_id: null,
  logo_media_id: null,
  orden: 0,
  logo: null,
}

const LOGRO: Logro = {
  id: 'logro-1',
  usuario_admin_id: 'admin-1',
  titulo: 'Certificación AWS',
  descripcion: 'Obtuve la certificación',
  fecha: '2025-01-01',
  categoria: 'certificacion',
  url_referencia: null,
  orden: 0,
}

const SKILLS: Skill[] = [
  { id: 'skill-1', usuario_admin_id: 'admin-1', nombre: 'React', icono: 'react', orden: 0, visible: true },
]

function seccion(borde?: BordeBloqueBloque) {
  render(
    <EnvoltorioSeccion visible id="b" borde_bloque={borde}>
      <p>Contenido</p>
    </EnvoltorioSeccion>,
  )
  return document.getElementById('seccion-b') as HTMLElement
}

describe('EnvoltorioSeccion: variables del contorno (Fase 7c)', () => {
  it.each([
    ['ninguno', '0px', 'transparent'],
    ['sutil', '1px', 'var(--border)'],
    ['marcado', '2px', 'color-mix(in oklab, var(--color-primario) 60%, transparent)'],
  ] as const)('borde_bloque="%s" fija --ancho-borde=%s y --color-borde', (valor, ancho, color) => {
    const el = seccion(valor)
    expect(el.style.getPropertyValue('--ancho-borde')).toBe(ancho)
    expect(el.style.getPropertyValue('--color-borde')).toBe(color)
  })

  it('sin el campo (snapshot anterior a la fase) equivale a "sutil"', () => {
    const el = seccion(undefined)
    expect(el.style.getPropertyValue('--ancho-borde')).toBe(BORDE_BLOQUE_VARIABLES.sutil['--ancho-borde'])
    expect(el.style.getPropertyValue('--color-borde')).toBe(BORDE_BLOQUE_VARIABLES.sutil['--color-borde'])
  })

  it('las clases del contorno leen las variables con "sutil" como respaldo', () => {
    expect(CLASES_BORDE_BLOQUE).toBe(
      'border-[length:var(--ancho-borde,1px)] border-[color:var(--color-borde,var(--border))]',
    )
  })

  it('fondo_bloque tarjeta y vidrio usan el contorno variable (no un borde fijo)', () => {
    for (const fondo of ['tarjeta', 'vidrio'] as const) {
      const { unmount } = render(
        <EnvoltorioSeccion visible id={`f-${fondo}`} fondo_bloque={fondo}>
          <p>Contenido</p>
        </EnvoltorioSeccion>,
      )
      const el = document.getElementById(`seccion-f-${fondo}`) as HTMLElement
      expect(el).toHaveClass(fondo === 'vidrio' ? CLASES_BORDE_VIDRIO_BLOQUE : CLASES_BORDE_BLOQUE)
      unmount()
    }
  })

  it('el separador inferior sigue siendo independiente del contorno', () => {
    const el = seccion('ninguno')
    expect(el).toHaveClass('border-b')
  })
})

describe('tarjetas de los bloques: usan CLASES_BORDE_BLOQUE (Fase 7c)', () => {
  it('proyectos: tarjeta simple, con sombra y vidrio', () => {
    for (const estilo of ['simple', 'con_sombra', 'vidrio'] as const) {
      const { unmount } = render(
        <ProveedorDetallePublico>
          <BloqueProyectos
            titulo="Proyectos"
            config={{ cantidad_a_mostrar: 3, solo_destacados: false, estilo_tarjeta: estilo }}
            proyectos={[PROYECTO]}
          />
        </ProveedorDetallePublico>,
      )
      expect(screen.getByRole('button', { name: 'Portafolio personal' })).toHaveClass(
        estilo === 'vidrio' ? CLASES_BORDE_VIDRIO_BLOQUE : CLASES_BORDE_BLOQUE,
      )
      unmount()
    }
  })

  it('certificaciones: tarjeta simple, con sombra y vidrio', () => {
    for (const estilo of ['simple', 'con_sombra', 'vidrio'] as const) {
      const { container, unmount } = render(
        <ProveedorDetallePublico>
          <BloqueCertificaciones
            titulo="Certificaciones"
            config={{ orden: 'fecha', estilo_tarjeta: estilo }}
            certificaciones={[CERTIFICACION]}
          />
        </ProveedorDetallePublico>,
      )
      expect(container.querySelector(`button.${CSS.escape('border-[length:var(--ancho-borde,1px)]')}`)).not.toBeNull()
      unmount()
    }
  })

  it('skills: chips vidrio y contorno', () => {
    for (const estilo of ['vidrio', 'contorno'] as const) {
      const { container, unmount } = render(
        <BloqueSkills
          titulo="Skills"
          config={{ direccion: 'izquierda', velocidad: 'media', disposicion: 'cuadricula', estilo_chip: estilo }}
          skills={SKILLS}
        />,
      )
      expect(container.querySelector(`[data-chip-skill="${estilo}"]`)).toHaveClass(
        estilo === 'vidrio' ? CLASES_BORDE_VIDRIO_BLOQUE : CLASES_BORDE_CHIP_CONTORNO,
      )
      unmount()
    }
  })

  it('skills: el chip contorno usa grosor x2 y color primario (60 %)', () => {
    expect(CLASES_BORDE_CHIP_CONTORNO).toContain('calc(var(--ancho-borde,1px)*2)')
    expect(CLASES_BORDE_CHIP_CONTORNO).toContain('var(--color-primario)_60%')
  })

  it('vidrio: color del contorno al 50 %', () => {
    expect(CLASES_BORDE_VIDRIO_BLOQUE).toContain('var(--color-borde,var(--border))_50%')
  })

  it('skills: el chip simple no lleva contorno', () => {
    const { container } = render(
      <BloqueSkills titulo="Skills" config={{ direccion: 'izquierda', velocidad: 'media', disposicion: 'cuadricula', estilo_chip: 'simple' }} skills={SKILLS} />,
    )
    expect(container.querySelector('[data-chip-skill="simple"]')).not.toHaveClass(CLASES_BORDE_BLOQUE)
  })

  it('logros: tarjeta por ítem', () => {
    const { container } = render(<BloqueLogros titulo="Logros" config={{}} logros={[LOGRO]} />)
    expect(container.querySelector('li > div')).toHaveClass(CLASES_BORDE_BLOQUE)
  })

  it('contacto: tarjeta destacada', () => {
    const { container } = render(
      <BloqueContacto
        titulo="Contacto"
        config={{ mostrar_formulario: false, estilo: 'tarjeta_destacada' }}
        perfil={null}
        redesSociales={[]}
      />,
    )
    expect(container.querySelector('[data-estilo-contacto="tarjeta_destacada"]')).toHaveClass(CLASES_BORDE_BLOQUE)
  })
})
