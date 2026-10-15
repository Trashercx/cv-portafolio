import { validarImagen } from '../../media/validar-imagen';
import {
  ajustarTitulo,
  escaparXml,
  fechaEmitidaEnIngles,
  generarSvgClaudeAcademy,
  paletaDeCurso,
} from './claude-academy-svg';
import {
  claudeAcademyExtractor,
  codigoDeClaudeAcademy,
  idDeCursoEnCatalogo,
  URL_API_CLAUDE_ACADEMY,
} from './claude-academy';
import { EXTRACTORES } from './index';
import { CLAVES_PROVEEDOR, modoDeProveedor } from './proveedores';
import { ContextoExtraccion, ExtractorNoAplica } from './tipos';
import { sanearVista } from './utils';
import { RedSeguraError } from '../red-segura';

const CODIGO = 'df6e12f44e4efdfe708d0f05a9f6f40d';
const URL_VERIFICACION = `https://academy.claude.com/verify/${CODIGO}`;

/** Contexto falso: responde por URL y registra las peticiones. */
function contexto(respuestas: Record<string, string | Error>) {
  const llamadas: { url: string; opciones?: unknown }[] = [];
  const ctx: ContextoExtraccion = {
    descargar(url, opciones) {
      llamadas.push({ url, opciones });
      const r = respuestas[url];
      if (r === undefined) return Promise.reject(new RedSeguraError('404'));
      if (r instanceof Error) return Promise.reject(r);
      return Promise.resolve({
        buffer: Buffer.from(r),
        contentType: url.endsWith('.js')
          ? 'text/javascript'
          : url === URL_API_CLAUDE_ACADEMY
            ? 'application/json'
            : 'text/html',
        urlFinal: url,
      });
    },
  };
  return { ctx, llamadas };
}

const RESPUESTA_VALIDA = JSON.stringify({
  valid: true,
  certificateName: 'Oscar.dev',
  courseTitle: 'Claude Code 101',
  issuedAt: '2026-09-06T06:03:56.242973Z',
});

const CATALOGO = {
  'https://academy.claude.com/':
    '<script type="module" src="/assets/v1/index-ezoxscef.js"></script>',
  'https://academy.claude.com/assets/v1/index-ezoxscef.js':
    'import("./courses-kmg2q1bn.js")',
  'https://academy.claude.com/assets/v1/courses-kmg2q1bn.js':
    'x={kind:"course",id:"22npsux5ldfq0",visibility:"public",shared:{title:"Claude 101"}};' +
    'y={kind:"course",id:"tk9do23ky8ac",visibility:"public",shared:{title:"Claude Code 101"}}',
};

function svgDeVista(url: string): string {
  return Buffer.from(url.split(',')[1], 'base64').toString('utf8');
}

describe('Claude Academy (Fase 7i, UC-35)', () => {
  describe('registro y reconocimiento del enlace', () => {
    it('es un proveedor automático y va antes de los genéricos en la cadena', () => {
      expect(CLAVES_PROVEEDOR).toContain('claude_academy');
      expect(modoDeProveedor('claude_academy')).toBe('automatico');
      const indice = EXTRACTORES.indexOf(claudeAcademyExtractor);
      expect(indice).toBeGreaterThanOrEqual(0);
      expect(indice).toBeLessThan(EXTRACTORES.length - 3);
    });

    it.each([
      [URL_VERIFICACION, CODIGO],
      [`${URL_VERIFICACION}?utm=x`, CODIGO],
      [`Mira mi insignia: ${URL_VERIFICACION}`, CODIGO],
      ['https://academy.claude.com/verify/abc', null],
      ['http://academy.claude.com/verify/df6e12f44e4efdfe', null],
      ['https://academy.claude.com.evil.test/verify/df6e12f44e4efdfe', null],
      ['https://academy.claude.com/courses/claude-code-101', null],
    ])('%s → %s', (entrada, esperado) => {
      expect(codigoDeClaudeAcademy(entrada)).toBe(esperado);
    });
  });

  describe('extraer', () => {
    it('llama al API público con POST JSON y arma la vista con la imagen generada', async () => {
      const { ctx, llamadas } = contexto({
        [URL_API_CLAUDE_ACADEMY]: RESPUESTA_VALIDA,
        ...CATALOGO,
      });

      const vista = sanearVista(
        await claudeAcademyExtractor.extraer(URL_VERIFICACION, ctx),
      );

      expect(llamadas[0]).toMatchObject({
        url: URL_API_CLAUDE_ACADEMY,
        opciones: {
          tipos: ['application/json'],
          postJson: {
            cuerpo: { verifyCode: CODIGO },
            cabeceras: { 'Connect-Protocol-Version': '1' },
          },
        },
      });
      expect(vista).toMatchObject({
        proveedor: 'claude_academy',
        modo_proveedor: 'automatico',
        nombre: 'Claude Code 101',
        emisor: 'Anthropic · Claude Academy',
        fecha_emision: '2026-09-06',
        fecha_expiracion: null,
        url_verificacion: URL_VERIFICACION,
        id_externo: CODIGO,
      });
      expect(vista.imagen?.url).toMatch(/^data:image\/svg\+xml;base64,/);
      expect(vista.imagen).toMatchObject({
        ancho: 1650,
        alto: 1125,
        formato: 'svg',
      });

      const svg = svgDeVista(vista.imagen!.url);
      expect(svg).toContain('Oscar.dev');
      expect(svg).toContain('ISSUED SEPTEMBER 6, 2026');
      // Color del curso por su id del catálogo (melocotón para Claude Code 101).
      expect(svg).toContain('#d97757');
      expect(await validarImagen(Buffer.from(svg))).toEqual({
        mime: 'image/svg+xml',
        formato: 'svg',
      });
    });

    it('si el catálogo no responde, igual genera la insignia (color por título)', async () => {
      const { ctx } = contexto({ [URL_API_CLAUDE_ACADEMY]: RESPUESTA_VALIDA });
      const vista = await claudeAcademyExtractor.extraer(URL_VERIFICACION, ctx);
      const svg = svgDeVista(vista.imagen!.url);
      expect(svg).toContain(paletaDeCurso('Claude Code 101').viva);
    });

    it('una insignia no válida devuelve la vista vacía con aviso', async () => {
      const { ctx } = contexto({
        [URL_API_CLAUDE_ACADEMY]: JSON.stringify({ valid: false }),
      });
      const vista = await claudeAcademyExtractor.extraer(URL_VERIFICACION, ctx);
      expect(vista.nombre).toBe('');
      expect(vista.imagen).toBeNull();
      expect(vista.avisos[0]).toMatch(/no pudo verificar/);
    });

    it('una respuesta que no es JSON no le corresponde', async () => {
      const { ctx } = contexto({ [URL_API_CLAUDE_ACADEMY]: '<html>' });
      await expect(
        claudeAcademyExtractor.extraer(URL_VERIFICACION, ctx),
      ).rejects.toBeInstanceOf(ExtractorNoAplica);
    });

    it('un fallo de red del API se propaga como RedSeguraError', async () => {
      const { ctx } = contexto({
        [URL_API_CLAUDE_ACADEMY]: new RedSeguraError(
          'El servidor respondió 503',
        ),
      });
      await expect(
        claudeAcademyExtractor.extraer(URL_VERIFICACION, ctx),
      ).rejects.toBeInstanceOf(RedSeguraError);
    });

    it('escapa los textos que llegan del API remoto', async () => {
      const { ctx } = contexto({
        [URL_API_CLAUDE_ACADEMY]: JSON.stringify({
          valid: true,
          certificateName: 'Ana & "Bob" <script>',
          courseTitle: 'Curso <b>',
          issuedAt: '2026-01-02T00:00:00Z',
        }),
      });
      const vista = await claudeAcademyExtractor.extraer(URL_VERIFICACION, ctx);
      const svg = svgDeVista(vista.imagen!.url);
      expect(svg).not.toContain('<script');
      expect(svg).not.toContain('<b>');
      expect(await validarImagen(Buffer.from(svg))).not.toBeNull();
    });
  });

  describe('idDeCursoEnCatalogo', () => {
    it('encuentra el id por título sin distinguir mayúsculas ni espacios', async () => {
      const { ctx } = contexto(CATALOGO);
      expect(await idDeCursoEnCatalogo(ctx, '  claude   code 101 ')).toBe(
        'tk9do23ky8ac',
      );
      expect(await idDeCursoEnCatalogo(ctx, 'Otro curso')).toBeNull();
    });

    it('respeta el plazo global aunque una descarga no responda nunca', async () => {
      const ctx: ContextoExtraccion = {
        descargar: () => new Promise(() => undefined),
      };
      const inicio = Date.now();
      expect(await idDeCursoEnCatalogo(ctx, 'Claude Code 101', 50)).toBeNull();
      expect(Date.now() - inicio).toBeLessThan(1000);
    });

    it('devuelve null si falta cualquier pieza', async () => {
      const { ctx } = contexto({});
      expect(await idDeCursoEnCatalogo(ctx, 'Claude Code 101')).toBeNull();
    });
  });

  describe('generador del SVG', () => {
    it('elige la paleta con FNV-1a como la página original', () => {
      expect(paletaDeCurso('tk9do23ky8ac').clave).toBe('peach');
      expect(paletaDeCurso('3n2veylcj0hl').clave).toBe('cactus');
      expect(paletaDeCurso('s3g8hsa4x2a7').clave).toBe('heather');
    });

    it('ajusta títulos largos en hasta 3 líneas', () => {
      expect(ajustarTitulo('Claude 101').lineas).toEqual(['Claude 101']);
      const largo = ajustarTitulo(
        'Deploying Claude Enterprise with confidence: The five decisions that shape your rollout',
      );
      expect(largo.lineas.length).toBeLessThanOrEqual(3);
      expect(largo.tamano).toBeLessThan(110);
    });

    it('formatea la fecha en inglés y tolera fechas ausentes o inválidas', () => {
      expect(fechaEmitidaEnIngles('2026-09-06T06:03:56Z')).toBe(
        'September 6, 2026',
      );
      expect(fechaEmitidaEnIngles(null)).toBeNull();
      expect(fechaEmitidaEnIngles('ayer')).toBeNull();
      expect(
        generarSvgClaudeAcademy({ curso: 'X', titular: 'Y', emitidaIso: null }),
      ).not.toContain('ISSUED');
    });

    it.each([
      ['JavaScript: Fundamentals', 'Ana'],
      ['Curso', 'online = sí, onload=x'],
    ])(
      'un texto legítimo que parece código activo (%s / %s) sigue siendo un SVG admitido',
      async (curso, titular) => {
        const svg = generarSvgClaudeAcademy({
          curso,
          titular,
          emitidaIso: null,
        });
        expect(await validarImagen(Buffer.from(svg))).toEqual({
          mime: 'image/svg+xml',
          formato: 'svg',
        });
      },
    );

    it('escaparXml cubre los cinco caracteres especiales', () => {
      expect(escaparXml(`<a href="x">'&'</a>`)).toBe(
        '&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;',
      );
    });
  });
});
