import { describe, it, expect, beforeEach } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { UnicornProvider } from './UnicornProvider';
import { useUnicorn } from '../../hooks';
import {
  autoGuide,
  autoGuideContentPackage,
  sampleContentPackage,
} from '../../test/fixtures';
import type { ReactNode } from 'react';
import type { ContentPackage } from '../../types';

/**
 * Integration tests for Provider + useAutoGuide. These verify the full round-trip:
 * host calls onToolOpen → decision engine fires → pendingAutoPrompt shows / guide
 * launches / fatigue tracks. The engine itself is covered in decisionEngine.test.ts;
 * these tests exercise the wiring, React state, and persistence path.
 */

function wrapperFactory(packages: ContentPackage[], toolName = 'test-tool') {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <UnicornProvider content={packages} tool={toolName}>
        {children}
      </UnicornProvider>
    );
  };
}

describe('Provider + useAutoGuide integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('exposes auto-guide state and callbacks via useUnicorn', () => {
    const { result } = renderHook(() => useUnicorn(), {
      wrapper: wrapperFactory([autoGuideContentPackage]),
    });

    expect(result.current.pendingAutoPrompt).toBeNull();
    expect(result.current.autoGuideEnabled).toBe(true);
    expect(typeof result.current.onToolOpen).toBe('function');
    expect(typeof result.current.acceptPendingPrompt).toBe('function');
    expect(typeof result.current.dismissPendingPrompt).toBe('function');
    expect(typeof result.current.permanentlyDismissPendingPrompt).toBe('function');
    expect(typeof result.current.setAutoGuideEnabled).toBe('function');
    expect(typeof result.current.resetProgression).toBe('function');
  });

  it('surfaces a pending prompt when a matching context opens for the first time', () => {
    const { result } = renderHook(() => useUnicorn(), {
      wrapper: wrapperFactory([autoGuideContentPackage]),
    });

    act(() => {
      result.current.onToolOpen('panel.intro');
    });

    expect(result.current.pendingAutoPrompt).not.toBeNull();
    expect(result.current.pendingAutoPrompt?.id).toBe(autoGuide.id);
  });

  it('does not prompt when no guide matches the context', () => {
    const { result } = renderHook(() => useUnicorn(), {
      wrapper: wrapperFactory([autoGuideContentPackage]),
    });

    act(() => {
      result.current.onToolOpen('unrelated.context');
    });

    expect(result.current.pendingAutoPrompt).toBeNull();
  });

  it('does not prompt for guides without autoTrigger', () => {
    const { result } = renderHook(() => useUnicorn(), {
      wrapper: wrapperFactory([sampleContentPackage]),
    });

    act(() => {
      result.current.onToolOpen('terrain-editor.sculpt');
    });

    expect(result.current.pendingAutoPrompt).toBeNull();
  });

  it('launches the guide when the pending prompt is accepted', () => {
    const { result } = renderHook(() => useUnicorn(), {
      wrapper: wrapperFactory([autoGuideContentPackage]),
    });

    act(() => {
      result.current.onToolOpen('panel.intro');
    });
    expect(result.current.pendingAutoPrompt).not.toBeNull();

    act(() => {
      result.current.acceptPendingPrompt();
    });

    expect(result.current.pendingAutoPrompt).toBeNull();
    expect(result.current.activeGuide?.id).toBe(autoGuide.id);
  });

  it('tracks dismissal and closes the pending prompt on "Not now"', () => {
    const { result } = renderHook(() => useUnicorn(), {
      wrapper: wrapperFactory([autoGuideContentPackage]),
    });

    act(() => {
      result.current.onToolOpen('panel.intro');
    });

    act(() => {
      result.current.dismissPendingPrompt();
    });

    expect(result.current.pendingAutoPrompt).toBeNull();
    expect(result.current.activeGuide).toBeNull();
    // Fatigue should have persisted via the Provider's updateFatigue path
    const stored = JSON.parse(localStorage.getItem('unicorn:test-tool') ?? '{}');
    expect(stored.fatigue?.[autoGuide.id]?.dismissCount).toBe(1);
  });

  it('permanently dismisses a guide — never prompts it again', () => {
    const { result } = renderHook(() => useUnicorn(), {
      wrapper: wrapperFactory([autoGuideContentPackage]),
    });

    act(() => {
      result.current.onToolOpen('panel.intro');
    });
    act(() => {
      result.current.permanentlyDismissPendingPrompt();
    });
    // Re-open the same context; should be silent.
    act(() => {
      result.current.onToolOpen('panel.intro');
    });

    expect(result.current.pendingAutoPrompt).toBeNull();

    const stored = JSON.parse(localStorage.getItem('unicorn:test-tool') ?? '{}');
    expect(stored.fatigue?.[autoGuide.id]?.permanentlyDismissed).toBe(true);
  });

  it('honors the global autoGuideEnabled toggle', () => {
    const { result } = renderHook(() => useUnicorn(), {
      wrapper: wrapperFactory([autoGuideContentPackage]),
    });

    act(() => {
      result.current.setAutoGuideEnabled(false);
    });
    act(() => {
      result.current.onToolOpen('panel.intro');
    });

    expect(result.current.pendingAutoPrompt).toBeNull();

    const stored = JSON.parse(localStorage.getItem('unicorn:test-tool') ?? '{}');
    expect(stored.autoGuideEnabled).toBe(false);
  });

  it('resetProgression clears completed guides, fatigue, and re-enables auto-guides', () => {
    const { result } = renderHook(() => useUnicorn(), {
      wrapper: wrapperFactory([autoGuideContentPackage]),
    });

    act(() => {
      result.current.onToolOpen('panel.intro');
    });
    act(() => {
      result.current.permanentlyDismissPendingPrompt();
    });
    act(() => {
      result.current.setAutoGuideEnabled(false);
    });

    act(() => {
      result.current.resetProgression();
    });

    const stored = JSON.parse(localStorage.getItem('unicorn:test-tool') ?? '{}');
    expect(stored.fatigue).toEqual({});
    expect(stored.completedGuides).toEqual([]);
    expect(stored.autoGuideEnabled).toBe(true);

    // And a fresh onToolOpen should now prompt again.
    act(() => {
      result.current.onToolOpen('panel.intro');
    });
    expect(result.current.pendingAutoPrompt).not.toBeNull();
  });

  it('annotate() marks the element when a badge-strategy guide is pending for a context', () => {
    const badgePackage: ContentPackage = {
      tool: 'test-app',
      version: '1.0.0',
      guides: [
        {
          ...autoGuide,
          id: 'badge-guide',
          autoTrigger: { on: 'first-use', prompt: 'badge' },
        },
      ],
    };

    function Probe() {
      const { annotate, onToolOpen } = useUnicorn();
      const attrs = annotate('panel.intro');
      return (
        <div data-testid="probe" {...attrs}>
          <button onClick={() => onToolOpen('panel.intro')}>open</button>
        </div>
      );
    }

    const { getByText, getByTestId } = render(
      <UnicornProvider content={[badgePackage]} tool="test-tool">
        <Probe />
      </UnicornProvider>,
    );

    // Before onToolOpen: no badge
    expect(getByTestId('probe').getAttribute('data-unicorn-auto-badge')).toBeNull();

    act(() => {
      getByText('open').click();
    });

    // After: badge attribute present
    const probe = getByTestId('probe');
    expect(probe.getAttribute('data-unicorn-auto-badge')).toBe('true');
  });
});
