import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCertificacionDto } from './create-certificacion.dto';
import { UpdateCertificacionDto } from './update-certificacion.dto';

const BASE = {
  nombre: 'AWS Certified',
  institucion: 'AWS',
  url_verificacion: 'https://aws.amazon.com/verify/123',
  orden: 1,
};

describe('CreateCertificacionDto (validación de fechas)', () => {
  it('rechaza fecha_expiracion igual a fecha_emision (debe ser estrictamente posterior)', async () => {
    const dto = plainToInstance(CreateCertificacionDto, {
      ...BASE,
      fecha_emision: '2026-01-01',
      fecha_expiracion: '2026-01-01',
    });

    const errores = await validate(dto);

    const errorFechaExpiracion = errores.find(
      (e) => e.property === 'fecha_expiracion',
    );
    expect(errorFechaExpiracion?.constraints).toHaveProperty('esPosteriorA');
  });

  it('acepta fecha_expiracion estrictamente posterior a fecha_emision', async () => {
    const dto = plainToInstance(CreateCertificacionDto, {
      ...BASE,
      fecha_emision: '2026-01-01',
      fecha_expiracion: '2026-01-02',
    });

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('rechaza fecha_emision futura', async () => {
    const dto = plainToInstance(CreateCertificacionDto, {
      ...BASE,
      fecha_emision: '2099-01-01',
    });

    const errores = await validate(dto);

    const errorFechaEmision = errores.find(
      (e) => e.property === 'fecha_emision',
    );
    expect(errorFechaEmision?.constraints).toHaveProperty('esFechaIso');
  });
});

describe('UpdateCertificacionDto (PATCH parcial, hereda los validadores de Create)', () => {
  it('un PATCH que solo trae fecha_expiracion, sin fecha_emision, no falla por el cruce de fechas', async () => {
    const dto = plainToInstance(UpdateCertificacionDto, {
      fecha_expiracion: '2026-01-01',
    });

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });
});
