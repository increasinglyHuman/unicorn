/**
 * Public entry point — the full surface exported to consumers of @increasinglyhuman/unicorn.
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
export { UnicornWatch } from './components/Watch';
export type { UnicornWatchProps } from './components/Watch';
export { AutoGuidePrompt } from './components/AutoGuidePrompt';

// Hooks
export { useUnicorn } from './hooks';

// Content
export { ContentResolver } from './content';
export {
  decideAutoGuide,
  createEmptyFatigue,
  recordPrompt,
  recordDismissal,
  recordPermanentDismissal,
  clearFatigue,
} from './content/autoGuide';

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
  PromptStrategy,
  AutoTriggerOn,
  AutoTrigger,
  AutoGuideConfig,
  GuideFatigueState,
  FatigueRecord,
  AutoGuideDecision,
  DeferReason,
  SkipReason,
  AutoGuideDecisionInput,
} from './types';

// i18n
export { defaultStrings } from './i18n';
export type { UnicornStrings } from './i18n';

// Utils
export { loadProgression, saveProgression } from './utils';
export type { ProgressionState } from './utils';
