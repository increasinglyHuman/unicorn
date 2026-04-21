import { createContext } from 'react';
import type { GuideContent, UserLevel, ContentPackage } from '../types';
import type { UnicornStrings } from '../i18n';

/**
 * UnicornContext — the React context shape shared between UnicornProvider and its consumers.
 * Default value is null so useUnicorn() can throw a clear error when called outside a Provider.
 * This file is type-definition-only; the actual state is owned by UnicornProvider.
 *
 * Depends on: ../types (GuideContent, UserLevel, ContentPackage), ../i18n (UnicornStrings)
 * Depended on by: UnicornProvider (produces value), useUnicorn (consumes value)
 */
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

  // --- Auto-guide (ADR-002) ---
  /** Report that a host tool/panel just opened — dumb event in, smart decision out. */
  onToolOpen: (contextKey: string) => void;
  /** The guide currently showing a soft-prompt card, or null. */
  pendingAutoPrompt: GuideContent | null;
  /** User accepted the pending prompt — launches the guide. */
  acceptPendingPrompt: () => void;
  /** User declined the pending prompt with "Not now". */
  dismissPendingPrompt: () => void;
  /** User clicked "Don't ask again" — this guide won't auto-prompt again. */
  permanentlyDismissPendingPrompt: () => void;
  /** Whether auto-guides are enabled globally (user-controllable). */
  autoGuideEnabled: boolean;
  /** Toggle the global auto-guide switch (exposed for host settings UIs). */
  setAutoGuideEnabled: (enabled: boolean) => void;
  /** Reset all progression (completed, dismissed, fatigue) — "show me the tutorials again". */
  resetProgression: () => void;
}

export const UnicornContext = createContext<UnicornContextValue | null>(null);
