/**
 * Auto-guide types — configuration, runtime state, and decision engine outputs.
 * Split from ../types/content.ts because these describe Unicorn runtime behavior,
 * not the shape of authored content. Content authors never need to touch this file.
 *
 * Depends on: ./content (GuideContent, PromptStrategy)
 * Depended on by:
 *   - ../content/autoGuide/decisionEngine (input and output types)
 *   - ../content/autoGuide/fatigue (state shape)
 *   - ../components/Provider/UnicornProvider (config prop, context state)
 *   - ../utils/progression (persisted state extension)
 */

import type { GuideContent, PromptStrategy } from './content';

/**
 * Host-app-facing configuration for the auto-guide engine.
 * Passed as the `autoGuide` prop on <UnicornProvider>; all fields optional with sensible defaults.
 */
export interface AutoGuideConfig {
  /** Master switch. If false, onToolOpen() is a no-op. Default: true. */
  enabled: boolean;
  /**
   * Dismissals per session before the engine goes quiet for the rest of the session.
   * User-initiated guidance (search, openGuide) still works. Default: 3.
   */
  fatigueThreshold: number;
  /** Minimum seconds between auto-prompts, to avoid stacking. Default: 30. */
  cooldownSeconds: number;
  /**
   * "Not now" dismissals per guide before that guide stops auto-prompting.
   * Separate from permanentlyDismissed ("Don't ask again"). Default: 2.
   */
  maxDismissalsPerGuide: number;
  /** Fallback strategy when a guide's autoTrigger doesn't specify one. Default: 'soft'. */
  defaultPrompt: PromptStrategy;
}

/** Per-guide fatigue bookkeeping — persisted to localStorage. */
export interface GuideFatigueState {
  /** Count of "Not now" dismissals of this specific guide's auto-prompt. */
  dismissCount: number;
  /** User explicitly clicked "Don't ask again" — never auto-prompt this guide again. */
  permanentlyDismissed: boolean;
  /** ISO timestamp of the last auto-prompt for this guide (or null if never prompted). */
  lastPrompted: string | null;
}

/** Map of guide ID → fatigue record. Empty object on first run. */
export type FatigueRecord = Record<string, GuideFatigueState>;

/** Outcome of a single decision engine evaluation. All branches are explicit. */
export type AutoGuideDecision =
  | { action: 'show'; guide: GuideContent; strategy: PromptStrategy }
  | { action: 'defer'; guide: GuideContent; reason: DeferReason }
  | { action: 'skip'; reason: SkipReason };

/**
 * Why a decision was deferred — the guide is eligible but can't fire right now.
 * Deferred guides may be re-evaluated on the next onToolOpen for the same context.
 */
export type DeferReason = 'cooldown-active' | 'another-guide-active';

/**
 * Why a decision was skipped — the guide will not fire for this onToolOpen call.
 * Skip is typically permanent for the current session; some reasons are permanent forever.
 */
export type SkipReason =
  | 'engine-disabled'
  | 'no-matching-guide'
  | 'already-completed'
  | 'permanently-dismissed'
  | 'guide-dismissal-threshold'
  | 'session-fatigue-threshold';

/**
 * Input state for a decision engine call. All data is explicit; no hidden globals.
 * `now` is injectable to make time-based logic (cooldowns) trivially testable.
 */
export interface AutoGuideDecisionInput {
  /** The context key that was opened. */
  context: string;
  /** All guides that match the context key (before filtering). */
  candidates: GuideContent[];
  /** Guide IDs the user has already completed. */
  completedGuides: Set<string>;
  /** Per-guide fatigue state, persisted across sessions. */
  fatigue: FatigueRecord;
  /** Total dismissals in the current session (not persisted). */
  sessionDismissals: number;
  /** Timestamp of the last auto-prompt fired this session (not persisted). */
  lastAutoPromptAt: number | null;
  /** True if another guide is already visible — defer, don't interrupt. */
  isAnotherGuideActive: boolean;
  /** Current timestamp in ms (Date.now()) — injectable for testing. */
  now: number;
  /** Engine configuration. */
  config: AutoGuideConfig;
}
