import { credlyExtractor } from './credly';
import { datacampExtractor } from './datacamp';
import { genericoExtractor } from './generico';
import { imagenDirectaExtractor } from './imagen-directa';
import { openBadgesExtractor } from './open-badges';
import { pngHorneadoExtractor } from './png-horneado';
import { skilljarExtractor } from './skilljar';
import { Extractor } from './tipos';

export * from './tipos';

/**
 * Cadena de importación (Fase 7d, UC-35): `importar` prueba en este orden y se
 * queda con el primero que acepta la entrada Y reconoce el recurso (un
 * extractor que descubre que no le corresponde lanza `ExtractorNoAplica` y se
 * pasa al siguiente).
 *
 * Desviación del orden del contrato: `png-horneado` va ANTES de
 * `imagen-directa`; si no, todo PNG descargado por URL lo atraparía
 * `imagen-directa` y el Open Badges horneado nunca se leería.
 *
 * Fase 7e: `skilljar` y `datacamp` (hosts anclados, solo páginas) van justo
 * tras `credly`, no tras `imagen-directa`: si su página responde 403, el
 * primer extractor genérico que descargue lanzaría `RedSeguraError` y se
 * perdería el resultado parcial de DataCamp (modo archivo).
 */
export const EXTRACTORES: Extractor[] = [
  credlyExtractor,
  skilljarExtractor,
  datacampExtractor,
  openBadgesExtractor,
  pngHorneadoExtractor,
  imagenDirectaExtractor,
  genericoExtractor,
];
