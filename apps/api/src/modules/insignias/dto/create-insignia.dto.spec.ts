import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateInsigniaDto } from './create-insignia.dto';
import { ImportarInsigniaDto } from './importar-insignia.dto';
import { ReordenarInsigniasDto } from './reordenar-insignias.dto';

const UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const base = { nombre: 'AWS Cloud Practitioner', emisor: 'AWS' };

async function errores<T extends object>(
  clase: new () => T,
  payload: Record<string, unknown>,
) {
  return validate(plainToInstance(clase, payload), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
}

describe('CreateInsigniaDto (Fase 7d, UC-35)', () => {
  it('acepta imagen_media_id sin imagen_url_remota', async () => {
    expect(
      await errores(CreateInsigniaDto, { ...base, imagen_media_id: UUID }),
    ).toHaveLength(0);
  });

  it('acepta imagen_url_remota https sin imagen_media_id', async () => {
    expect(
      await errores(CreateInsigniaDto, {
        ...base,
        imagen_url_remota: 'https://images.credly.com/a.png',
        fecha_emision: '2024-05-01',
        habilidades: ['AWS', 'Cloud'],
      }),
    ).toHaveLength(0);
  });

  it('rechaza si no hay ninguna de las dos imágenes', async () => {
    expect((await errores(CreateInsigniaDto, base)).length).toBeGreaterThan(0);
  });

  it('rechaza si vienen ambas (XOR)', async () => {
    expect(
      (
        await errores(CreateInsigniaDto, {
          ...base,
          imagen_media_id: UUID,
          imagen_url_remota: 'https://x.test/a.png',
        })
      ).length,
    ).toBeGreaterThan(0);
  });

  it('Fase 7i: acepta la imagen generada como data URI svg o png en base64', async () => {
    for (const tipo of ['svg+xml', 'png']) {
      expect(
        await errores(CreateInsigniaDto, {
          ...base,
          imagen_url_remota: `data:image/${tipo};base64,PHN2Zz48L3N2Zz4=`,
        }),
      ).toHaveLength(0);
    }
  });

  it.each([
    { imagen_url_remota: 'http://x.test/a.png' },
    // Fase 7i: solo svg/png en base64 y con tope de tamaño.
    { imagen_url_remota: 'data:text/html;base64,PGgxPjwvaDE+' },
    { imagen_url_remota: 'data:image/svg+xml,<svg></svg>' },
    { imagen_url_remota: 'data:image/jpeg;base64,AAAA' },
    { imagen_url_remota: `data:image/png;base64,${'A'.repeat(70_000)}` },
    { imagen_url_remota: `https://x.test/${'a'.repeat(2000)}.png` },
    { imagen_media_id: 'no-uuid' },
    { imagen_media_id: UUID, proveedor: 'otro' },
    { imagen_media_id: UUID, campo_extra: 1 },
    { imagen_media_id: UUID, fecha_emision: 'ayer' },
    { imagen_media_id: UUID, habilidades: [1] },
  ])('rechaza %j', async (extra) => {
    expect(
      (await errores(CreateInsigniaDto, { ...base, ...extra })).length,
    ).toBeGreaterThan(0);
  });
});

describe('ImportarInsigniaDto / ReordenarInsigniasDto', () => {
  it('importar: 1 a 4000 caracteres tras recortar', async () => {
    expect(await errores(ImportarInsigniaDto, { entrada: 'a' })).toHaveLength(
      0,
    );
    expect(
      (await errores(ImportarInsigniaDto, { entrada: '   ' })).length,
    ).toBeGreaterThan(0);
    expect(
      (await errores(ImportarInsigniaDto, { entrada: 'a'.repeat(4001) }))
        .length,
    ).toBeGreaterThan(0);
  });

  it('reordenar: uuids únicos, al menos uno', async () => {
    expect(await errores(ReordenarInsigniasDto, { ids: [UUID] })).toHaveLength(
      0,
    );
    expect(
      (await errores(ReordenarInsigniasDto, { ids: [] })).length,
    ).toBeGreaterThan(0);
    expect(
      (await errores(ReordenarInsigniasDto, { ids: [UUID, UUID] })).length,
    ).toBeGreaterThan(0);
  });
});
