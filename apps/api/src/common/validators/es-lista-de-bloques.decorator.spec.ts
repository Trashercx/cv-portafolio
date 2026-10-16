import { IsArray, validate } from 'class-validator';
import { EsListaDeBloques } from './es-lista-de-bloques.decorator';

class ColumnaDto {
  @IsArray()
  @EsListaDeBloques()
  columna_1: unknown[];
}

const bloqueSobreMiValido = {
  tipo_seccion: 'sobre-mi',
  titulo_visible: 'Sobre mí',
  visible: true,
  configuracion: { mostrar_foto: true },
};

const bloqueProyectosValido = {
  tipo_seccion: 'proyectos',
  titulo_visible: 'Proyectos',
  visible: true,
  configuracion: { cantidad_a_mostrar: 6, solo_destacados: true },
};

describe('@EsListaDeBloques', () => {
  it('acepta un array vacío (columna sin bloques, p. ej. columna_3 en una distribución de 2 columnas)', async () => {
    const dto = new ColumnaDto();
    dto.columna_1 = [];

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('acepta bloques válidos de distintos tipos', async () => {
    const dto = new ColumnaDto();
    dto.columna_1 = [bloqueSobreMiValido, bloqueProyectosValido];

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('Fase 7j: acepta un bloque con tipo_seccion "hero" (la portada puede ir en una columna)', async () => {
    const dto = new ColumnaDto();
    dto.columna_1 = [
      {
        tipo_seccion: 'hero',
        titulo_visible: 'Inicio',
        visible: true,
        configuracion: { titulo: 'Hola', subtitulo: 'Mundo' },
      },
    ];

    const errores = await validate(dto);

    expect(errores).toHaveLength(0);
  });

  it('rechaza un bloque con tipo_seccion "columnas" (evita anidamiento sin límite)', async () => {
    const dto = new ColumnaDto();
    dto.columna_1 = [
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
    ];

    const errores = await validate(dto);

    expect(errores).toHaveLength(1);
    expect(errores[0].constraints?.esListaDeBloques).toContain(
      'tipo_seccion "columnas" no está permitido',
    );
  });

  it('rechaza un bloque con configuracion inválida para su tipo_seccion, con mensaje diagnosticable', async () => {
    const dto = new ColumnaDto();
    dto.columna_1 = [
      {
        tipo_seccion: 'proyectos',
        titulo_visible: 'Proyectos',
        visible: true,
        configuracion: { cantidad_a_mostrar: -1, solo_destacados: true },
      },
    ];

    const errores = await validate(dto);

    expect(errores).toHaveLength(1);
    expect(errores[0].constraints?.esListaDeBloques).toContain(
      'configuracion inválida para tipo_seccion "proyectos"',
    );
  });

  it('rechaza un bloque con una clave no permitida (p. ej. "id" filtrado de una fila real)', async () => {
    const dto = new ColumnaDto();
    dto.columna_1 = [
      {
        id: 'seccion-1',
        tipo_seccion: 'sobre-mi',
        titulo_visible: 'Sobre mí',
        visible: true,
        configuracion: { mostrar_foto: true },
      },
    ];

    const errores = await validate(dto);

    expect(errores).toHaveLength(1);
    expect(errores[0].constraints?.esListaDeBloques).toContain(
      'debe tener exactamente las claves',
    );
  });

  it('rechaza un bloque con titulo_visible vacío', async () => {
    const dto = new ColumnaDto();
    dto.columna_1 = [
      {
        tipo_seccion: 'sobre-mi',
        titulo_visible: '',
        visible: true,
        configuracion: { mostrar_foto: true },
      },
    ];

    const errores = await validate(dto);

    expect(errores).toHaveLength(1);
  });

  it('rechaza un bloque cuyo "visible" no es booleano', async () => {
    const dto = new ColumnaDto();
    dto.columna_1 = [
      {
        tipo_seccion: 'sobre-mi',
        titulo_visible: 'Sobre mí',
        visible: 'si',
        configuracion: { mostrar_foto: true },
      },
    ];

    const errores = await validate(dto);

    expect(errores).toHaveLength(1);
  });

  it('rechaza un elemento que no es un objeto', async () => {
    const dto = new ColumnaDto();
    dto.columna_1 = ['no-es-un-objeto'];

    const errores = await validate(dto);

    expect(errores).toHaveLength(1);
  });

  it('rechaza cuando el valor decorado no es un array', async () => {
    const dto = new ColumnaDto();
    // @ts-expect-error: forzando un valor inválido a propósito.
    dto.columna_1 = { no: 'es-un-array' };

    const errores = await validate(dto);

    expect(errores.length).toBeGreaterThan(0);
    const errorEsListaDeBloques = errores[0].constraints?.esListaDeBloques;
    expect(errorEsListaDeBloques).toBeDefined();
  });

  it('reporta el índice del elemento inválido dentro de un array con varios bloques', async () => {
    const dto = new ColumnaDto();
    dto.columna_1 = [
      bloqueSobreMiValido,
      {
        tipo_seccion: 'navegacion',
        titulo_visible: 'Inicio',
        visible: true,
        configuracion: {},
      },
    ];

    const errores = await validate(dto);

    expect(errores).toHaveLength(1);
    expect(errores[0].constraints?.esListaDeBloques).toContain('columna_1[1]');
  });
});
