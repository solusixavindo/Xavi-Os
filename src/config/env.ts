export type PublicEnvironment = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export type EnvironmentResult =
  | { ok: true; value: PublicEnvironment }
  | { ok: false; issues: string[] };

type RawEnvironment = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function isAllowedSupabaseUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname));
  } catch {
    return false;
  }
}

export function validateEnvironment(raw: RawEnvironment): EnvironmentResult {
  const issues: string[] = [];
  const supabaseUrl = raw.supabaseUrl?.trim() ?? '';
  const supabaseAnonKey = raw.supabaseAnonKey?.trim() ?? '';

  if (!supabaseUrl) {
    issues.push('EXPO_PUBLIC_SUPABASE_URL belum dikonfigurasi.');
  } else if (!isAllowedSupabaseUrl(supabaseUrl)) {
    issues.push('EXPO_PUBLIC_SUPABASE_URL harus berupa URL HTTPS yang valid.');
  }

  if (!supabaseAnonKey) {
    issues.push('EXPO_PUBLIC_SUPABASE_ANON_KEY belum dikonfigurasi.');
  } else if (supabaseAnonKey.length < 20) {
    issues.push('EXPO_PUBLIC_SUPABASE_ANON_KEY tidak valid.');
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: { supabaseUrl, supabaseAnonKey },
  };
}

export function readPublicEnvironment(): EnvironmentResult {
  return validateEnvironment({
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });
}
