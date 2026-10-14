import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ColumnasConfiguracionDto } from './columnas-configuracion.dto';
import { TIPOS_SECCION } from './index';
import { obtenerErroresConfiguracion } from './validar-configuracion';

/** Fase 7c (7c.3, UC-07/UC-12): campo base `borde_bloque`. */
const MINIMOS: Record<string, Record<string, unknown>> = {
  hero: { titulo: 'Hola', subtitulo: 'Mundo' },
  'sobre-mi': { mostrar_foto: true },
  proyectos: { cantidad_a_mostrar: 6, solo_destacados: true },
  certificaciones: { orden: 'fecha' },
  logros: {},
  contacto: { mostrar_formulario: false },
  skills: { direccion: 'izquierda', velocidad: 'media' },
  galeria: {},
  navegacion: {},
  insignias: {},
};

describe('borde_bloque (Fase 7c)', () => {
  const tipos = Object.keys(MINIMOS);

  it('cubre todos los tipos salvo columnas', () => {
    expect(
      TIPOS_SECCION.filter((t) => t !== 'columnas' && !(t in MINIMOS)),
    ).toEqual([]);
  });

  describe.each(tipos)('%s', (tipo) => {
    it.each(['ninguno', 'sutil', 'marcado'])('acepta "%s"', async (valor) => {
      expect(
        await obtenerErroresConfiguracion(tipo as never, {
          ...MINIMOS[tipo],
          borde_bloque: valor,
        }),
      ).toEqual([]);
    });

    it('rechaza un valor inválido', async () => {
      const errores = await obtenerErroresConfiguracion(tipo as never, {
        ...MINIMOS[tipo],
        borde_bloque: 'grueso',
      });
      expect(errores.length).toBeGreaterThan(0);
    });

    it('un payload sin el campo sigue válido', async () => {
      expect(
        await obtenerErroresConfiguracion(tipo as never, MINIMOS[tipo]),
      ).toEqual([]);
    });
  });

  it('columnas acepta borde_bloque propio y en bloques hijos', async () => {
    const instancia = plainToInstance(ColumnasConfiguracionDto, {
      distribucion: '1-1',
      alineacion_vertical: 'inicio',
      espaciado: 'normal',
      borde_bloque: 'marcado',
      columna_1: [
        {
          tipo_seccion: 'logros',
          titulo_visible: 'Logros',
          visible: true,
          configuracion: { borde_bloque: 'ninguno' },
        },
      ],
      columna_2: [],
      columna_3: [],
    });
    const errores = await validate(instancia, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errores).toHaveLength(0);
  });
});
