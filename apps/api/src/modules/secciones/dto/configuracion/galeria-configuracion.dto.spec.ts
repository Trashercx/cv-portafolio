import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GaleriaConfiguracionDto } from './galeria-configuracion.dto';

function validarConfiguracion(configuracion: Record<string, unknown>) {
  const instancia = plainToInstance(GaleriaConfiguracionDto, configuracion);
  return validate(instancia, { whitelist: true, forbidNonWhitelisted: true });
}

describe('GaleriaConfiguracionDto (Fase 4.5, UC-18)', () => {
  it('rellena los defaults (fotos=[], disposicion="carousel", columnas_grid=3) cuando el payload no los trae', () => {
    const instancia = plainToInstance(GaleriaConfiguracionDto, {});

    expect(instancia.fotos).toEqual([]);
    expect(instancia.disposicion).toBe('carousel');
    expect(instancia.columnas_grid).toBe(3);
  });

  it('acepta un payload vacío (fotos=[] es un estado válido)', async () => {
    const errores = await validarConfiguracion({});

    expect(errores).toHaveLength(0);
  });

  it('acepta una lista de fotos válida, con y sin título', async () => {
    const errores = await validarConfiguracion({
      fotos: [
        { media_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6', titulo: 'Playa' },
        { media_id: '3fa85f64-5717-4562-b3fc-2c963f66afa7' },
      ],
      disposicion: 'grid',
      columnas_grid: 4,
    });

    expect(errores).toHaveLength(0);
  });

  it('rechaza una foto sin media_id', async () => {
    const errores = await validarConfiguracion({
      fotos: [{ titulo: 'Sin id' }],
    });

    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza una foto con media_id que no es un UUID', async () => {
    const errores = await validarConfiguracion({
      fotos: [{ media_id: 'no-es-un-uuid' }],
    });

    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza una disposicion fuera del catálogo', async () => {
    const errores = await validarConfiguracion({
      fotos: [],
      disposicion: 'lista',
    });

    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza un columnas_grid fuera del catálogo', async () => {
    const errores = await validarConfiguracion({
      fotos: [],
      columnas_grid: 5,
    });

    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza campos que no correspondan al DTO (forbidNonWhitelisted)', async () => {
    const errores = await validarConfiguracion({
      fotos: [],
      campo_inventado: true,
    });

    expect(errores.length).toBeGreaterThan(0);
  });
});
