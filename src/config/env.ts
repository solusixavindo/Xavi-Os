export type PublicEnvironment = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

export type EnvironmentResult =
  | { ok: true; value: PublicEnvironment }
  | { ok: false; issues: string[] };

type RawEnvironment = {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
};

function isAllowedSupabaseUrl(value: string): boolean {
  if (!value || value !== value.trim() || /[\s'"\u0000-\u001f\u007f]/.test(value)) return false;
  if (value.includes('?') || value.includes('#')) return false;
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === 'https:' &&
      /^[a-z0-9]{20}\.supabase\.co$/.test(parsed.hostname) &&
      (parsed.pathname === '' || parsed.pathname === '/') &&
      parsed.search === '' &&
      parsed.hash === '' &&
      parsed.username === '' &&
      parsed.password === '' &&
      parsed.port === ''
    );
  } catch {
    return false;
  }
}

function isPublishableKey(value: string): boolean {
  return /^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(value);
}

export function validateEnvironment(raw: RawEnvironment): EnvironmentResult {
  const issues: string[] = [];
  const rawSupabaseUrl = raw.supabaseUrl ?? '';
  const supabaseUrl = rawSupabaseUrl.trim();
  const supabasePublishableKey = raw.supabasePublishableKey?.trim() ?? '';

  if (!rawSupabaseUrl) {
    issues.push('EXPO_PUBLIC_SUPABASE_URL belum dikonfigurasi.');
  } else if (!isAllowedSupabaseUrl(rawSupabaseUrl)) {
    issues.push('EXPO_PUBLIC_SUPABASE_URL harus berupa root Project URL Supabase HTTPS yang valid.');
  }

  if (!supabasePublishableKey) {
    issues.push('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY belum dikonfigurasi.');
  } else if (!isPublishableKey(supabasePublishableKey)) {
    issues.push('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY harus menggunakan format sb_publishable_.');
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: { supabaseUrl, supabasePublishableKey },
  };
}

export function readPublicEnvironment(): EnvironmentResult {
  return validateEnvironment({
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
