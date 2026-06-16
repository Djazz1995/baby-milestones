import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Async key-value storage contract Supabase auth expects.
 */
type AuthStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

/**
 * SecureStore caps each value at ~2048 bytes; a Supabase session JSON can
 * exceed that. This adapter transparently chunks values across multiple keys.
 * SecureStore keys allow only [A-Za-z0-9._-], so we join chunks with ".".
 */
const CHUNK_SIZE = 2000;

const secureStorage: AuthStorage = {
  async getItem(key) {
    const meta = await SecureStore.getItemAsync(`${key}.meta`);
    if (meta == null) {
      // Fall back to a single un-chunked value (older writes).
      return SecureStore.getItemAsync(key);
    }
    const count = Number(meta);
    let out = '';
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${key}.${i}`);
      if (part == null) return null;
      out += part;
    }
    return out;
  },
  async setItem(key, value) {
    const count = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(`${key}.meta`, String(count));
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(
        `${key}.${i}`,
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
      );
    }
    // Clear any stale single-value write.
    await SecureStore.deleteItemAsync(key);
  },
  async removeItem(key) {
    const meta = await SecureStore.getItemAsync(`${key}.meta`);
    if (meta != null) {
      const count = Number(meta);
      for (let i = 0; i < count; i++) {
        await SecureStore.deleteItemAsync(`${key}.${i}`);
      }
      await SecureStore.deleteItemAsync(`${key}.meta`);
    }
    await SecureStore.deleteItemAsync(key);
  },
};

/** SecureStore is unavailable on web; use localStorage there. */
const webStorage: AuthStorage = {
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

const storage = Platform.OS === 'web' ? webStorage : secureStorage;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values.'
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    // No URL-based session detection in a native app (AGENTS.md §8.2).
    detectSessionInUrl: false,
  },
});
