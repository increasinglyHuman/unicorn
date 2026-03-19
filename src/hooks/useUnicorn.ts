import { useContext } from 'react';
import { UnicornContext } from '../context';
import type { UnicornContextValue } from '../context';

/**
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
