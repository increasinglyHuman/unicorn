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
} from './content';

export type {
  AutoGuideConfig,
  GuideFatigueState,
  FatigueRecord,
  AutoGuideDecision,
  DeferReason,
  SkipReason,
  AutoGuideDecisionInput,
} from './autoGuide';

export type {
  HelpFlavor,
  HelpToggleKey,
  HelpPreferences,
  HelpPrefStore,
} from './helpPrefs';
export { HELP_FLAVORS } from './helpPrefs';
