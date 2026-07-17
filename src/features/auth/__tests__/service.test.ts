import { logoutAndClearSession } from '../service';

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
