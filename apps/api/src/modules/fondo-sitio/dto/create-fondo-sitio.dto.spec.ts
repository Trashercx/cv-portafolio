import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateFondoSitioDto } from './create-fondo-sitio.dto';

function validarFondo(payload: Record<string, unknown>) {
  const instancia = plainToInstance(CreateFondoSitioDto, payload);
  return validate(instancia, { whitelist: true, forbidNonWhitelisted: true });
}

const configuracionValida = { velocidad: 'media', opacidad: 0.5 };

describe('CreateFondoSitioDto (Fase 3.4, UC-15): 3 tipos de fondo nuevos', () => {
  it.each(['ondas', 'malla_difusa', 'lineas_diagonales'])(
    'acepta el tipo nuevo "%s"',
    async (tipo) => {
      const errores = await validarFondo({
        tipo,
        configuracion: configuracionValida,
      });

      expect(errores).toHaveLength(0);
    },
  );

  it.each([
    'solido',
    'degradado_animado',
    'aurora_animada',
    'particulas',
    'cuadricula_animada',
  ])('sigue aceptando el tipo original "%s"', async (tipo) => {
    const errores = await validarFondo({
      tipo,
      configuracion: configuracionValida,
    });

    expect(errores).toHaveLength(0);
  });

  it('rechaza un tipo fuera del catálogo de 8 valores', async () => {
    const errores = await validarFondo({
      tipo: 'confeti',
      configuracion: configuracionValida,
    });

    expect(errores.length).toBeGreaterThan(0);
  });
});
