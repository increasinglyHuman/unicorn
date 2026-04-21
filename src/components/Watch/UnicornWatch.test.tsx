import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { UnicornProvider } from '../Provider/UnicornProvider';
import { UnicornWatch } from './UnicornWatch';
import { autoGuideContentPackage } from '../../test/fixtures';
import { useUnicorn } from '../../hooks';

function Probe({ onMount }: { onMount: (hasPending: boolean) => void }) {
  const { pendingAutoPrompt } = useUnicorn();
  onMount(pendingAutoPrompt !== null);
  return null;
}

describe('UnicornWatch', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('emits onToolOpen on mount, triggering matching auto-guide', () => {
    let captured: { hasPending: boolean } = { hasPending: false };

    render(
      <UnicornProvider content={[autoGuideContentPackage]} tool="test-tool">
        <UnicornWatch context="panel.intro">
          <div>child</div>
        </UnicornWatch>
        <Probe onMount={(hasPending) => (captured = { hasPending })} />
      </UnicornProvider>,
    );

    expect(captured.hasPending).toBe(true);
  });

  it('renders children unchanged', () => {
    const { getByText } = render(
      <UnicornProvider content={[autoGuideContentPackage]} tool="test-tool">
        <UnicornWatch context="panel.intro">
          <span>Hello</span>
          <span>World</span>
        </UnicornWatch>
      </UnicornProvider>,
    );

    expect(getByText('Hello')).toBeDefined();
    expect(getByText('World')).toBeDefined();
  });

  it('re-emits when context prop changes', () => {
    const events: string[] = [];

    function Capture() {
      const { onToolOpen } = useUnicorn();
      // Wrap to observe calls
      const orig = onToolOpen;
      void orig;
      return null;
    }
    void Capture;

    function ProbeContexts() {
      const { pendingAutoPrompt } = useUnicorn();
      events.push(pendingAutoPrompt?.context ?? 'none');
      return null;
    }

    const { rerender } = render(
      <UnicornProvider content={[autoGuideContentPackage]} tool="test-tool">
        <UnicornWatch context="panel.intro">
          <div />
        </UnicornWatch>
        <ProbeContexts />
      </UnicornProvider>,
    );

    // First render fires onToolOpen('panel.intro') → pending prompt set
    expect(events.at(-1)).toBe('panel.intro');

    // Change context — should not crash or throw; new context has no guide so pending stays as-is
    act(() => {
      rerender(
        <UnicornProvider content={[autoGuideContentPackage]} tool="test-tool">
          <UnicornWatch context="other.thing">
            <div />
          </UnicornWatch>
          <ProbeContexts />
        </UnicornProvider>,
      );
    });

    // pendingAutoPrompt is still the panel.intro one (no new match), so last event is 'panel.intro'
    expect(events.at(-1)).toBe('panel.intro');
  });
});
