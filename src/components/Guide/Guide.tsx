import { useEffect, useRef, useCallback } from 'react';
import { useUnicorn } from '../../hooks';

/**
 * Guide component — renders the active guide overlay.
 * Handles 1-step (tooltip-like) and N-step (walkthrough) guides uniformly.
 * Manages focus trapping, keyboard navigation, and accessibility.
 */
export function Guide() {
  const {
    activeGuide,
    activeStep,
    nextStep,
    prevStep,
    closeGuide,
    completeGuide,
    strings,
  } = useUnicorn();

  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management: capture focus on open, restore on close
  useEffect(() => {
    if (activeGuide) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      panelRef.current?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [activeGuide]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!activeGuide) return;

      switch (e.key) {
        case 'Escape':
          closeGuide();
          break;
        case 'ArrowRight':
        case 'Enter':
          if (activeStep < activeGuide.steps.length - 1) {
            nextStep();
          } else {
            completeGuide(activeGuide.id);
            closeGuide();
          }
          break;
        case 'ArrowLeft':
          prevStep();
          break;
      }
    },
    [activeGuide, activeStep, nextStep, prevStep, closeGuide, completeGuide],
  );

  if (!activeGuide) return null;

  const step = activeGuide.steps[activeStep];
  const isFirst = activeStep === 0;
  const isLast = activeStep === activeGuide.steps.length - 1;
  const isSingleStep = activeGuide.steps.length === 1;

  const handleFinish = () => {
    completeGuide(activeGuide.id);
    closeGuide();
  };

  return (
    <div
      className="unicorn-guide-overlay"
      role="dialog"
      aria-label={activeGuide.title}
      aria-modal="true"
    >
      <div
        ref={panelRef}
        className="unicorn-guide-panel"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="unicorn-guide-header">
          <h2 className="unicorn-guide-title">{step.title}</h2>
          <button
            className="unicorn-guide-close"
            onClick={closeGuide}
            aria-label={strings.close}
          >
            &times;
          </button>
        </div>

        <div
          className="unicorn-guide-body"
          dangerouslySetInnerHTML={{ __html: step.body }}
        />

        {step.externalLinks && step.externalLinks.length > 0 && (
          <div className="unicorn-guide-links">
            <span className="unicorn-guide-links-label">
              {strings.goDeeper}
            </span>
            {step.externalLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`unicorn-guide-link unicorn-guide-link--${link.type}`}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}

        <div className="unicorn-guide-footer">
          {!isSingleStep && (
            <span className="unicorn-guide-progress" aria-live="polite">
              {strings.stepOf(activeStep + 1, activeGuide.steps.length)}
            </span>
          )}

          <div className="unicorn-guide-actions">
            {!isSingleStep && !isFirst && (
              <button
                className="unicorn-guide-btn unicorn-guide-btn--secondary"
                onClick={prevStep}
              >
                {strings.previous}
              </button>
            )}

            {isLast || isSingleStep ? (
              <button
                className="unicorn-guide-btn unicorn-guide-btn--primary"
                onClick={handleFinish}
              >
                {isSingleStep ? strings.gotIt : strings.finish}
              </button>
            ) : (
              <button
                className="unicorn-guide-btn unicorn-guide-btn--primary"
                onClick={nextStep}
              >
                {strings.next}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
