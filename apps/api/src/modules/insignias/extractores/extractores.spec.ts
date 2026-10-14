import { lookup } from 'dns/promises';
import { deflateSync } from 'zlib';
import { sharp } from '../../media/sharp';
import { credlyExtractor, idDeCredly } from './credly';
import { genericoExtractor } from './generico';
import { imagenDirectaExtractor } from './imagen-directa';
import { EXTRACTORES } from './index';
import { openBadgesExtractor } from './open-badges';
import {
  leerChunkOpenBadges,
  leerOpenBadgesDeSvg,
  pngHorneadoExtractor,
} from './png-horneado';
import { crearContextoExtraccion, ExtractorNoAplica } from './tipos';
import { extraerUrl, limpiarTexto, sanearVista, vistaVacia } from './utils';

jest.mock('dns/promises', () => ({ lookup: jest.fn() }));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ID = '0bd5c2c1-1f0c-4b8c-9d7a-3e2a4a1b9c11';
const OTRO_ID = '11111111-2222-4333-8444-555555555555';

const PAGINA_CREDLY = `<!doctype html><html><head>
<meta property="og:title" content="AWS Certified Cloud Practitioner &amp; más">
<meta property="og:description" content="Descripción de respaldo">
<meta property="og:image" content="https://images.credly.com/size/680x680/images/aws/image.png">
</head><body>
<a href="/users/sign_in">Entrar</a>
<a href="/users/jane-doe">Jane Doe</a>
<a href="/users/otra-persona">Otra</a>
</body></html>`;

const BADGES_JSON = {
  data: [
    {
      id: OTRO_ID,
      issued_at_date: '2020-01-01',
      image_url: 'https://images.credly.com/images/otra.png',
      badge_template: { name: 'Otra', description: 'x', skills: [] },
      issuer: { entities: [] },
    },
    {
      id: ID,
      issued_at_date: '2024-03-15',
      expires_at_date: '2027-03-15',
      image_url: 'https://images.credly.com/size/340x340/images/aws/image.png',
      badge_template: {
        name: 'AWS Certified Cloud Practitioner',
        description: 'Valida conocimientos de la nube AWS.',
        skills: [{ name: 'Cloud Computing' }, { name: 'AWS' }],
      },
      issuer: {
        entities: [
          { primary: false, entity: { name: 'Pearson VUE' } },
          {
            primary: true,
            entity: { name: 'Amazon Web Services Training and Certification' },
          },
        ],
      },
    },
  ],
  metadata: { total_pages: 1 },
};

const ASSERTION_2X = {
  '@context': 'https://w3id.org/openbadges/v2',
  type: 'Assertion',
  id: 'https://badges.ejemplo.test/assertions/42',
  issuedOn: '2023-06-01T10:00:00Z',
  expires: '2026-06-01T00:00:00Z',
  badge: 'https://badges.ejemplo.test/classes/1',
};
const BADGE_CLASS = {
  type: 'BadgeClass',
  name: 'Maestro del Cloud',
  description: 'Demuestra dominio.',
  image: { id: '/img/maestro.png' },
  issuer: 'https://badges.ejemplo.test/issuer',
  alignment: [{ targetName: 'Kubernetes' }, { targetName: 'Docker' }],
  tags: ['devops', 'Docker'],
};
const ISSUER = { type: 'Issuer', name: 'Academia Ejemplo' };

function crc32(buf: Buffer): number {
  let c;
  let crc = 0xffffffff;
  for (const byte of buf) {
    c = (crc ^ byte) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(tipo: string, datos: Buffer): Buffer {
  const cabecera = Buffer.alloc(8);
  cabecera.writeUInt32BE(datos.length, 0);
  cabecera.write(tipo, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([cabecera.subarray(4), datos])), 0);
  return Buffer.concat([cabecera, datos, crc]);
}

/** PNG real (sharp) con un chunk de texto insertado antes de IEND. */
async function pngConChunk(
  tipo: 'iTXt' | 'tEXt',
  valor: string,
  comprimido = false,
): Promise<Buffer> {
  const png = await sharp({
    create: {
      width: 8,
      height: 8,
      channels: 4,
      background: { r: 200, g: 30, b: 30, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  const sinIend = png.subarray(0, png.length - 12);
  const iend = png.subarray(png.length - 12);
  const datos =
    tipo === 'tEXt'
      ? Buffer.concat([
          Buffer.from('openbadges\0', 'latin1'),
          Buffer.from(valor, 'latin1'),
        ])
      : Buffer.concat([
          Buffer.from('openbadges\0', 'latin1'),
          Buffer.from([comprimido ? 1 : 0, 0]),
          Buffer.from('\0\0', 'latin1'),
          comprimido
            ? deflateSync(Buffer.from(valor, 'utf8'))
            : Buffer.from(valor, 'utf8'),
        ]);
  return Buffer.concat([sinIend, chunk(tipo, datos), iend]);
}

async function pngSimple(): Promise<Buffer> {
  return sharp({
    create: { width: 16, height: 16, channels: 3, background: '#336699' },
  })
    .png()
    .toBuffer();
}

type Ruta = { cuerpo: string | Buffer; tipo: string; status?: number };

/** `fetch` falso: responde por URL exacta; cualquier otra cosa es 404. */
function mockearFetch(rutas: Record<string, Ruta>): jest.Mock {
  const fetchMock = jest.fn(async (url: string) => {
    const ruta = rutas[url];
    if (!ruta) return new Response('no encontrado', { status: 404 });
    return new Response(ruta.cuerpo as BodyInit, {
      status: ruta.status ?? 200,
      headers: { 'content-type': ruta.tipo },
    });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const json = (obj: unknown, tipo = 'application/json'): Ruta => ({
  cuerpo: JSON.stringify(obj),
  tipo,
});
const html = (cuerpo: string): Ruta => ({
  cuerpo,
  tipo: 'text/html; charset=utf-8',
});

describe('extractores de insignias (Fase 7d, UC-35)', () => {
  const fetchOriginal = globalThis.fetch;

  beforeEach(() => {
    (lookup as unknown as jest.Mock)
      .mockReset()
      .mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  });
  afterAll(() => {
    globalThis.fetch = fetchOriginal;
  });

  describe('utilidades de entrada', () => {
    it('extraerUrl: enlace suelto, iframe, img y texto sin URL', () => {
      expect(extraerUrl(' https://a.test/x ')).toBe('https://a.test/x');
      expect(
        extraerUrl(
          '<iframe src="https://www.credly.com/embedded_badge/abc" width="1"></iframe>',
        ),
      ).toBe('https://www.credly.com/embedded_badge/abc');
      expect(extraerUrl('<img src="//cdn.test/a.png">')).toBe(
        'https://cdn.test/a.png',
      );
      expect(extraerUrl('hola mundo')).toBeNull();
    });

    it('ningún extractor acepta texto sin enlace ni embed', () => {
      expect(EXTRACTORES.some((e) => e.acepta('<<<basura>>>'))).toBe(false);
    });
  });

  describe('limpiarTexto', () => {
    it('quita etiquetas (incluido <script>), decodifica entidades y colapsa espacios', () => {
      expect(
        limpiarTexto(
          '<script>alert(1)</script>Hola &amp; <b>adiós</b>\n\n  fin',
          200,
        ),
      ).toBe('Hola & adiós fin');
    });
    it('no deja etiquetas reintroducidas por entidades ni por anidamiento', () => {
      expect(limpiarTexto('&lt;img src=x onerror=alert(1)&gt;ok', 200)).toBe(
        'ok',
      );
      expect(limpiarTexto('<<b>script>alert(1)<</b>/script>', 200)).not.toMatch(
        /<script/i,
      );
    });
    it('quita caracteres de control, trunca y tolera valores no texto', () => {
      expect(limpiarTexto('a\u0000b\u0007c', 10)).toBe('a b c');
      expect(limpiarTexto('x'.repeat(500), 200)).toHaveLength(200);
      expect(limpiarTexto(null, 10)).toBe('');
      expect(limpiarTexto({ a: 1 }, 10)).toBe('');
      expect(limpiarTexto(42, 10)).toBe('42');
    });
  });

  describe('sanearVista', () => {
    it('limita habilidades a 50 únicas de 100 caracteres y los textos a los topes del DTO', () => {
      const vista = vistaVacia('manual', null);
      vista.nombre = 'n'.repeat(500);
      vista.descripcion = 'd'.repeat(9000);
      vista.habilidades = [
        ...Array.from({ length: 80 }, (_, i) => 'h' + i),
        'h1',
        'z'.repeat(300),
      ];
      vista.url_verificacion = 'https://a.test/' + 'u'.repeat(3000);
      const v = sanearVista(vista);
      expect(v.nombre).toHaveLength(200);
      expect(v.descripcion).toHaveLength(5000);
      expect(v.habilidades).toHaveLength(50);
      expect(new Set(v.habilidades).size).toBe(50);
      expect(v.url_verificacion).toBeNull();
    });
  });

  describe('credly (patrones)', () => {
    it('reconoce credly.com y www.credly.com, y rechaza hosts parecidos', () => {
      expect(idDeCredly('https://credly.com/badges/' + ID)).toBe(ID);
      expect(idDeCredly('https://www.credly.com/badges/' + ID)).toBe(ID);
      expect(idDeCredly('https://credlyXcom/badges/' + ID)).toBeNull();
      expect(idDeCredly('https://evilcredly.com/badges/' + ID)).toBeNull();
    });
    it('el embed admite espacios alrededor de =', () => {
      expect(idDeCredly('<div data-share-badge-id = "' + ID + '"></div>')).toBe(
        ID,
      );
    });
  });

  describe('credly', () => {
    it('acepta enlace de badge, embedded_badge y código de embed', () => {
      expect(
        credlyExtractor.acepta(`https://www.credly.com/badges/${ID}`),
      ).toBe(true);
      expect(
        credlyExtractor.acepta(
          `https://www.credly.com/badges/${ID}/public_url`,
        ),
      ).toBe(true);
      expect(
        credlyExtractor.acepta(`https://www.credly.com/embedded_badge/${ID}`),
      ).toBe(true);
      expect(
        credlyExtractor.acepta(
          `<div data-iframe-width="150" data-share-badge-id="${ID}" data-share-badge-host="https://www.credly.com"></div><script async src="//cdn.credly.com/assets/utilities/embed.js"></script>`,
        ),
      ).toBe(true);
      expect(credlyExtractor.acepta('https://otro.test/badges/x')).toBe(false);
      expect(
        idDeCredly(`https://www.credly.com/badges/${ID.toUpperCase()}`),
      ).toBe(ID);
    });

    it('mapea badges.json: nombre, descripción, habilidades, emisor primary, fechas e imagen sin /size/', async () => {
      const fetchMock = mockearFetch({
        [`https://www.credly.com/badges/${ID}`]: html(PAGINA_CREDLY),
        'https://www.credly.com/users/jane-doe/badges.json': json(BADGES_JSON),
      });

      const v = await credlyExtractor.extraer(
        `https://www.credly.com/badges/${ID}`,
      );

      expect(v).toMatchObject({
        proveedor: 'credly',
        nombre: 'AWS Certified Cloud Practitioner',
        emisor: 'Amazon Web Services Training and Certification',
        descripcion: 'Valida conocimientos de la nube AWS.',
        fecha_emision: '2024-03-15',
        fecha_expiracion: '2027-03-15',
        habilidades: ['Cloud Computing', 'AWS'],
        id_externo: ID,
        url_verificacion: `https://www.credly.com/badges/${ID}`,
        imagen: { url: 'https://images.credly.com/images/aws/image.png' },
        avisos: [],
      });
      // El enlace de navegación /users/sign_in se ignora.
      expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
        `https://www.credly.com/badges/${ID}`,
        'https://www.credly.com/users/jane-doe/badges.json',
      ]);
    });

    it('pagina el listado hasta encontrar el id', async () => {
      mockearFetch({
        [`https://www.credly.com/badges/${ID}`]: html(PAGINA_CREDLY),
        'https://www.credly.com/users/jane-doe/badges.json': json({
          data: [BADGES_JSON.data[0]],
          metadata: { total_pages: 2 },
        }),
        'https://www.credly.com/users/jane-doe/badges.json?page=2': json({
          data: [BADGES_JSON.data[1]],
          metadata: { total_pages: 2 },
        }),
      });
      const v = await credlyExtractor.extraer(
        `https://www.credly.com/embedded_badge/${ID}`,
      );
      expect(v.nombre).toBe('AWS Certified Cloud Practitioner');
    });

    it('si el id no está en el listado, cae a og:title/og:image con aviso', async () => {
      mockearFetch({
        [`https://www.credly.com/badges/${ID}`]: html(PAGINA_CREDLY),
        'https://www.credly.com/users/jane-doe/badges.json': json({
          data: [BADGES_JSON.data[0]],
          metadata: { total_pages: 1 },
        }),
      });
      const v = await credlyExtractor.extraer(
        `https://www.credly.com/badges/${ID}`,
      );
      expect(v.nombre).toBe('AWS Certified Cloud Practitioner & más');
      expect(v.imagen?.url).toBe(
        'https://images.credly.com/images/aws/image.png',
      );
      expect(v.avisos.length).toBeGreaterThanOrEqual(2);
      expect(v.proveedor).toBe('credly');
    });

    it('sin enlace al perfil, cae a og:* con aviso', async () => {
      mockearFetch({
        [`https://www.credly.com/badges/${ID}`]: html(
          PAGINA_CREDLY.replace(/<a href="\/users\/(?!sign_in)[^<]*<\/a>/g, ''),
        ),
      });
      const v = await credlyExtractor.extraer(
        `https://www.credly.com/badges/${ID}`,
      );
      expect(v.nombre).toContain('AWS Certified');
      expect(v.avisos.join(' ')).toMatch(/perfil/);
    });

    it('si la página no se puede leer devuelve campos vacíos y aviso (sin lanzar)', async () => {
      mockearFetch({});
      const v = await credlyExtractor.extraer(
        `https://www.credly.com/badges/${ID}`,
      );
      expect(v.nombre).toBe('');
      expect(v.imagen).toBeNull();
      expect(v.id_externo).toBe(ID);
      expect(v.avisos[0]).toMatch(/Credly/);
    });
  });

  describe('open-badges (assertion hosted)', () => {
    it('resuelve BadgeClass e Issuer y mapea los campos', async () => {
      mockearFetch({
        'https://badges.ejemplo.test/assertions/42': json(
          ASSERTION_2X,
          'application/ld+json',
        ),
        'https://badges.ejemplo.test/classes/1': json(BADGE_CLASS),
        'https://badges.ejemplo.test/issuer': json(ISSUER),
      });
      const v = await openBadgesExtractor.extraer(
        'https://badges.ejemplo.test/assertions/42',
      );
      expect(v).toMatchObject({
        proveedor: 'open_badges',
        nombre: 'Maestro del Cloud',
        emisor: 'Academia Ejemplo',
        descripcion: 'Demuestra dominio.',
        fecha_emision: '2023-06-01',
        fecha_expiracion: '2026-06-01',
        habilidades: ['Kubernetes', 'Docker', 'devops'],
        url_verificacion: 'https://badges.ejemplo.test/assertions/42',
        id_externo: 'https://badges.ejemplo.test/assertions/42',
        imagen: { url: 'https://badges.ejemplo.test/img/maestro.png' },
        avisos: [],
      });
    });

    it('un BadgeClass inalcanzable da avisos y campos vacíos, no un error', async () => {
      mockearFetch({
        'https://badges.ejemplo.test/assertions/42': json(ASSERTION_2X),
      });
      const v = await openBadgesExtractor.extraer(
        'https://badges.ejemplo.test/assertions/42',
      );
      expect(v.nombre).toBe('');
      expect(v.fecha_emision).toBe('2023-06-01');
      expect(v.avisos.length).toBeGreaterThan(0);
    });

    it('soporta Open Badges 3.0 (credentialSubject.achievement)', async () => {
      mockearFetch({
        'https://ob3.ejemplo.test/c/1': json({
          '@context': ['https://www.w3.org/ns/credentials/v2'],
          type: ['VerifiableCredential', 'OpenBadgeCredential'],
          id: 'https://ob3.ejemplo.test/c/1',
          issuer: { id: 'https://ob3.ejemplo.test/i', name: 'Instituto OB3' },
          validFrom: '2025-02-01T00:00:00Z',
          credentialSubject: {
            achievement: {
              name: 'Logro 3.0',
              description: 'Desc 3',
              image: { id: 'https://ob3.ejemplo.test/logro.png' },
              tag: ['a', 'b'],
            },
          },
        }),
      });
      const v = await openBadgesExtractor.extraer(
        'https://ob3.ejemplo.test/c/1',
      );
      expect(v).toMatchObject({
        nombre: 'Logro 3.0',
        emisor: 'Instituto OB3',
        fecha_emision: '2025-02-01',
        habilidades: ['a', 'b'],
        imagen: { url: 'https://ob3.ejemplo.test/logro.png' },
      });
    });

    it('no aplica si el recurso no es un assertion (HTML o JSON cualquiera)', async () => {
      mockearFetch({
        'https://a.test/p': html('<html></html>'),
        'https://a.test/j': json({ hola: 'mundo' }),
      });
      await expect(
        openBadgesExtractor.extraer('https://a.test/p'),
      ).rejects.toThrow(ExtractorNoAplica);
      await expect(
        openBadgesExtractor.extraer('https://a.test/j'),
      ).rejects.toThrow(ExtractorNoAplica);
    });
  });

  describe('png-horneado', () => {
    it('lee un chunk iTXt openbadges con el assertion en JSON (sin comprimir y comprimido)', async () => {
      const assertion = JSON.stringify(ASSERTION_2X);
      expect(leerChunkOpenBadges(await pngConChunk('iTXt', assertion))).toBe(
        assertion,
      );
      expect(
        leerChunkOpenBadges(await pngConChunk('iTXt', assertion, true)),
      ).toBe(assertion);
      expect(leerChunkOpenBadges(await pngConChunk('tEXt', assertion))).toBe(
        assertion,
      );
      expect(leerChunkOpenBadges(await pngSimple())).toBeNull();
      expect(leerChunkOpenBadges(Buffer.from('no es un png'))).toBeNull();
    });

    it('extrae por URL: assertion horneado -> BadgeClass -> vista previa', async () => {
      mockearFetch({
        'https://badges.ejemplo.test/baked.png': {
          cuerpo: await pngConChunk('iTXt', JSON.stringify(ASSERTION_2X)),
          tipo: 'image/png',
        },
        'https://badges.ejemplo.test/classes/1': json(BADGE_CLASS),
        'https://badges.ejemplo.test/issuer': json(ISSUER),
      });
      const v = await pngHorneadoExtractor.extraer(
        'https://badges.ejemplo.test/baked.png',
      );
      expect(v.proveedor).toBe('open_badges');
      expect(v.nombre).toBe('Maestro del Cloud');
      expect(v.emisor).toBe('Academia Ejemplo');
    });

    it('si el chunk trae una URL hosted, la descarga', async () => {
      mockearFetch({
        'https://badges.ejemplo.test/baked.png': {
          cuerpo: await pngConChunk(
            'tEXt',
            'https://badges.ejemplo.test/assertions/42',
          ),
          tipo: 'image/png',
        },
        'https://badges.ejemplo.test/assertions/42': json(ASSERTION_2X),
        'https://badges.ejemplo.test/classes/1': json(BADGE_CLASS),
        'https://badges.ejemplo.test/issuer': json(ISSUER),
      });
      const v = await pngHorneadoExtractor.extraer(
        'https://badges.ejemplo.test/baked.png',
      );
      expect(v.nombre).toBe('Maestro del Cloud');
    });

    it('PNG sin chunk o contenido que no es PNG: no aplica', async () => {
      mockearFetch({
        'https://a.test/plano.png': {
          cuerpo: await pngSimple(),
          tipo: 'image/png',
        },
        'https://a.test/pagina': html('<html></html>'),
      });
      await expect(
        pngHorneadoExtractor.extraer('https://a.test/plano.png'),
      ).rejects.toThrow(ExtractorNoAplica);
      await expect(
        pngHorneadoExtractor.extraer('https://a.test/pagina'),
      ).rejects.toThrow(ExtractorNoAplica);
    });

    it('lee el elemento openbadges:assertion de un SVG (JSON en CDATA y verify hosted)', () => {
      const conJson = `<svg xmlns:openbadges="http://openbadges.org"><openbadges:assertion verify="https://x.test/a"><![CDATA[${JSON.stringify(ASSERTION_2X)}]]></openbadges:assertion></svg>`;
      expect(leerOpenBadgesDeSvg(conJson)?.assertion).toMatchObject({
        type: 'Assertion',
      });
      const soloVerify = `<svg><openbadges:assertion verify="https://x.test/a"></openbadges:assertion></svg>`;
      expect(leerOpenBadgesDeSvg(soloVerify)).toEqual({
        url: 'https://x.test/a',
      });
      expect(leerOpenBadgesDeSvg('<svg/>')).toBeNull();
    });
  });

  describe('imagen-directa', () => {
    it('una URL image/png devuelve la imagen, nombre derivado, dimensiones y aviso', async () => {
      mockearFetch({
        'https://cdn.test/mi-insignia_final.png': {
          cuerpo: await pngSimple(),
          tipo: 'image/png',
        },
      });
      const v = await imagenDirectaExtractor.extraer(
        'https://cdn.test/mi-insignia_final.png',
      );
      expect(v.proveedor).toBe('generico');
      expect(v.nombre).toBe('mi insignia final');
      expect(v.imagen).toEqual({
        url: 'https://cdn.test/mi-insignia_final.png',
        ancho: 16,
        alto: 16,
        formato: 'png',
      });
      expect(v.avisos.length).toBeGreaterThan(0);
    });

    it('acepta svg+xml, jpeg y webp; rechaza HTML', async () => {
      mockearFetch({
        'https://cdn.test/a.svg': {
          cuerpo:
            '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"/>',
          tipo: 'image/svg+xml',
        },
        'https://cdn.test/p': html('<html></html>'),
      });
      expect(
        (await imagenDirectaExtractor.extraer('https://cdn.test/a.svg')).imagen
          ?.url,
      ).toBe('https://cdn.test/a.svg');
      await expect(
        imagenDirectaExtractor.extraer('https://cdn.test/p'),
      ).rejects.toThrow(ExtractorNoAplica);
    });
  });

  describe('generico', () => {
    const PAGINA = `<html><head><title>Título de página</title>
<meta property="og:title" content="Insignia &quot;Pro&quot;">
<meta name="description" content="Descripción meta">
<meta content="Plataforma X" property="og:site_name">
<meta name="twitter:image" content="/img/tw.png">
</head><body></body></html>`;

    it('toma og:*, twitter:image relativo y marca proveedor generico', async () => {
      mockearFetch({ 'https://acc.test/badge/9': html(PAGINA) });
      const v = await genericoExtractor.extraer('https://acc.test/badge/9');
      expect(v).toMatchObject({
        proveedor: 'generico',
        nombre: 'Insignia "Pro"',
        descripcion: 'Descripción meta',
        emisor: 'Plataforma X',
        url_verificacion: 'https://acc.test/badge/9',
        imagen: { url: 'https://acc.test/img/tw.png' },
      });
      expect(v.avisos[0]).toMatch(/revisa/i);
    });

    it('sin og:title usa <title>; emisor cae al host; no aplica si no es HTML', async () => {
      mockearFetch({
        'https://acc.test/b': html(
          '<html><head><title>Solo título</title></head></html>',
        ),
        'https://acc.test/j': json({ a: 1 }),
      });
      const v = await genericoExtractor.extraer('https://acc.test/b');
      expect(v.nombre).toBe('Solo título');
      expect(v.emisor).toBe('acc.test');
      expect(v.imagen).toBeNull();
      await expect(
        genericoExtractor.extraer('https://acc.test/j'),
      ).rejects.toThrow(ExtractorNoAplica);
    });
  });

  describe('contexto de extracción', () => {
    it('memoiza descargas: la misma URL se pide una sola vez', async () => {
      const fetchMock = mockearFetch({
        'https://a.test/x': html('<html></html>'),
      });
      const ctx = crearContextoExtraccion();
      await ctx.descargar('https://a.test/x', { accept: 'text/html' });
      await ctx.descargar('https://a.test/x', { accept: 'image/*' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
