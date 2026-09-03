import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ColumnasConfiguracionDto } from './columnas-configuracion.dto';

function validarConfiguracion(configuracion: Record<string, unknown>) {
  const instancia = plainToInstance(ColumnasConfiguracionDto, configuracion);
  return validate(instancia, { whitelist: true, forbidNonWhitelisted: true });
}

const bloqueSobreMi = {
  tipo_seccion: 'sobre-mi',
  titulo_visible: 'Sobre mí',
  visible: true,
  configuracion: { mostrar_foto: true },
};

const bloqueContacto = {
  tipo_seccion: 'contacto',
  titulo_visible: 'Contacto',
  visible: true,
  configuracion: { mostrar_formulario: false },
};

const bloqueSkills = {
  tipo_seccion: 'skills',
  titulo_visible: 'Skills',
  visible: false,
  configuracion: { direccion: 'derecha', velocidad: 'rapida' },
};

describe('ColumnasConfiguracionDto (Fase 3.3, UC-17)', () => {
  it('acepta un layout válido con bloques de distintos tipos en cada columna y columna_3 vacío', async () => {
    const configuracion = {
      distribucion: '1-1',
      alineacion_vertical: 'centro',
      espaciado: 'normal',
      columna_1: [bloqueSobreMi],
      columna_2: [bloqueContacto, bloqueSkills],
      columna_3: [],
    };

    const errores = await validarConfiguracion(configuracion);

    expect(errores).toHaveLength(0);
  });

  it('acepta las 4 distribuciones documentadas', async () => {
    for (const distribucion of ['1-1', '1-2', '2-1', '1-1-1']) {
      const errores = await validarConfiguracion({
        distribucion,
        alineacion_vertical: 'inicio',
        espaciado: 'compacto',
        columna_1: [],
        columna_2: [],
        columna_3: [],
      });

      expect(errores).toHaveLength(0);
    }
  });

  it('rechaza una distribucion fuera del catálogo', async () => {
    const errores = await validarConfiguracion({
      distribucion: '3-1',
      alineacion_vertical: 'inicio',
      espaciado: 'normal',
      columna_1: [],
      columna_2: [],
      columna_3: [],
    });

    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza una alineacion_vertical fuera del catálogo', async () => {
    const errores = await validarConfiguracion({
      distribucion: '1-1',
      alineacion_vertical: 'arriba-del-todo',
      espaciado: 'normal',
      columna_1: [],
      columna_2: [],
      columna_3: [],
    });

    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza un espaciado fuera del catálogo', async () => {
    const errores = await validarConfiguracion({
      distribucion: '1-1',
      alineacion_vertical: 'inicio',
      espaciado: 'gigante',
      columna_1: [],
      columna_2: [],
      columna_3: [],
    });

    expect(errores.length).toBeGreaterThan(0);
  });

  it('rechaza un hijo con tipo_seccion "hero" anidado en cualquier columna', async () => {
    const errores = await validarConfiguracion({
      distribucion: '1-1',
      alineacion_vertical: 'inicio',
      espaciado: 'normal',
      columna_1: [
        {
          tipo_seccion: 'hero',
          titulo_visible: 'Inicio',
          visible: true,
          configuracion: { titulo: 'Hola', subtitulo: 'Mundo' },
        },
      ],
      columna_2: [],
      columna_3: [],
    });

    expect(errores.length).toBeGreaterThan(0);
    expect(errores[0].constraints?.esListaDeBloques).toContain('hero');
  });

  it('rechaza un hijo con tipo_seccion "columnas" anidado dentro de columnas (sin anidamiento múltiple)', async () => {
    const errores = await validarConfiguracion({
      distribucion: '1-1',
      alineacion_vertical: 'inicio',
      espaciado: 'normal',
      columna_1: [
        {
          tipo_seccion: 'columnas',
          titulo_visible: 'Columnas anidadas',
          visible: true,
          configuracion: {
            distribucion: '1-1',
            alineacion_vertical: 'inicio',
            espaciado: 'normal',
            columna_1: [],
            columna_2: [],
            columna_3: [],
          },
        },
      ],
      columna_2: [],
      columna_3: [],
    });

    expect(errores.length).toBeGreaterThan(0);
    expect(errores[0].constraints?.esListaDeBloques).toContain('columnas');
  });

  it('rechaza un hijo con configuracion inválida para su propio tipo_seccion, con mensaje diagnosticable', async () => {
    const errores = await validarConfiguracion({
      distribucion: '1-1',
      alineacion_vertical: 'inicio',
      espaciado: 'normal',
      columna_1: [
        {
          tipo_seccion: 'certificaciones',
          titulo_visible: 'Certificaciones',
          visible: true,
          configuracion: { orden: 'aleatorio' },
        },
      ],
      columna_2: [],
      columna_3: [],
    });

    expect(errores.length).toBeGreaterThan(0);
    expect(errores[0].constraints?.esListaDeBloques).toContain(
      'configuracion inválida para tipo_seccion "certificaciones"',
    );
  });

  it('rechaza campos que no correspondan al DTO (forbidNonWhitelisted)', async () => {
    const errores = await validarConfiguracion({
      distribucion: '1-1',
      alineacion_vertical: 'inicio',
      espaciado: 'normal',
      columna_1: [],
      columna_2: [],
      columna_3: [],
      campo_inventado: true,
    });

    expect(errores.length).toBeGreaterThan(0);
  });
});
