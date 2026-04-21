import { describe, it, expect } from 'vitest';
import { decideAutoGuide } from './decisionEngine';
import type {
  AutoGuideConfig,
  AutoGuideDecisionInput,
  FatigueRecord,
  GuideContent,
  GuideFatigueState,
} from '../../types';

/**
 * decisionEngine tests — every branch of the decision chain gets direct coverage.
 * The engine is pure, so all tests build a minimal DecisionInput and assert on
 * the returned tagged-union Decision. No React, no DOM, no storage.
 */

const defaultConfig: AutoGuideConfig = {
  enabled: true,
  fatigueThreshold: 3,
  cooldownSeconds: 30,
  maxDismissalsPerGuide: 2,
  defaultPrompt: 'soft',
};

function makeGuide(overrides: Partial<GuideContent> = {}): GuideContent {
  return {
    id: 'guide-1',
    tool: 'test',
    context: 'test.context',
    mode: 'guide',
    level: 'beginner',
    locale: 'en',
    tags: [],
    title: 'Test Guide',
    description: 'A test guide',
    steps: [{ title: 'Step', body: 'Body' }],
    autoTrigger: { on: 'first-use' },
    ...overrides,
  };
}

function makeFatigue(
  guideId: string,
  state: Partial<GuideFatigueState>,
): FatigueRecord {
  return {
    [guideId]: {
      dismissCount: 0,
      permanentlyDismissed: false,
      lastPrompted: null,
      ...state,
    },
  };
}

function makeInput(
  overrides: Partial<AutoGuideDecisionInput> = {},
): AutoGuideDecisionInput {
  return {
    context: 'test.context',
    candidates: [],
    completedGuides: new Set(),
    fatigue: {},
    sessionDismissals: 0,
    lastAutoPromptAt: null,
    isAnotherGuideActive: false,
    now: 1_000_000,
    config: defaultConfig,
    ...overrides,
  };
}

describe('decideAutoGuide', () => {
  describe('skip decisions', () => {
    it('skips when engine is disabled', () => {
      const result = decideAutoGuide(
        makeInput({
          candidates: [makeGuide()],
          config: { ...defaultConfig, enabled: false },
        }),
      );
      expect(result).toEqual({ action: 'skip', reason: 'engine-disabled' });
    });

    it('skips when no candidates match', () => {
      const result = decideAutoGuide(makeInput({ candidates: [] }));
      expect(result).toEqual({ action: 'skip', reason: 'no-matching-guide' });
    });

    it('skips when candidates exist but none have autoTrigger', () => {
      const guide = makeGuide({ autoTrigger: undefined });
      const result = decideAutoGuide(makeInput({ candidates: [guide] }));
      expect(result).toEqual({ action: 'skip', reason: 'no-matching-guide' });
    });

    it('skips when the only candidate is already completed', () => {
      const guide = makeGuide();
      const result = decideAutoGuide(
        makeInput({
          candidates: [guide],
          completedGuides: new Set([guide.id]),
        }),
      );
      expect(result).toEqual({ action: 'skip', reason: 'already-completed' });
    });

    it('skips when the only candidate is permanently dismissed', () => {
      const guide = makeGuide();
      const result = decideAutoGuide(
        makeInput({
          candidates: [guide],
          fatigue: makeFatigue(guide.id, { permanentlyDismissed: true }),
        }),
      );
      expect(result).toEqual({
        action: 'skip',
        reason: 'permanently-dismissed',
      });
    });

    it('skips when candidate has hit the per-guide dismissal threshold', () => {
      const guide = makeGuide();
      const result = decideAutoGuide(
        makeInput({
          candidates: [guide],
          fatigue: makeFatigue(guide.id, { dismissCount: 2 }),
        }),
      );
      expect(result).toEqual({
        action: 'skip',
        reason: 'guide-dismissal-threshold',
      });
    });

    it('skips when session fatigue threshold is reached', () => {
      const guide = makeGuide();
      const result = decideAutoGuide(
        makeInput({
          candidates: [guide],
          sessionDismissals: 3,
        }),
      );
      expect(result).toEqual({
        action: 'skip',
        reason: 'session-fatigue-threshold',
      });
    });
  });

  describe('defer decisions', () => {
    it('defers when another guide is active', () => {
      const guide = makeGuide();
      const result = decideAutoGuide(
        makeInput({ candidates: [guide], isAnotherGuideActive: true }),
      );
      expect(result).toEqual({
        action: 'defer',
        guide,
        reason: 'another-guide-active',
      });
    });

    it('defers when cooldown is active', () => {
      const guide = makeGuide();
      const now = 1_000_000;
      const result = decideAutoGuide(
        makeInput({
          candidates: [guide],
          now,
          // 10s ago, cooldown is 30s → still within cooldown
          lastAutoPromptAt: now - 10_000,
        }),
      );
      expect(result).toEqual({
        action: 'defer',
        guide,
        reason: 'cooldown-active',
      });
    });

    it('does not defer for cooldown if cooldown has elapsed exactly', () => {
      const guide = makeGuide();
      const now = 1_000_000;
      const result = decideAutoGuide(
        makeInput({
          candidates: [guide],
          now,
          lastAutoPromptAt: now - 30_000, // exactly cooldownSeconds ago
        }),
      );
      expect(result.action).toBe('show');
    });

    it('prefers "session-fatigue" over "defer" when both apply', () => {
      // Session-fatigue is a skip (permanent for session), defer is transient.
      // Skipping first is correct because there's no point queueing a guide the session is done with.
      const guide = makeGuide();
      const result = decideAutoGuide(
        makeInput({
          candidates: [guide],
          sessionDismissals: 3,
          isAnotherGuideActive: true,
        }),
      );
      expect(result).toEqual({
        action: 'skip',
        reason: 'session-fatigue-threshold',
      });
    });
  });

  describe('show decisions', () => {
    it('shows when all checks pass', () => {
      const guide = makeGuide();
      const result = decideAutoGuide(makeInput({ candidates: [guide] }));
      expect(result).toEqual({
        action: 'show',
        guide,
        strategy: 'soft',
      });
    });

    it('uses the guide-level prompt strategy when specified', () => {
      const guide = makeGuide({
        autoTrigger: { on: 'first-use', prompt: 'direct' },
      });
      const result = decideAutoGuide(makeInput({ candidates: [guide] }));
      expect(result).toEqual({
        action: 'show',
        guide,
        strategy: 'direct',
      });
    });

    it('falls back to config.defaultPrompt when guide omits strategy', () => {
      const guide = makeGuide({ autoTrigger: { on: 'first-use' } });
      const result = decideAutoGuide(
        makeInput({
          candidates: [guide],
          config: { ...defaultConfig, defaultPrompt: 'badge' },
        }),
      );
      expect(result).toEqual({
        action: 'show',
        guide,
        strategy: 'badge',
      });
    });

    it('shows without cooldown when this is the first auto-prompt of the session', () => {
      const guide = makeGuide();
      const result = decideAutoGuide(
        makeInput({ candidates: [guide], lastAutoPromptAt: null }),
      );
      expect(result.action).toBe('show');
    });
  });

  describe('candidate ranking and fallthrough', () => {
    it('picks the highest-priority candidate among multiple matches', () => {
      const low = makeGuide({
        id: 'low',
        autoTrigger: { on: 'first-use', priority: 1 },
      });
      const high = makeGuide({
        id: 'high',
        autoTrigger: { on: 'first-use', priority: 5 },
      });
      const result = decideAutoGuide(
        makeInput({ candidates: [low, high] }),
      );
      expect(result.action).toBe('show');
      if (result.action === 'show') {
        expect(result.guide.id).toBe('high');
      }
    });

    it('falls through to a lower-priority guide when higher is completed', () => {
      const high = makeGuide({
        id: 'high',
        autoTrigger: { on: 'first-use', priority: 5 },
      });
      const low = makeGuide({
        id: 'low',
        autoTrigger: { on: 'first-use', priority: 1 },
      });
      const result = decideAutoGuide(
        makeInput({
          candidates: [high, low],
          completedGuides: new Set(['high']),
        }),
      );
      expect(result.action).toBe('show');
      if (result.action === 'show') {
        expect(result.guide.id).toBe('low');
      }
    });

    it('falls through past permanently-dismissed and over-dismissed guides', () => {
      const blocked1 = makeGuide({
        id: 'blocked1',
        autoTrigger: { on: 'first-use', priority: 10 },
      });
      const blocked2 = makeGuide({
        id: 'blocked2',
        autoTrigger: { on: 'first-use', priority: 5 },
      });
      const open = makeGuide({
        id: 'open',
        autoTrigger: { on: 'first-use', priority: 1 },
      });
      const result = decideAutoGuide(
        makeInput({
          candidates: [blocked1, blocked2, open],
          fatigue: {
            blocked1: {
              dismissCount: 0,
              permanentlyDismissed: true,
              lastPrompted: null,
            },
            blocked2: {
              dismissCount: 5,
              permanentlyDismissed: false,
              lastPrompted: null,
            },
          },
        }),
      );
      expect(result.action).toBe('show');
      if (result.action === 'show') {
        expect(result.guide.id).toBe('open');
      }
    });

    it('surfaces the first guide-specific block reason when all candidates are blocked', () => {
      const a = makeGuide({ id: 'a' });
      const b = makeGuide({ id: 'b' });
      const result = decideAutoGuide(
        makeInput({
          candidates: [a, b],
          completedGuides: new Set(['a', 'b']),
        }),
      );
      expect(result).toEqual({ action: 'skip', reason: 'already-completed' });
    });

    it('treats ties in priority as array order for stability', () => {
      const first = makeGuide({
        id: 'first',
        autoTrigger: { on: 'first-use', priority: 3 },
      });
      const second = makeGuide({
        id: 'second',
        autoTrigger: { on: 'first-use', priority: 3 },
      });
      const result = decideAutoGuide(
        makeInput({ candidates: [first, second] }),
      );
      expect(result.action).toBe('show');
      if (result.action === 'show') {
        expect(result.guide.id).toBe('first');
      }
    });
  });

  describe('purity', () => {
    it('does not mutate input objects', () => {
      const guide = makeGuide();
      const candidates = [guide];
      const fatigue = makeFatigue(guide.id, { dismissCount: 1 });
      const completed = new Set<string>();
      const input = makeInput({
        candidates,
        fatigue,
        completedGuides: completed,
      });

      const frozenCandidates = JSON.parse(JSON.stringify(candidates));
      const frozenFatigue = JSON.parse(JSON.stringify(fatigue));

      decideAutoGuide(input);

      expect(candidates).toEqual(frozenCandidates);
      expect(fatigue).toEqual(frozenFatigue);
      expect(completed.size).toBe(0);
    });
  });
});
