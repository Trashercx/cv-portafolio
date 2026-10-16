import { plainToInstance } from 'class-transformer';
import { CertificacionesConfiguracionDto } from './certificaciones-configuracion.dto';
import { ColumnasConfiguracionDto } from './columnas-configuracion.dto';
import { ContactoConfiguracionDto } from './contacto-configuracion.dto';
import { GaleriaConfiguracionDto } from './galeria-configuracion.dto';
import { HeroConfiguracionDto } from './hero-configuracion.dto';
import { TIPOS_SECCION } from './index';
import { LogrosConfiguracionDto } from './logros-configuracion.dto';
import { NavegacionConfiguracionDto } from './navegacion-configuracion.dto';
import { ProyectosConfiguracionDto } from './proyectos-configuracion.dto';
import { SkillsConfiguracionDto } from './skills-configuracion.dto';
import { SobreMiConfiguracionDto } from './sobre-mi-configuracion.dto';
import { obtenerErroresConfiguracion } from './validar-configuracion';

/**
 * Contrato de bloques de la Fase 7 (7.2, UC-07/UC-12): campos nuevos de la
 * base y de cada bloque, y el tipo `navegacion`. Se valida con
 * `obtenerErroresConfiguracion` (whitelist + forbidNonWhitelisted, la misma
 * ruta que usa `SeccionesService`).
 */
const HERO_MIN = { titulo: 'Hola', subtitulo: 'Mundo' };

const CASOS_MINIMOS = {
  hero: HERO_MIN,
  'sobre-mi': { mostrar_foto: true },
  proyectos: { cantidad_a_mostrar: 6, solo_destacados: true },
  certificaciones: { orden: 'fecha' },
  logros: {},
  contacto: { mostrar_formulario: false },
  skills: { direccion: 'izquierda', velocidad: 'media' },
  galeria: {},
  navegacion: {},
} as const;

type TipoConMinimo = keyof typeof CASOS_MINIMOS;

describe('Contrato de bloques Fase 7 (7.2)', () => {
  describe('campos base: animacion_entrada, separador_forma, fondo_bloque ampliado', () => {
    it.each(Object.keys(CASOS_MINIMOS) as TipoConMinimo[])(
      '%s: un payload viejo toma animacion_entrada="aparecer" y separador_forma="ninguno"',
      async (tipo) => {
        const minimo = CASOS_MINIMOS[tipo];
        expect(await obtenerErroresConfiguracion(tipo, minimo)).toEqual([]);
        const dtos: Record<TipoConMinimo, new () => object> = {
          hero: HeroConfiguracionDto,
          'sobre-mi': SobreMiConfiguracionDto,
          proyectos: ProyectosConfiguracionDto,
          certificaciones: CertificacionesConfiguracionDto,
          logros: LogrosConfiguracionDto,
          contacto: ContactoConfiguracionDto,
          skills: SkillsConfiguracionDto,
          galeria: GaleriaConfiguracionDto,
          navegacion: NavegacionConfiguracionDto,
        };
        const Dto = dtos[tipo];
        expect(plainToInstance(Dto, minimo)).toMatchObject({
          animacion_entrada: 'aparecer',
          separador_forma: 'ninguno',
        });
      },
    );

    it.each([
      'ninguna',
      'aparecer',
      'deslizar_arriba',
      'deslizar_lateral',
      'escalar',
    ])('acepta animacion_entrada="%s"', async (valor) => {
      expect(
        await obtenerErroresConfiguracion('hero', {
          ...HERO_MIN,
          animacion_entrada: valor,
        }),
      ).toEqual([]);
    });

    it.each(['ninguno', 'onda', 'diagonal', 'curva'])(
      'acepta separador_forma="%s"',
      async (valor) => {
        expect(
          await obtenerErroresConfiguracion('logros', {
            separador_forma: valor,
          }),
        ).toEqual([]);
      },
    );

    it.each(['degradado', 'vidrio'])(
      'acepta fondo_bloque="%s"',
      async (valor) => {
        expect(
          await obtenerErroresConfiguracion('logros', { fondo_bloque: valor }),
        ).toEqual([]);
      },
    );

    it('rechaza animacion_entrada, separador_forma y fondo_bloque fuera del catálogo', async () => {
      for (const campo of [
        { animacion_entrada: 'rebotar' },
        { separador_forma: 'zigzag' },
        { fondo_bloque: 'neon' },
      ]) {
        expect(
          (await obtenerErroresConfiguracion('logros', campo)).length,
        ).toBeGreaterThan(0);
      }
    });

    it('rechaza un campo desconocido (whitelist)', async () => {
      expect(
        (await obtenerErroresConfiguracion('logros', { inventado: 1 })).length,
      ).toBeGreaterThan(0);
    });
  });

  describe('enums por bloque: un valor válido pasa y uno fuera de catálogo se rechaza', () => {
    const casos: Array<[TipoConMinimo, string, string, string]> = [
      ['hero', 'disposicion', 'editorial', 'mosaico'],
      ['hero', 'efecto_titulo', 'resaltado', 'neon'],
      ['hero', 'decoracion_fondo', 'cuadricula', 'estrellas'],
      ['sobre-mi', 'estilo_foto', 'flotante', 'polaroid'],
      ['proyectos', 'disposicion', 'bento', 'masonry'],
      ['proyectos', 'estilo_tarjeta', 'vidrio', 'neon'],
      ['proyectos', 'efecto_hover', 'inclinar', 'girar'],
      ['certificaciones', 'efecto_hover', 'elevar', 'saltar'],
      ['logros', 'efecto_hover', 'ninguno', 'saltar'],
      ['skills', 'disposicion', 'nube', 'espiral'],
      ['skills', 'estilo_chip', 'contorno', 'neon'],
      ['contacto', 'estilo', 'tarjeta_destacada', 'gigante'],
      ['galeria', 'efecto_hover', 'zoom', 'rebotar'],
      ['navegacion', 'estilo', 'barra', 'lateral'],
    ];

    it.each(casos)('%s.%s', async (tipo, campo, valido, invalido) => {
      const minimo = CASOS_MINIMOS[tipo];
      expect(
        await obtenerErroresConfiguracion(tipo, { ...minimo, [campo]: valido }),
      ).toEqual([]);
      expect(
        (
          await obtenerErroresConfiguracion(tipo, {
            ...minimo,
            [campo]: invalido,
          })
        ).length,
      ).toBeGreaterThan(0);
    });

    it('proyectos.mostrar_tecnologias, hero.mostrar_redes y mostrar_indicador_scroll deben ser boolean', async () => {
      expect(
        (
          await obtenerErroresConfiguracion('proyectos', {
            ...CASOS_MINIMOS.proyectos,
            mostrar_tecnologias: 'si',
          })
        ).length,
      ).toBeGreaterThan(0);
      expect(
        await obtenerErroresConfiguracion('hero', {
          ...HERO_MIN,
          mostrar_redes: true,
          mostrar_indicador_scroll: true,
        }),
      ).toEqual([]);
    });

    it('defaults propios documentados', () => {
      expect(plainToInstance(HeroConfiguracionDto, HERO_MIN)).toMatchObject({
        disposicion: 'centrado',
        mostrar_redes: false,
        mostrar_indicador_scroll: false,
        efecto_titulo: 'ninguno',
        decoracion_fondo: 'ninguna',
      });
      expect(
        plainToInstance(SobreMiConfiguracionDto, { mostrar_foto: true }),
      ).toMatchObject({ estilo_foto: 'simple' });
      expect(
        plainToInstance(ProyectosConfiguracionDto, CASOS_MINIMOS.proyectos),
      ).toMatchObject({
        disposicion: 'tarjetas',
        efecto_hover: 'elevar',
        mostrar_tecnologias: true,
      });
      expect(
        plainToInstance(CertificacionesConfiguracionDto, {}),
      ).toMatchObject({ efecto_hover: 'elevar' });
      expect(plainToInstance(LogrosConfiguracionDto, {})).toMatchObject({
        efecto_hover: 'elevar',
      });
      expect(plainToInstance(SkillsConfiguracionDto, {})).toMatchObject({
        disposicion: 'marquesina',
        estilo_chip: 'simple',
      });
      expect(plainToInstance(ContactoConfiguracionDto, {})).toMatchObject({
        estilo: 'simple',
      });
      expect(plainToInstance(GaleriaConfiguracionDto, {})).toMatchObject({
        efecto_hover: 'zoom',
      });
    });
  });

  describe('hero: titulos_rotativos, botón secundario', () => {
    it('acepta 0 a 6 títulos de 1 a 60 caracteres', async () => {
      for (const n of [0, 1, 6]) {
        expect(
          await obtenerErroresConfiguracion('hero', {
            ...HERO_MIN,
            titulos_rotativos: Array.from({ length: n }, (_, i) => `T${i}`),
          }),
        ).toEqual([]);
      }
      expect(
        await obtenerErroresConfiguracion('hero', {
          ...HERO_MIN,
          titulos_rotativos: ['x'.repeat(60)],
        }),
      ).toEqual([]);
    });

    it('rechaza 7 títulos, uno vacío, uno de 61 caracteres o uno no string', async () => {
      for (const titulos_rotativos of [
        Array.from({ length: 7 }, (_, i) => `T${i}`),
        ['ok', ''],
        ['x'.repeat(61)],
        [123],
        'no es array',
      ]) {
        expect(
          (
            await obtenerErroresConfiguracion('hero', {
              ...HERO_MIN,
              titulos_rotativos,
            })
          ).length,
        ).toBeGreaterThan(0);
      }
    });

    it('texto_boton_secundario admite hasta 40 caracteres', async () => {
      expect(
        await obtenerErroresConfiguracion('hero', {
          ...HERO_MIN,
          texto_boton_secundario: 'x'.repeat(40),
        }),
      ).toEqual([]);
      expect(
        (
          await obtenerErroresConfiguracion('hero', {
            ...HERO_MIN,
            texto_boton_secundario: 'x'.repeat(41),
          })
        ).length,
      ).toBeGreaterThan(0);
    });

    it.each([
      'https://ejemplo.com/cv',
      'http://a.co',
      '/proyectos',
      '#contacto',
    ])('enlace_boton_secundario acepta "%s"', async (enlace) => {
      expect(
        await obtenerErroresConfiguracion('hero', {
          ...HERO_MIN,
          enlace_boton_secundario: enlace,
        }),
      ).toEqual([]);
    });

    it.each([
      'javascript:alert(1)',
      'ftp://x.com',
      'ejemplo.com',
      '//evil.com',
      '',
    ])('enlace_boton_secundario rechaza "%s"', async (enlace) => {
      expect(
        (
          await obtenerErroresConfiguracion('hero', {
            ...HERO_MIN,
            enlace_boton_secundario: enlace,
          })
        ).length,
      ).toBeGreaterThan(0);
    });
  });

  describe('sobre-mi: estadisticas', () => {
    const base = { mostrar_foto: true };

    it('acepta 0 a 4 estadísticas válidas', async () => {
      expect(
        await obtenerErroresConfiguracion('sobre-mi', {
          ...base,
          estadisticas: [
            { etiqueta: 'Años de experiencia', valor: '5+' },
            { etiqueta: 'x'.repeat(30), valor: 'y'.repeat(12) },
          ],
        }),
      ).toEqual([]);
      expect(
        await obtenerErroresConfiguracion('sobre-mi', {
          ...base,
          estadisticas: [],
        }),
      ).toEqual([]);
    });

    it('rechaza 5 estadísticas', async () => {
      const estadisticas = Array.from({ length: 5 }, () => ({
        etiqueta: 'a',
        valor: '1',
      }));
      expect(
        (
          await obtenerErroresConfiguracion('sobre-mi', {
            ...base,
            estadisticas,
          })
        ).length,
      ).toBeGreaterThan(0);
    });

    it('rechaza un campo extra dentro de una estadística (whitelist anidada)', async () => {
      const errores = await obtenerErroresConfiguracion('sobre-mi', {
        ...base,
        estadisticas: [{ etiqueta: 'a', valor: '1', extra: true }],
      });
      expect(errores.length).toBeGreaterThan(0);
    });

    it('rechaza etiqueta vacía/larga y valor vacío/largo', async () => {
      for (const estadistica of [
        { etiqueta: '', valor: '1' },
        { etiqueta: 'x'.repeat(31), valor: '1' },
        { etiqueta: 'a', valor: '' },
        { etiqueta: 'a', valor: 'y'.repeat(13) },
        { etiqueta: 'a' },
      ]) {
        expect(
          (
            await obtenerErroresConfiguracion('sobre-mi', {
              ...base,
              estadisticas: [estadistica],
            })
          ).length,
        ).toBeGreaterThan(0);
      }
    });
  });

  describe('contacto.texto_llamada', () => {
    it('admite hasta 120 caracteres', async () => {
      expect(
        await obtenerErroresConfiguracion('contacto', {
          ...CASOS_MINIMOS.contacto,
          texto_llamada: 'x'.repeat(120),
        }),
      ).toEqual([]);
      expect(
        (
          await obtenerErroresConfiguracion('contacto', {
            ...CASOS_MINIMOS.contacto,
            texto_llamada: 'x'.repeat(121),
          })
        ).length,
      ).toBeGreaterThan(0);
    });
  });

  describe('navegacion (tipo nuevo)', () => {
    it('está en TIPOS_SECCION', () => {
      expect(TIPOS_SECCION).toContain('navegacion');
    });

    it('un payload vacío es válido y toma los defaults del plan', async () => {
      expect(await obtenerErroresConfiguracion('navegacion', {})).toEqual([]);
      expect(plainToInstance(NavegacionConfiguracionDto, {})).toMatchObject({
        estilo: 'flotante',
        fijo: true,
        mostrar_nombre: true,
        mostrar_cv: true,
        mostrar_toggle_modo: true,
        mostrar_progreso_scroll: false,
      });
    });

    it('acepta todos los campos con valores explícitos', async () => {
      expect(
        await obtenerErroresConfiguracion('navegacion', {
          estilo: 'barra',
          fijo: false,
          mostrar_nombre: false,
          mostrar_cv: false,
          mostrar_toggle_modo: false,
          mostrar_progreso_scroll: true,
        }),
      ).toEqual([]);
    });

    it('rechaza booleanos inválidos y campos desconocidos', async () => {
      expect(
        (await obtenerErroresConfiguracion('navegacion', { fijo: 'si' }))
          .length,
      ).toBeGreaterThan(0);
      expect(
        (await obtenerErroresConfiguracion('navegacion', { enlaces: [] }))
          .length,
      ).toBeGreaterThan(0);
    });

    it('se rechaza dentro de columnas (igual que hero)', async () => {
      const instancia = plainToInstance(ColumnasConfiguracionDto, {
        distribucion: '1-1',
        alineacion_vertical: 'inicio',
        espaciado: 'normal',
        columna_1: [
          {
            tipo_seccion: 'navegacion',
            titulo_visible: 'Menú',
            visible: true,
            configuracion: {},
          },
        ],
        columna_2: [],
        columna_3: [],
      });
      const { validate } = await import('class-validator');
      const errores = await validate(instancia, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      expect(errores).toHaveLength(1);
      expect(errores[0].constraints?.esListaDeBloques).toContain('navegacion');
    });
  });
});
