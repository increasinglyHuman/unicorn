/**
 * i18n string table — externalizes every user-facing string Unicorn renders in its own chrome
 * (buttons, placeholders, step counters). Host content strings (guide titles, step bodies)
 * live in ContentPackages and use the guide's own locale field — they are out of scope here.
 * Host apps override via <UnicornProvider strings={...}>; partial overrides merge onto defaults.
 *
 * Depends on: (nothing — zero runtime imports by design)
 * Depended on by: UnicornProvider (merges overrides), Guide, Search (consume via useUnicorn().strings)
 */

export interface UnicornStrings {
  next: string;
  previous: string;
  close: string;
  finish: string;
  stepOf: (current: number, total: number) => string;
  searchPlaceholder: string;
  searchNoResults: string;
  goDeeper: string;
  gotIt: string;
  showMeHow: string;
  skipGuide: string;
}

export const defaultStrings: UnicornStrings = {
  next: 'Next',
  previous: 'Previous',
  close: 'Close',
  finish: 'Finish',
  stepOf: (current, total) => `Step ${current} of ${total}`,
  searchPlaceholder: 'Search guides...',
  searchNoResults: 'No guides found',
  goDeeper: 'Go deeper',
  gotIt: 'Got it',
  showMeHow: 'Show me how',
  skipGuide: 'Skip',
};
