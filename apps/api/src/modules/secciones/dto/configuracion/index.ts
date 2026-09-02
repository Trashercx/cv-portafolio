import { CertificacionesConfiguracionDto } from './certificaciones-configuracion.dto';
import { ContactoConfiguracionDto } from './contacto-configuracion.dto';
import { HeroConfiguracionDto } from './hero-configuracion.dto';
import { LogrosConfiguracionDto } from './logros-configuracion.dto';
import { ProyectosConfiguracionDto } from './proyectos-configuracion.dto';
import { SkillsConfiguracionDto } from './skills-configuracion.dto';
import { SobreMiConfiguracionDto } from './sobre-mi-configuracion.dto';

export {
  CertificacionesConfiguracionDto,
  ContactoConfiguracionDto,
  HeroConfiguracionDto,
  LogrosConfiguracionDto,
  ProyectosConfiguracionDto,
  SkillsConfiguracionDto,
  SobreMiConfiguracionDto,
};

/**
 * Los 7 tipos de bloque del editor visual (UC-07), decididos en
 * docs/plan-tecnico.md sección 5 (`skills` agregado en Sprint 8, UC-16).
 * `Seccion.tipo_seccion` solo puede ser uno de estos valores.
 */
export const TIPOS_SECCION = [
  'hero',
  'sobre-mi',
  'proyectos',
  'certificaciones',
  'logros',
  'contacto',
  'skills',
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
  };
