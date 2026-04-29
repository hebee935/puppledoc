import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { flattenEndpoints } from '../spec';
import { MethodPill } from './MethodPill';

export function CommandPalette() {
  const { paletteOpen, closePalette, groups, selectEndpoint } = useStore();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (paletteOpen) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [paletteOpen]);

  const items = useMemo(() => {
    const flat = flattenEndpoints(groups);
    // Empty query: show every endpoint (the palette scrolls). Typed query:
    // show every match — capping makes long-tail results invisible.
    if (!query.trim()) return flat;
    return rank(flat, query.trim().toLowerCase());
  }, [groups, query]);

  if (!paletteOpen) return null;

  return (
    <div
      className="palette-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) closePalette();
      }}
    >
      <div
        className="palette"
        role="dialog"
        aria-label="Search endpoints"
        onKeyDown={(e) => {
          if (e.key === 'Escape') closePalette();
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setCursor((c) => Math.min(c + 1, items.length - 1));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
          }
          if (e.key === 'Enter') {
            const ep = items[cursor];
            if (ep) {
              selectEndpoint(ep.id);
              closePalette();
            }
          }
        }}
      >
        <input
          ref={inputRef}
          className="palette-input"
          placeholder="Search endpoints by path, method, or event…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
          }}
        />
        <div className="palette-list">
          {items.length === 0 && <div className="palette-empty">No match</div>}
          {items.map((ep, i) => (
            <button
              key={ep.id}
              className="palette-item"
              data-active={cursor === i}
              onMouseEnter={() => setCursor(i)}
              onClick={() => {
                selectEndpoint(ep.id);
                closePalette();
              }}
            >
              {ep.kind === 'model' ? (
                <span className="model-type-chip">type</span>
              ) : (
                <MethodPill method={ep.method} />
              )}
              <span className="palette-item-label">{ep.title}</span>
              <span className="palette-item-group">{ep.kind === 'model' ? 'Models' : ep.path}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function rank<T extends { title: string; path: string; method: string }>(
  items: T[],
  q: string,
): T[] {
  return items
    .map((item) => {
      const hay = `${item.title} ${item.path} ${item.method}`.toLowerCase();
      let score = 0;
      if (hay.includes(q)) score += 10;
      // Subsequence match — q's chars appear in order in hay.
      let j = 0;
      for (let i = 0; i < hay.length && j < q.length; i++) if (hay[i] === q[j]) j++;
      if (j === q.length) score += 5;
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);
}
