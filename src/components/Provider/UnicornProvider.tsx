import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { UnicornContext } from '../../context';
import type {
  AutoGuideConfig,
  ContentPackage,
  FatigueRecord,
  GuideContent,
  UserLevel,
} from '../../types';
import type {
  HelpFlavor,
  HelpPrefStore,
  HelpToggleKey,
} from '../../types/helpPrefs';
import type { UnicornStrings } from '../../i18n';
import { defaultStrings } from '../../i18n';
import { ContentResolver } from '../../content';
import { loadProgression, saveProgression } from '../../utils/progression';
import { createLocalStorageHelpPrefStore } from '../../prefs';
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

  // Help-preference store (ADR-003), scoped to this tool as its per-app override layer
  // (reads per-app → global → default). Constructed once; a subscribe-driven tick below
  // makes its reads reactive. The legacy `autoGuideEnabled` opt-out is subsumed by the
  // migration effect further down (it needs persistProgression, defined below).
  const storeRef = useRef<HelpPrefStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createLocalStorageHelpPrefStore(tool);
  }
  const helpPrefStore = storeRef.current;

  // Force a re-render when help prefs change (this tab via setHelpEnabled, or another
  // origin-sharing tab via the 'storage' event) so gated surfaces re-evaluate.
  const [helpPrefsTick, bumpHelpPrefs] = useReducer((n: number) => n + 1, 0);
  useEffect(
    () => helpPrefStore.subscribe(() => bumpHelpPrefs()),
    [helpPrefStore],
  );

  const isHelpEnabled = useCallback(
    (flavor?: HelpFlavor) => helpPrefStore.isHelpEnabled(flavor),
    // helpPrefsTick is intentionally in deps: it doesn't appear in the body, but bumping
    // it must refresh this callback's identity so the memoized context value updates and
    // gated consumers re-render with fresh pref reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [helpPrefStore, helpPrefsTick],
  );
  const setHelpEnabled = useCallback(
    (key: HelpToggleKey, enabled: boolean) =>
      helpPrefStore.setHelpEnabled(key, enabled),
    [helpPrefStore],
  );

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

  // Back-compat: the old global auto-guide switch was the on/off master for the whole
  // auto-guide engine, so it maps to the help-pref master switch (ADR-003).
  const setAutoGuideEnabled = useCallback(
    (enabled: boolean) => helpPrefStore.setHelpEnabled('master', enabled),
    [helpPrefStore],
  );

  // One-time subsume of the legacy per-tool `autoGuideEnabled` opt-out into master.
  // Neutralizes the legacy flag after migrating so a later user re-enable is never
  // clobbered on remount (idempotency comes from the persisted flag flip, not a marker).
  const migratedRef = useRef(false);
  useEffect(() => {
    if (migratedRef.current) return;
    migratedRef.current = true;
    if (progression.autoGuideEnabled === false) {
      helpPrefStore.setHelpEnabled('master', false);
      persistProgression({ ...progression, autoGuideEnabled: true });
    }
    // Mount-only migration reading the initial progression snapshot; intentionally not
    // re-run on progression changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    isHelpEnabled,
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
    // "Show me the tutorials again" re-enables the master switch (which subsumed the
    // legacy auto-guide toggle). Individual flavor opt-outs are deliberate settings, kept.
    helpPrefStore.setHelpEnabled('master', true);
    autoGuide.resetSession();
  }, [persistProgression, userLevel, autoGuide, helpPrefStore]);

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
      autoGuideEnabled: isHelpEnabled(),
      setAutoGuideEnabled,
      isHelpEnabled,
      setHelpEnabled,
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
      isHelpEnabled,
      setHelpEnabled,
      setAutoGuideEnabled,
      resetProgression,
    ],
  );

  return (
    <UnicornContext.Provider value={value}>{children}</UnicornContext.Provider>
  );
}
