import { describe, it, expect, beforeEach } from 'vitest';
import { classifyFlavor, resolveHelpEnabled } from './classifyFlavor';
import { createLocalStorageHelpPrefStore } from './helpPrefStore';
import type { GuideContent } from '../types';
import type { HelpPreferences } from '../types/helpPrefs';

/**
 * Unit coverage for the ADR-003 help-preference subsystem: the flavor classifier
 * (single mapping authority), the layered precedence resolver, and the localStorage
 * store's per-app override behavior. Pure logic first, storage behavior last.
 */

/** Minimal GuideContent builder for classification — only the fields the classifier reads. */
function guide(partial: Partial<GuideContent>): GuideContent {
  return {
    id: 'g',
    tool: 't',
    context: 'x.y',
    mode: 'guide',
    level: 'beginner',
    locale: 'en',
    tags: [],
    title: 'T',
    description: 'D',
    steps: [{ title: 'S', body: 'B' }],
    ...partial,
  };
}

describe('classifyFlavor', () => {
  it('classifies teleport tips as tips even though they carry mode:coach', () => {
    // The shipped tips carry mode:'coach'; the context/tag signal must win (order matters).
    expect(
      classifyFlavor(
        guide({
          context: 'teleport.tip',
          mode: 'coach',
          tags: ['teleport', 'tip'],
        }),
      ),
    ).toBe('tips');
  });

  it('classifies by a tip tag regardless of context', () => {
    expect(classifyFlavor(guide({ context: 'foo.bar', tags: ['tip'] }))).toBe(
      'tips',
    );
  });

  it('classifies coach-mode (non-tip) guides as coach', () => {
    expect(
      classifyFlavor(guide({ context: 'editor.error', mode: 'coach' })),
    ).toBe('coach');
  });

  it('classifies single-step guides as tooltips', () => {
    expect(
      classifyFlavor(
        guide({ mode: 'guide', steps: [{ title: 'a', body: 'b' }] }),
      ),
    ).toBe('tooltips');
  });

  it('classifies multi-step guides as walkthroughs', () => {
    expect(
      classifyFlavor(
        guide({
          mode: 'guide',
          steps: [
            { title: 'a', body: 'b' },
            { title: 'c', body: 'd' },
          ],
        }),
      ),
    ).toBe('walkthroughs');
  });

  it('folds image-callout into tooltips/walkthroughs by step count (no own flavor)', () => {
    expect(
      classifyFlavor(
        guide({ mode: 'image-callout', steps: [{ title: 'a', body: 'b' }] }),
      ),
    ).toBe('tooltips');
    expect(
      classifyFlavor(
        guide({
          mode: 'image-callout',
          steps: [
            { title: 'a', body: 'b' },
            { title: 'c', body: 'd' },
          ],
        }),
      ),
    ).toBe('walkthroughs');
  });
});

describe('resolveHelpEnabled', () => {
  const on = (flavors: HelpPreferences['flavors'] = {}): HelpPreferences => ({
    master: true,
    flavors,
  });

  it('defaults to enabled with no layers', () => {
    expect(resolveHelpEnabled([])).toBe(true);
    expect(resolveHelpEnabled([], 'coach')).toBe(true);
  });

  it('resolves an absent flavor to enabled (opt-out model)', () => {
    expect(resolveHelpEnabled([on()], 'walkthroughs')).toBe(true);
  });

  it('master:false at any layer forces everything off', () => {
    expect(resolveHelpEnabled([{ master: false, flavors: {} }], 'tips')).toBe(
      false,
    );
    expect(resolveHelpEnabled([{ master: false, flavors: {} }])).toBe(false);
    // global master off even though app master on
    expect(
      resolveHelpEnabled([on(), { master: false, flavors: {} }], 'tips'),
    ).toBe(false);
  });

  it('per-app layer overrides global for a flavor', () => {
    const app = on({ coach: false });
    const global = on({ coach: true });
    expect(resolveHelpEnabled([app, global], 'coach')).toBe(false);
  });

  it('falls through to global when the app layer does not define the flavor', () => {
    const app = on({});
    const global = on({ tooltips: false });
    expect(resolveHelpEnabled([app, global], 'tooltips')).toBe(false);
  });
});

describe('createLocalStorageHelpPrefStore', () => {
  beforeEach(() => localStorage.clear());

  it('reads/writes the shared global key and resolves master precedence', () => {
    const store = createLocalStorageHelpPrefStore();
    expect(store.isHelpEnabled('coach')).toBe(true); // default-on

    store.setHelpEnabled('coach', false);
    expect(store.isHelpEnabled('coach')).toBe(false);
    expect(store.getPreferences().flavors.coach).toBe(false);

    store.setHelpEnabled('master', false);
    expect(store.isHelpEnabled('tips')).toBe(false); // master off ⇒ all off
    expect(JSON.parse(localStorage.getItem('unicorn:help-prefs')!).master).toBe(
      false,
    );
  });

  it('reads a per-app layer ahead of the global layer', () => {
    const globalStore = createLocalStorageHelpPrefStore();
    globalStore.setHelpEnabled('coach', false);

    const appStore = createLocalStorageHelpPrefStore('world');
    // App layer empty ⇒ inherits global coach:false
    expect(appStore.isHelpEnabled('coach')).toBe(false);

    // App override wins, and does not touch the global key.
    appStore.setHelpEnabled('coach', true);
    expect(appStore.isHelpEnabled('coach')).toBe(true);
    expect(localStorage.getItem('unicorn:help-prefs:world')).toContain(
      '"coach":true',
    );
    expect(
      JSON.parse(localStorage.getItem('unicorn:help-prefs')!).flavors.coach,
    ).toBe(false);
  });

  it('notifies subscribers on write and supports unsubscribe', () => {
    const store = createLocalStorageHelpPrefStore('world');
    let calls = 0;
    const unsub = store.subscribe(() => calls++);

    store.setHelpEnabled('tooltips', false);
    expect(calls).toBe(1);

    unsub();
    store.setHelpEnabled('tooltips', true);
    expect(calls).toBe(1); // no further notifications after unsubscribe
  });
});
