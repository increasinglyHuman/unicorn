import { useState, useCallback, useMemo, type ReactNode } from 'react';
import { UnicornContext } from '../../context';
import type { ContentPackage, UserLevel, GuideContent } from '../../types';
import type { UnicornStrings } from '../../i18n';
import { defaultStrings } from '../../i18n';
import { ContentResolver } from '../../content';
import { loadProgression, saveProgression } from '../../utils/progression';

export interface UnicornProviderProps {
  /** Content packages to load */
  content: ContentPackage[];
  /** Tool identifier (used for progression storage) */
  tool: string;
  /** Initial user skill level */
  userLevel?: UserLevel;
  /** UI string overrides (for i18n) */
  strings?: Partial<UnicornStrings>;
  /** Child components */
  children: ReactNode;
}

export function UnicornProvider({
  content,
  tool,
  userLevel: initialLevel = 'beginner',
  strings: stringOverrides,
  children,
}: UnicornProviderProps) {
  const resolver = useMemo(() => new ContentResolver(content), [content]);
  const strings = useMemo(
    () => ({ ...defaultStrings, ...stringOverrides }),
    [stringOverrides],
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
    // Query is available for pre-populating the search input
    // The Search component reads this from context
    void query;
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const annotate = useCallback(
    (contextKey: string): Record<string, unknown> => {
      return {
        'data-unicorn-context': contextKey,
        'data-unicorn-has-guide': resolver
          .getByContext(contextKey, { level: userLevel })
          .length > 0,
      };
    },
    [resolver, userLevel],
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
    ],
  );

  return (
    <UnicornContext.Provider value={value}>{children}</UnicornContext.Provider>
  );
}
