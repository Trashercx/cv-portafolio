const sendMock = jest.fn().mockResolvedValue({});

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  DeleteObjectsCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

const metadataMock = jest.fn();
jest.mock('sharp', () => jest.fn(() => ({ metadata: metadataMock })));

import { S3MediaStorageService } from './s3-media-storage.service';

describe('S3MediaStorageService (UC-09)', () => {
  const buildFile = (overrides: Partial<Express.Multer.File> = {}) =>
    ({
      originalname: 'foto.png',
      mimetype: 'image/png',
      buffer: Buffer.from('contenido'),
      size: 9,
      ...overrides,
    }) as Express.Multer.File;

  const envOriginal = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    sendMock.mockResolvedValue({});
    metadataMock.mockResolvedValue({ width: 800, height: 600 });
    process.env.AWS_REGION = 'us-east-1';
    process.env.S3_BUCKET_NAME = 'mi-bucket';
    process.env.AWS_ACCESS_KEY_ID = 'fake-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'fake-secret-key';
    delete process.env.CLOUDFRONT_DOMAIN;
  });

  afterAll(() => {
    process.env = envOriginal;
  });

  it('sube el archivo con la carpeta indicada y devuelve la key prefijada', async () => {
    const service = new S3MediaStorageService();

    const resultado = await service.upload(buildFile(), 'perfil');

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(resultado.key).toMatch(/^perfil\/[0-9a-f-]+\.png$/);
    expect(resultado.url).toBe(
      `https://mi-bucket.s3.us-east-1.amazonaws.com/${resultado.key}`,
    );
  });

  it('usa un prefijo genérico cuando no se indica carpeta o no es una de las válidas', async () => {
    const service = new S3MediaStorageService();

    const resultado = await service.upload(buildFile(), 'carpeta-invalida');

    expect(resultado.key).toMatch(/^biblioteca\/[0-9a-f-]+\.png$/);
  });

  it('lee width/height con sharp cuando el archivo es una imagen', async () => {
    const service = new S3MediaStorageService();

    const resultado = await service.upload(buildFile());

    expect(resultado.width).toBe(800);
    expect(resultado.height).toBe(600);
  });

  it('no calcula dimensiones para archivos que no son imagen', async () => {
    const service = new S3MediaStorageService();

    const resultado = await service.upload(
      buildFile({ mimetype: 'application/pdf', originalname: 'cv.pdf' }),
    );

    expect(resultado.width).toBeUndefined();
    expect(resultado.height).toBeUndefined();
    expect(metadataMock).not.toHaveBeenCalled();
  });

  it('usa el dominio de CloudFront para la URL cuando está configurado', async () => {
    process.env.CLOUDFRONT_DOMAIN = 'cdn.example.com';
    const service = new S3MediaStorageService();

    const resultado = await service.upload(buildFile());

    expect(resultado.url).toBe(`https://cdn.example.com/${resultado.key}`);
  });

  describe('derivados (Fase 8, UC-34)', () => {
    it('subirDerivado usa la key dada con caché inmutable', async () => {
      const service = new S3MediaStorageService();

      const resultado = await service.subirDerivado(
        Buffer.from('x'),
        'perfil/abc-640.webp',
        'image/webp',
      );

      expect(sendMock.mock.calls[0][0].input).toMatchObject({
        Key: 'perfil/abc-640.webp',
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      });
      expect(resultado).toEqual({
        key: 'perfil/abc-640.webp',
        url: 'https://mi-bucket.s3.us-east-1.amazonaws.com/perfil/abc-640.webp',
      });
    });

    it('descargar devuelve el cuerpo como Buffer', async () => {
      sendMock.mockResolvedValue({
        Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) },
      });
      const service = new S3MediaStorageService();

      const buffer = await service.descargar('perfil/abc.png');

      expect(buffer).toEqual(Buffer.from([1, 2, 3]));
    });

    it('eliminar borra en lote e ignora una lista vacía', async () => {
      const service = new S3MediaStorageService();

      await service.eliminar([]);
      expect(sendMock).not.toHaveBeenCalled();

      await service.eliminar(['a.webp', 'b.avif']);
      expect(sendMock.mock.calls[0][0].input.Delete.Objects).toEqual([
        { Key: 'a.webp' },
        { Key: 'b.avif' },
      ]);
    });
  });
});
