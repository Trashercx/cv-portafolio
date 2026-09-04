import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRedSocialDto } from './create-red-social.dto';

const BASE = {
  plataforma_id: '11111111-1111-4111-8111-111111111111',
  orden: 0,
};

/**
 * `url` se normaliza vía `@Transform` anteponiendo `https://` cuando el
 * valor no trae ya un esquema URI reconocible — ver comentario del DTO.
 * Defensa en profundidad: el frontend (`redSocialSchema`) hace lo mismo.
 */
describe('CreateRedSocialDto (normalización de url)', () => {
  it('antepone https:// a una url sin esquema', async () => {
    const dto = plainToInstance(CreateRedSocialDto, {
      ...BASE,
      url: 'linkedin.com/in/x',
    });

    expect(dto.url).toBe('https://linkedin.com/in/x');

    const errores = await validate(dto);
    expect(errores).toHaveLength(0);
  });

  it('no toca una url que ya trae https://', async () => {
    const dto = plainToInstance(CreateRedSocialDto, {
      ...BASE,
      url: 'https://linkedin.com/in/x',
    });

    expect(dto.url).toBe('https://linkedin.com/in/x');
  });

  it('no toca un enlace mailto:', async () => {
    const dto = plainToInstance(CreateRedSocialDto, {
      ...BASE,
      url: 'mailto:correo@ejemplo.com',
    });

    expect(dto.url).toBe('mailto:correo@ejemplo.com');

    const errores = await validate(dto);
    expect(errores).toHaveLength(0);
  });

  it('sigue rechazando una url vacía', async () => {
    const dto = plainToInstance(CreateRedSocialDto, { ...BASE, url: '' });

    const errores = await validate(dto);
    const errorUrl = errores.find((e) => e.property === 'url');
    expect(errorUrl).toBeDefined();
  });
});
