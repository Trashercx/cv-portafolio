import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { obtenerErroresConfiguracion } from './validar-configuracion';
import { InsigniasConfiguracionDto } from './insignias-configuracion.dto';

function validarConfiguracion(configuracion: Record<string, unknown>) {
  const instancia = plainToInstance(InsigniasConfiguracionDto, configuracion);
  return validate(instancia, { whitelist: true, forbidNonWhitelisted: true });
}

describe('InsigniasConfiguracionDto (Fase 7d, UC-35)', () => {
  it('rellena los defaults del contrato', () => {
    const i = plainToInstance(InsigniasConfiguracionDto, {});
    expect(i.columnas).toBe('auto');
    expect(i.tamano).toBe('normal');
    expect(i.efecto_hover).toBe('inclinar_brillo');
    expect(i.mostrar_emisor).toBe(true);
    expect(i.mostrar_fecha).toBe(true);
    expect(i.mostrar_habilidades).toBe(false);
    expect(i.mostrar_enlace).toBe(true);
    // Fase 7h: medallas por defecto.
    expect(i.estilo).toBe('medalla');
    expect(i.animacion_reposo).toBe('flotar');
    expect(i.marco_medalla).toBe('halo');
    expect(i.etiqueta_medalla).toBe('al_pasar');
  });

  it('acepta un payload vacío y uno completo', async () => {
    expect(await validarConfiguracion({})).toHaveLength(0);
    expect(
      await validarConfiguracion({
        titulo: 'Insignias',
        subtitulo: 'Certificaciones verificables',
        columnas: 4,
        tamano: 'grande',
        efecto_hover: 'girar',
        estilo: 'tarjeta',
        animacion_reposo: 'balanceo',
        marco_medalla: 'cinta',
        etiqueta_medalla: 'siempre',
        mostrar_emisor: false,
        mostrar_fecha: false,
        mostrar_habilidades: true,
        mostrar_enlace: false,
        limite: 12,
        espaciado_vertical: 'amplio',
      }),
    ).toHaveLength(0);
  });

  it.each([2, 3, 4, 'auto'])('acepta columnas=%s', async (columnas) => {
    expect(await validarConfiguracion({ columnas })).toHaveLength(0);
  });

  it.each([
    { columnas: 5 },
    { columnas: '3' },
    { tamano: 'enorme' },
    { efecto_hover: 'rebotar' },
    { estilo: 'poster' },
    { animacion_reposo: 'girar' },
    { marco_medalla: 'estrella' },
    { etiqueta_medalla: 'a_veces' },
    { limite: 0 },
    { limite: 51 },
    { limite: 2.5 },
    { mostrar_emisor: 'si' },
    { campo_inventado: true },
  ])('rechaza %j', async (payload) => {
    expect((await validarConfiguracion(payload)).length).toBeGreaterThan(0);
  });

  it('es un tipo registrado y válido dentro de `columnas`', async () => {
    expect(
      await obtenerErroresConfiguracion('insignias', { columnas: 3 }),
    ).toEqual([]);
    expect(
      (await obtenerErroresConfiguracion('insignias', { columnas: 9 })).length,
    ).toBeGreaterThan(0);

    const errores = await obtenerErroresConfiguracion('columnas', {
      distribucion: '1-1',
      alineacion_vertical: 'inicio',
      espaciado: 'normal',
      columna_2: [],
      columna_3: [],
      columna_1: [
        {
          tipo_seccion: 'insignias',
          titulo_visible: 'Insignias',
          visible: true,
          configuracion: { columnas: 2 },
        },
      ],
    });
    expect(errores).toEqual([]);
  });

  describe('Fase 7l (UC-07): carrusel y cinta', () => {
    it('disposicion toma "rejilla" por defecto y los demás campos nuevos no tienen default', () => {
      const i = plainToInstance(InsigniasConfiguracionDto, {});
      expect(i.disposicion).toBe('rejilla');
      expect(i.reproduccion_automatica).toBeUndefined();
      expect(i.intervalo_segundos).toBeUndefined();
      expect(i.velocidad_cinta).toBeUndefined();
    });

    it('acepta las tres disposiciones, el intervalo 2-15 y las tres velocidades', async () => {
      for (const disposicion of ['rejilla', 'carrusel', 'cinta']) {
        expect(await validarConfiguracion({ disposicion })).toHaveLength(0);
      }
      for (const intervalo_segundos of [2, 15]) {
        expect(await validarConfiguracion({ intervalo_segundos })).toHaveLength(
          0,
        );
      }
      for (const velocidad_cinta of ['lenta', 'normal', 'rapida']) {
        expect(await validarConfiguracion({ velocidad_cinta })).toHaveLength(0);
      }
      expect(
        await validarConfiguracion({ reproduccion_automatica: true }),
      ).toHaveLength(0);
    });

    it.each([
      { disposicion: 'mosaico' },
      { intervalo_segundos: 1 },
      { intervalo_segundos: 16 },
      { intervalo_segundos: 2.5 },
      { velocidad_cinta: 'turbo' },
      { reproduccion_automatica: 'si' },
    ])('rechaza %j', async (payload) => {
      expect((await validarConfiguracion(payload)).length).toBeGreaterThan(0);
    });
  });
});
