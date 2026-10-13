import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTemaDto } from './create-tema.dto';

function validarTema(payload: Record<string, unknown>) {
  const instancia = plainToInstance(CreateTemaDto, payload);
  return validate(instancia, { whitelist: true, forbidNonWhitelisted: true });
}

const base = {
  nombre: 'Oscuro',
  color_primario: '#111111',
  color_secundario: '#222222',
  color_fondo: '#000000',
  color_texto: '#ffffff',
  modo: 'oscuro' as const,
};

describe('CreateTemaDto (Fase 3.4, UC-08): catálogo cerrado de fuente_principal', () => {
  it.each([
    'manrope',
    'inter',
    'space_grotesk',
    'sora',
    'dm_sans',
    'playfair_display',
    'jetbrains_mono',
    'sans_sistema',
    'serif_sistema',
    'mono_sistema',
  ])(
    'acepta el token del catálogo "%s" (ampliado en Fase 7, 7.2)',
    async (fuente_principal) => {
      const errores = await validarTema({ ...base, fuente_principal });

      expect(errores).toHaveLength(0);
    },
  );

  /**
   * Regresión (Fase 3.4): un `PATCH /admin/temas/:id` sobre una fila
   * guardada ANTES de este cambio, con uno de estos 4 nombres de fuente
   * legados (nunca resolvían visualmente, pero eran válidos), no debe
   * romperse con 400 solo porque el Select del frontend ya no los ofrece.
   */
  it.each(['Inter', 'Poppins', 'Merriweather', 'Georgia'])(
    'sigue aceptando el valor legado "%s" (fila guardada antes de Fase 3.4)',
    async (fuente_principal) => {
      const errores = await validarTema({ ...base, fuente_principal });

      expect(errores).toHaveLength(0);
    },
  );

  it('rechaza un valor de fuente_principal fuera del catálogo cerrado (10 tokens + 4 legados)', async () => {
    const errores = await validarTema({
      ...base,
      fuente_principal: 'Comic Sans MS',
    });

    expect(errores.length).toBeGreaterThan(0);
  });
});

describe('CreateTemaDto (Fase 7, 7.2, UC-08): fuentes fuera del catálogo', () => {
  it.each(['Roboto', 'MANROPE', 'comic_sans', ''])(
    'rechaza "%s"',
    async (fuente_principal) => {
      const errores = await validarTema({ ...base, fuente_principal });

      expect(errores.length).toBeGreaterThan(0);
    },
  );

  it('rechaza un campo desconocido (whitelist)', async () => {
    const errores = await validarTema({
      ...base,
      fuente_principal: 'sora',
      inventado: true,
    });

    expect(errores.length).toBeGreaterThan(0);
  });
});
