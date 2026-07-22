/**
 * Help-preference schema — the contract for the centralized, cross-app guidance
 * enable/disable system proposed in ADR-003 (Centralized Help Preferences).
 *
 * STATUS: Design stub. These signatures are what World's ADR cites; they are NOT
 * yet exported from the public entry point (src/index.ts). Wiring into the barrel
 * + a version bump happens when ADR-003 is accepted. Nothing here ships until then.
 *
 * Design intent (see comms.md, Unicorn reply 2026-07-22):
 *   - ONE shared store for the whole suite, NOT the per-tool `unicorn:<tool>` key
 *     that ProgressionState uses. A user's help choice must stick across World,
 *     Animator, Skinner, kudzu — which works via localStorage because the suite
 *     is same-origin (https://poqpoq.com/...). The HelpPrefStore interface is the
 *     seam that lets a server-backed adapter replace localStorage later (cross-
 *     device sync) without changing the isHelpEnabled/setHelpEnabled consumer API.
 *   - Flavors slice by USER-FACING EXPERIENCE, not by GuideMode. See classifyFlavor.
 *
 * Depends on: (nothing — pure type definitions)
 * Depended on by:
 *   - src/prefs/classifyFlavor (maps a GuideContent to its flavor)
 *   - src/prefs/helpPrefStore (localStorage reference implementation)
 *   - Consumer Settings UIs (bind toggles to setHelpEnabled)
 *   - Lib-rendered surfaces (Guide/Coach gate on isHelpEnabled internally)
 */

/**
 * The four user-facing help experiences a user can independently toggle.
 * Deliberately NOT the same axis as GuideMode ('guide' | 'image-callout' | 'coach'):
 *   - 'tips'         Loading-screen tips (teleport style). Content-only — the lib
 *                    never renders these, so the CONSUMER must gate on the pref.
 *   - 'tooltips'     One-step guides (mode 'guide' or 'image-callout', steps.length === 1).
 *   - 'walkthroughs' Multi-step tours (mode 'guide' or 'image-callout', steps.length > 1).
 *   - 'coach'        Behavior/error-triggered slide-ins (mode 'coach').
 * Note there is no 'image-callout' flavor: an image callout is a rendering of a
 * step, so it folds into whichever guide contains it.
 */
export type HelpFlavor = 'tips' | 'tooltips' | 'walkthroughs' | 'coach';

/** The complete set of flavors, in display order. Single source for Settings UIs. */
export const HELP_FLAVORS: readonly HelpFlavor[] = [
  'tips',
  'tooltips',
  'walkthroughs',
  'coach',
] as const;

/**
 * Every key a consumer can flip: the four flavors plus the master switch.
 * 'master' off ⇒ ALL flavors resolve disabled regardless of their own value.
 */
export type HelpToggleKey = HelpFlavor | 'master';

/**
 * Persisted help preferences — SHARED across all suite apps (not per-tool).
 * Missing/unknown fields default to enabled (opt-out model, matching the existing
 * `autoGuideEnabled: true` default in ProgressionState, which ADR-003 subsumes).
 */
export interface HelpPreferences {
  /** Master switch. When false, every flavor is treated as disabled. Default true. */
  master: boolean;
  /** Per-flavor enablement. An absent flavor is treated as enabled. */
  flavors: Partial<Record<HelpFlavor, boolean>>;
}

/**
 * Storage adapter for help preferences. The whole point of this interface is the
 * seam: localStorage today (createLocalStorageHelpPrefStore), a server-backed
 * implementation later for cross-device sync — consumers never change because they
 * only ever call isHelpEnabled / setHelpEnabled / subscribe.
 */
export interface HelpPrefStore {
  /**
   * Resolve whether a flavor is enabled, honoring master precedence.
   * Called with no argument, returns the master state.
   * Never throws; a broken/absent backing store resolves to the opt-out default (enabled).
   */
  isHelpEnabled(flavor?: HelpFlavor): boolean;

  /** Set a flavor (or 'master') on/off and persist. Notifies subscribers. */
  setHelpEnabled(key: HelpToggleKey, enabled: boolean): void;

  /** Read the full preference snapshot (for rendering a Settings panel). */
  getPreferences(): HelpPreferences;

  /**
   * Subscribe to preference changes. Returns an unsubscribe function.
   * Fires after every setHelpEnabled so live guides and Settings UIs stay in sync,
   * including across tabs/apps when the backing store emits cross-context events.
   */
  subscribe(listener: (prefs: HelpPreferences) => void): () => void;
}
