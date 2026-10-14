import { CertificacionesConfiguracionDto } from './certificaciones-configuracion.dto';
import { ColumnasConfiguracionDto } from './columnas-configuracion.dto';
import { ContactoConfiguracionDto } from './contacto-configuracion.dto';
import { GaleriaConfiguracionDto } from './galeria-configuracion.dto';
import { HeroConfiguracionDto } from './hero-configuracion.dto';
import { InsigniasConfiguracionDto } from './insignias-configuracion.dto';
import { LogrosConfiguracionDto } from './logros-configuracion.dto';
import { NavegacionConfiguracionDto } from './navegacion-configuracion.dto';
import { ProyectosConfiguracionDto } from './proyectos-configuracion.dto';
import { SkillsConfiguracionDto } from './skills-configuracion.dto';
import { SobreMiConfiguracionDto } from './sobre-mi-configuracion.dto';

export {
  CertificacionesConfiguracionDto,
  ColumnasConfiguracionDto,
  ContactoConfiguracionDto,
  GaleriaConfiguracionDto,
  HeroConfiguracionDto,
  InsigniasConfiguracionDto,
  LogrosConfiguracionDto,
  NavegacionConfiguracionDto,
  ProyectosConfiguracionDto,
  SkillsConfiguracionDto,
  SobreMiConfiguracionDto,
};

/**
 * Los 11 tipos de bloque del editor visual (UC-07), decididos en
 * docs/plan-tecnico.md sección 5 (`skills` agregado en Sprint 8, UC-16;
 * `navegacion` agregado en Fase 7, 7.2: barra de navegación del sitio,
 * nunca dentro de `columnas`; `columnas` agregado en Fase 3.3, UC-17 — contenedor de layout
 * multi-columna, ver `docs/plan-portafolio.md` §4; `insignias` agregado en Fase 7d, UC-35; `galeria` agregado en
 * Fase 4.5, UC-18 — bloque de galería de fotos, reusa el patrón jsonb de
 * `columnas` sin tabla propia). `Seccion.tipo_seccion` solo puede ser uno de
 * estos valores.
 */
export const TIPOS_SECCION = [
  'hero',
  'sobre-mi',
  'proyectos',
  'certificaciones',
  'logros',
  'contacto',
  'skills',
  'columnas',
  'galeria',
  'navegacion',
  'insignias',
] as const;

export type TipoSeccion = (typeof TIPOS_SECCION)[number];

/**
 * Un DTO de validación distinto por `tipo_seccion`: la forma de
 * `Seccion.configuracion` varía según el bloque, así que nunca se acepta
 * como JSON libre (ver `SeccionesService.validarConfiguracion`).
 */
export const CONFIGURACION_DTO_POR_TIPO: Record<TipoSeccion, new () => object> =
  {
    hero: HeroConfiguracionDto,
    'sobre-mi': SobreMiConfiguracionDto,
    proyectos: ProyectosConfiguracionDto,
    certificaciones: CertificacionesConfiguracionDto,
    logros: LogrosConfiguracionDto,
    contacto: ContactoConfiguracionDto,
    skills: SkillsConfiguracionDto,
    columnas: ColumnasConfiguracionDto,
    galeria: GaleriaConfiguracionDto,
    navegacion: NavegacionConfiguracionDto,
    insignias: InsigniasConfiguracionDto,
  };
