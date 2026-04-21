/**
 * Decision engine — pure function that decides whether, when, and how to present
 * an auto-triggered guide in response to an onToolOpen(context) call.
 *
 * Intentionally pure: all inputs explicit (including `now` for clock injection),
 * no side effects, no I/O, no hidden globals. This is the comprehension anchor
 * for ADR-002's "Dumb Events, Smart Decisions" principle — the host's event
 * is dumb, this function is where all the judgment lives, and it's unit-testable
 * in isolation without React, storage, or a DOM.
 *
 * Depends on: ../../types (AutoGuideDecisionInput, AutoGuideDecision, GuideContent, PromptStrategy)
 * Depended on by: ../../components/Provider/useAutoGuide (runtime consumer)
 */

import type {
  AutoGuideDecision,
  AutoGuideDecisionInput,
  GuideContent,
  PromptStrategy,
} from '../../types';

/**
 * Decide what to do when a context key opens and one or more guides might apply.
 * Returns exactly one of: 'show', 'defer', or 'skip'. Never throws.
 *
 * Decision chain (short-circuits at first match, order matters):
 *   1. Engine disabled            → skip:engine-disabled
 *   2. No eligible candidate      → skip:no-matching-guide
 *   3. Best candidate completed   → skip:already-completed
 *   4. Best candidate perma-dism. → skip:permanently-dismissed
 *   5. Guide dismissal threshold  → skip:guide-dismissal-threshold
 *   6. Session fatigue threshold  → skip:session-fatigue-threshold
 *   7. Another guide visible      → defer:another-guide-active
 *   8. Cooldown not elapsed       → defer:cooldown-active
 *   9. All clear                  → show
 *
 * Candidate selection: filter to guides with an autoTrigger, rank by (priority desc,
 * then array order for stability), and evaluate the top candidate only. If the top
 * candidate fails a check that is guide-specific (completed / dismissed), we move
 * to the next one in rank order. Session-level failures (fatigue, cooldown) are
 * checked once against the eventual "best" candidate.
 */
export function decideAutoGuide(
  input: AutoGuideDecisionInput,
): AutoGuideDecision {
  const {
    candidates,
    completedGuides,
    fatigue,
    sessionDismissals,
    lastAutoPromptAt,
    isAnotherGuideActive,
    now,
    config,
  } = input;

  if (!config.enabled) {
    return { action: 'skip', reason: 'engine-disabled' };
  }

  const autoCandidates = candidates
    .filter(
      (
        g,
      ): g is GuideContent & {
        autoTrigger: NonNullable<GuideContent['autoTrigger']>;
      } => g.autoTrigger !== undefined,
    )
    .sort(
      (a, b) => (b.autoTrigger.priority ?? 0) - (a.autoTrigger.priority ?? 0),
    );

  if (autoCandidates.length === 0) {
    return { action: 'skip', reason: 'no-matching-guide' };
  }

  // Walk candidates in priority order until we find one that isn't guide-specifically blocked.
  // Guide-specific blocks (completed, permanently dismissed, dismissal threshold) only rule out
  // that one guide — another matching guide might still be eligible.
  let selected: (typeof autoCandidates)[number] | null = null;
  let firstGuideBlockedReason: AutoGuideDecision | null = null;

  for (const guide of autoCandidates) {
    if (completedGuides.has(guide.id)) {
      firstGuideBlockedReason ??= {
        action: 'skip',
        reason: 'already-completed',
      };
      continue;
    }

    const guideFatigue = fatigue[guide.id];
    if (guideFatigue?.permanentlyDismissed) {
      firstGuideBlockedReason ??= {
        action: 'skip',
        reason: 'permanently-dismissed',
      };
      continue;
    }

    if (
      guideFatigue &&
      guideFatigue.dismissCount >= config.maxDismissalsPerGuide
    ) {
      firstGuideBlockedReason ??= {
        action: 'skip',
        reason: 'guide-dismissal-threshold',
      };
      continue;
    }

    selected = guide;
    break;
  }

  if (!selected) {
    // Every candidate was guide-specifically blocked; surface the first reason.
    // The null check above guarantees firstGuideBlockedReason is set if we got here.
    return (
      firstGuideBlockedReason ?? { action: 'skip', reason: 'no-matching-guide' }
    );
  }

  // Session-level checks (apply regardless of which guide was selected).
  if (sessionDismissals >= config.fatigueThreshold) {
    return { action: 'skip', reason: 'session-fatigue-threshold' };
  }

  if (isAnotherGuideActive) {
    return { action: 'defer', guide: selected, reason: 'another-guide-active' };
  }

  if (
    lastAutoPromptAt !== null &&
    now - lastAutoPromptAt < config.cooldownSeconds * 1000
  ) {
    return { action: 'defer', guide: selected, reason: 'cooldown-active' };
  }

  const strategy: PromptStrategy =
    selected.autoTrigger.prompt ?? config.defaultPrompt;

  return { action: 'show', guide: selected, strategy };
}
