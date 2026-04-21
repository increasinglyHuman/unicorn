import type { ContentPackage, GuideContent, UserLevel } from '../types';

/**
 * ContentResolver — resolves guides from loaded ContentPackages by context key, ID, or free-text search.
 * Applies locale fallback (exact locale → 'en'), level filtering (show at-or-below user level),
 * and pre-builds context/tag indexes at construction for O(1) lookup. Pure, stateless across queries.
 *
 * Depends on: ../types (ContentPackage, GuideContent, UserLevel)
 * Depended on by:
 *   - UnicornProvider (memoized per content array — primary consumer)
 *   - Search (ad-hoc instance for full-text queries)
 *   - External consumers (e.g. World TeleportScreen — uses getByContext standalone, no Provider required)
 */
export class ContentResolver {
  private guides: Map<string, GuideContent> = new Map();
  private contextIndex: Map<string, GuideContent[]> = new Map();
  private tagIndex: Map<string, GuideContent[]> = new Map();

  constructor(packages: ContentPackage[]) {
    for (const pkg of packages) {
      for (const guide of pkg.guides) {
        this.guides.set(guide.id, guide);

        // Index by context key
        const existing = this.contextIndex.get(guide.context) ?? [];
        existing.push(guide);
        this.contextIndex.set(guide.context, existing);

        // Index by tags
        for (const tag of guide.tags) {
          const tagged = this.tagIndex.get(tag) ?? [];
          tagged.push(guide);
          this.tagIndex.set(tag, tagged);
        }
      }
    }
  }

  /** Get a guide by ID */
  getById(id: string): GuideContent | undefined {
    return this.guides.get(id);
  }

  /** Find guides matching a context key, filtered by level and locale */
  getByContext(
    context: string,
    options: { level?: UserLevel; locale?: string } = {},
  ): GuideContent[] {
    const candidates = this.contextIndex.get(context) ?? [];
    return this.filter(candidates, options);
  }

  /** Search guides by fuzzy text match across title, description, and tags */
  search(
    query: string,
    options: { level?: UserLevel; locale?: string } = {},
  ): GuideContent[] {
    if (!query.trim()) return [];

    const terms = query.toLowerCase().split(/\s+/);
    const scored: Array<{ guide: GuideContent; score: number }> = [];

    for (const guide of this.guides.values()) {
      const searchable = [
        guide.title,
        guide.description,
        ...guide.tags,
        ...guide.steps.map((s) => s.title),
      ]
        .join(' ')
        .toLowerCase();

      let score = 0;
      for (const term of terms) {
        if (searchable.includes(term)) score++;
      }

      if (score > 0) {
        scored.push({ guide, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const candidates = scored.map((s) => s.guide);
    return this.filter(candidates, options);
  }

  /** Get all guide IDs (for progression tracking) */
  getAllIds(): string[] {
    return Array.from(this.guides.keys());
  }

  private filter(
    guides: GuideContent[],
    options: { level?: UserLevel; locale?: string },
  ): GuideContent[] {
    const { level, locale = 'en' } = options;

    return guides.filter((guide) => {
      // Locale: prefer match, but always fall back to 'en'
      if (guide.locale !== locale && guide.locale !== 'en') return false;

      // Level: show content at or below the user's level
      if (level) {
        const levels: UserLevel[] = ['beginner', 'intermediate', 'advanced'];
        const userIdx = levels.indexOf(level);
        const guideIdx = levels.indexOf(guide.level);
        if (guideIdx > userIdx) return false;
      }

      return true;
    });
  }
}
