/**
 * Storage adapter (04_ARCHITECTURE): every persistence read/write goes through
 * this interface so a real backend can replace localStorage without touching
 * UI code. All reads are defensive — corrupted storage never crashes the app.
 */

export interface StorageAdapter {
  get<T>(key: string, fallback: T): T;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

const PREFIX = 'gac-connect:';

function makeWebStorageAdapter(getStore: () => Storage): StorageAdapter {
  return {
    get<T>(key: string, fallback: T): T {
      try {
        const raw = getStore().getItem(PREFIX + key);
        if (raw === null) return fallback;
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    set<T>(key: string, value: T): void {
      try {
        getStore().setItem(PREFIX + key, JSON.stringify(value));
      } catch {
        // Quota exceeded or storage unavailable — persistence is best-effort.
      }
    },
    remove(key: string): void {
      try {
        getStore().removeItem(PREFIX + key);
      } catch {
        // Ignore — nothing to clean up if storage is unavailable.
      }
    },
  };
}

/** In-memory fallback for environments without web storage. */
export function makeMemoryAdapter(): StorageAdapter {
  const map = new Map<string, string>();
  return {
    get<T>(key: string, fallback: T): T {
      const raw = map.get(key);
      if (raw === undefined) return fallback;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    },
    set<T>(key: string, value: T): void {
      map.set(key, JSON.stringify(value));
    },
    remove(key: string): void {
      map.delete(key);
    },
  };
}

function safeWebAdapter(getStore: () => Storage): StorageAdapter {
  try {
    const s = getStore();
    const probe = PREFIX + '__probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return makeWebStorageAdapter(getStore);
  } catch {
    return makeMemoryAdapter();
  }
}

/** Durable state: tier selections, tour dismissal, quote acceptances. */
export const persistent: StorageAdapter = safeWebAdapter(() => window.localStorage);

/** Session state: loader-seen-this-session. */
export const session: StorageAdapter = safeWebAdapter(() => window.sessionStorage);
