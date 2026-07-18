export type SignOutClient = {
  auth: {
    signOut(options: { scope: 'local' }): Promise<{ error: Error | null }>;
  };
};

export async function logoutAndClearSession(client: SignOutClient, clearStorage: () => Promise<void>): Promise<void> {
  let signOutError: Error | null = null;
  try {
    const result = await client.auth.signOut({ scope: 'local' });
    signOutError = result.error;
  } finally {
    await clearStorage();
  }
  if (signOutError) throw signOutError;
}

export function safeAuthError(error: unknown): string {
  const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
  if (status === 404) return 'Layanan autentikasi belum terhubung dengan benar.';
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('invalid login credentials')) return 'Email atau password salah.';
  if (message.includes('email not confirmed')) return 'Email belum diverifikasi. Periksa kotak masuk Anda.';
  if (message.includes('user already registered')) return 'Email sudah terdaftar. Silakan masuk.';
  if (message.includes('rate limit')) return 'Terlalu banyak permintaan. Coba kembali beberapa saat lagi.';
  if (message.includes('expired')) return 'Tautan atau sesi sudah kedaluwarsa.';
  if (message.includes('network') || message.includes('fetch')) return 'Tidak dapat terhubung. Periksa koneksi internet Anda.';
  return 'Permintaan tidak dapat diproses. Silakan coba kembali.';
}
