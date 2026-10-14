import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateFondoSitioDto, TIPOS_FONDO } from './create-fondo-sitio.dto';
import { UpdateFondoSitioDto } from './update-fondo-sitio.dto';

function validarFondo(payload: Record<string, unknown>) {
  const instancia = plainToInstance(CreateFondoSitioDto, payload);
  return validate(instancia, { whitelist: true, forbidNonWhitelisted: true });
}

const configuracionValida = { velocidad: 'media', opacidad: 0.5 };

describe('CreateFondoSitioDto (Fase 7b, UC-15 ext.)', () => {
  it('expone exactamente los 9 tipos del contrato', () => {
    expect([...TIPOS_FONDO]).toEqual([
      'solido',
      'aurora_mesh',
      'malla_puntos',
      'rejilla_perspectiva',
      'particulas_red',
      'ondas_fluidas',
      'haces_luz',
      'degradado_grano',
      'campo_estrellas',
    ]);
  });

  it.each([...TIPOS_FONDO])('acepta el tipo nuevo "%s"', async (tipo) => {
    const errores = await validarFondo({
      tipo,
      configuracion: configuracionValida,
    });
    expect(errores).toHaveLength(0);
  });

  it.each([
    'degradado_animado',
    'aurora_animada',
    'particulas',
    'cuadricula_animada',
    'ondas',
    'malla_difusa',
    'lineas_diagonales',
    'confeti',
  ])('rechaza el tipo "%s"', async (tipo) => {
    const errores = await validarFondo({
      tipo,
      configuracion: configuracionValida,
    });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('acepta intensidad e interactivo válidos', async () => {
    const errores = await validarFondo({
      tipo: 'aurora_mesh',
      configuracion: {
        ...configuracionValida,
        intensidad: 'alta',
        interactivo: false,
      },
    });
    expect(errores).toHaveLength(0);
  });

  it('rechaza una intensidad inválida', async () => {
    const errores = await validarFondo({
      tipo: 'aurora_mesh',
      configuracion: { ...configuracionValida, intensidad: 'extrema' },
    });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza un interactivo que no es booleano', async () => {
    const errores = await validarFondo({
      tipo: 'aurora_mesh',
      configuracion: { ...configuracionValida, interactivo: 'si' },
    });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza claves desconocidas dentro de configuracion', async () => {
    const errores = await validarFondo({
      tipo: 'aurora_mesh',
      configuracion: { ...configuracionValida, brillo: 3 },
    });
    expect(errores.length).toBeGreaterThan(0);
  });

  it('UpdateFondoSitioDto acepta una actualización parcial', async () => {
    const instancia = plainToInstance(UpdateFondoSitioDto, {
      tipo: 'campo_estrellas',
    });
    const errores = await validate(instancia, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errores).toHaveLength(0);
  });
});
