import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from './media.service';
import { MEDIA_STORAGE_SERVICE } from './storage/media-storage.interface';

describe('MediaService (módulo mínimo, prerequisito de UC-02/UC-03/UC-04)', () => {
  let service: MediaService;
  let prisma: { media: { create: jest.Mock } };
  let storage: { upload: jest.Mock };

  const buildFile = (overrides: Partial<Express.Multer.File> = {}) =>
    ({
      originalname: 'foto.png',
      mimetype: 'image/png',
      buffer: Buffer.from('contenido'),
      size: 9,
      ...overrides,
    }) as Express.Multer.File;

  beforeEach(async () => {
    prisma = { media: { create: jest.fn() } };
    storage = {
      upload: jest.fn().mockResolvedValue({
        url: 'http://localhost:3000/uploads/abc.png',
        key: 'abc.png',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: prisma },
        { provide: MEDIA_STORAGE_SERVICE, useValue: storage },
      ],
    }).compile();

    service = module.get(MediaService);
  });

  it('sube el archivo mediante el MediaStorageService inyectado y guarda el registro con usuario_admin_id', async () => {
    prisma.media.create.mockResolvedValue({ id: 'media-uuid' });

    await service.create(
      buildFile(),
      { alt_text: 'Foto de perfil' },
      'admin-uuid',
    );

    expect(storage.upload).toHaveBeenCalledTimes(1);
    expect(prisma.media.create).toHaveBeenCalledWith({
      data: {
        usuario_admin_id: 'admin-uuid',
        url: 'http://localhost:3000/uploads/abc.png',
        s3_key: 'abc.png',
        tipo: 'imagen',
        ancho: undefined,
        alto: undefined,
        alt_text: 'Foto de perfil',
      },
    });
  });

  it('infiere tipo "imagen" o "pdf" del mimetype cuando el DTO no lo especifica', async () => {
    prisma.media.create.mockResolvedValue({ id: 'media-uuid' });

    await service.create(
      buildFile({ mimetype: 'application/pdf', originalname: 'cv.pdf' }),
      {},
      'admin-uuid',
    );

    expect(prisma.media.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tipo: 'pdf' }),
      }),
    );
  });

  it('respeta el tipo explícito del DTO en vez de inferirlo', async () => {
    prisma.media.create.mockResolvedValue({ id: 'media-uuid' });

    await service.create(buildFile(), { tipo: 'documento' }, 'admin-uuid');

    expect(prisma.media.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tipo: 'documento' }),
      }),
    );
  });
});
