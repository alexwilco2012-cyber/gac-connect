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

/**
 * A new visit starts clean (18 Sep). Demo work — the accepted quote, matched
 * invoices, a procurement half way to Compass, the tier switches — used to
 * outlive the tab, so whoever opened the site next found everything already
 * chosen and had to reach for Reset demo before they could choose anything.
 * Now it lasts as long as the tab does: a reload keeps it (the session flag
 * survives a reload), a fresh tab or a fresh scan of the QR does not.
 *
 * Two keys are preferences rather than demo work and stay: the collapsed
 * sidebar, and the tour dismissal — someone who said "No thanks" yesterday is
 * not asked again today. The top bar's Reset demo is the deliberate way to
 * bring the tour offer back.
 *
 * Runs here, at module load, because every store imports this file before it
 * reads a key — so the sweep is always ahead of the first read.
 */
export const VISIT_KEPT_KEYS: readonly string[] = ['sidebarCollapsed', 'tourDismissed'];
const VISIT_FLAG = 'demoSession';
const DECK_CORE_KEYS: readonly string[] = [
  'calc',
  'accepted',
  'sent',
  'tour-dismissed',
  'dash-view',
];

export function startFreshVisit(getLocal: () => Storage, sessionAdapter: StorageAdapter): void {
  if (sessionAdapter.get<boolean>(VISIT_FLAG, false)) return;
  try {
    const store = getLocal();
    const doomed: string[] = [];
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      const name = key.slice(PREFIX.length);
      // The deck shares this origin and sweeps its own keys ('pres.' and its
      // five core names); the site leaves them alone.
      if (name.startsWith('pres.') || DECK_CORE_KEYS.includes(name)) continue;
      if (!VISIT_KEPT_KEYS.includes(name)) doomed.push(key);
    }
    for (const key of doomed) store.removeItem(key);
  } catch {
    // Storage unavailable — there is nothing to sweep.
  }
  sessionAdapter.set(VISIT_FLAG, true);
}

startFreshVisit(() => window.localStorage, session);
