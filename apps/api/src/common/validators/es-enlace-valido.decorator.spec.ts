import { esEnlaceValido } from './es-enlace-valido.decorator';

describe('esEnlaceValido (Fase 7, UC-07)', () => {
  it.each([
    'https://ejemplo.com',
    'http://ejemplo.com/ruta?x=1',
    '/proyectos',
    '/',
    '#contacto',
    '#',
  ])('acepta %s', (valor) => {
    expect(esEnlaceValido(valor)).toBe(true);
  });

  it.each([
    '//evil.com',
    '/\\evil.com',
    '/\\\\evil.com',
    'javascript:alert(1)',
    'ftp://ejemplo.com',
    'ejemplo.com',
    '',
    'https://',
    ' /ruta',
  ])('rechaza %s', (valor) => {
    expect(esEnlaceValido(valor)).toBe(false);
  });

  it('rechaza valores que no son texto', () => {
    expect(esEnlaceValido(null)).toBe(false);
    expect(esEnlaceValido(42)).toBe(false);
  });
});
