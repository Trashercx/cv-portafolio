import {
  construirClaveMedia,
  contentDispositionInline,
  nombreArchivoSeguro,
  repararNombreOriginal,
} from './clave-media';

/** Simula cómo entrega Multer un nombre UTF-8: decodificado como latin1. */
const comoMulter = (nombre: string) =>
  Buffer.from(nombre, 'utf8').toString('latin1');

describe('clave-media (Fase 7h, UC-09)', () => {
  describe('repararNombreOriginal', () => {
    it('recupera tildes y eñes que Multer decodificó como latin1', () => {
      expect(
        repararNombreOriginal(comoMulter('Diseño Certificación.png')),
      ).toBe('Diseño Certificación.png');
    });

    it('deja intacto un nombre ASCII', () => {
      expect(repararNombreOriginal('foto.png')).toBe('foto.png');
    });

    it('deja intacto un latin1 que no es UTF-8 válido', () => {
      expect(repararNombreOriginal('café.png')).toBe('café.png');
    });
  });

  describe('nombreArchivoSeguro', () => {
    it.each([
      ['Mi Certificado AWS.pdf', 'application/pdf', 'Mi-Certificado-AWS.pdf'],
      ['Diseño (final) v2.PNG', 'image/png', 'Diseno-final-v2.png'],
      ['foto.HEIC.jpg', 'image/jpeg', 'foto.HEIC.jpg'],
      ['captura.jpeg', 'image/jpeg', 'captura.jpg'],
      ['imagen-sin-extension', 'image/webp', 'imagen-sin-extension.webp'],
      ['../../etc/passwd.png', 'image/png', 'etc-passwd.png'],
      ['###.png', 'image/png', 'archivo.png'],
      ['', 'application/pdf', 'archivo.pdf'],
      ['  espacios   raros  .svg', 'image/svg+xml', 'espacios-raros.svg'],
    ])('%s (%s) → %s', (original, mime, esperado) => {
      expect(nombreArchivoSeguro(original, mime)).toBe(esperado);
    });

    it('usa la extensión real del contenido, no la declarada', () => {
      expect(nombreArchivoSeguro('logo.png', 'image/webp')).toBe('logo.webp');
    });

    it('limita la base a 80 caracteres', () => {
      const nombre = nombreArchivoSeguro(`${'a'.repeat(200)}.png`, 'image/png');
      expect(nombre).toBe(`${'a'.repeat(80)}.png`);
    });

    it('solo deja caracteres seguros para una URL', () => {
      expect(nombreArchivoSeguro('a b?c#d%e&f.png', 'image/png')).toMatch(
        /^[A-Za-z0-9._-]+$/,
      );
    });
  });

  describe('construirClaveMedia', () => {
    it('arma <prefijo>/<id de 12 hex>/<nombre>', () => {
      expect(
        construirClaveMedia('perfil', 'Foto Perfil.jpg', 'image/jpeg'),
      ).toMatch(/^perfil\/[0-9a-f]{12}\/Foto-Perfil\.jpg$/);
    });

    it('sin prefijo arma <id>/<nombre>', () => {
      expect(
        construirClaveMedia(undefined, 'cv.pdf', 'application/pdf'),
      ).toMatch(/^[0-9a-f]{12}\/cv\.pdf$/);
    });

    it('dos subidas del mismo archivo no colisionan', () => {
      const a = construirClaveMedia('perfil', 'x.png', 'image/png');
      const b = construirClaveMedia('perfil', 'x.png', 'image/png');
      expect(a).not.toBe(b);
    });
  });

  it('contentDispositionInline codifica el nombre UTF-8 y deja un respaldo ASCII', () => {
    expect(contentDispositionInline('año.pdf')).toBe(
      'inline; filename="a_o.pdf"; filename*=UTF-8\'\'a%C3%B1o.pdf',
    );
  });
});
