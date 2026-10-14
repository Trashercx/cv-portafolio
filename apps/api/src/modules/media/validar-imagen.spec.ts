import { sharp } from './sharp';
import {
  esHeicPorContenido,
  esSvgSeguro,
  validarImagen,
} from './validar-imagen';

const svg = (cuerpo = '') =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">${cuerpo}<rect width="10" height="10"/></svg>`,
  );

describe('validarImagen (Fase 7d, UC-09/UC-35)', () => {
  it('reconoce un PNG real por contenido, con dimensiones', async () => {
    const png = await sharp({
      create: { width: 12, height: 8, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer();
    expect(await validarImagen(png)).toEqual({
      mime: 'image/png',
      formato: 'png',
      ancho: 12,
      alto: 8,
    });
  });

  it('reconoce JPEG y WebP aunque nadie declare su MIME', async () => {
    const base = sharp({
      create: { width: 4, height: 4, channels: 3, background: '#000' },
    });
    expect(
      (await validarImagen(await base.clone().jpeg().toBuffer()))?.mime,
    ).toBe('image/jpeg');
    expect(
      (await validarImagen(await base.clone().webp().toBuffer()))?.mime,
    ).toBe('image/webp');
  });

  it('acepta un SVG limpio, con BOM, prologo XML y comentarios', async () => {
    expect((await validarImagen(svg()))?.mime).toBe('image/svg+xml');
    const conPrologo = Buffer.from(
      '﻿  <?xml version="1.0"?>\n<!-- hecho a mano -->\n' + svg().toString(),
    );
    expect((await validarImagen(conPrologo))?.formato).toBe('svg');
  });

  it.each([
    ['<script>', '<script>alert(1)</script>'],
    ['onload', '<g onLoad = "x()"/>'],
    ['javascript:', '<a xlink:href="JavaScript:alert(1)"/>'],
    ['foreignObject', '<foreignObject><div/></foreignObject>'],
    ['ENTITY', ''],
    ['data:', '<image xlink:href="data:image/png;base64,AAAA"/>'],
    ['href externo', '<image href="https://evil.example/x.png"/>'],
  ])('rechaza un SVG con %s', async (_n, cuerpo) => {
    const texto =
      _n === 'ENTITY'
        ? '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x "y">]><svg xmlns="http://www.w3.org/2000/svg"/>'
        : svg(cuerpo).toString();
    expect(await validarImagen(Buffer.from(texto))).toBeNull();
    expect(esSvgSeguro(Buffer.from(texto))).toBe(false);
  });

  it('rechaza texto o HTML aunque se declare como imagen', async () => {
    expect(await validarImagen(Buffer.from('hola mundo'))).toBeNull();
    expect(await validarImagen(Buffer.from('<html><svg/></html>'))).toBeNull();
    expect(await validarImagen(Buffer.alloc(0))).toBeNull();
  });
});

describe('esHeicPorContenido (Fase 7g, UC-09)', () => {
  const heic = Buffer.from(
    '00000018667479706865696300000000' + '6d6966316865' + '6963',
    'hex',
  );
  it('detecta HEIC por marca mayor o compatible', () => {
    expect(esHeicPorContenido(heic)).toBe(true);
  });
  it('detecta HEIC cuando solo una marca compatible lo es', () => {
    const c = Buffer.concat([
      Buffer.from([0, 0, 0, 20]),
      Buffer.from('ftypisom'),
      Buffer.alloc(4),
      Buffer.from('heic'),
    ]);
    expect(esHeicPorContenido(c)).toBe(true);
  });
  it('AVIF no cuenta como HEIC', () => {
    const avif = Buffer.concat([
      Buffer.from([0, 0, 0, 16]),
      Buffer.from('ftypavif'),
      Buffer.alloc(4),
    ]);
    expect(esHeicPorContenido(avif)).toBe(false);
  });
  it('AVIF con marca mayor mif1 y compatible avif no cuenta como HEIC', () => {
    const avif = Buffer.concat([
      Buffer.from([0, 0, 0, 24]),
      Buffer.from('ftypmif1'),
      Buffer.alloc(4),
      Buffer.from('mif1'),
      Buffer.from('avif'),
    ]);
    expect(esHeicPorContenido(avif)).toBe(false);
  });
  it('PNG, vacío y corto dan false', async () => {
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: '#fff' },
    })
      .png()
      .toBuffer();
    expect(esHeicPorContenido(png)).toBe(false);
    expect(esHeicPorContenido(Buffer.alloc(0))).toBe(false);
    expect(esHeicPorContenido(Buffer.from([0, 0, 0]))).toBe(false);
  });
});
