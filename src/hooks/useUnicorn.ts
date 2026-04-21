import { useContext } from 'react';
import { UnicornContext } from '../context';
import type { UnicornContextValue } from '../context';

/**
 * useUnicorn — primary hook for host app code to read and control guidance state.
 * Must be called inside a UnicornProvider; throws a clear error if used outside one
 * so misconfigurations surface at render time instead of as silent no-ops.
 *
 * Depends on: ../context (UnicornContext, UnicornContextValue)
 * Depended on by:
 *   - Guide, Search (internal components)
 *   - Host app code (any component needing annotate(), openGuide(), onToolOpen(), etc.)
 *
 * Access UnicornNotes from any component within a UnicornProvider.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { annotate, openGuide } = useUnicorn();
 *   return (
 *     <div {...annotate('editor.brush-selector')}>
 *       <button onClick={() => openGuide('brush-guide')}>Help</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useUnicorn(): UnicornContextValue {
  const context = useContext(UnicornContext);
  if (!context) {
    throw new Error(
      'useUnicorn must be used within a <UnicornProvider>. ' +
        'Wrap your application (or the relevant subtree) in <UnicornProvider>.',
    );
  }
  return context;
}
