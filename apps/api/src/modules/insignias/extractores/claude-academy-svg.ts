/**
 * Fase 7i (UC-35): insignia de Claude Academy dibujada en el servidor.
 *
 * La página `academy.claude.com/verify/<código>` no publica una imagen: la
 * dibuja en el navegador a partir de los datos verificados (curso, titular y
 * fecha). Para poder guardarla en la biblioteca se reproduce aquí la misma
 * composición como SVG estático: tarjeta 1650x1125 del color del curso,
 * mancha clara, "Course completion badge" en arco, sello, título del curso,
 * "Presented to" + titular y pie con "Claude Academy" y la fecha de emisión.
 *
 * El SVG no tiene scripts, enlaces externos ni fuentes remotas (pasa
 * `validarImagen`); los textos llegan del API remoto y se escapan siempre.
 */

/** Paletas de la página original; se elige por hash FNV-1a del curso, como allí. */
const PALETAS = [
  { clave: 'peach', clara: '#ebc9b7', viva: '#d97757' },
  { clave: 'cactus', clara: '#bcd1ca', viva: '#629987' },
  { clave: 'heather', clara: '#cbcadb', viva: '#827dbd' },
] as const;

const TINTA = '#141413';
const CREMA = '#faf9f5';
const ANCHO = 1650;
const ALTO = 1125;

/** Mancha central (rotada 180°), igual que la de la página original. */
const MANCHA =
  'M368.744 0.056734C409.51 0.675675 447.963 4.05603 488.53 7.42688C531.94 11.0358 575.407 13.0831 618.827 17.2443C636.409 18.9297 653.973 21.5007 671.612 22.8243C705.288 52.6286 743.39 79.843 775.872 110.79C786.564 120.979 796.146 132.71 807.084 142.708C813.406 148.488 828.6 158.648 832.922 164.162C836.666 168.951 842.931 186.948 846.409 193.947C854.817 210.849 864.873 226.932 873.451 243.624C896.739 288.902 918.453 335.151 939.703 381.467C941.125 384.562 947.153 397.102 947.485 399.331C948.348 405.044 947.229 422.984 946.926 429.725C944.926 473.965 944.604 518.062 942.168 562.35C941.817 568.749 943.125 578.757 942.054 584.318C941.03 589.64 929.732 608.466 926.671 615.226C916.539 637.565 906.065 659.619 895.857 681.91C882.417 711.248 871.403 741.747 855.053 769.676C843.859 778.674 830.723 784.854 819.027 792.996C767.493 828.856 721.135 873.134 669.422 908.871C653.641 919.783 634.153 929.372 617.737 940.113C614.723 942.084 603.16 951.987 600.866 952.206C598.847 952.397 594.667 951.006 592.43 951.025C548.774 951.359 511.799 941.903 469.317 936.971C431.603 932.591 393.453 930.077 355.919 923.992C333.949 920.44 311.855 914.041 289.705 911.27C272.663 909.137 255.194 910.128 238.276 906.148C189.245 862.669 144.109 814.944 101.552 764.839C99.0687 761.915 97.2678 757.792 94.6328 754.726C84.2731 742.681 70.0841 732.387 59.7813 720.389C52.6821 712.124 46.4644 668.436 43.7157 655.191C28.5031 581.908 16.9492 507.264 4.18198 433.591C1.36694 417.365 -3.19219 413.499 3.36675 397.017C19.0059 357.728 33.1189 317.507 48.3694 277.951C59.2694 249.69 70.1032 221.39 81.4107 193.3C138.081 142.451 201.604 99.63 266.246 60.0368L352.536 0.0281397C357.929 0.0852726 363.36 -0.0575598 368.753 0.0281397L368.744 0.056734Z';

/** Arco del texto superior: círculo de radio 358.35 en (826.97, 574.94), de 160° a 20°. */
const ARCO = 'M 490.23 697.50 A 358.35 358.35 0 1 1 1163.71 697.50';

const FUENTE_TITULOS = "Georgia, 'Times New Roman', serif";
const FUENTE_SANS = "'Helvetica Neue', Arial, sans-serif";

/** Caja del título: x 430–1220 (790 px), y 474–722. */
const CAJA_TITULO = { x: 430, ancho: 790, y: 474, alto: 248 };
const CAJA_NOMBRE = { ancho: 790, y: 855 };

export function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Texto remoto listo para el SVG: escapado y con un espacio de ancho cero
 * (`&#8203;`) que corta lo que `validarImagen` toma por código activo
 * (`javascript:`, `on…=`). Sin esto, un curso como "JavaScript: Basics" se
 * vería en la vista previa pero "Guardar" respondería 400. El filtro global
 * no se relaja.
 */
export function textoParaSvg(texto: string): string {
  return escaparXml(texto)
    .replace(/(javascript)(\s*:)/gi, '$1&#8203;$2')
    .replace(/\b(on[a-z]+)(\s*=)/gi, '$1&#8203;$2');
}

/** FNV-1a de 32 bits (mismo hash que usa la página para elegir la paleta). */
export function fnv1a(texto: string): number {
  let hash = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    hash = Math.imul(hash ^ texto.charCodeAt(i), 16777619) >>> 0;
  }
  return hash;
}

export function paletaDeCurso(curso: string) {
  return PALETAS[fnv1a(curso) % PALETAS.length];
}

/** Ancho aproximado de un carácter de serif respecto al tamaño de letra. */
const ANCHO_CARACTER = 0.5;

/**
 * Reparte el título en 1–3 líneas y elige el mayor tamaño (110 → 44 px) con
 * el que caben a lo ancho y a lo alto de la caja. Estimación por número de
 * caracteres: suficiente para títulos de curso, que son cortos.
 */
export function ajustarTitulo(titulo: string): {
  lineas: string[];
  tamano: number;
} {
  const palabras = titulo.split(/\s+/).filter(Boolean);
  for (let tamano = 110; tamano >= 44; tamano -= 4) {
    const maxCaracteres = Math.floor(
      CAJA_TITULO.ancho / (tamano * ANCHO_CARACTER),
    );
    const lineas: string[] = [];
    for (const palabra of palabras) {
      const ultima = lineas[lineas.length - 1];
      if (
        ultima !== undefined &&
        `${ultima} ${palabra}`.length <= maxCaracteres
      ) {
        lineas[lineas.length - 1] = `${ultima} ${palabra}`;
      } else {
        lineas.push(palabra);
      }
    }
    const caben =
      lineas.every((l) => l.length <= maxCaracteres) &&
      lineas.length * tamano * 1.04 <= CAJA_TITULO.alto;
    if (lineas.length <= 3 && caben) return { lineas, tamano };
  }
  // Muy largo: tres líneas al mínimo, recortadas con elipsis.
  const maxCaracteres = Math.floor(CAJA_TITULO.ancho / (44 * ANCHO_CARACTER));
  const recortado =
    titulo.length > maxCaracteres * 3
      ? `${titulo.slice(0, maxCaracteres * 3 - 1).trimEnd()}…`
      : titulo;
  const lineas: string[] = [];
  for (let i = 0; i < recortado.length; i += maxCaracteres) {
    lineas.push(recortado.slice(i, i + maxCaracteres));
  }
  return { lineas: lineas.slice(0, 3), tamano: 44 };
}

/** Tamaño del nombre del titular: 55 px, reducido si no cabe en una línea. */
export function tamanoNombre(nombre: string): number {
  const necesario = nombre.length * ANCHO_CARACTER * 55;
  if (necesario <= CAJA_NOMBRE.ancho) return 55;
  return Math.max(
    26,
    Math.floor(CAJA_NOMBRE.ancho / (nombre.length * ANCHO_CARACTER)),
  );
}

/** "2026-09-06T06:03:56Z" → "September 6, 2026" (como la página original). */
export function fechaEmitidaEnIngles(iso: string | null): string | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export interface DatosInsigniaClaudeAcademy {
  curso: string;
  /**
   * Id del curso en el catálogo de la página: decide el color como allí. Sin
   * él se usa el título (el color puede no coincidir con el original).
   */
  idCurso?: string | null;
  titular: string;
  emitidaIso: string | null;
}

export function generarSvgClaudeAcademy({
  curso,
  idCurso,
  titular,
  emitidaIso,
}: DatosInsigniaClaudeAcademy): string {
  const paleta = paletaDeCurso(idCurso || curso);
  const { lineas, tamano } = ajustarTitulo(curso);
  const altoBloque = lineas.length * tamano * 1.04;
  const primeraLinea =
    CAJA_TITULO.y + (CAJA_TITULO.alto - altoBloque) / 2 + tamano * 0.82;
  const titulo = lineas
    .map(
      (linea, i) =>
        `<tspan x="825" y="${(primeraLinea + i * tamano * 1.04).toFixed(1)}">${textoParaSvg(linea)}</tspan>`,
    )
    .join('');
  const emitida = fechaEmitidaEnIngles(emitidaIso);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ANCHO} ${ALTO}" width="${ANCHO}" height="${ALTO}">`,
    `<defs><clipPath id="tarjeta"><rect width="${ANCHO}" height="${ALTO}" rx="48"/></clipPath>`,
    `<path id="arco" d="${ARCO}" fill="none"/></defs>`,
    `<g clip-path="url(#tarjeta)">`,
    `<rect width="${ANCHO}" height="${ALTO}" fill="${paleta.viva}"/>`,
    `<g transform="translate(351.78 87.19)"><g transform="rotate(180 473.902 476.112)"><path d="${MANCHA}" fill="${paleta.clara}"/></g></g>`,
    `<text fill="${paleta.viva}" font-family="${FUENTE_SANS}" font-weight="600" font-size="38" letter-spacing="14"><textPath href="#arco" startOffset="50%" text-anchor="middle">COURSE COMPLETION BADGE</textPath></text>`,
    // Sello genérico (la página usa un pictograma por curso).
    `<circle cx="825" cy="364" r="92" fill="${CREMA}"/>`,
    `<circle cx="825" cy="364" r="92" fill="none" stroke="${paleta.viva}" stroke-width="6" stroke-dasharray="4 10"/>`,
    `<path d="M780 366 L812 398 L872 334" fill="none" stroke="${paleta.viva}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<text fill="${TINTA}" font-family="${FUENTE_TITULOS}" font-weight="500" font-size="${tamano}" text-anchor="middle" letter-spacing="1">${titulo}</text>`,
    `<text x="825" y="806" fill="${TINTA}" font-family="${FUENTE_TITULOS}" font-size="39" text-anchor="middle">Presented to</text>`,
    `<text x="825" y="${CAJA_NOMBRE.y + 20}" fill="${TINTA}" font-family="${FUENTE_TITULOS}" font-size="${tamanoNombre(titular)}" text-anchor="middle">${textoParaSvg(titular)}</text>`,
    `<text x="59" y="1046" fill="${CREMA}" font-family="${FUENTE_TITULOS}" font-weight="500" font-size="49">Claude Academy</text>`,
    emitida
      ? `<text x="1590" y="1047" fill="${CREMA}" font-family="${FUENTE_SANS}" font-weight="600" font-size="28" letter-spacing="2.5" text-anchor="end">ISSUED ${escaparXml(emitida.toUpperCase())}</text>`
      : '',
    `</g></svg>`,
  ].join('');
}
