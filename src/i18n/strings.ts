/**
 * UI chrome strings — externalized from day one for i18n readiness.
 * All user-facing text in Unicorn components goes through this table.
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
