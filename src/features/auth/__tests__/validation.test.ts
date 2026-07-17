import { loginSchema, registerSchema, resetPasswordSchema } from '../validation';

describe('auth form validation', () => {
  test('normalizes valid registration input', () => {
    const parsed = registerSchema.parse({
      fullName: '  Siti Rahma  ',
      email: 'SITI@EXAMPLE.COM',
      phone: '+62 812-3456-7890',
      password: 'secure-pass-123',
      confirmPassword: 'secure-pass-123',
      referralCode: 'x12345678901',
      acceptedTerms: true,
    });
    expect(parsed.email).toBe('siti@example.com');
    expect(parsed.phone).toBe('+6281234567890');
    expect(parsed.referralCode).toBe('X12345678901');
  });

  test('requires terms and matching passwords', () => {
    const result = registerSchema.safeParse({
      fullName: 'Siti Rahma', email: 'siti@example.com', phone: '+6281234567890',
      password: 'secure-pass-123', confirmPassword: 'different-pass', referralCode: '', acceptedTerms: false,
    });
    expect(result.success).toBe(false);
  });

  test('rejects invalid login and reset input', () => {
    expect(loginSchema.safeParse({ email: 'invalid', password: 'short' }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: 'secure-pass-123', confirmPassword: 'different' }).success).toBe(false);
  });
});
