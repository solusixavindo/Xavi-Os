import { createChunkedSecureStorage, type SecureStoreDriver } from '../secureStorage';

function memoryDriver() {
  const values = new Map<string, string>();
  const driver: SecureStoreDriver = {
    async getItemAsync(key) { return values.get(key) ?? null; },
    async setItemAsync(key, value) { values.set(key, value); },
    async deleteItemAsync(key) { values.delete(key); },
  };
  return { driver, values };
}

describe('chunked secure session storage', () => {
  test('persists and restores a payload larger than one SecureStore entry', async () => {
    const { driver, values } = memoryDriver();
    const storage = createChunkedSecureStorage(driver);
    const session = JSON.stringify({ access_token: 'a'.repeat(5200), refresh_token: 'b'.repeat(1200) });
    await storage.setItem('session', session);
    expect(values.size).toBeGreaterThan(2);
    await expect(storage.getItem('session')).resolves.toBe(session);
  });

  test('removes metadata and every session chunk', async () => {
    const { driver, values } = memoryDriver();
    const storage = createChunkedSecureStorage(driver);
    await storage.setItem('session', 'x'.repeat(4000));
    await storage.removeItem('session');
    expect(values.size).toBe(0);
    await expect(storage.getItem('session')).resolves.toBeNull();
  });

  test('invalidates and cleans a generation with a missing chunk', async () => {
    const { driver, values } = memoryDriver();
    const storage = createChunkedSecureStorage(driver);
    await storage.setItem('session', 'x'.repeat(4000));
    const chunkKey = [...values.keys()].find((key) => !key.endsWith('.meta'));
    expect(chunkKey).toBeDefined();
    values.delete(chunkKey!);

    await expect(storage.getItem('session')).resolves.toBeNull();
    expect(values.size).toBe(0);
  });

  test('keeps the previous valid generation when a replacement write fails', async () => {
    const { driver, values } = memoryDriver();
    const storage = createChunkedSecureStorage(driver);
    await storage.setItem('session', 'previous-session');
    const previousKeys = new Set(values.keys());
    const originalSet = driver.setItemAsync;
    let failed = false;
    driver.setItemAsync = async (key, value) => {
      if (!failed && !key.endsWith('.meta') && value.startsWith('replacement')) {
        failed = true;
        throw new Error('simulated secure storage failure');
      }
      await originalSet(key, value);
    };

    await expect(storage.setItem('session', `replacement${'x'.repeat(4000)}`)).rejects.toThrow(
      'simulated secure storage failure',
    );
    await expect(storage.getItem('session')).resolves.toBe('previous-session');
    expect(new Set(values.keys())).toEqual(previousKeys);
  });
});
