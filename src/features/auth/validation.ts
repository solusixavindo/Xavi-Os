import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Alamat email tidak valid.').max(254);
const password = z.string().min(8, 'Minimal 8 karakter.').max(72, 'Maksimal 72 karakter.');
const phone = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s().-]/g, ''))
  .pipe(z.string().regex(/^\+?[0-9]{8,15}$/, 'Nomor WhatsApp tidak valid.'));

export const loginSchema = z.object({ email, password });

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Nama minimal 2 karakter.').max(120),
    email,
    phone,
    password,
    confirmPassword: z.string(),
    referralCode: z
      .string()
      .trim()
      .toUpperCase()
      .refine((value) => value === '' || /^X[A-Z0-9]{11}$/.test(value), 'Kode referral tidak valid.'),
    acceptedTerms: z.literal(true, { error: 'Syarat dan Kebijakan Privasi wajib disetujui.' }),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Konfirmasi password tidak sama.' });
    }
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Konfirmasi password tidak sama.' });
    }
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export function firstValidationErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    result[key] ??= issue.message;
  }
  return result;
}
