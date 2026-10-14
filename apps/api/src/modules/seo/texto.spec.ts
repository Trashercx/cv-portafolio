import { escaparHtml, recortarDescripcion } from './texto';

describe('recortarDescripcion (Fase 8, UC-34)', () => {
  it('devuelve el texto limpio si cabe en el límite', () => {
    expect(recortarDescripcion('  Hola\n\n  mundo  ')).toBe('Hola mundo');
  });

  it('corta en el último espacio y agrega «…»', () => {
    const texto = 'palabra '.repeat(40);
    const r = recortarDescripcion(texto);
    expect(r.endsWith('…')).toBe(true);
    expect(r.length).toBeLessThanOrEqual(155);
    expect(r).not.toMatch(/\s…$/);
  });

  it('sin espacios corta duro en max - 1', () => {
    expect(recortarDescripcion('a'.repeat(200), 10)).toBe(`${'a'.repeat(9)}…`);
  });

  it('quita puntuación final antes de la elipsis', () => {
    expect(recortarDescripcion('uno dos, tres cuatro', 10)).toBe('uno dos…');
  });
});

describe('escaparHtml', () => {
  it('escapa & < > " y comilla simple', () => {
    expect(escaparHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;',
    );
  });
});
