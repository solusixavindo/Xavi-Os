import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const AUTH_STORAGE_KEY = 'xavi-os-auth-session';
const STORAGE_PREFIX = 'xavi.auth';
const CHUNK_SIZE = 1800;
const MAX_CHUNKS = 128;

export type AsyncKeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type SecureStoreDriver = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

type ChunkMetadata = {
  version: 1;
  generation: string;
  chunks: number;
};

let generationSequence = 0;

function safeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

function metadataKey(key: string): string {
  return `${STORAGE_PREFIX}.${safeKey(key)}.meta`;
}

function chunkKey(key: string, generation: string, index: number): string {
  return `${STORAGE_PREFIX}.${safeKey(key)}.${generation}.${index}`;
}

function parseMetadata(value: string | null): ChunkMetadata | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ChunkMetadata>;
    if (parsed.version !== 1 || typeof parsed.generation !== 'string' || !Number.isInteger(parsed.chunks)) return null;
    if ((parsed.chunks ?? 0) < 1 || (parsed.chunks ?? 0) > MAX_CHUNKS) return null;
    return parsed as ChunkMetadata;
  } catch {
    return null;
  }
}

async function deleteGeneration(driver: SecureStoreDriver, key: string, metadata: ChunkMetadata | null): Promise<void> {
  if (!metadata) return;
  await Promise.all(
    Array.from({ length: metadata.chunks }, (_, index) => driver.deleteItemAsync(chunkKey(key, metadata.generation, index))),
  );
}

export function createChunkedSecureStorage(driver: SecureStoreDriver): AsyncKeyValueStorage {
  return {
    async getItem(key) {
      const rawMetadata = await driver.getItemAsync(metadataKey(key));
      const metadata = parseMetadata(rawMetadata);
      if (!metadata) {
        if (rawMetadata) await driver.deleteItemAsync(metadataKey(key));
        return null;
      }

      const chunks = await Promise.all(
        Array.from({ length: metadata.chunks }, (_, index) => driver.getItemAsync(chunkKey(key, metadata.generation, index))),
      );
      if (chunks.some((chunk) => chunk === null)) {
        await driver.deleteItemAsync(metadataKey(key));
        await deleteGeneration(driver, key, metadata);
        return null;
      }
      return chunks.join('');
    },

    async setItem(key, value) {
      const chunks = Array.from({ length: Math.max(1, Math.ceil(value.length / CHUNK_SIZE)) }, (_, index) =>
        value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
      );
      if (chunks.length > MAX_CHUNKS) throw new Error('Session payload exceeds the secure storage limit.');

      const previousMetadata = parseMetadata(await driver.getItemAsync(metadataKey(key)));
      generationSequence += 1;
      const generation = `${Date.now().toString(36)}${generationSequence.toString(36)}`;
      const nextMetadata: ChunkMetadata = { version: 1, generation, chunks: chunks.length };

      try {
        await Promise.all(chunks.map((chunk, index) => driver.setItemAsync(chunkKey(key, generation, index), chunk)));
        await driver.setItemAsync(metadataKey(key), JSON.stringify(nextMetadata));
      } catch (error) {
        await deleteGeneration(driver, key, nextMetadata);
        throw error;
      }

      await deleteGeneration(driver, key, previousMetadata);
    },

    async removeItem(key) {
      const metadata = parseMetadata(await driver.getItemAsync(metadataKey(key)));
      await driver.deleteItemAsync(metadataKey(key));
      await deleteGeneration(driver, key, metadata);
    },
  };
}

const nativeDriver: SecureStoreDriver = {
  getItemAsync: (key) => SecureStore.getItemAsync(key),
  setItemAsync: (key, value) =>
    SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  deleteItemAsync: (key) => SecureStore.deleteItemAsync(key),
};

const webStorage: AsyncKeyValueStorage = {
  async getItem(key) {
    return globalThis.localStorage?.getItem(key) ?? null;
  },
  async setItem(key, value) {
    globalThis.localStorage?.setItem(key, value);
  },
  async removeItem(key) {
    globalThis.localStorage?.removeItem(key);
  },
};

export const secureSessionStorage =
  Platform.OS === 'web' ? webStorage : createChunkedSecureStorage(nativeDriver);

export async function clearPersistedSession(): Promise<void> {
  await secureSessionStorage.removeItem(AUTH_STORAGE_KEY);
}
