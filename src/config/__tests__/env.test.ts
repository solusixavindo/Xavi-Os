import { validateEnvironment } from '../env';

describe('environment validation', () => {
  test('accepts a valid URL and sb_publishable key', () => {
    const result = validateEnvironment({
      supabaseUrl: 'https://project.supabase.co',
      supabasePublishableKey: `sb_publishable_${'a'.repeat(32)}`,
    });
    expect(result.ok).toBe(true);
  });

  test('rejects missing values without returning their contents', () => {
    const result = validateEnvironment({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues).toHaveLength(2);
  });

  test('rejects insecure non-local URLs', () => {
    expect(
      validateEnvironment({
        supabaseUrl: 'http://example.com',
        supabasePublishableKey: `sb_publishable_${'a'.repeat(32)}`,
      }).ok,
    ).toBe(false);
  });

  test('rejects a secret key without echoing its value', () => {
    const secretKey = `sb_${'secret'}_${'s'.repeat(32)}`;
    const result = validateEnvironment({
      supabaseUrl: 'https://project.supabase.co',
      supabasePublishableKey: secretKey,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.join(' ')).not.toContain(secretKey);
  });

  test('rejects a legacy service-role JWT', () => {
    const encodedHeader = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
    const encodedPayload = 'eyJyb2xlIjoic2VydmljZV9yb2xlIn0';
    const serviceRoleJwt = [encodedHeader, encodedPayload, 'test-signature'].join('.');
    expect(
      validateEnvironment({
        supabaseUrl: 'https://project.supabase.co',
        supabasePublishableKey: serviceRoleJwt,
      }).ok,
    ).toBe(false);
  });
});
