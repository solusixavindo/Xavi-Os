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
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname));
  } catch {
    return false;
  }
}

function isPublishableKey(value: string): boolean {
  return /^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(value);
}

export function validateEnvironment(raw: RawEnvironment): EnvironmentResult {
  const issues: string[] = [];
  const supabaseUrl = raw.supabaseUrl?.trim() ?? '';
  const supabasePublishableKey = raw.supabasePublishableKey?.trim() ?? '';

  if (!supabaseUrl) {
    issues.push('EXPO_PUBLIC_SUPABASE_URL belum dikonfigurasi.');
  } else if (!isAllowedSupabaseUrl(supabaseUrl)) {
    issues.push('EXPO_PUBLIC_SUPABASE_URL harus berupa URL HTTPS yang valid.');
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
