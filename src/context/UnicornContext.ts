import { createContext } from 'react';
import type { GuideContent, UserLevel, ContentPackage } from '../types';
import type { HelpFlavor, HelpToggleKey } from '../types/helpPrefs';
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
  /**
   * @deprecated Back-compat alias for `isHelpEnabled('coach')` (ADR-003). Reads the
   * coach flavor toggle, which subsumes the old global auto-guide switch. Prefer
   * `isHelpEnabled` in new code; this remains so existing host Settings UIs keep working.
   */
  autoGuideEnabled: boolean;
  /**
   * @deprecated Back-compat alias for `setHelpEnabled('coach', enabled)` (ADR-003).
   * Prefer `setHelpEnabled` in new code.
   */
  setAutoGuideEnabled: (enabled: boolean) => void;
  /** Reset all progression (completed, dismissed, fatigue) — "show me the tutorials again". */
  resetProgression: () => void;

  // --- Help preferences (ADR-003) ---
  /**
   * Whether a help flavor is enabled for this app, resolving per-app → global →
   * default-enabled precedence (master:false at either scope forces off). Called with
   * no argument, returns the effective master state. Lib-rendered surfaces gate on this;
   * content-only consumers (e.g. teleport tips) must call it themselves before rendering.
   */
  isHelpEnabled: (flavor?: HelpFlavor) => boolean;
  /**
   * Toggle a help flavor (or 'master') and persist. Writes to this app's preference
   * layer. Bind Settings toggles to this.
   */
  setHelpEnabled: (key: HelpToggleKey, enabled: boolean) => void;
}

export const UnicornContext = createContext<UnicornContextValue | null>(null);
