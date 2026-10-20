import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpsertIntegracionGithubDto } from './upsert-integracion-github.dto';

async function errores(payload: Record<string, unknown>) {
  return validate(
    plainToInstance(UpsertIntegracionGithubDto, {
      usuario_github: 'oscar',
      ...payload,
    }),
    { whitelist: true, forbidNonWhitelisted: true },
  );
}

describe('UpsertIntegracionGithubDto, README (Fase 7m, #66, UC-36)', () => {
  it.each([
    [{}],
    [{ readme_repositorio: 'oscar/oscar' }],
    [{ readme_repositorio: 'oscar/mi.repo_1-x', readme_rama: 'feature/x-1.0' }],
    [{ readme_repositorio: null, readme_rama: null }],
  ])('acepta %j', async (payload) => {
    expect(await errores(payload)).toHaveLength(0);
  });

  it.each([
    [{ readme_repositorio: 'oscar' }],
    [{ readme_repositorio: '-oscar/oscar' }],
    [{ readme_repositorio: 'oscar/' }],
    [{ readme_repositorio: 'oscar/.' }],
    [{ readme_repositorio: 'oscar/..' }],
    [{ readme_repositorio: 'oscar/a b' }],
    [{ readme_repositorio: `${'a'.repeat(40)}/repo` }],
    [{ readme_repositorio: 5 }],
    [{ readme_rama: 'con espacio' }],
    [{ readme_rama: '' }],
    [{ readme_rama: 'a'.repeat(256) }],
    [{ readme_markdown: 'x' }],
  ])('rechaza %j', async (payload) => {
    expect((await errores(payload)).length).toBeGreaterThan(0);
  });
});
