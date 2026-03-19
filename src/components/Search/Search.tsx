import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useUnicorn } from '../../hooks';
import { ContentResolver } from '../../content';
import type { GuideContent } from '../../types';

/**
 * Search component — command-palette style search across all loaded guides.
 * Opens with Cmd/Ctrl+? or programmatically via openSearch().
 */
export function Search() {
  const { isSearchOpen, closeSearch, openGuide, content, userLevel, strings } =
    useUnicorn();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const resolver = useMemo(() => new ContentResolver(content), [content]);

  const results: GuideContent[] = useMemo(() => {
    if (!query.trim()) return [];
    return resolver.search(query, { level: userLevel });
  }, [query, resolver, userLevel]);

  // Focus input on open, restore on close
  useEffect(() => {
    if (isSearchOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setQuery('');
      // Allow render to complete before focusing
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isSearchOpen]);

  const handleSelect = useCallback(
    (guide: GuideContent) => {
      closeSearch();
      openGuide(guide.id);
    },
    [closeSearch, openGuide],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSearch();
      }
    },
    [closeSearch],
  );

  if (!isSearchOpen) return null;

  return (
    <div
      className="unicorn-search-overlay"
      role="dialog"
      aria-label="Search guides"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      <div className="unicorn-search-panel">
        <input
          ref={inputRef}
          type="search"
          className="unicorn-search-input"
          placeholder={strings.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={strings.searchPlaceholder}
        />

        <div className="unicorn-search-results" role="listbox">
          {query.trim() && results.length === 0 && (
            <div className="unicorn-search-empty">
              {strings.searchNoResults}
            </div>
          )}

          {results.map((guide) => (
            <button
              key={guide.id}
              className="unicorn-search-result"
              role="option"
              onClick={() => handleSelect(guide)}
            >
              <span className="unicorn-search-result-title">
                {guide.title}
              </span>
              <span className="unicorn-search-result-desc">
                {guide.description}
              </span>
              {guide.tags.length > 0 && (
                <span className="unicorn-search-result-tags">
                  {guide.tags.join(', ')}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
