import { useEffect, type ReactNode } from 'react';
import { useUnicorn } from '../../hooks';

/**
 * UnicornWatch — declarative wrapper that emits onToolOpen when its children mount.
 * Offered as an alternative to calling useUnicorn().onToolOpen directly, for teams
 * that prefer a component-based integration. Functionally equivalent; pick whichever
 * fits your codebase.
 *
 * Renders children unchanged (no DOM wrapper). If you need DOM anchoring for
 * highlight targets, use your own wrapping element and call onToolOpen imperatively.
 *
 * Depends on: ../../hooks (useUnicorn)
 * Depended on by: Host applications (wrap tool/panel components)
 *
 * @example
 * ```tsx
 * function BuildPanel() {
 *   return (
 *     <UnicornWatch context="build-panel">
 *       <div>...build panel UI...</div>
 *     </UnicornWatch>
 *   );
 * }
 * ```
 */
export interface UnicornWatchProps {
  /** Context key matching a guide's `context` field (e.g. "build-panel"). */
  context: string;
  /** Children rendered unchanged — UnicornWatch is a fragment-like wrapper. */
  children: ReactNode;
}

export function UnicornWatch({ context, children }: UnicornWatchProps) {
  const { onToolOpen } = useUnicorn();

  useEffect(() => {
    onToolOpen(context);
    // We only want to fire on mount and on actual context changes, not on every
    // re-render caused by onToolOpen identity churn. onToolOpen is stable per
    // Provider (memoized via useCallback), but we guard with an explicit dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  return <>{children}</>;
}
