import { describe, it, expect, beforeEach } from 'vitest';
import { render, act, fireEvent } from '@testing-library/react';
import { UnicornProvider } from '../Provider/UnicornProvider';
import { AutoGuidePrompt } from './AutoGuidePrompt';
import { autoGuide, autoGuideContentPackage } from '../../test/fixtures';
import { useUnicorn } from '../../hooks';

function TriggerButton() {
  const { onToolOpen } = useUnicorn();
  return (
    <button onClick={() => onToolOpen('panel.intro')}>trigger</button>
  );
}

describe('AutoGuidePrompt', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not render when no prompt is pending', () => {
    const { queryByRole } = render(
      <UnicornProvider content={[autoGuideContentPackage]} tool="test-tool">
        <AutoGuidePrompt />
      </UnicornProvider>,
    );

    expect(queryByRole('dialog')).toBeNull();
  });

  it('renders prompt card with guide title when a soft prompt is pending', () => {
    const { getByRole, getByText } = render(
      <UnicornProvider content={[autoGuideContentPackage]} tool="test-tool">
        <TriggerButton />
        <AutoGuidePrompt />
      </UnicornProvider>,
    );

    act(() => {
      getByText('trigger').click();
    });

    const dialog = getByRole('dialog');
    expect(dialog).toBeDefined();
    // Default string: "Want a quick tour of {title}?"
    expect(dialog.textContent).toContain(autoGuide.title);
  });

  it('accept button opens the guide and clears the prompt', () => {
    function Probe() {
      const { activeGuide, pendingAutoPrompt } = useUnicorn();
      return (
        <div>
          <span data-testid="active">{activeGuide?.id ?? 'none'}</span>
          <span data-testid="pending">{pendingAutoPrompt?.id ?? 'none'}</span>
        </div>
      );
    }

    const { getByText, getByTestId } = render(
      <UnicornProvider content={[autoGuideContentPackage]} tool="test-tool">
        <TriggerButton />
        <AutoGuidePrompt />
        <Probe />
      </UnicornProvider>,
    );

    act(() => {
      getByText('trigger').click();
    });
    expect(getByTestId('pending').textContent).toBe(autoGuide.id);

    act(() => {
      getByText('Show me').click();
    });

    expect(getByTestId('active').textContent).toBe(autoGuide.id);
    expect(getByTestId('pending').textContent).toBe('none');
  });

  it('dismiss button clears prompt without opening guide', () => {
    function Probe() {
      const { activeGuide } = useUnicorn();
      return <span data-testid="active">{activeGuide?.id ?? 'none'}</span>;
    }

    const { getByText, getByTestId, queryByRole } = render(
      <UnicornProvider content={[autoGuideContentPackage]} tool="test-tool">
        <TriggerButton />
        <AutoGuidePrompt />
        <Probe />
      </UnicornProvider>,
    );

    act(() => {
      getByText('trigger').click();
    });

    act(() => {
      getByText('Not now').click();
    });

    expect(queryByRole('dialog')).toBeNull();
    expect(getByTestId('active').textContent).toBe('none');
  });

  it('Escape key dismisses (same as "Not now" — does not permanently dismiss)', () => {
    const { getByText, getByRole, queryByRole } = render(
      <UnicornProvider content={[autoGuideContentPackage]} tool="test-tool">
        <TriggerButton />
        <AutoGuidePrompt />
      </UnicornProvider>,
    );

    act(() => {
      getByText('trigger').click();
    });

    const dialog = getByRole('dialog');
    act(() => {
      fireEvent.keyDown(dialog, { key: 'Escape' });
    });

    expect(queryByRole('dialog')).toBeNull();
    const stored = JSON.parse(localStorage.getItem('unicorn:test-tool') ?? '{}');
    expect(stored.fatigue?.[autoGuide.id]?.permanentlyDismissed).toBeFalsy();
    expect(stored.fatigue?.[autoGuide.id]?.dismissCount).toBe(1);
  });

  it('"Don\'t ask again" sets permanent dismissal', () => {
    const { getByText, queryByRole } = render(
      <UnicornProvider content={[autoGuideContentPackage]} tool="test-tool">
        <TriggerButton />
        <AutoGuidePrompt />
      </UnicornProvider>,
    );

    act(() => {
      getByText('trigger').click();
    });

    act(() => {
      getByText("Don't ask again").click();
    });

    expect(queryByRole('dialog')).toBeNull();
    const stored = JSON.parse(localStorage.getItem('unicorn:test-tool') ?? '{}');
    expect(stored.fatigue?.[autoGuide.id]?.permanentlyDismissed).toBe(true);
  });
});
