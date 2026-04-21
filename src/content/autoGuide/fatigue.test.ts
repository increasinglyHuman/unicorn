import { describe, it, expect } from 'vitest';
import {
  createEmptyFatigue,
  recordPrompt,
  recordDismissal,
  recordPermanentDismissal,
  clearFatigue,
} from './fatigue';
import type { FatigueRecord } from '../../types';

describe('fatigue state helpers', () => {
  describe('createEmptyFatigue', () => {
    it('returns an empty record', () => {
      expect(createEmptyFatigue()).toEqual({});
    });
  });

  describe('recordPrompt', () => {
    it('adds a fresh entry with the current timestamp', () => {
      const at = new Date('2026-04-21T10:00:00Z');
      const result = recordPrompt(createEmptyFatigue(), 'g1', at);
      expect(result.g1).toEqual({
        dismissCount: 0,
        permanentlyDismissed: false,
        lastPrompted: '2026-04-21T10:00:00.000Z',
      });
    });

    it('updates lastPrompted on an existing entry without touching other fields', () => {
      const initial: FatigueRecord = {
        g1: {
          dismissCount: 2,
          permanentlyDismissed: false,
          lastPrompted: '2026-01-01T00:00:00.000Z',
        },
      };
      const at = new Date('2026-04-21T10:00:00Z');
      const result = recordPrompt(initial, 'g1', at);
      expect(result.g1).toEqual({
        dismissCount: 2,
        permanentlyDismissed: false,
        lastPrompted: '2026-04-21T10:00:00.000Z',
      });
    });

    it('does not mutate the input', () => {
      const initial = createEmptyFatigue();
      recordPrompt(initial, 'g1', new Date());
      expect(initial).toEqual({});
    });
  });

  describe('recordDismissal', () => {
    it('increments dismissCount from zero', () => {
      const result = recordDismissal(createEmptyFatigue(), 'g1');
      expect(result.g1.dismissCount).toBe(1);
    });

    it('increments an existing count', () => {
      const initial: FatigueRecord = {
        g1: {
          dismissCount: 1,
          permanentlyDismissed: false,
          lastPrompted: null,
        },
      };
      const result = recordDismissal(initial, 'g1');
      expect(result.g1.dismissCount).toBe(2);
    });

    it('leaves permanentlyDismissed unchanged', () => {
      const initial: FatigueRecord = {
        g1: {
          dismissCount: 0,
          permanentlyDismissed: true,
          lastPrompted: null,
        },
      };
      const result = recordDismissal(initial, 'g1');
      expect(result.g1.permanentlyDismissed).toBe(true);
    });
  });

  describe('recordPermanentDismissal', () => {
    it('sets permanentlyDismissed on a fresh entry', () => {
      const result = recordPermanentDismissal(createEmptyFatigue(), 'g1');
      expect(result.g1.permanentlyDismissed).toBe(true);
      expect(result.g1.dismissCount).toBe(0);
    });

    it('preserves dismissCount on an existing entry', () => {
      const initial: FatigueRecord = {
        g1: {
          dismissCount: 3,
          permanentlyDismissed: false,
          lastPrompted: null,
        },
      };
      const result = recordPermanentDismissal(initial, 'g1');
      expect(result.g1).toEqual({
        dismissCount: 3,
        permanentlyDismissed: true,
        lastPrompted: null,
      });
    });
  });

  describe('clearFatigue', () => {
    it('removes an existing entry', () => {
      const initial: FatigueRecord = {
        g1: {
          dismissCount: 2,
          permanentlyDismissed: true,
          lastPrompted: '2026-01-01',
        },
        g2: {
          dismissCount: 0,
          permanentlyDismissed: false,
          lastPrompted: null,
        },
      };
      const result = clearFatigue(initial, 'g1');
      expect(result).toEqual({
        g2: initial.g2,
      });
    });

    it('is a no-op for missing entries', () => {
      const initial = createEmptyFatigue();
      const result = clearFatigue(initial, 'missing');
      expect(result).toBe(initial);
    });
  });
});
