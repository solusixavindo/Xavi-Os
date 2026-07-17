import type { SupabaseClient } from '@supabase/supabase-js';

export const APP_SCHEME = 'xavi-os';
export const AUTH_CALLBACK_URL = `${APP_SCHEME}://auth/callback`;
export const PASSWORD_RESET_URL = `${APP_SCHEME}://auth/reset-password`;

export type AuthLinkResult = { handled: boolean; passwordRecovery: boolean };

function getAllParameters(url: URL): URLSearchParams {
  const parameters = new URLSearchParams(url.search);
  const fragment = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  if (fragment) {
    new URLSearchParams(fragment).forEach((value, key) => parameters.set(key, value));
  }
  return parameters;
}

export async function handleAuthDeepLink(client: SupabaseClient, rawUrl: string): Promise<AuthLinkResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { handled: false, passwordRecovery: false };
  }

  const knownPath = url.pathname === '/callback' || url.pathname === '/reset-password';
  if (url.protocol !== `${APP_SCHEME}:` || url.hostname !== 'auth' || !knownPath) {
    return { handled: false, passwordRecovery: false };
  }

  const parameters = getAllParameters(url);
  const providerError = parameters.get('error_description') ?? parameters.get('error');
  if (providerError) throw new Error('Tautan autentikasi tidak valid atau sudah kedaluwarsa.');

  const code = parameters.get('code');
  const accessToken = parameters.get('access_token');
  const refreshToken = parameters.get('refresh_token');
  const passwordRecovery = url.pathname.includes('reset-password') || parameters.get('type') === 'recovery';

  async function validateServerSession(): Promise<void> {
    const verified = await client.auth.getUser();
    if (verified.error || !verified.data.user) {
      await client.auth.signOut({ scope: 'local' });
      throw new Error('Auth callback session validation failed.');
    }
  }

  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    await validateServerSession();
    return { handled: true, passwordRecovery };
  }

  if (accessToken && refreshToken) {
    const { error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw error;
    await validateServerSession();
    return { handled: true, passwordRecovery };
  }

  return { handled: false, passwordRecovery };
}
