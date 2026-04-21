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
