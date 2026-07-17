import type { SupabaseClient } from '@supabase/supabase-js';

import { handleAuthDeepLink } from '../authLinks';

function authClient() {
  const exchangeCodeForSession = jest.fn(async () => ({ error: null }));
  const setSession = jest.fn(async () => ({ error: null }));
  const getUser = jest.fn(async () => ({ data: { user: { id: 'verified-user' } }, error: null }));
  const signOut = jest.fn(async () => ({ error: null }));
  return {
    client: { auth: { exchangeCodeForSession, setSession, getUser, signOut } } as unknown as SupabaseClient,
    exchangeCodeForSession,
    setSession,
    getUser,
    signOut,
  };
}

describe('Supabase auth deep links', () => {
  test('exchanges a PKCE code without exposing it', async () => {
    const { client, exchangeCodeForSession } = authClient();
    const result = await handleAuthDeepLink(client, 'xavi-os://auth/callback?code=temporary-code');
    expect(result).toEqual({ handled: true, passwordRecovery: false });
    expect(exchangeCodeForSession).toHaveBeenCalledWith('temporary-code');
  });

  test('recognizes a password recovery callback', async () => {
    const { client } = authClient();
    await expect(handleAuthDeepLink(client, 'xavi-os://auth/reset-password?code=recovery-code')).resolves.toEqual({
      handled: true,
      passwordRecovery: true,
    });
  });

  test('ignores unrelated schemes', async () => {
    const { client, exchangeCodeForSession } = authClient();
    await expect(handleAuthDeepLink(client, 'https://example.com/auth/callback?code=ignored')).resolves.toEqual({
      handled: false,
      passwordRecovery: false,
    });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  test('ignores unknown paths on the application auth host', async () => {
    const { client, exchangeCodeForSession } = authClient();
    await expect(handleAuthDeepLink(client, 'xavi-os://auth/not-allowed?code=ignored')).resolves.toEqual({
      handled: false,
      passwordRecovery: false,
    });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  test('rejects recovery callbacks sent to the signup callback path', async () => {
    const { client, exchangeCodeForSession } = authClient();
    await expect(
      handleAuthDeepLink(client, 'xavi-os://auth/callback?code=ignored&type=recovery'),
    ).resolves.toEqual({ handled: false, passwordRecovery: false });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  test('rejects signup callbacks sent to the recovery path', async () => {
    const { client, exchangeCodeForSession } = authClient();
    await expect(
      handleAuthDeepLink(client, 'xavi-os://auth/reset-password?code=ignored&type=signup'),
    ).resolves.toEqual({ handled: false, passwordRecovery: false });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  test('sanitizes provider errors on known paths', async () => {
    const { client } = authClient();
    await expect(
      handleAuthDeepLink(client, 'xavi-os://auth/callback?error_description=raw-provider-detail'),
    ).rejects.toThrow('Tautan autentikasi tidak valid atau sudah kedaluwarsa.');
  });

  test('clears an exchanged session that server validation rejects', async () => {
    const { client, getUser, signOut } = authClient();
    getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('invalid') } as never);
    await expect(handleAuthDeepLink(client, 'xavi-os://auth/callback?code=invalid-code')).rejects.toThrow();
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
