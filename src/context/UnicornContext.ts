import { createContext } from 'react';
import type { GuideContent, UserLevel, ContentPackage } from '../types';
import type { UnicornStrings } from '../i18n';

export interface UnicornContextValue {
  /** Loaded content packages */
  content: ContentPackage[];
  /** Current user skill level */
  userLevel: UserLevel;
  /** Set of completed guide IDs */
  completedGuides: Set<string>;
  /** Currently active guide (if any) */
  activeGuide: GuideContent | null;
  /** Current step index within the active guide */
  activeStep: number;
  /** Open a guide by ID */
  openGuide: (guideId: string) => void;
  /** Close the active guide */
  closeGuide: () => void;
  /** Navigate to next/previous step */
  nextStep: () => void;
  prevStep: () => void;
  /** Mark a guide as completed */
  completeGuide: (guideId: string) => void;
  /** Open search panel */
  openSearch: (query?: string) => void;
  /** Close search panel */
  closeSearch: () => void;
  /** Whether search is open */
  isSearchOpen: boolean;
  /** Get annotation props for an element */
  annotate: (contextKey: string) => Record<string, unknown>;
  /** UI strings (i18n) */
  strings: UnicornStrings;
}

export const UnicornContext = createContext<UnicornContextValue | null>(null);
