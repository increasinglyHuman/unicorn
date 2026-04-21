import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { UnicornContext } from '../../context';
import type {
  AutoGuideConfig,
  ContentPackage,
  FatigueRecord,
  GuideContent,
  UserLevel,
} from '../../types';
import type { UnicornStrings } from '../../i18n';
import { defaultStrings } from '../../i18n';
import { ContentResolver } from '../../content';
import { loadProgression, saveProgression } from '../../utils/progression';
import { useAutoGuide } from './useAutoGuide';

/**
 * UnicornProvider — root context provider wrapping a host app's Unicorn-aware subtree.
 * Owns active guide state, step cursor, search visibility, user level, progression
 * persistence, and delegates all auto-guide behavior (ADR-002) to useAutoGuide.
 * All public hooks read from this provider; useUnicorn() throws clearly if used outside one.
 *
 * Depends on:
 *   - ../../context (UnicornContext — the React context object)
 *   - ../../content (ContentResolver — memoized per content array)
 *   - ../../utils/progression (localStorage-backed state persistence)
 *   - ../../i18n (defaultStrings + UnicornStrings for string overrides)
 *   - ../../types (ContentPackage, UserLevel, GuideContent, AutoGuideConfig, FatigueRecord)
 *   - ./useAutoGuide (auto-guide engine wiring — kept separate so this file stays small)
 * Depended on by:
 *   - Host applications (wrap app root or relevant subtree)
 *   - Guide, Search, useUnicorn — consume the context this provides
 */
export interface UnicornProviderProps {
  /** Content packages to load */
  content: ContentPackage[];
  /** Tool identifier (used for progression storage) */
  tool: string;
  /** Initial user skill level */
  userLevel?: UserLevel;
  /** UI string overrides (for i18n) */
  strings?: Partial<UnicornStrings>;
  /** Auto-guide engine configuration (ADR-002). Partial — fields not supplied use defaults. */
  autoGuide?: Partial<AutoGuideConfig>;
  /** Child components */
  children: ReactNode;
}

/** Defaults from ADR-002 "Three Strikes" — see Fatigue Management section. */
const defaultAutoGuideConfig: AutoGuideConfig = {
  enabled: true,
  fatigueThreshold: 3,
  cooldownSeconds: 30,
  maxDismissalsPerGuide: 2,
  defaultPrompt: 'soft',
};

export function UnicornProvider({
  content,
  tool,
  userLevel: initialLevel = 'beginner',
  strings: stringOverrides,
  autoGuide: autoGuideOverrides,
  children,
}: UnicornProviderProps) {
  const resolver = useMemo(() => new ContentResolver(content), [content]);
  const strings = useMemo(
    () => ({ ...defaultStrings, ...stringOverrides }),
    [stringOverrides],
  );
  const autoGuideConfig = useMemo(
    () => ({ ...defaultAutoGuideConfig, ...autoGuideOverrides }),
    [autoGuideOverrides],
  );

  const [progression, setProgression] = useState(() => loadProgression(tool));
  const [activeGuide, setActiveGuide] = useState<GuideContent | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const userLevel = initialLevel ?? progression.userLevel;

  const completedGuides = useMemo(
    () => new Set(progression.completedGuides),
    [progression.completedGuides],
  );

  const persistProgression = useCallback(
    (next: typeof progression) => {
      setProgression(next);
      saveProgression(tool, next);
    },
    [tool],
  );

  const updateFatigue = useCallback(
    (next: FatigueRecord) => {
      persistProgression({ ...progression, fatigue: next });
    },
    [persistProgression, progression],
  );

  const setAutoGuideEnabled = useCallback(
    (enabled: boolean) => {
      persistProgression({ ...progression, autoGuideEnabled: enabled });
    },
    [persistProgression, progression],
  );

  // resetProgression is declared after useAutoGuide below so it can call into
  // autoGuide.resetSession() to also clear session-scoped state (cooldown,
  // pendingPrompt, sessionDismissals). "Show me tutorials again" must work
  // immediately, without waiting out the 30s cooldown from the prior prompt.

  const openGuide = useCallback(
    (guideId: string) => {
      const guide = resolver.getById(guideId);
      if (guide) {
        setActiveGuide(guide);
        setActiveStep(0);
      }
    },
    [resolver],
  );

  const closeGuide = useCallback(() => {
    setActiveGuide(null);
    setActiveStep(0);
  }, []);

  const nextStep = useCallback(() => {
    if (activeGuide && activeStep < activeGuide.steps.length - 1) {
      setActiveStep((s) => s + 1);
    }
  }, [activeGuide, activeStep]);

  const prevStep = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep((s) => s - 1);
    }
  }, [activeStep]);

  const completeGuide = useCallback(
    (guideId: string) => {
      setProgression((prev) => {
        const next = {
          ...prev,
          completedGuides: [...new Set([...prev.completedGuides, guideId])],
        };
        saveProgression(tool, next);
        return next;
      });
    },
    [tool],
  );

  const openSearch = useCallback((query?: string) => {
    setIsSearchOpen(true);
    void query;
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const autoGuide = useAutoGuide({
    resolver,
    config: autoGuideConfig,
    userLevel,
    completedGuides,
    fatigue: progression.fatigue,
    autoGuideEnabled: progression.autoGuideEnabled,
    isAnotherGuideActive: activeGuide !== null,
    updateFatigue,
    openGuide,
  });

  const resetProgression = useCallback(() => {
    persistProgression({
      completedGuides: [],
      userLevel,
      dismissedGuides: [],
      fatigue: {},
      autoGuideEnabled: true,
    });
    autoGuide.resetSession();
  }, [persistProgression, userLevel, autoGuide]);

  const annotate = useCallback(
    (contextKey: string): Record<string, unknown> => {
      const hasGuide =
        resolver.getByContext(contextKey, { level: userLevel }).length > 0;
      const hasBadge = autoGuide.getBadgeGuideForContext(contextKey) !== null;
      return {
        'data-unicorn-context': contextKey,
        'data-unicorn-has-guide': hasGuide,
        ...(hasBadge ? { 'data-unicorn-auto-badge': true } : {}),
      };
    },
    [resolver, userLevel, autoGuide],
  );

  const value = useMemo(
    () => ({
      content,
      userLevel,
      completedGuides,
      activeGuide,
      activeStep,
      openGuide,
      closeGuide,
      nextStep,
      prevStep,
      completeGuide,
      openSearch,
      closeSearch,
      isSearchOpen,
      annotate,
      strings,
      onToolOpen: autoGuide.onToolOpen,
      pendingAutoPrompt: autoGuide.pendingPrompt,
      acceptPendingPrompt: autoGuide.acceptPendingPrompt,
      dismissPendingPrompt: autoGuide.dismissPendingPrompt,
      permanentlyDismissPendingPrompt:
        autoGuide.permanentlyDismissPendingPrompt,
      autoGuideEnabled: progression.autoGuideEnabled,
      setAutoGuideEnabled,
      resetProgression,
    }),
    [
      content,
      userLevel,
      completedGuides,
      activeGuide,
      activeStep,
      openGuide,
      closeGuide,
      nextStep,
      prevStep,
      completeGuide,
      openSearch,
      closeSearch,
      isSearchOpen,
      annotate,
      strings,
      autoGuide,
      progression.autoGuideEnabled,
      setAutoGuideEnabled,
      resetProgression,
    ],
  );

  return (
    <UnicornContext.Provider value={value}>{children}</UnicornContext.Provider>
  );
}
