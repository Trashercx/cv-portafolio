import { lookup } from 'dns/promises';
import { datacampExtractor } from './datacamp';
import { EXTRACTORES } from './index';
import {
  CLAVES_PROVEEDOR,
  listarProveedores,
  PROVEEDORES_INSIGNIA,
} from './proveedores';
import { fechaIngles, skilljarExtractor } from './skilljar';

jest.mock('dns/promises', () => ({ lookup: jest.fn() }));

const HASH = 'a'.repeat(40);
const URL_SKILLJAR = 'https://verify.skilljar.com/c/abc123xyz';

const PAGINA_SKILLJAR = `<html><head>
<meta property="og:title" content="Certificate for Claude Certified Architect &ndash; Foundations Certification">
<meta property="og:site_name" content="Anthropic">
<meta property="og:description" content="Descripci&oacute;n del curso">
<meta property="og:image" content="https://cdn.skilljar.test/cert.jpg?a=1&amp;b=2">
<script>var x = "Completion Date Jan 1, 2000";</script>
</head><body>
<div>Completion Date May 27, 2026</div><div>Course Completed Claude Certified Architect – Foundations Certification</div>
<div>Offered By Anthropic Education</div><div>Certificate Expires Nov. 27, 2026</div>
</body></html>`;

const PAGINA_SIN_EXPIRA = PAGINA_SKILLJAR.replace(
  'Certificate Expires Nov. 27, 2026',
  '',
);

function mockearFetch(status: number, cuerpo: string, tipo = 'text/html') {
  const mock = jest.fn(
    async () =>
      new Response(cuerpo, { status, headers: { 'content-type': tipo } }),
  );
  globalThis.fetch = mock as unknown as typeof fetch;
  return mock;
}

describe('proveedores de insignias (Fase 7e, UC-35)', () => {
  const fetchOriginal = globalThis.fetch;
  beforeEach(() => {
    (lookup as unknown as jest.Mock)
      .mockReset()
      .mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  });
  afterAll(() => {
    globalThis.fetch = fetchOriginal;
  });

  it('claves únicas y listado sin regex', () => {
    expect(new Set(CLAVES_PROVEEDOR).size).toBe(PROVEEDORES_INSIGNIA.length);
    expect(CLAVES_PROVEEDOR).toEqual(
      expect.arrayContaining(['credly', 'skilljar', 'datacamp', 'manual']),
    );
    for (const p of listarProveedores()) {
      expect(Object.keys(p).sort()).toEqual([
        'ayuda',
        'clave',
        'modo',
        'nombre',
      ]);
    }
    expect(listarProveedores().find((p) => p.clave === 'datacamp')?.modo).toBe(
      'archivo',
    );
  });

  it('skilljar y datacamp van antes de generico en la cadena', () => {
    const i = (e: unknown) => EXTRACTORES.indexOf(e as never);
    expect(i(skilljarExtractor)).toBeGreaterThan(-1);
    expect(i(datacampExtractor)).toBeGreaterThan(-1);
    expect(i(skilljarExtractor)).toBeLessThan(EXTRACTORES.length - 1);
    expect(i(datacampExtractor)).toBeLessThan(EXTRACTORES.length - 1);
  });

  describe('fechaIngles', () => {
    it.each([
      ['May 27, 2026', '2026-05-27'],
      ['Nov. 27, 2026', '2026-11-27'],
      ['Sept. 3, 2025', '2025-09-03'],
      ['January 5, 2025', '2025-01-05'],
      ['Sep 3 2025', '2025-09-03'],
      ['Dec. 31, 2024', '2024-12-31'],
    ])('%s -> %s', (entrada, esperado) => {
      expect(fechaIngles(entrada)).toBe(esperado);
    });
    it('rechaza basura y fechas imposibles', () => {
      expect(fechaIngles('nada')).toBeNull();
      expect(fechaIngles('Feb 30, 2025')).toBeNull();
      expect(fechaIngles(undefined)).toBeNull();
    });
  });

  describe('skilljar', () => {
    it('acepta solo hosts skilljar anclados', () => {
      expect(skilljarExtractor.acepta(URL_SKILLJAR)).toBe(true);
      expect(
        skilljarExtractor.acepta(
          'https://anthropic.skilljar.com/x/verify/c/abc',
        ),
      ).toBe(true);
      expect(
        skilljarExtractor.acepta('https://skilljar.com.evil.test/c/abc'),
      ).toBe(false);
      expect(
        skilljarExtractor.acepta('https://evil.test/skilljar.com/c/a'),
      ).toBe(false);
    });

    it('mapea nombre, emisor, fechas, imagen con &amp; decodificado', async () => {
      mockearFetch(200, PAGINA_SKILLJAR);
      const v = await skilljarExtractor.extraer(URL_SKILLJAR);
      expect(v).toMatchObject({
        proveedor: 'skilljar',
        modo_proveedor: 'automatico',
        nombre: 'Claude Certified Architect – Foundations Certification',
        emisor: 'Anthropic Education',
        descripcion: 'Descripción del curso',
        fecha_emision: '2026-05-27',
        fecha_expiracion: '2026-11-27',
        url_verificacion: URL_SKILLJAR,
        id_externo: 'abc123xyz',
        imagen: { url: 'https://cdn.skilljar.test/cert.jpg?a=1&b=2' },
      });
      expect(v.avisos.join(' ')).toMatch(/caduca/);
    });

    it('sin "Certificate Expires": fecha_expiracion null', async () => {
      mockearFetch(200, PAGINA_SIN_EXPIRA);
      const v = await skilljarExtractor.extraer(URL_SKILLJAR);
      expect(v.fecha_emision).toBe('2026-05-27');
      expect(v.fecha_expiracion).toBeNull();
      expect(v.emisor).toBe('Anthropic Education');
    });
  });

  describe('datacamp', () => {
    const URL_DC = `https://www.datacamp.com/statement-of-accomplishment/course/${HASH}`;

    it('acepta ambas rutas', () => {
      expect(datacampExtractor.acepta(URL_DC)).toBe(true);
      expect(
        datacampExtractor.acepta(
          `https://datacamp.com/completed/statement-of-accomplishment/track/${HASH}`,
        ),
      ).toBe(true);
      expect(datacampExtractor.acepta('https://datacamp.com/x/' + HASH)).toBe(
        false,
      );
    });

    it('403: datos parciales, aviso y modo archivo', async () => {
      mockearFetch(403, 'Just a moment...');
      const v = await datacampExtractor.extraer(URL_DC);
      expect(v).toMatchObject({
        proveedor: 'datacamp',
        modo_proveedor: 'archivo',
        emisor: 'DataCamp',
        nombre: '',
        imagen: null,
        url_verificacion: URL_DC,
        id_externo: HASH,
      });
      expect(v.avisos[0]).toMatch(/Subir archivo/);
    });

    it('200 con og:title y og:image: camino genérico con proveedor datacamp', async () => {
      mockearFetch(
        200,
        '<meta property="og:title" content="Intro to Python"><meta property="og:image" content="https://img.datacamp.test/a.png">',
      );
      const v = await datacampExtractor.extraer(URL_DC);
      expect(v).toMatchObject({
        proveedor: 'datacamp',
        emisor: 'DataCamp',
        nombre: 'Intro to Python',
        id_externo: HASH,
        imagen: { url: 'https://img.datacamp.test/a.png' },
      });
    });
  });
});
