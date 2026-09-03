import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProyectoDto } from './create-proyecto.dto';
import { UpdateProyectoDto } from './update-proyecto.dto';

const BASE = {
  titulo: 'Portafolio personal',
  descripcion: 'Sitio de portafolio/CV',
  estado: 'en_progreso',
  destacado: false,
  orden: 1,
};

describe('CreateProyectoDto (validación de fechas)', () => {
  it('acepta fecha_fin igual a fecha_inicio (proyecto de un solo día, oIgual: true)', async () => {
    const dto = plainToInstance(CreateProyectoDto, {
      ...BASE,
      fecha_inicio: '2026-01-01',
      fecha_fin: '2026-01-01',
    });

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('rechaza fecha_fin anterior a fecha_inicio', async () => {
    const dto = plainToInstance(CreateProyectoDto, {
      ...BASE,
      fecha_inicio: '2026-01-05',
      fecha_fin: '2026-01-01',
    });

    const errores = await validate(dto);

    const errorFechaFin = errores.find((e) => e.property === 'fecha_fin');
    expect(errorFechaFin?.constraints).toHaveProperty('esPosteriorA');
  });

  it('rechaza fecha_inicio futura', async () => {
    const dto = plainToInstance(CreateProyectoDto, {
      ...BASE,
      fecha_inicio: '2099-01-01',
    });

    const errores = await validate(dto);

    const errorFechaInicio = errores.find((e) => e.property === 'fecha_inicio');
    expect(errorFechaInicio?.constraints).toHaveProperty('esFechaIso');
  });

  it('rechaza una fecha_inicio de calendario inválida (2026-02-30)', async () => {
    const dto = plainToInstance(CreateProyectoDto, {
      ...BASE,
      fecha_inicio: '2026-02-30',
    });

    const errores = await validate(dto);

    const errorFechaInicio = errores.find((e) => e.property === 'fecha_inicio');
    expect(errorFechaInicio?.constraints).toHaveProperty('esFechaIso');
  });
});

describe('UpdateProyectoDto (PATCH parcial, hereda los validadores de Create)', () => {
  it('un PATCH que solo trae fecha_fin, sin fecha_inicio, no falla por el cruce de fechas', async () => {
    const dto = plainToInstance(UpdateProyectoDto, {
      fecha_fin: '2026-01-01',
    });

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });
});
