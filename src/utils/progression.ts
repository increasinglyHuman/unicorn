import type { UserLevel } from '../types';

/**
 * Progression persistence — localStorage-backed state for completed/dismissed guides and user level.
 * Scoped per tool via `unicorn:<tool>` key so multiple BlackBox apps on the same origin don't collide.
 * Silent-fails on quota errors, SSR, or private browsing — persistence is a nice-to-have, never a crash vector.
 *
 * Depends on: ../types (UserLevel), browser localStorage
 * Depended on by: UnicornProvider (loads on mount, saves on progression state changes)
 */

const STORAGE_PREFIX = 'unicorn';

export interface ProgressionState {
  completedGuides: string[];
  userLevel: UserLevel;
  dismissedGuides: string[];
}

const defaultState: ProgressionState = {
  completedGuides: [],
  userLevel: 'beginner',
  dismissedGuides: [],
};

/** Get the storage key for a tool */
function storageKey(tool: string): string {
  return `${STORAGE_PREFIX}:${tool}`;
}

/** Load progression state from localStorage */
export function loadProgression(tool: string): ProgressionState {
  try {
    const raw = localStorage.getItem(storageKey(tool));
    if (!raw) return { ...defaultState };
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return { ...defaultState };
  }
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
