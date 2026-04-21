/**
 * Fatigue state helpers — pure functions for reading and updating the per-guide
 * fatigue record. Every helper returns a NEW FatigueRecord rather than mutating,
 * so they're safe to use inside React state setters (setState((prev) => next)).
 *
 * Persistence lives in ../../utils/progression; this file only transforms state.
 *
 * Depends on: ../../types (FatigueRecord, GuideFatigueState)
 * Depended on by: ../../components/Provider/useAutoGuide (state transitions)
 */

import type { FatigueRecord, GuideFatigueState } from '../../types';

const emptyGuideState: GuideFatigueState = {
  dismissCount: 0,
  permanentlyDismissed: false,
  lastPrompted: null,
};

/** Starting state for a fresh install — empty record, zero bookkeeping. */
export function createEmptyFatigue(): FatigueRecord {
  return {};
}

/**
 * Record that an auto-prompt was shown for `guideId` at the given timestamp.
 * Does not increment dismissCount — dismissal happens later if the user declines.
 */
export function recordPrompt(
  fatigue: FatigueRecord,
  guideId: string,
  at: Date = new Date(),
): FatigueRecord {
  const current = fatigue[guideId] ?? emptyGuideState;
  return {
    ...fatigue,
    [guideId]: {
      ...current,
      lastPrompted: at.toISOString(),
    },
  };
}

/**
 * Record that the user clicked "Not now" on an auto-prompt for `guideId`.
 * Bumps the dismissCount by one. Once dismissCount reaches the Provider's
 * maxDismissalsPerGuide, the decision engine will stop selecting this guide.
 */
export function recordDismissal(
  fatigue: FatigueRecord,
  guideId: string,
): FatigueRecord {
  const current = fatigue[guideId] ?? emptyGuideState;
  return {
    ...fatigue,
    [guideId]: {
      ...current,
      dismissCount: current.dismissCount + 1,
    },
  };
}

/**
 * Record that the user clicked "Don't ask again" — this guide is permanently
 * excluded from auto-prompts (they can still find it via search or openGuide).
 */
export function recordPermanentDismissal(
  fatigue: FatigueRecord,
  guideId: string,
): FatigueRecord {
  const current = fatigue[guideId] ?? emptyGuideState;
  return {
    ...fatigue,
    [guideId]: {
      ...current,
      permanentlyDismissed: true,
    },
  };
}

/**
 * Clear all fatigue for `guideId` — exposed via resetProgression() for users
 * who want to see auto-prompts again. Returns a new record with the entry removed.
 */
export function clearFatigue(
  fatigue: FatigueRecord,
  guideId: string,
): FatigueRecord {
  if (!(guideId in fatigue)) return fatigue;
  const next = { ...fatigue };
  delete next[guideId];
  return next;
}
