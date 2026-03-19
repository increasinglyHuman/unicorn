import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useUnicorn } from './useUnicorn';
import { UnicornProvider } from '../components/Provider';
import { sampleContentPackage } from '../test/fixtures';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <UnicornProvider content={[sampleContentPackage]} tool="test-app">
      {children}
    </UnicornProvider>
  );
}

describe('useUnicorn', () => {
  it('throws when used outside UnicornProvider', () => {
    expect(() => {
      renderHook(() => useUnicorn());
    }).toThrow('useUnicorn must be used within a <UnicornProvider>');
  });

  it('returns context value when inside UnicornProvider', () => {
    const { result } = renderHook(() => useUnicorn(), { wrapper });

    expect(result.current).toBeDefined();
    expect(result.current.userLevel).toBe('beginner');
    expect(result.current.activeGuide).toBeNull();
    expect(result.current.isSearchOpen).toBe(false);
    expect(typeof result.current.openGuide).toBe('function');
    expect(typeof result.current.closeGuide).toBe('function');
    expect(typeof result.current.annotate).toBe('function');
    expect(typeof result.current.openSearch).toBe('function');
  });

  it('annotate returns data attributes for a context key', () => {
    const { result } = renderHook(() => useUnicorn(), { wrapper });
    const attrs = result.current.annotate('terrain-editor.sculpt');

    expect(attrs['data-unicorn-context']).toBe('terrain-editor.sculpt');
    expect(attrs['data-unicorn-has-guide']).toBe(true);
  });

  it('annotate returns has-guide false for unknown context', () => {
    const { result } = renderHook(() => useUnicorn(), { wrapper });
    const attrs = result.current.annotate('unknown.context');

    expect(attrs['data-unicorn-has-guide']).toBe(false);
  });
});
