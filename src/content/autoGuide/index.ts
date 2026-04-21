/**
 * Barrel — re-exports the auto-guide engine's public surface.
 * Everything here is pure with no React deps; the Provider layer consumes these.
 */

export { decideAutoGuide } from './decisionEngine';
export {
  createEmptyFatigue,
  recordPrompt,
  recordDismissal,
  recordPermanentDismissal,
  clearFatigue,
} from './fatigue';
