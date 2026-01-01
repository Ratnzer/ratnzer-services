/**
 * localCache
 * - Synchronous cache (localStorage) for instant app startup on Android (Capacitor WebView).
 * - Stores small/medium JSON payloads (profile, orders, products, banners, etc.).
 * - Uses an envelope with timestamp to support "show cached immediately, refresh in background".
 *
 * NOTE:
 *  - Keep payload sizes reasonable (very large arrays/images should use Filesystem/SQLite).
 */
type CacheEnvelope<T> = { ts: number; data: T };

const PREFIX = 'ratelozn_cache_v1:';

function now() {
  return Date.now();
}

function keyOf(key: string) {
  return `${PREFIX}${key}`;
}

function safeParse<T>(raw: string | null): CacheEnvelope<T> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.ts !== 'number' || !('data' in parsed)) return null;
    return parsed as CacheEnvelope<T>;
  } catch {
    return null;
  }
}

export const localCache = {
  getEnvelope<T>(key: string): CacheEnvelope<T> | null {
    if (typeof window === 'undefined') return null;
    try {
      return safeParse<T>(window.localStorage.getItem(keyOf(key)));
    } catch {
      return null;
    }
  },

  get<T>(key: string, fallback: T): T {
    const env = this.getEnvelope<T>(key);
    return env ? env.data : fallback;
  },

  set<T>(key: string, data: T) {
    if (typeof window === 'undefined') return;
    try {
      const env: CacheEnvelope<T> = { ts: now(), data };
      window.localStorage.setItem(keyOf(key), JSON.stringify(env));
    } catch {
      // Swallow quota / serialization errors (don't crash UI)
    }
  },

  remove(key: string) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(keyOf(key));
    } catch {}
  },

  removeMany(keys: string[]) {
    keys.forEach(k => this.remove(k));
  }
};

export default localCache;
