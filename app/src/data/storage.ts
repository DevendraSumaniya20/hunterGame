import { createAsyncStorage } from '@react-native-async-storage/async-storage';

/** On-device key/value storage for this app. */
export const storage = createAsyncStorage('hunt');

export async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null; // corrupt or unreadable: behave like a fresh install
  }
}

export const writeJson = (key: string, value: unknown) => storage.setItem(key, JSON.stringify(value));
