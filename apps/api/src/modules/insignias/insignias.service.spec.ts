import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { lookup } from 'dns/promises';
import { sharp } from '../media/sharp';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { InsigniasService } from './insignias.service';

jest.mock('dns/promises', () => ({ lookup: jest.fn() }));

const ID_CREDLY = '0bd5c2c1-1f0c-4b8c-9d7a-3e2a4a1b9c11';

describe('InsigniasService (Fase 7d, UC-35)', () => {
  const fetchOriginal = globalThis.fetch;
  let service: InsigniasService;
  let fetchMock: jest.Mock;

  const prisma = {
    insignia: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    media: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  const mediaService = { create: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    (lookup as unknown as jest.Mock).mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
    ]);
    fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    prisma.insignia.aggregate.mockResolvedValue({ _max: { orden: 4 } });
    prisma.insignia.create.mockImplementation(({ data }) => ({
      id: 'ins-1',
      ...data,
    }));
    prisma.$transaction.mockImplementation((ops: unknown[]) =>
      Promise.all(ops),
    );
    const mod = await Test.createTestingModule({
      providers: [
        InsigniasService,
        { provide: PrismaService, useValue: prisma },
        { provide: MediaService, useValue: mediaService },
      ],
    }).compile();
    service = mod.get(InsigniasService);
  });
  afterAll(() => {
    globalThis.fetch = fetchOriginal;
  });

  describe('crear', () => {
    it('con imagen_media_id: valida la media y asigna el siguiente orden', async () => {
      prisma.media.findUnique.mockResolvedValue({ id: 'm1' });
      const r = await service.crear('admin-1', {
        nombre: 'AWS',
        emisor: 'Amazon',
        imagen_media_id: 'm1',
        fecha_emision: '2024-03-15',
        habilidades: ['Cloud'],
      });
      const data = prisma.insignia.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        usuario_admin_id: 'admin-1',
        imagen_media_id: 'm1',
        orden: 5,
        visible: true,
        proveedor: 'manual',
        habilidades: ['Cloud'],
      });
      expect(data.fecha_emision).toEqual(new Date('2024-03-15'));
      expect(r.id).toBe('ins-1');
      expect(mediaService.create).not.toHaveBeenCalled();
    });

    it('con imagen_media_id inexistente: 400', async () => {
      prisma.media.findUnique.mockResolvedValue(null);
      await expect(
        service.crear('a', {
          nombre: 'x',
          emisor: 'y',
          imagen_media_id: 'nope',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('con imagen_url_remota: descarga segura, sube a la carpeta insignias y usa la media nueva', async () => {
      const png = await sharp({
        create: { width: 4, height: 4, channels: 3, background: '#fff' },
      })
        .png()
        .toBuffer();
      fetchMock.mockResolvedValue(
        new Response(png, {
          status: 200,
          headers: { 'content-type': 'image/png' },
        }),
      );
      mediaService.create.mockResolvedValue({ id: 'media-nueva' });

      await service.crear('admin-1', {
        nombre: 'Certificación Ñandú Pro',
        emisor: 'Acme',
        imagen_url_remota: 'https://images.credly.com/a.png',
      });

      const [file, dto, usuario] = mediaService.create.mock.calls[0];
      expect(file.originalname).toBe('certificacion-nandu-pro.png');
      expect(file.mimetype).toBe('image/png');
      expect(file.buffer.length).toBe(png.length);
      expect(dto).toEqual({
        carpeta: 'insignias',
        alt_text: 'Certificación Ñandú Pro',
      });
      expect(usuario).toBe('admin-1');
      expect(prisma.insignia.create.mock.calls[0][0].data.imagen_media_id).toBe(
        'media-nueva',
      );
    });

    it('con imagen_url_remota inalcanzable o no permitida: 400 (nunca 500)', async () => {
      await expect(
        service.crear('a', {
          nombre: 'x',
          emisor: 'y',
          imagen_url_remota: 'https://127.0.0.1/a.png',
        }),
      ).rejects.toThrow(BadRequestException);

      fetchMock.mockResolvedValue(
        new Response('<html/>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
      );
      await expect(
        service.crear('a', {
          nombre: 'x',
          emisor: 'y',
          imagen_url_remota: 'https://ejemplo.test/a',
        }),
      ).rejects.toThrow(/no es una imagen admitida/i);
      expect(prisma.insignia.create).not.toHaveBeenCalled();
    });

    it('imagen_url_remota con contenido que no es imagen (aunque diga image/png): 400', async () => {
      fetchMock.mockResolvedValue(
        new Response('<svg><script>1</script></svg>', {
          status: 200,
          headers: { 'content-type': 'image/png' },
        }),
      );
      await expect(
        service.crear('a', {
          nombre: 'x',
          emisor: 'y',
          imagen_url_remota: 'https://ejemplo.test/a.png',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mediaService.create).not.toHaveBeenCalled();
    });

    it('sin ninguna imagen, o con ambas: 400', async () => {
      await expect(
        service.crear('a', { nombre: 'x', emisor: 'y' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.crear('a', {
          nombre: 'x',
          emisor: 'y',
          imagen_media_id: 'm',
          imagen_url_remota: 'https://a.test/i.png',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('actualizar / eliminar / obtener', () => {
    it('obtener inexistente: 404', async () => {
      prisma.insignia.findUnique.mockResolvedValue(null);
      await expect(service.obtener('x')).rejects.toThrow(NotFoundException);
    });

    it('actualizar solo toca los campos enviados y permite limpiar fechas con null', async () => {
      prisma.insignia.findUnique.mockResolvedValue({
        id: 'i1',
        usuario_admin_id: 'a',
        nombre: 'N',
      });
      prisma.insignia.update.mockResolvedValue({ id: 'i1' });
      await service.actualizar('i1', {
        visible: false,
        fecha_expiracion: null as unknown as undefined,
      });
      const { data } = prisma.insignia.update.mock.calls[0][0];
      expect(data.visible).toBe(false);
      expect(data.fecha_expiracion).toBeNull();
      expect(data.nombre).toBeUndefined();
      expect(data.fecha_emision).toBeUndefined();
      expect(data.imagen_media_id).toBeUndefined();
    });

    it('eliminar borra solo la fila (no la media)', async () => {
      prisma.insignia.findUnique.mockResolvedValue({ id: 'i1' });
      await service.eliminar('i1');
      expect(prisma.insignia.delete).toHaveBeenCalledWith({
        where: { id: 'i1' },
      });
      expect(mediaService.create).not.toHaveBeenCalled();
    });
  });

  describe('reordenar', () => {
    it('asigna orden = posición en una transacción', async () => {
      prisma.insignia.count.mockResolvedValue(3);
      prisma.insignia.update.mockImplementation((args) => args);
      await service.reordenar(['c', 'a', 'b']);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.insignia.update.mock.calls.map((c) => c[0])).toEqual([
        { where: { id: 'c' }, data: { orden: 0 } },
        { where: { id: 'a' }, data: { orden: 1 } },
        { where: { id: 'b' }, data: { orden: 2 } },
      ]);
    });

    it('404 si algún id no existe, sin tocar nada', async () => {
      prisma.insignia.count.mockResolvedValue(2);
      await expect(service.reordenar(['a', 'b', 'c'])).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('listarVisibles (snapshot)', () => {
    it('solo visibles, por orden, con la imagen y variantes', async () => {
      prisma.insignia.findMany.mockResolvedValue([{ id: 'i1' }]);
      await service.listarVisibles();
      const args = prisma.insignia.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ visible: true });
      expect(args.orderBy).toEqual({ orden: 'asc' });
      expect(args.select.imagen.include.variantes).toBeDefined();
      expect(Object.keys(args.select).sort()).toEqual(
        [
          'id',
          'nombre',
          'emisor',
          'descripcion',
          'proveedor',
          'url_verificacion',
          'fecha_emision',
          'fecha_expiracion',
          'habilidades',
          'orden',
          'imagen',
        ].sort(),
      );
    });
  });

  describe('importar', () => {
    it('entrada sin URL ni embed ni imagen: 400', async () => {
      await expect(service.importar('esto no es nada')).rejects.toThrow(
        BadRequestException,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('un enlace de Credly se importa con el extractor de Credly', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (url.endsWith(`/badges/${ID_CREDLY}`)) {
          return new Response('<a href="/users/jane">Jane</a>', {
            headers: { 'content-type': 'text/html' },
          });
        }
        return new Response(
          JSON.stringify({
            data: [
              {
                id: ID_CREDLY,
                image_url: 'https://images.credly.com/size/110x110/i.png',
                badge_template: { name: 'Badge', skills: [] },
                issuer: {
                  entities: [{ primary: true, entity: { name: 'Emisor' } }],
                },
              },
            ],
          }),
          { headers: { 'content-type': 'application/json' } },
        );
      });
      const v = await service.importar(
        `https://www.credly.com/badges/${ID_CREDLY}`,
      );
      expect(v.proveedor).toBe('credly');
      expect(v.nombre).toBe('Badge');
      expect(v.imagen?.url).toBe('https://images.credly.com/i.png');
    });

    it('sanea la vista previa: sin HTML, entidades decodificadas y topes del DTO', async () => {
      const habilidades = Array.from({ length: 80 }, (_, i) => 'hab ' + i);
      const largo = 'x'.repeat(9000);
      const assertion = {
        '@context': 'https://w3id.org/openbadges/v2',
        type: 'Assertion',
        id: 'https://a.test/assertion/1',
        badge: {
          type: 'BadgeClass',
          name:
            '<script>alert(1)</script>Nombre &amp; <b>Co</b>  \u0007 ' + largo,
          description: '&lt;img src=x onerror=alert(1)&gt;Hola ' + largo,
          image: 'https://a.test/b.png',
          tags: [...habilidades, 'y'.repeat(300), 'hab 1'],
          issuer: { name: '<i>Emisor</i> ' + largo },
        },
      };
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify(assertion), {
          headers: { 'content-type': 'application/json' },
        }),
      );
      const v = await service.importar('https://a.test/assertion/1');
      expect(v.nombre.startsWith('Nombre & Co xxx')).toBe(true);
      expect(v.nombre).not.toMatch(/[<>\u0007]|script/);
      expect(v.nombre.length).toBeLessThanOrEqual(200);
      expect(v.emisor.length).toBeLessThanOrEqual(200);
      expect(v.emisor).not.toContain('<');
      expect(v.descripcion).not.toMatch(/[<>]/);
      expect(v.descripcion!.length).toBeLessThanOrEqual(5000);
      expect(v.habilidades.length).toBe(50);
      expect(new Set(v.habilidades).size).toBe(50);
      expect(v.habilidades.every((h) => h.length <= 100)).toBe(true);
    });

    it('una página cualquiera cae al extractor genérico', async () => {
      fetchMock.mockResolvedValue(
        new Response(
          '<title>Hola</title><meta property="og:image" content="https://a.test/i.png">',
          {
            headers: { 'content-type': 'text/html' },
          },
        ),
      );
      const v = await service.importar('https://a.test/badge');
      expect(v.proveedor).toBe('generico');
      expect(v.nombre).toBe('Hola');
      expect(v.imagen?.url).toBe('https://a.test/i.png');
    });

    it('error de red o destino privado: vista vacía con aviso, nunca excepción', async () => {
      const privada = await service.importar('https://10.0.0.5/badge');
      expect(privada.nombre).toBe('');
      expect(privada.avisos[0]).toMatch(/no está permitido/);

      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      const caida = await service.importar('https://a.test/badge');
      expect(caida.imagen).toBeNull();
      expect(caida.avisos[0]).toMatch(/No se pudo importar/);
    });

    it('un recurso que ningún extractor reconoce: vista vacía con aviso', async () => {
      fetchMock.mockResolvedValue(
        new Response('{"a":1}', {
          headers: { 'content-type': 'application/json' },
        }),
      );
      const v = await service.importar('https://a.test/dato.json');
      expect(v.nombre).toBe('');
      expect(v.avisos.join(' ')).toMatch(/No se reconoció/);
    });
  });

  describe('importarArchivo', () => {
    const archivo = (buffer: Buffer, mimetype: string) =>
      ({
        buffer,
        mimetype,
        originalname: 'badge.png',
        size: buffer.length,
      }) as Express.Multer.File;

    it('rechaza texto con MIME de imagen falso, sin subir nada', async () => {
      await expect(
        service.importarArchivo(
          archivo(Buffer.from('<html>hola</html>'), 'image/png'),
          'a',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mediaService.create).not.toHaveBeenCalled();
    });

    it('rechaza un SVG con <script> o manejadores, sin subir nada', async () => {
      for (const cuerpo of [
        '<script>alert(1)</script>',
        '<rect onclick="x()"/>',
      ]) {
        const svg =
          '<svg xmlns="http://www.w3.org/2000/svg">' + cuerpo + '</svg>';
        await expect(
          service.importarArchivo(
            archivo(Buffer.from(svg), 'image/svg+xml'),
            'a',
          ),
        ).rejects.toThrow(BadRequestException);
      }
      expect(mediaService.create).not.toHaveBeenCalled();
    });

    it('un PNG real declarado como SVG se sube con el MIME real (image/png)', async () => {
      mediaService.create.mockResolvedValue({
        id: 'm1',
        url: 'https://cdn.test/x.png',
        ancho: 2,
        alto: 2,
      });
      const png = await sharp({
        create: { width: 2, height: 2, channels: 3, background: '#000' },
      })
        .png()
        .toBuffer();
      const v = await service.importarArchivo(
        archivo(png, 'image/svg+xml'),
        'a',
      );
      expect(mediaService.create.mock.calls[0][0].mimetype).toBe('image/png');
      expect(v.imagen?.formato).toBe('png');
    });

    it('acepta JPEG y WebP como imagen simple (Fase 7g, UC-35)', async () => {
      mediaService.create.mockResolvedValue({
        id: 'mj',
        url: 'https://cdn.test/insignias/x.jpg',
        ancho: 4,
        alto: 4,
      });
      const base = sharp({
        create: { width: 4, height: 4, channels: 3, background: '#fff' },
      });
      const jpeg = await base.clone().jpeg().toBuffer();
      const v = await service.importarArchivo(archivo(jpeg, 'image/jpeg'), 'a');
      expect(mediaService.create.mock.calls[0][0].mimetype).toBe('image/jpeg');
      expect(v.imagen_media_id).toBe('mj');
      expect(v.imagen).toMatchObject({
        url: 'https://cdn.test/insignias/x.jpg',
        formato: 'jpeg',
      });
      const webp = await base.clone().webp().toBuffer();
      const w = await service.importarArchivo(archivo(webp, 'image/webp'), 'a');
      expect(w.imagen?.formato).toBe('webp');
    });

    it('rechaza tipos que no sean PNG, JPEG, WebP o SVG sin subir nada', async () => {
      await expect(
        service.importarArchivo(archivo(Buffer.from('x'), 'image/jpeg'), 'a'),
      ).rejects.toThrow(BadRequestException);
      expect(mediaService.create).not.toHaveBeenCalled();
    });

    it('sin Open Badges: sube a la biblioteca y devuelve vista vacía con la media', async () => {
      mediaService.create.mockResolvedValue({
        id: 'm9',
        url: 'https://cdn.test/insignias/x.png',
        ancho: 16,
        alto: 16,
      });
      const png = await sharp({
        create: { width: 16, height: 16, channels: 3, background: '#000' },
      })
        .png()
        .toBuffer();
      const v = await service.importarArchivo(
        archivo(png, 'image/png'),
        'admin-1',
      );
      expect(mediaService.create.mock.calls[0][1]).toMatchObject({
        carpeta: 'insignias',
      });
      expect(v.imagen_media_id).toBe('m9');
      expect(v.imagen).toEqual({
        url: 'https://cdn.test/insignias/x.png',
        ancho: 16,
        alto: 16,
        formato: 'png',
      });
      expect(v.nombre).toBe('');
      expect(v.avisos.length).toBe(1);
    });

    it('SVG con assertion horneado embebido completa la vista previa', async () => {
      mediaService.create.mockResolvedValue({
        id: 'm10',
        url: 'https://cdn.test/insignias/y.svg',
        ancho: null,
        alto: null,
      });
      const assertion = {
        '@context': 'https://w3id.org/openbadges/v2',
        type: 'Assertion',
        issuedOn: '2024-01-02',
        badge: {
          type: 'BadgeClass',
          name: 'Horneada',
          description: 'D',
          image: 'https://a.test/b.png',
          issuer: { name: 'Quien Emite' },
        },
      };
      const svg = `<svg xmlns:openbadges="http://openbadges.org"><openbadges:assertion verify="https://a.test/v"><![CDATA[${JSON.stringify(assertion)}]]></openbadges:assertion></svg>`;
      const v = await service.importarArchivo(
        archivo(Buffer.from(svg), 'image/svg+xml'),
        'admin-1',
      );
      expect(v).toMatchObject({
        proveedor: 'open_badges',
        nombre: 'Horneada',
        emisor: 'Quien Emite',
        fecha_emision: '2024-01-02',
        imagen_media_id: 'm10',
        imagen: { url: 'https://cdn.test/insignias/y.svg', formato: 'svg' },
      });
    });
  });
});
