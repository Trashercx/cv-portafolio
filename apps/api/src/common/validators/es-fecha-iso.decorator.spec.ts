import { validate } from 'class-validator';
import { EsFechaIso } from './es-fecha-iso.decorator';

class FechaSinRestriccionDto {
  @EsFechaIso()
  fecha: string;
}

class FechaNoFuturaDto {
  @EsFechaIso({ noFutura: true })
  fecha: string;
}

describe('@EsFechaIso', () => {
  it('rechaza una fecha inválida de calendario (2026-02-30)', async () => {
    const dto = new FechaSinRestriccionDto();
    dto.fecha = '2026-02-30';

    const errores = await validate(dto);

    expect(errores).toHaveLength(1);
    expect(errores[0].constraints).toHaveProperty('esFechaIso');
  });

  it('rechaza el 29 de febrero en un año no bisiesto (2026-02-29)', async () => {
    const dto = new FechaSinRestriccionDto();
    dto.fecha = '2026-02-29';

    const errores = await validate(dto);

    expect(errores).toHaveLength(1);
  });

  it('acepta el 29 de febrero en un año bisiesto (2028-02-29)', async () => {
    const dto = new FechaSinRestriccionDto();
    dto.fecha = '2028-02-29';

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('acepta una fecha futura cuando no se pide noFutura', async () => {
    const dto = new FechaSinRestriccionDto();
    dto.fecha = '2099-01-01';

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('rechaza una fecha futura cuando noFutura: true', async () => {
    const dto = new FechaNoFuturaDto();
    dto.fecha = '2099-01-01';

    const errores = await validate(dto);

    expect(errores).toHaveLength(1);
    expect(errores[0].constraints).toHaveProperty('esFechaIso');
  });

  it('acepta la fecha de hoy cuando noFutura: true', async () => {
    const dto = new FechaNoFuturaDto();
    const hoy = new Date();
    const iso = new Date(
      Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate()),
    )
      .toISOString()
      .slice(0, 10);
    dto.fecha = iso;

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('rechaza valores que no tienen forma de fecha ISO', async () => {
    const dto = new FechaSinRestriccionDto();
    dto.fecha = 'no-es-una-fecha';

    const errores = await validate(dto);

    expect(errores).toHaveLength(1);
  });
});
