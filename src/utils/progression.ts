import type { UserLevel } from '../types';

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
