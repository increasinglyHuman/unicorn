import { useCallback, useEffect, useRef } from 'react';
import { useUnicorn } from '../../hooks';

/**
 * AutoGuidePrompt — renders the soft-prompt card when the engine has chosen
 * the 'soft' strategy for a matched auto-guide. Offers three actions:
 * Show me / Not now / Don't ask again. Returns null when no prompt is pending,
 * so it's safe to mount unconditionally alongside Guide and Search.
 *
 * Accessibility:
 *   - role="dialog" with aria-labelledby on the title
 *   - Focus moves to the accept button on appear; returns to the prior element on close
 *   - Escape dismisses as "Not now" (does NOT permanently dismiss — permanent
 *     dismissal must be an explicit choice, never accidental)
 *
 * Depends on: ../../hooks (useUnicorn — reads pendingAutoPrompt + action callbacks)
 * Depended on by: Host applications (render once inside UnicornProvider)
 */
export function AutoGuidePrompt() {
  const {
    pendingAutoPrompt,
    acceptPendingPrompt,
    dismissPendingPrompt,
    permanentlyDismissPendingPrompt,
    strings,
  } = useUnicorn();

  const acceptRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (pendingAutoPrompt) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      acceptRef.current?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [pendingAutoPrompt]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissPendingPrompt();
      }
    },
    [dismissPendingPrompt],
  );

  if (!pendingAutoPrompt) return null;

  const titleId = `unicorn-auto-prompt-title-${pendingAutoPrompt.id}`;

  return (
    <div
      className="unicorn-auto-prompt"
      role="dialog"
      aria-labelledby={titleId}
      aria-modal="false"
      onKeyDown={handleKeyDown}
    >
      <div className="unicorn-auto-prompt-card">
        <h3 id={titleId} className="unicorn-auto-prompt-title">
          {strings.autoPromptTitle(pendingAutoPrompt.title)}
        </h3>

        {pendingAutoPrompt.description && (
          <p className="unicorn-auto-prompt-description">
            {pendingAutoPrompt.description}
          </p>
        )}

        <div className="unicorn-auto-prompt-actions">
          <button
            ref={acceptRef}
            type="button"
            className="unicorn-auto-prompt-btn unicorn-auto-prompt-btn--primary"
            onClick={acceptPendingPrompt}
          >
            {strings.autoPromptAccept}
          </button>
          <button
            type="button"
            className="unicorn-auto-prompt-btn unicorn-auto-prompt-btn--secondary"
            onClick={dismissPendingPrompt}
          >
            {strings.autoPromptDismiss}
          </button>
          <button
            type="button"
            className="unicorn-auto-prompt-btn unicorn-auto-prompt-btn--tertiary"
            onClick={permanentlyDismissPendingPrompt}
          >
            {strings.autoPromptPermanent}
          </button>
        </div>
      </div>
    </div>
  );
}
