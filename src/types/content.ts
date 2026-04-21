/**
 * Content schema — the complete type definitions for Unicorn guidance content.
 * This file is the canonical reference for ContentPackage authors (human or AI).
 * Changes here are public API changes and require a matching content schema version bump.
 *
 * Depends on: (nothing — pure type definitions)
 * Depended on by:
 *   - ContentResolver (parses and indexes these shapes)
 *   - UnicornProvider (type constraints on props)
 *   - Content authors (AI and human) writing ContentPackages for BlackBox apps
 */

/** Skill level for progressive content filtering */
export type UserLevel = 'beginner' | 'intermediate' | 'advanced';

/** Guidance mode determines rendering behavior */
export type GuideMode = 'guide' | 'image-callout' | 'coach';

/** External link types for handoff rendering */
export type ExternalLinkType = 'docs' | 'tutorial' | 'video' | 'api-reference';

/** An external link attached to any content node */
export interface ExternalLink {
  label: string;
  url: string;
  type: ExternalLinkType;
}

/** A single step within a guide */
export interface GuideStep {
  /** CSS selector or annotation key for the target element */
  target?: string;
  /** Whether to highlight the target element */
  highlight?: boolean;
  /** Step title */
  title: string;
  /** Rich content body (supports markdown) */
  body: string;
  /** Optional image with annotation markers */
  image?: ImageCallout;
  /** External links for deeper reading */
  externalLinks?: ExternalLink[];
}

/** Image callout with positioned markers */
export interface ImageCallout {
  src: string;
  alt: string;
  markers?: ImageMarker[];
}

/** A numbered marker on an annotated image */
export interface ImageMarker {
  x: number;
  y: number;
  label: string;
}

/** Coach trigger conditions */
export interface CoachTrigger {
  /** Trigger on specific user action */
  action?: string;
  /** Trigger on error matching this pattern */
  errorPattern?: string;
  /** Trigger after N seconds of inactivity in a context */
  inactivitySeconds?: number;
}

/**
 * How an auto-triggered guide is presented to the user.
 *   - 'soft':   Slide-in card offering the guide with Yes / Not now / Don't ask again
 *   - 'direct': Launches the guide immediately (still Escape-dismissable)
 *   - 'badge':  Marks the annotated element with data-unicorn-auto-badge="true"
 *               so the host app can render a visual indicator; user opts in explicitly.
 *               If no element with the matching context is mounted, the guide is
 *               silently deferred (still discoverable via search).
 */
export type PromptStrategy = 'soft' | 'direct' | 'badge';

/**
 * When an auto-triggered guide should fire.
 *   - 'first-use': Only if the user has not yet completed this guide.
 *                  (Currently the only supported mode — future modes may include
 *                  'every-use' or 'on-error' once the engine grows.)
 */
export type AutoTriggerOn = 'first-use';

/**
 * Opt-in auto-guide configuration on a GuideContent entry.
 * Presence of this field makes the guide eligible for proactive presentation
 * when the host app calls onToolOpen(context) with a matching context key.
 * Absence means the guide is user-initiated only (search, explicit openGuide).
 */
export interface AutoTrigger {
  /** When the trigger fires. See {@link AutoTriggerOn}. */
  on: AutoTriggerOn;
  /** Presentation strategy. Defaults to the Provider's `autoGuide.defaultPrompt`. */
  prompt?: PromptStrategy;
  /** When multiple guides match one context, higher priority wins. Defaults to 0. */
  priority?: number;
}

/** A complete guide content entry */
export interface GuideContent {
  /** Unique identifier */
  id: string;
  /** Which tool this belongs to */
  tool: string;
  /** Context key for matching (dot-separated path) */
  context: string;
  /** Guidance mode */
  mode: GuideMode;
  /** Target skill level */
  level: UserLevel;
  /** Locale code (BCP 47) */
  locale: string;
  /** Guide IDs that should be completed first */
  prerequisites?: string[];
  /** Searchable tags */
  tags: string[];
  /** Display title */
  title: string;
  /** Brief description for search results */
  description: string;
  /** Guide steps (1 = tooltip-like, N = walkthrough) */
  steps: GuideStep[];
  /** Coach-specific trigger (only for mode: 'coach') */
  coachTrigger?: CoachTrigger;
  /** Opt-in auto-guide trigger — see {@link AutoTrigger}. Absence = user-initiated only. */
  autoTrigger?: AutoTrigger;
  /** External links at the guide level */
  externalLinks?: ExternalLink[];
  /** Hash of source files this content describes (staleness detection) */
  sourceHash?: string;
  /** Who/what authored this content */
  generatedBy?: string;
  /** Who reviewed it */
  reviewedBy?: string;
  /** When it was last reviewed */
  reviewedAt?: string;
}

/** A content package — all guides for a tool (or shared) */
export interface ContentPackage {
  /** Tool identifier (e.g., 'poqpoq-world', 'animator', 'shared') */
  tool: string;
  /** Package version */
  version: string;
  /** All guide content entries */
  guides: GuideContent[];
}
