import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ExperienciaConfiguracionDto } from './experiencia-configuracion.dto';
import { obtenerErroresConfiguracion } from './validar-configuracion';

function validarConfiguracion(configuracion: Record<string, unknown>) {
  const instancia = plainToInstance(ExperienciaConfiguracionDto, configuracion);
  return validate(instancia, { whitelist: true, forbidNonWhitelisted: true });
}

describe('ExperienciaConfiguracionDto (Fase 7l, UC-19)', () => {
  it('rellena los defaults del contrato', () => {
    const e = plainToInstance(ExperienciaConfiguracionDto, {});
    expect(e.disposicion).toBe('linea_tiempo');
    expect(e.mostrar_duracion).toBe(true);
    expect(e.mostrar_tecnologias).toBe(true);
    expect(e.mostrar_logos).toBe(true);
    expect(e.mostrar_ubicacion).toBe(true);
    expect(e.efecto_hover).toBe('elevar');
    expect(e.limite).toBeUndefined();
  });

  it('acepta un payload vacío y uno completo', async () => {
    expect(await validarConfiguracion({})).toHaveLength(0);
    expect(
      await validarConfiguracion({
        titulo: 'Experiencia',
        subtitulo: 'Dónde he trabajado',
        disposicion: 'tarjetas',
        mostrar_duracion: false,
        mostrar_tecnologias: false,
        mostrar_logos: false,
        mostrar_ubicacion: false,
        limite: 50,
        efecto_hover: 'inclinar',
        espaciado_vertical: 'amplio',
      }),
    ).toHaveLength(0);
  });

  it.each([
    { disposicion: 'rejilla' },
    { efecto_hover: 'girar' },
    { limite: 0 },
    { limite: 51 },
    { limite: 1.5 },
    { mostrar_logos: 'si' },
    { titulo: 'x'.repeat(201) },
    { subtitulo: 'x'.repeat(301) },
    { campo_inventado: true },
  ])('rechaza %j', async (payload) => {
    expect((await validarConfiguracion(payload)).length).toBeGreaterThan(0);
  });

  it('está registrado como tipo de sección y se valida por tipo', async () => {
    expect(await obtenerErroresConfiguracion('experiencia', {})).toEqual([]);
    expect(
      (await obtenerErroresConfiguracion('experiencia', { disposicion: 'x' }))
        .length,
    ).toBeGreaterThan(0);
  });
});
