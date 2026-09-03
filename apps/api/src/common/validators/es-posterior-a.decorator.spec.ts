import { validate } from 'class-validator';
import { EsPosteriorA } from './es-posterior-a.decorator';

class RangoEstrictoDto {
  inicio: string;

  @EsPosteriorA('inicio')
  fin: string;
}

class RangoOIgualDto {
  inicio: string;

  @EsPosteriorA('inicio', { oIgual: true })
  fin: string;
}

describe('@EsPosteriorA', () => {
  it('rechaza cuando el campo es igual al relacionado (estrictamente posterior)', async () => {
    const dto = new RangoEstrictoDto();
    dto.inicio = '2026-01-01';
    dto.fin = '2026-01-01';

    const errores = await validate(dto);

    expect(errores).toHaveLength(1);
    expect(errores[0].constraints).toHaveProperty('esPosteriorA');
  });

  it('acepta cuando el campo es estrictamente posterior al relacionado', async () => {
    const dto = new RangoEstrictoDto();
    dto.inicio = '2026-01-01';
    dto.fin = '2026-01-02';

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('rechaza cuando el campo es anterior al relacionado', async () => {
    const dto = new RangoEstrictoDto();
    dto.inicio = '2026-01-05';
    dto.fin = '2026-01-01';

    const errores = await validate(dto);

    expect(errores).toHaveLength(1);
  });

  it('con oIgual: true, acepta que ambas fechas sean iguales', async () => {
    const dto = new RangoOIgualDto();
    dto.inicio = '2026-01-01';
    dto.fin = '2026-01-01';

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('pasa sin error si el campo relacionado no viene en el payload (PATCH parcial)', async () => {
    const dto = new RangoEstrictoDto();
    dto.fin = '2026-01-01';
    // dto.inicio queda undefined, como en un PATCH que solo trae `fin`.

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('pasa sin error si el propio campo no viene en el payload', async () => {
    const dto = new RangoEstrictoDto();
    dto.inicio = '2026-01-01';
    // dto.fin queda undefined.

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('pasa sin error si el campo relacionado viene vacío', async () => {
    const dto = new RangoEstrictoDto();
    dto.inicio = '';
    dto.fin = '2026-01-01';

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });
});
