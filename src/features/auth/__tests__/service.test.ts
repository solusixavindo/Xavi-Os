import { logoutAndClearSession, safeAuthError } from '../service';

describe('logout', () => {
  test('signs out locally and clears persisted session', async () => {
    const signOut = jest.fn(async () => ({ error: null }));
    const clear = jest.fn(async () => undefined);
    await logoutAndClearSession({ auth: { signOut } }, clear);
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(clear).toHaveBeenCalledTimes(1);
  });

  test('still clears storage when sign-out returns an error', async () => {
    const clear = jest.fn(async () => undefined);
    await expect(
      logoutAndClearSession({ auth: { signOut: async () => ({ error: new Error('network') }) } }, clear),
    ).rejects.toThrow('network');
    expect(clear).toHaveBeenCalledTimes(1);
  });
});

describe('safe auth errors', () => {
  test('maps a gateway 404 without exposing technical details', () => {
    const error = Object.assign(new Error('raw gateway response'), { status: 404 });
    expect(safeAuthError(error)).toBe('Layanan autentikasi belum terhubung dengan benar.');
  });
});
