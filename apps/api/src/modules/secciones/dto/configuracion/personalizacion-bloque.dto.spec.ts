import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CertificacionesConfiguracionDto } from './certificaciones-configuracion.dto';
import { ColumnasConfiguracionDto } from './columnas-configuracion.dto';
import { ContactoConfiguracionDto } from './contacto-configuracion.dto';
import { HeroConfiguracionDto } from './hero-configuracion.dto';
import { LogrosConfiguracionDto } from './logros-configuracion.dto';
import { ProyectosConfiguracionDto } from './proyectos-configuracion.dto';
import { SkillsConfiguracionDto } from './skills-configuracion.dto';
import { SobreMiConfiguracionDto } from './sobre-mi-configuracion.dto';

function validarConfiguracion<T extends object>(
  DtoClase: new () => T,
  configuracion: Record<string, unknown>,
) {
  const instancia = plainToInstance(DtoClase, configuracion);
  return validate(instancia as object, {
    whitelist: true,
    forbidNonWhitelisted: true,
  }).then((errores) => ({ errores, instancia }));
}

/** Los 5 campos base (Fase 3.4) que los 8 tipos de bloque heredan de `BloqueConfiguracionBaseDto`. */
const DEFAULTS_BASE = {
  espaciado_vertical: 'normal',
  ancho_contenido: 'normal',
  alineacion_texto: 'izquierda',
  fondo_bloque: 'ninguno',
  separador_inferior: true,
};

describe('Personalización por bloque (Fase 3.4, UC-07): campos base + propios nuevos', () => {
  describe('BloqueConfiguracionBaseDto heredado — un payload "viejo" sin ninguno de los 5 campos base sigue validando OK y toma los defaults', () => {
    const casos: Array<{
      nombre: string;
      DtoClase: new () => object;
      minimo: Record<string, unknown>;
      defaultsPropios: Record<string, unknown>;
    }> = [
      {
        nombre: 'hero',
        DtoClase: HeroConfiguracionDto,
        minimo: { titulo: 'Hola', subtitulo: 'Mundo' },
        defaultsPropios: {
          mostrar_foto_perfil: false,
          posicion_foto: 'ninguna',
          estilo_foto: 'con_marco',
          altura: 'normal',
          overlay_fondo: 'ninguno',
          tamano_titulo: 'normal',
        },
      },
      {
        nombre: 'sobre-mi',
        DtoClase: SobreMiConfiguracionDto,
        minimo: { mostrar_foto: true },
        defaultsPropios: { posicion_foto: 'izquierda', forma_foto: 'circular' },
      },
      {
        nombre: 'proyectos',
        DtoClase: ProyectosConfiguracionDto,
        minimo: { cantidad_a_mostrar: 6, solo_destacados: true },
        defaultsPropios: {
          columnas: 3,
          estilo_tarjeta: 'simple',
          mostrar_descripcion: true,
        },
      },
      {
        nombre: 'certificaciones',
        DtoClase: CertificacionesConfiguracionDto,
        minimo: { orden: 'fecha' },
        defaultsPropios: {
          columnas: 3,
          estilo_tarjeta: 'simple',
          mostrar_fecha: true,
        },
      },
      {
        nombre: 'logros',
        DtoClase: LogrosConfiguracionDto,
        minimo: {},
        defaultsPropios: { estilo_lista: 'tarjetas' },
      },
      {
        nombre: 'contacto',
        DtoClase: ContactoConfiguracionDto,
        minimo: { mostrar_formulario: false },
        defaultsPropios: { estilo_redes: 'iconos' },
      },
      {
        nombre: 'skills',
        DtoClase: SkillsConfiguracionDto,
        minimo: { direccion: 'izquierda', velocidad: 'media' },
        defaultsPropios: {
          tamano_icono: 'lg',
          mostrar_nombres: true,
          pausar_al_pasar: true,
        },
      },
      {
        nombre: 'columnas',
        DtoClase: ColumnasConfiguracionDto,
        minimo: {
          distribucion: '1-1',
          alineacion_vertical: 'inicio',
          espaciado: 'normal',
          columna_1: [],
          columna_2: [],
          columna_3: [],
        },
        defaultsPropios: {},
      },
    ];

    it.each(casos)(
      '$nombre: valida OK sin los campos nuevos y plainToInstance rellena todos los defaults documentados',
      async ({ DtoClase, minimo, defaultsPropios }) => {
        const { errores, instancia } = await validarConfiguracion(
          DtoClase,
          minimo,
        );

        expect(errores).toHaveLength(0);
        expect(instancia).toMatchObject({
          ...DEFAULTS_BASE,
          ...defaultsPropios,
        });
      },
    );
  });

  it('rechaza un espaciado_vertical fuera del catálogo (campo base, cualquier tipo de bloque sirve de ejemplo)', async () => {
    const { errores } = await validarConfiguracion(HeroConfiguracionDto, {
      titulo: 'Hola',
      subtitulo: 'Mundo',
      espaciado_vertical: 'gigante',
    });

    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza un ancho_contenido fuera del catálogo', async () => {
    const { errores } = await validarConfiguracion(SobreMiConfiguracionDto, {
      mostrar_foto: true,
      ancho_contenido: 'mediano',
    });

    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza una alineacion_texto fuera del catálogo', async () => {
    const { errores } = await validarConfiguracion(ContactoConfiguracionDto, {
      mostrar_formulario: true,
      alineacion_texto: 'derecha',
    });

    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza un fondo_bloque fuera del catálogo', async () => {
    const { errores } = await validarConfiguracion(LogrosConfiguracionDto, {
      fondo_bloque: 'llamativo',
    });

    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza un separador_inferior que no sea boolean', async () => {
    const { errores } = await validarConfiguracion(ColumnasConfiguracionDto, {
      distribucion: '1-1',
      alineacion_vertical: 'inicio',
      espaciado: 'normal',
      columna_1: [],
      columna_2: [],
      columna_3: [],
      separador_inferior: 'si',
    });

    expect(errores.length).toBeGreaterThan(0);
  });

  describe('campos propios nuevos por tipo de bloque: valores fuera de catálogo se rechazan', () => {
    it('hero: altura fuera de catálogo', async () => {
      const { errores } = await validarConfiguracion(HeroConfiguracionDto, {
        titulo: 'Hola',
        subtitulo: 'Mundo',
        altura: 'enorme',
      });
      expect(errores.length).toBeGreaterThan(0);
    });

    it('hero: overlay_fondo fuera de catálogo', async () => {
      const { errores } = await validarConfiguracion(HeroConfiguracionDto, {
        titulo: 'Hola',
        subtitulo: 'Mundo',
        overlay_fondo: 'azul',
      });
      expect(errores.length).toBeGreaterThan(0);
    });

    it('hero: tamano_titulo fuera de catálogo', async () => {
      const { errores } = await validarConfiguracion(HeroConfiguracionDto, {
        titulo: 'Hola',
        subtitulo: 'Mundo',
        tamano_titulo: 'gigante',
      });
      expect(errores.length).toBeGreaterThan(0);
    });

    it('sobre-mi: posicion_foto fuera de catálogo', async () => {
      const { errores } = await validarConfiguracion(SobreMiConfiguracionDto, {
        mostrar_foto: true,
        posicion_foto: 'centro',
      });
      expect(errores.length).toBeGreaterThan(0);
    });

    it('sobre-mi: forma_foto fuera de catálogo', async () => {
      const { errores } = await validarConfiguracion(SobreMiConfiguracionDto, {
        mostrar_foto: true,
        forma_foto: 'ovalada',
      });
      expect(errores.length).toBeGreaterThan(0);
    });

    it('proyectos: columnas fuera de catálogo (solo 2 o 3)', async () => {
      const { errores } = await validarConfiguracion(
        ProyectosConfiguracionDto,
        {
          cantidad_a_mostrar: 6,
          solo_destacados: true,
          columnas: 4,
        },
      );
      expect(errores.length).toBeGreaterThan(0);
    });

    it('proyectos: estilo_tarjeta fuera de catálogo', async () => {
      const { errores } = await validarConfiguracion(
        ProyectosConfiguracionDto,
        {
          cantidad_a_mostrar: 6,
          solo_destacados: true,
          estilo_tarjeta: 'neon',
        },
      );
      expect(errores.length).toBeGreaterThan(0);
    });

    it('certificaciones: columnas fuera de catálogo (solo 2 o 3)', async () => {
      const { errores } = await validarConfiguracion(
        CertificacionesConfiguracionDto,
        { orden: 'fecha', columnas: 5 },
      );
      expect(errores.length).toBeGreaterThan(0);
    });

    it('logros: estilo_lista fuera de catálogo', async () => {
      const { errores } = await validarConfiguracion(LogrosConfiguracionDto, {
        estilo_lista: 'grilla',
      });
      expect(errores.length).toBeGreaterThan(0);
    });

    it('contacto: estilo_redes fuera de catálogo', async () => {
      const { errores } = await validarConfiguracion(ContactoConfiguracionDto, {
        mostrar_formulario: true,
        estilo_redes: 'texto',
      });
      expect(errores.length).toBeGreaterThan(0);
    });

    it('skills: tamano_icono fuera de catálogo', async () => {
      const { errores } = await validarConfiguracion(SkillsConfiguracionDto, {
        direccion: 'izquierda',
        velocidad: 'media',
        tamano_icono: 'xl',
      });
      expect(errores.length).toBeGreaterThan(0);
    });
  });
});
