/**
 * localStorage-backed HelpPrefStore — the v1 reference implementation of the
 * cross-app help-preference store proposed in ADR-003.
 *
 * STATUS: Design stub for ADR-003 (Centralized Help Preferences). Not yet exported
 * from the public entry point.
 *
 * Two deliberate departures from ProgressionState persistence (src/utils/progression.ts):
 *   1. SHARED KEY, not per-tool. ProgressionState uses `unicorn:<tool>` so apps don't
 *      collide — correct for completion state, which IS per-app. Help prefs are the
 *      opposite: one user choice must apply everywhere, so this uses a single
 *      un-namespaced key (STORAGE_KEY below). Same-origin suite ⇒ shared localStorage.
 *   2. Cross-context notification via the 'storage' event, so a toggle flipped in
 *      Animator's Settings updates a live guide in World's tab without a reload.
 *
 * Silent-fail discipline matches progression.ts: SSR, private browsing, and quota
 * errors degrade to in-memory defaults, never a crash. Persistence is a nicety.
 *
 * The seam: a future server-backed store (cross-device sync via the identity service)
 * implements the same HelpPrefStore interface. Consumers never change. Per ADR-001's
 * "library not a service" principle and the Good Neighbor Policy, that server binding
 * is out of scope here — this file stays localStorage-only.
 *
 * Depends on: ../types/helpPrefs (HelpPrefStore, HelpPreferences, HelpToggleKey),
 *             ./classifyFlavor (resolveHelpEnabled), browser localStorage
 * Depended on by: UnicornProvider (constructs one, provides via context), Settings UIs
 */

import type {
  HelpFlavor,
  HelpPrefStore,
  HelpPreferences,
  HelpToggleKey,
} from '../types/helpPrefs';
import { resolveHelpEnabled } from './classifyFlavor';

/** Shared across the whole suite — intentionally NOT namespaced per tool. */
const STORAGE_KEY = 'unicorn:help-prefs';

const DEFAULT_PREFS: HelpPreferences = { master: true, flavors: {} };

function readPrefs(): HelpPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS, flavors: {} };
    const parsed = JSON.parse(raw) as Partial<HelpPreferences>;
    return {
      master: parsed.master ?? true,
      flavors: parsed.flavors ?? {},
    };
  } catch {
    return { ...DEFAULT_PREFS, flavors: {} };
  }
}

function writePrefs(prefs: HelpPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable — degrade silently, in-memory value still served.
  }
}

/**
 * Construct a localStorage-backed help-preference store. One instance per app is
 * enough; multiple instances stay consistent because they share the storage key
 * and the 'storage' event.
 */
export function createLocalStorageHelpPrefStore(): HelpPrefStore {
  let prefs = readPrefs();
  const listeners = new Set<(p: HelpPreferences) => void>();

  const emit = () => {
    for (const listener of listeners) listener(prefs);
  };

  // Cross-tab / cross-app sync: another origin-sharing app wrote a new value.
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY) return;
      prefs = readPrefs();
      emit();
    });
  }

  return {
    isHelpEnabled(flavor?: HelpFlavor): boolean {
      return resolveHelpEnabled(prefs, flavor);
    },

    setHelpEnabled(key: HelpToggleKey, enabled: boolean): void {
      prefs =
        key === 'master'
          ? { ...prefs, master: enabled }
          : { ...prefs, flavors: { ...prefs.flavors, [key]: enabled } };
      writePrefs(prefs);
      emit();
    },

    getPreferences(): HelpPreferences {
      return { master: prefs.master, flavors: { ...prefs.flavors } };
    },

    subscribe(listener: (p: HelpPreferences) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
