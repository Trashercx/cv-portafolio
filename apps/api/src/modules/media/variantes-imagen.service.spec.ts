import { sharp } from './sharp';
import { VariantesImagenService } from './variantes-imagen.service';

/** Fase 8 (UC-34): sharp real y storage fake en memoria. */
describe('VariantesImagenService (Fase 8, UC-34)', () => {
  let objetos: Map<string, Buffer>;
  let filas: Record<string, unknown>[];
  let storage: {
    subirDerivado: jest.Mock;
    eliminar: jest.Mock;
  };
  let prisma: {
    mediaVariante: {
      createMany: jest.Mock;
      findMany: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
  let service: VariantesImagenService;

  const png = (width: number, height: number) =>
    sharp({
      create: { width, height, channels: 3, background: '#336699' },
    })
      .png()
      .toBuffer();

  beforeEach(() => {
    objetos = new Map();
    filas = [];
    storage = {
      subirDerivado: jest.fn(async (buf: Buffer, key: string) => {
        objetos.set(key, buf);
        return { url: `https://cdn/${key}`, key };
      }),
      eliminar: jest.fn(async (keys: string[]) =>
        keys.forEach((k) => objetos.delete(k)),
      ),
    };
    prisma = {
      mediaVariante: {
        createMany: jest.fn(async ({ data }) => {
          filas.push(...data);
        }),
        findMany: jest.fn(async () => filas.map((f) => ({ s3_key: f.s3_key }))),
        deleteMany: jest.fn(async () => {
          filas = [];
        }),
      },
    };
    service = new VariantesImagenService(prisma as never, storage as never);
  });

  it('genera webp y avif a 640 y 1024 (no 1600) para un original de 1300 px', async () => {
    const buffer = await png(1300, 800);

    const total = await service.generar(
      'm1',
      buffer,
      'perfil/abc.png',
      'image/png',
    );

    expect(total).toEqual({ generadas: 4, omitida: false });
    expect([...objetos.keys()].sort()).toEqual([
      'perfil/abc-1024.avif',
      'perfil/abc-1024.webp',
      'perfil/abc-640.avif',
      'perfil/abc-640.webp',
    ]);
    expect(filas).toHaveLength(4);
    const f640 = filas.find((f) => f.ancho === 640 && f.formato === 'webp');
    expect(f640).toMatchObject({
      media_id: 'm1',
      alto: 394,
      url: 'https://cdn/perfil/abc-640.webp',
      s3_key: 'perfil/abc-640.webp',
    });
    expect(f640?.bytes).toEqual(expect.any(Number));
    expect(storage.subirDerivado).toHaveBeenCalledWith(
      expect.any(Buffer),
      'perfil/abc-640.avif',
      'image/avif',
    );
  });

  it('una imagen más angosta que 640 px genera una sola variante a su ancho', async () => {
    await service.generar('m2', await png(300, 200), 'abc.png', 'image/png');

    expect([...objetos.keys()].sort()).toEqual([
      'abc-300.avif',
      'abc-300.webp',
    ]);
  });

  it('no genera nada para svg ni gif', async () => {
    const svg = await service.generar(
      'm3',
      Buffer.from('<svg/>'),
      'a.svg',
      'image/svg+xml',
    );
    const gif = await service.generar(
      'm3',
      Buffer.alloc(1),
      'a.gif',
      'image/gif',
    );

    expect(svg).toEqual({ generadas: 0, omitida: true });
    expect(gif).toEqual({ generadas: 0, omitida: true });
    expect(storage.subirDerivado).not.toHaveBeenCalled();
  });

  it('no lanza si el storage falla: devuelve el error y limpia lo subido', async () => {
    let n = 0;
    storage.subirDerivado.mockImplementation(
      async (buf: Buffer, key: string) => {
        if (++n === 3) throw new Error('S3 caído');
        objetos.set(key, buf);
        return { url: `https://cdn/${key}`, key };
      },
    );

    await expect(
      service.generar('m4', await png(1300, 800), 'a.png', 'image/png'),
    ).resolves.toEqual({ generadas: 0, omitida: false, error: 'S3 caído' });
    expect(prisma.mediaVariante.createMany).not.toHaveBeenCalled();
    expect(storage.eliminar).toHaveBeenCalledWith(['a-640.webp', 'a-640.avif']);
    expect(objetos.size).toBe(0);
  });

  it('si falla createMany borra todas las claves subidas y devuelve el error', async () => {
    prisma.mediaVariante.createMany.mockRejectedValue(new Error('BD caída'));

    const r = await service.generar(
      'm6',
      await png(700, 400),
      'a.png',
      'image/png',
    );

    expect(r).toEqual({ generadas: 0, omitida: false, error: 'BD caída' });
    expect(storage.eliminar).toHaveBeenCalledWith(['a-640.webp', 'a-640.avif']);
    expect(objetos.size).toBe(0);
  });

  it('eliminarDe borra objetos y filas, y tampoco lanza si falla', async () => {
    await service.generar('m5', await png(700, 400), 'a.png', 'image/png');
    expect(objetos.size).toBe(2);

    await service.eliminarDe('m5');
    expect(objetos.size).toBe(0);
    expect(filas).toHaveLength(0);

    storage.eliminar.mockRejectedValue(new Error('boom'));
    await expect(service.eliminarDe('m5')).resolves.toBeUndefined();
  });
});
