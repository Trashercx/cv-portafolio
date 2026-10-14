/**
 * `sharp` exporta la función con `module.exports = sharp` y sin `default`, pero
 * sus tipos la declaran como `export default`. Sin `esModuleInterop` en este
 * proyecto, `import sharp from 'sharp'` compila a `sharp_1.default`
 * (undefined en runtime). Este módulo centraliza el `require` tipado (Fase 8,
 * UC-34) para que todos usen la función real.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const sharp = require('sharp') as typeof import('sharp').default;
