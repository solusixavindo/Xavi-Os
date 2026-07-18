import { workspaceInputSchema, workspaceResponseSchema } from '../models';

describe('workspace domain validation', () => {
  test('normalizes a valid workspace input', () => {
    expect(workspaceInputSchema.parse({ name: '  Xavindo Team  ', slug: 'Xavindo-Team' })).toEqual({
      name: 'Xavindo Team',
      slug: 'xavindo-team',
    });
  });

  test.each(['two words', '-leading', 'trailing-', 'under_score', 'ab'])('rejects invalid slug %s', (slug) => {
    expect(() => workspaceInputSchema.parse({ name: 'Valid Name', slug })).toThrow();
  });

  test('rejects an unknown role from an RPC response', () => {
    expect(() =>
      workspaceResponseSchema.parse({
        id: '10000000-0000-4000-8000-000000000001',
        kind: 'business',
        name: 'Business',
        slug: 'business',
        role: 'platform_admin',
        archived_at: null,
        created_at: '2026-07-18T09:00:00.000Z',
        updated_at: '2026-07-18T09:00:00.000Z',
      }),
    ).toThrow();
  });
});
