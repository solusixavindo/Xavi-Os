import { validateEnvironment } from '../env';

describe('environment validation', () => {
  test('accepts only a valid URL and non-empty anon key', () => {
    const result = validateEnvironment({
      supabaseUrl: 'https://project.supabase.co',
      supabaseAnonKey: 'public-anon-key-placeholder-value',
    });
    expect(result.ok).toBe(true);
  });

  test('rejects missing values without returning their contents', () => {
    const result = validateEnvironment({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues).toHaveLength(2);
  });

  test('rejects insecure non-local URLs', () => {
    expect(validateEnvironment({ supabaseUrl: 'http://example.com', supabaseAnonKey: 'a'.repeat(24) }).ok).toBe(false);
  });
});
