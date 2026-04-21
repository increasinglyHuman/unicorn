import type { FatigueRecord, UserLevel } from '../types';

/**
 * Progression persistence — localStorage-backed state for completed/dismissed guides,
 * user level, auto-guide opt-out flag, and per-guide fatigue. Scoped per tool via
 * `unicorn:<tool>` key so multiple BlackBox apps on the same origin don't collide.
 * Silent-fails on quota errors, SSR, or private browsing — persistence is a
 * nice-to-have, never a crash vector.
 *
 * Session state (sessionDismissals, lastAutoPromptAt) is intentionally NOT persisted
 * here; it lives in React state and resets on page reload, matching user expectations
 * of "session."
 *
 * Depends on: ../types (UserLevel, FatigueRecord), browser localStorage
 * Depended on by: UnicornProvider (loads on mount, saves on progression state changes)
 */

const STORAGE_PREFIX = 'unicorn';

export interface ProgressionState {
  completedGuides: string[];
  userLevel: UserLevel;
  dismissedGuides: string[];
  /** Per-guide fatigue — added in v0.2 alongside auto-guide engine. */
  fatigue: FatigueRecord;
  /** Global user opt-out for auto-guides. Added in v0.2. */
  autoGuideEnabled: boolean;
}

const defaultState: ProgressionState = {
  completedGuides: [],
  userLevel: 'beginner',
  dismissedGuides: [],
  fatigue: {},
  autoGuideEnabled: true,
};

/** Get the storage key for a tool */
function storageKey(tool: string): string {
  return `${STORAGE_PREFIX}:${tool}`;
}

/**
 * Load progression state from localStorage, merging stored fields onto defaults.
 * This merge shape is the forward-compatibility strategy: v0.1 saves (without
 * `fatigue` or `autoGuideEnabled`) load cleanly because defaults supply those
 * fields. Any unknown fields in stored JSON are preserved on the returned object
 * but are simply not read. No explicit schema version or migration step needed.
 */
export function loadProgression(tool: string): ProgressionState {
  try {
    const raw = localStorage.getItem(storageKey(tool));
    if (!raw) return cloneDefault();
    const parsed = JSON.parse(raw) as Partial<ProgressionState>;
    return { ...cloneDefault(), ...parsed };
  } catch {
    return cloneDefault();
  }
}

function cloneDefault(): ProgressionState {
  return {
    ...defaultState,
    completedGuides: [],
    dismissedGuides: [],
    fatigue: {},
  };
}

/** Save progression state to localStorage */
export function saveProgression(
  tool: string,
  state: ProgressionState,
): void {
  try {
    localStorage.setItem(storageKey(tool), JSON.stringify(state));
  } catch {
    // localStorage unavailable — degrade silently
  }
}
