/**
 * localStorage-backed HelpPrefStore — the v1 implementation of the cross-app
 * help-preference store (ADR-003 lib side / World ADR-174 consumer side).
 *
 * Persistence model (two departures from ProgressionState, src/utils/progression.ts):
 *   1. SHARED GLOBAL KEY, not per-tool. ProgressionState uses `unicorn:<tool>` so apps
 *      don't collide — correct for completion state, which IS per-app. Help prefs are
 *      the opposite: one user choice applies everywhere, so the global layer lives at a
 *      single un-namespaced key. Same-origin suite ⇒ shared localStorage.
 *   2. Cross-context notification via the 'storage' event, so a toggle flipped in one
 *      app's Settings updates a live guide in another tab without a reload.
 *
 * Per-app override (ADR-174 §R3): constructing with an `appId` adds a per-app layer at
 * `unicorn:help-prefs:<appId>` that is read AHEAD of the global layer. Resolution
 * precedence is per-app → global → default-enabled, with master:false at either scope
 * forcing off (see resolveHelpEnabled). The public method signatures are unchanged —
 * only the constructor gained an optional argument, exactly as World requested, so a
 * per-app UI can ship later without an API break.
 *
 * Write scope: a store writes to the layer it was constructed for — an app-scoped store
 * (appId given) writes the per-app key; a global store (no appId) writes the global key.
 * getPreferences() likewise returns that own layer (what setHelpEnabled mutates), while
 * isHelpEnabled() always resolves the full precedence stack.
 *
 * The seam: a future server-backed store (cross-device sync via the identity service)
 * implements the same HelpPrefStore interface — consumers never change. Per ADR-001's
 * "library not a service" principle and the Good Neighbor Policy, that server binding is
 * out of scope here; this file stays localStorage-only.
 *
 * Silent-fail discipline matches progression.ts: SSR, private browsing, and quota errors
 * degrade to in-memory defaults, never a crash.
 *
 * Depends on: ../types/helpPrefs (HelpPrefStore, HelpPreferences, HelpToggleKey, HelpFlavor),
 *             ./classifyFlavor (resolveHelpEnabled), browser localStorage
 * Depended on by: UnicornProvider (constructs one scoped to `tool`, provides via context),
 *                 Settings UIs (global + per-app override panels)
 */

import type {
  HelpFlavor,
  HelpPrefStore,
  HelpPreferences,
  HelpToggleKey,
} from '../types/helpPrefs';
import { resolveHelpEnabled } from './classifyFlavor';

/** The global layer — intentionally NOT namespaced per tool. Shared suite-wide. */
const GLOBAL_KEY = 'unicorn:help-prefs';

/** Per-app override layer key. Read ahead of GLOBAL_KEY when an appId is set. */
function appKey(appId: string): string {
  return `${GLOBAL_KEY}:${appId}`;
}

function emptyPrefs(): HelpPreferences {
  return { master: true, flavors: {} };
}

function readKey(key: string): HelpPreferences {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return emptyPrefs();
    const parsed = JSON.parse(raw) as Partial<HelpPreferences>;
    return { master: parsed.master ?? true, flavors: parsed.flavors ?? {} };
  } catch {
    return emptyPrefs();
  }
}

function writeKey(key: string, prefs: HelpPreferences): void {
  try {
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable — degrade silently; in-memory value still served.
  }
}

/**
 * Construct a localStorage-backed help-preference store.
 *
 * @param appId optional per-app scope. When provided, an override layer at
 *   `unicorn:help-prefs:<appId>` is read ahead of the shared global layer, and writes
 *   from this store target that per-app layer. Omit for a global store (writes global).
 */
export function createLocalStorageHelpPrefStore(appId?: string): HelpPrefStore {
  const ownKey = appId ? appKey(appId) : GLOBAL_KEY;

  // Cached layers. `own` is what this store writes; the precedence stack is what it reads.
  let ownPrefs = readKey(ownKey);
  let globalPrefs = appId ? readKey(GLOBAL_KEY) : ownPrefs;

  const listeners = new Set<(p: HelpPreferences) => void>();
  const emit = () => {
    for (const listener of listeners) listener(ownPrefs);
  };

  /** Precedence stack, most-specific-first. */
  const layers = (): HelpPreferences[] =>
    appId ? [ownPrefs, globalPrefs] : [globalPrefs];

  // Cross-tab / cross-app sync: another origin-sharing context wrote a layer we read.
  if (
    typeof window !== 'undefined' &&
    typeof window.addEventListener === 'function'
  ) {
    window.addEventListener('storage', (e) => {
      if (e.key === ownKey) {
        ownPrefs = readKey(ownKey);
        if (!appId) globalPrefs = ownPrefs;
        emit();
      } else if (appId && e.key === GLOBAL_KEY) {
        globalPrefs = readKey(GLOBAL_KEY);
        emit();
      }
    });
  }

  return {
    isHelpEnabled(flavor?: HelpFlavor): boolean {
      return resolveHelpEnabled(layers(), flavor);
    },

    setHelpEnabled(key: HelpToggleKey, enabled: boolean): void {
      ownPrefs =
        key === 'master'
          ? { ...ownPrefs, master: enabled }
          : { ...ownPrefs, flavors: { ...ownPrefs.flavors, [key]: enabled } };
      if (!appId) globalPrefs = ownPrefs; // global store: own layer IS the global layer
      writeKey(ownKey, ownPrefs);
      emit();
    },

    getPreferences(): HelpPreferences {
      // Return this store's OWN layer (what setHelpEnabled mutates), not the merge.
      return { master: ownPrefs.master, flavors: { ...ownPrefs.flavors } };
    },

    subscribe(listener: (p: HelpPreferences) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
