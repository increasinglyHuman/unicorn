/**
 * Flavor classification — the SINGLE authority that maps a GuideContent to the
 * user-facing HelpFlavor it belongs to, plus the master-precedence resolver.
 *
 * STATUS: Design stub for ADR-003 (Centralized Help Preferences). Not yet exported
 * from the public entry point. Pure and unit-testable — no React, no storage, no DOM.
 *
 * Why this function exists: World slices help by user experience (tips/tooltips/
 * walkthroughs/coach) while the content schema slices by GuideMode
 * ('guide' | 'image-callout' | 'coach'). Those are different axes. Without one
 * shared classifier, World and Unicorn would each guess the mapping and drift.
 * Every consumer that needs "which flavor is this guide?" calls THIS.
 *
 * Depends on: ../types (GuideContent), ../types/helpPrefs (HelpFlavor, HelpPreferences)
 * Depended on by:
 *   - Lib-rendered surfaces (Guide/Coach) to gate on the matching flavor pref
 *   - Content-only consumers (e.g. World TeleportScreen) to gate loading tips
 */

import type { GuideContent } from '../types';
import type { HelpFlavor, HelpPreferences } from '../types/helpPrefs';

/**
 * Map a guide to its user-facing flavor.
 *
 * ORDER MATTERS — the tips check must come FIRST. The shipped teleport tips carry
 * `mode: 'coach'` (set for forward-compatibility, ignored by their content-only
 * consumer). If we checked mode before context/tags, those tips would misclassify
 * as 'coach' and be gated by the wrong toggle. The context/tag signal wins.
 */
export function classifyFlavor(guide: GuideContent): HelpFlavor {
  // 1. Loading tips — matched by context suffix or tag, NOT by mode (see note above).
  if (guide.context.endsWith('.tip') || guide.tags.includes('tip')) {
    return 'tips';
  }

  // 2. Contextual coach — behavior/error-triggered slide-ins.
  if (guide.mode === 'coach') {
    return 'coach';
  }

  // 3. Everything else ('guide' or 'image-callout') splits by step count.
  //    An image-callout is a rendering of a step, so it folds in here — it is not
  //    its own flavor.
  return guide.steps.length > 1 ? 'walkthroughs' : 'tooltips';
}

/**
 * Resolve whether a flavor is enabled given a preference snapshot, honoring master
 * precedence and the opt-out (default-enabled) model. This is the logic every
 * HelpPrefStore.isHelpEnabled implementation shares — kept pure so it can be tested
 * without a backing store.
 *
 * @param flavor omit to query the master switch itself.
 */
export function resolveHelpEnabled(prefs: HelpPreferences, flavor?: HelpFlavor): boolean {
  if (!prefs.master) return false; // master off ⇒ all off
  if (flavor === undefined) return true; // master is on
  return prefs.flavors[flavor] ?? true; // absent flavor ⇒ enabled
}
