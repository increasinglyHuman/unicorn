import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { UnicornProvider } from './UnicornProvider';
import { useUnicorn } from '../../hooks';
import { sampleContentPackage } from '../../test/fixtures';

function TestConsumer() {
  const { activeGuide, openGuide, closeGuide, activeStep, nextStep } =
    useUnicorn();

  return (
    <div>
      <span data-testid="active-guide">{activeGuide?.title ?? 'none'}</span>
      <span data-testid="active-step">{activeStep}</span>
      <button onClick={() => openGuide('test-terrain-sculpt')}>Open</button>
      <button onClick={closeGuide}>Close</button>
      <button onClick={nextStep}>Next</button>
    </div>
  );
}

describe('UnicornProvider', () => {
  it('renders children', () => {
    render(
      <UnicornProvider content={[sampleContentPackage]} tool="test-app">
        <div data-testid="child">Hello</div>
      </UnicornProvider>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('opens and closes a guide', () => {
    render(
      <UnicornProvider content={[sampleContentPackage]} tool="test-app">
        <TestConsumer />
      </UnicornProvider>,
    );

    expect(screen.getByTestId('active-guide')).toHaveTextContent('none');

    act(() => screen.getByText('Open').click());
    expect(screen.getByTestId('active-guide')).toHaveTextContent(
      'Sculpting Terrain',
    );

    act(() => screen.getByText('Close').click());
    expect(screen.getByTestId('active-guide')).toHaveTextContent('none');
  });

  it('navigates steps', () => {
    render(
      <UnicornProvider content={[sampleContentPackage]} tool="test-app">
        <TestConsumer />
      </UnicornProvider>,
    );

    act(() => screen.getByText('Open').click());
    expect(screen.getByTestId('active-step')).toHaveTextContent('0');

    act(() => screen.getByText('Next').click());
    expect(screen.getByTestId('active-step')).toHaveTextContent('1');
  });

  it('accepts custom strings', () => {
    function StringConsumer() {
      const { strings } = useUnicorn();
      return <span data-testid="next-label">{strings.next}</span>;
    }

    render(
      <UnicornProvider
        content={[sampleContentPackage]}
        tool="test-app"
        strings={{ next: 'Siguiente' }}
      >
        <StringConsumer />
      </UnicornProvider>,
    );

    expect(screen.getByTestId('next-label')).toHaveTextContent('Siguiente');
  });
});
