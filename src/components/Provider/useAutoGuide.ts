/**
 * useAutoGuide — encapsulates all auto-guide runtime behavior so UnicornProvider
 * stays small and focused on orchestration. Owns session-scoped state (session
 * dismissals, cooldown tracking, pending prompt, badged contexts) and the
 * onToolOpen callback that glues host events to the pure decision engine.
 *
 * Design notes:
 *   - Session state is React-only (never persisted). Reloading the page resets
 *     sessionDismissals and lastAutoPromptAt — this matches user expectations
 *     of "session" and keeps the engine from outliving its welcome.
 *   - Persisted state (completedGuides, fatigue) is passed in from the Provider
 *     and written back via the `updateFatigue` callback. This hook does not
 *     touch localStorage directly; persistence is Provider's concern.
 *   - The 'defer' decision is treated as a no-op for v1: the next onToolOpen
 *     call for the same context will re-evaluate, which is sufficient for the
 *     auto-prompt UX. Explicit deferred-queue replay can be added in v0.3
 *     if real usage shows it's needed.
 *
 * Depends on:
 *   - ../../content/autoGuide (decideAutoGuide, fatigue helpers)
 *   - ../../types (AutoGuideConfig, FatigueRecord, GuideContent, UserLevel)
 * Depended on by: ./UnicornProvider (called once inside the provider body)
 */

import { useCallback, useRef, useState } from 'react';
import {
  decideAutoGuide,
  recordDismissal,
  recordPermanentDismissal,
  recordPrompt,
} from '../../content/autoGuide';
import type { ContentResolver } from '../../content';
import type {
  AutoGuideConfig,
  FatigueRecord,
  GuideContent,
  UserLevel,
} from '../../types';

export interface UseAutoGuideArgs {
  resolver: ContentResolver;
  config: AutoGuideConfig;
  userLevel: UserLevel;
  completedGuides: Set<string>;
  fatigue: FatigueRecord;
  /** Global user opt-out; AND-ed with config.enabled. */
  autoGuideEnabled: boolean;
  /** True when a regular guide is open — defer auto-guides while that's true. */
  isAnotherGuideActive: boolean;
  /** Persistence hook from the Provider — replaces the fatigue record. */
  updateFatigue: (next: FatigueRecord) => void;
  /** Open a guide by ID (used for 'direct' strategy and for accepting prompts). */
  openGuide: (guideId: string) => void;
}

export interface UseAutoGuideResult {
  /** The guide currently awaiting a soft-prompt decision from the user, or null. */
  pendingPrompt: GuideContent | null;
  /** Call this when a host tool/panel opens. Dumb event in, smart decision out. */
  onToolOpen: (context: string) => void;
  /** User clicked "Yes" on the pending soft prompt. */
  acceptPendingPrompt: () => void;
  /** User clicked "Not now" on the pending soft prompt. */
  dismissPendingPrompt: () => void;
  /** User clicked "Don't ask again" on the pending soft prompt. */
  permanentlyDismissPendingPrompt: () => void;
  /**
   * If the badge strategy fired for a context, returns the guide that should
   * be opened when the host's badge UI is clicked. Returns null if no badge
   * is active for that context.
   */
  getBadgeGuideForContext: (context: string) => GuideContent | null;
  /**
   * Clear session-scoped state (sessionDismissals, lastAutoPromptAt, pendingPrompt, badges).
   * Called by Provider.resetProgression so "show me tutorials again" works immediately
   * without waiting out a lingering cooldown.
   */
  resetSession: () => void;
}

export function useAutoGuide(args: UseAutoGuideArgs): UseAutoGuideResult {
  const [pendingPrompt, setPendingPrompt] = useState<GuideContent | null>(null);
  const [sessionDismissals, setSessionDismissals] = useState(0);
  const [lastAutoPromptAt, setLastAutoPromptAt] = useState<number | null>(null);
  const [badgedContexts, setBadgedContexts] = useState<
    Map<string, GuideContent>
  >(() => new Map());

  // Use a ref for args so the onToolOpen callback doesn't need to list every
  // arg field in its deps — the callback reads the LATEST values without
  // causing re-renders of anything that captures the callback reference.
  const argsRef = useRef(args);
  argsRef.current = args;

  const onToolOpen = useCallback(
    (context: string) => {
      const {
        resolver,
        config,
        userLevel,
        completedGuides,
        fatigue,
        autoGuideEnabled,
        isAnotherGuideActive,
        updateFatigue,
        openGuide,
      } = argsRef.current;

      const effectiveConfig: AutoGuideConfig = {
        ...config,
        enabled: config.enabled && autoGuideEnabled,
      };

      const candidates = resolver.getByContext(context, { level: userLevel });

      const decision = decideAutoGuide({
        context,
        candidates,
        completedGuides,
        fatigue,
        sessionDismissals,
        lastAutoPromptAt,
        isAnotherGuideActive,
        now: Date.now(),
        config: effectiveConfig,
      });

      if (decision.action !== 'show') return;

      updateFatigue(recordPrompt(fatigue, decision.guide.id));
      setLastAutoPromptAt(Date.now());

      switch (decision.strategy) {
        case 'soft':
          setPendingPrompt(decision.guide);
          break;
        case 'direct':
          openGuide(decision.guide.id);
          break;
        case 'badge':
          setBadgedContexts((prev) => {
            const next = new Map(prev);
            next.set(context, decision.guide);
            return next;
          });
          break;
      }
    },
    [sessionDismissals, lastAutoPromptAt],
  );

  const acceptPendingPrompt = useCallback(() => {
    if (!pendingPrompt) return;
    argsRef.current.openGuide(pendingPrompt.id);
    setPendingPrompt(null);
  }, [pendingPrompt]);

  const dismissPendingPrompt = useCallback(() => {
    if (!pendingPrompt) return;
    const { updateFatigue, fatigue } = argsRef.current;
    updateFatigue(recordDismissal(fatigue, pendingPrompt.id));
    setSessionDismissals((d) => d + 1);
    setPendingPrompt(null);
  }, [pendingPrompt]);

  const permanentlyDismissPendingPrompt = useCallback(() => {
    if (!pendingPrompt) return;
    const { updateFatigue, fatigue } = argsRef.current;
    updateFatigue(recordPermanentDismissal(fatigue, pendingPrompt.id));
    setSessionDismissals((d) => d + 1);
    setPendingPrompt(null);
  }, [pendingPrompt]);

  const getBadgeGuideForContext = useCallback(
    (context: string): GuideContent | null => {
      return badgedContexts.get(context) ?? null;
    },
    [badgedContexts],
  );

  const resetSession = useCallback(() => {
    setPendingPrompt(null);
    setSessionDismissals(0);
    setLastAutoPromptAt(null);
    setBadgedContexts(new Map());
  }, []);

  return {
    pendingPrompt,
    onToolOpen,
    acceptPendingPrompt,
    dismissPendingPrompt,
    permanentlyDismissPendingPrompt,
    getBadgeGuideForContext,
    resetSession,
  };
}
