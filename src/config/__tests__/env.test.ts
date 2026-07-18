import { validateEnvironment } from '../env';

describe('environment validation', () => {
  test('accepts a valid URL and sb_publishable key', () => {
    const result = validateEnvironment({
      supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co',
      supabasePublishableKey: `sb_publishable_${'a'.repeat(32)}`,
    });
    expect(result.ok).toBe(true);
  });

  test.each([
    ['REST API path', 'https://abcdefghijklmnopqrst.supabase.co/rest/v1'],
    ['underscored REST path', 'https://abcdefghijklmnopqrst.supabase.co/rest_v1'],
    ['Auth API path', 'https://abcdefghijklmnopqrst.supabase.co/auth/v1'],
    ['arbitrary path', 'https://abcdefghijklmnopqrst.supabase.co/anything'],
    ['query', 'https://abcdefghijklmnopqrst.supabase.co?source=mobile'],
    ['fragment', 'https://abcdefghijklmnopqrst.supabase.co#auth'],
    ['leading whitespace', ' https://abcdefghijklmnopqrst.supabase.co'],
    ['trailing whitespace', 'https://abcdefghijklmnopqrst.supabase.co '],
    ['quote', '"https://abcdefghijklmnopqrst.supabase.co"'],
    ['control character', 'https://abcdefghijklmnopqrst.supabase.co\n'],
    ['non-Supabase hostname', 'https://abcdefghijklmnopqrst.example.com'],
    ['invalid project reference', 'https://short.supabase.co'],
    ['insecure protocol', 'http://abcdefghijklmnopqrst.supabase.co'],
    ['port', 'https://abcdefghijklmnopqrst.supabase.co:8443'],
    ['embedded credential', 'https://user@abcdefghijklmnopqrst.supabase.co'],
  ])('rejects %s', (_caseName, supabaseUrl) => {
    const result = validateEnvironment({
      supabaseUrl,
      supabasePublishableKey: `sb_publishable_${'a'.repeat(32)}`,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.join(' ')).not.toContain(supabaseUrl);
  });

  test('rejects missing values without returning their contents', () => {
    const result = validateEnvironment({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues).toHaveLength(2);
  });

  test('rejects insecure non-local URLs', () => {
    expect(
      validateEnvironment({
        supabaseUrl: 'http://abcdefghijklmnopqrst.supabase.co',
        supabasePublishableKey: `sb_publishable_${'a'.repeat(32)}`,
      }).ok,
    ).toBe(false);
  });

  test('rejects a secret key without echoing its value', () => {
    const secretKey = `sb_${'secret'}_${'s'.repeat(32)}`;
    const result = validateEnvironment({
      supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co',
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
        supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co',
        supabasePublishableKey: serviceRoleJwt,
      }).ok,
    ).toBe(false);
  });
});
