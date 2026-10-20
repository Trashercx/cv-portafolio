import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaUsosService } from './media-usos.service';

describe('MediaUsosService (UC-09, Fase 7d)', () => {
  let service: MediaUsosService;
  const prisma = {
    perfil: { findMany: jest.fn() },
    proyectoImagen: { findMany: jest.fn() },
    certificacion: { findMany: jest.fn() },
    seccion: { findMany: jest.fn() },
    insignia: { findMany: jest.fn() },
    experienciaLaboral: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.perfil.findMany.mockResolvedValue([]);
    prisma.proyectoImagen.findMany.mockResolvedValue([]);
    prisma.certificacion.findMany.mockResolvedValue([]);
    prisma.seccion.findMany.mockResolvedValue([]);
    prisma.insignia.findMany.mockResolvedValue([]);
    prisma.experienciaLaboral.findMany.mockResolvedValue([]);
    const mod = await Test.createTestingModule({
      providers: [
        MediaUsosService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = mod.get(MediaUsosService);
  });

  it('insignia: la imagen de una insignia cuenta como uso (Fase 7d.2, UC-35)', async () => {
    prisma.insignia.findMany.mockResolvedValue([
      { id: 'i1', nombre: 'AWS Cloud', imagen_media_id: 'm9' },
    ]);
    const usos = await service.calcular();
    expect(usos.m9).toEqual([
      { tipo: 'insignia', id: 'i1', nombre: 'AWS Cloud' },
    ]);
  });

  it('experiencia: el logo de un puesto cuenta como uso (Fase 7l, UC-19)', async () => {
    prisma.experienciaLaboral.findMany.mockResolvedValue([
      { id: 'x1', cargo: 'Dev', empresa: 'Acme', logo_media_id: 'm8' },
    ]);
    const usos = await service.calcular();
    expect(usos.m8).toEqual([
      { tipo: 'experiencia', id: 'x1', nombre: 'Dev · Acme' },
    ]);
  });

  it('perfil y cv con el nombre completo', async () => {
    prisma.perfil.findMany.mockResolvedValue([
      {
        id: 'p1',
        nombre_completo: 'Ana Pérez',
        imagen_perfil_id: 'm1',
        cv_media_id: 'm2',
      },
    ]);
    const r = await service.calcular();
    expect(r.m1).toEqual([{ tipo: 'perfil', id: 'p1', nombre: 'Ana Pérez' }]);
    expect(r.m2).toEqual([{ tipo: 'cv', id: 'p1', nombre: 'Ana Pérez' }]);
  });

  it('proyecto y certificación', async () => {
    prisma.proyectoImagen.findMany.mockResolvedValue([
      { media_id: 'm3', proyecto: { id: 'pr1', titulo: 'API' } },
    ]);
    prisma.certificacion.findMany.mockResolvedValue([
      { id: 'c1', nombre: 'AWS SAA', logo_media_id: 'm4' },
    ]);
    const r = await service.calcular();
    expect(r.m3).toEqual([{ tipo: 'proyecto', id: 'pr1', nombre: 'API' }]);
    expect(r.m4).toEqual([
      { tipo: 'certificacion', id: 'c1', nombre: 'AWS SAA' },
    ]);
  });

  it('hero, galería y galería anidada en columnas', async () => {
    prisma.seccion.findMany.mockResolvedValue([
      {
        id: 's1',
        tipo_seccion: 'hero',
        titulo_visible: 'Inicio',
        configuracion: { imagen_fondo_media_id: 'm5' },
      },
      {
        id: 's2',
        tipo_seccion: 'galeria',
        titulo_visible: 'Fotos',
        configuracion: { fotos: [{ media_id: 'm6' }, { media_id: 'm7' }] },
      },
      {
        id: 's3',
        tipo_seccion: 'columnas',
        titulo_visible: 'Dos cols',
        configuracion: {
          columna_1: [
            {
              tipo_seccion: 'galeria',
              configuracion: { fotos: [{ media_id: 'm6' }] },
            },
          ],
          columna_2: [],
        },
      },
    ]);
    const r = await service.calcular();
    expect(r.m5).toEqual([{ tipo: 'hero', id: 's1', nombre: 'Inicio' }]);
    expect(r.m7).toEqual([{ tipo: 'galeria', id: 's2', nombre: 'Fotos' }]);
    expect(r.m6).toEqual([
      { tipo: 'galeria', id: 's2', nombre: 'Fotos' },
      { tipo: 'galeria', id: 's3', nombre: 'Dos cols' },
    ]);
  });

  it('una media sin usos no aparece en el resultado', async () => {
    const r = await service.calcular();
    expect(r.libre).toBeUndefined();
    expect(Object.keys(r)).toHaveLength(0);
  });
});
