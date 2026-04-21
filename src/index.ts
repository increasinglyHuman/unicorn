/**
 * Public entry point — the full surface exported to consumers of @poqpoq/unicorn.
 * Anything not re-exported here is internal. This file must stay tree-shakeable:
 * re-export named symbols only, never side-effecting modules.
 *
 * Depends on: all src/ subtrees (components, hooks, content, types, i18n, utils)
 * Depended on by: Host applications (import root), Vite library bundler (entry)
 */

// Components
export { UnicornProvider } from './components/Provider';
export type { UnicornProviderProps } from './components/Provider';
export { Guide } from './components/Guide';
export { Search } from './components/Search';

// Hooks
export { useUnicorn } from './hooks';

// Content
export { ContentResolver } from './content';

// Types
export type {
  UserLevel,
  GuideMode,
  ExternalLinkType,
  ExternalLink,
  GuideStep,
  ImageCallout,
  ImageMarker,
  CoachTrigger,
  GuideContent,
  ContentPackage,
} from './types';

// i18n
export { defaultStrings } from './i18n';
export type { UnicornStrings } from './i18n';

// Utils
export { loadProgression, saveProgression } from './utils';
export type { ProgressionState } from './utils';
