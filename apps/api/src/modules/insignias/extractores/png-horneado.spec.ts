import { sharp } from '../../media/sharp';
import { leerOpenBadgesHorneado } from './png-horneado';

describe('leerOpenBadgesHorneado con JPEG y WebP (Fase 7g, UC-35)', () => {
  it('devuelve null sin lanzar: no hay Open Badges horneado en esos formatos', async () => {
    const base = sharp({
      create: { width: 4, height: 4, channels: 3, background: '#fff' },
    });
    const jpeg = await base.clone().jpeg().toBuffer();
    const webp = await base.clone().webp().toBuffer();
    expect(leerOpenBadgesHorneado(jpeg, 'image/jpeg')).toBeNull();
    expect(leerOpenBadgesHorneado(webp, 'image/webp')).toBeNull();
  });
});
