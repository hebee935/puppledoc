import { useRef } from 'react';

interface Props {
  /** 'left' resizer belongs to a column whose right edge is draggable
   *  (e.g. the sidebar). 'right' resizer belongs to a column whose
   *  left edge is draggable (e.g. the test panel). */
  edge: 'right' | 'left';
  current: number;
  onChange: (next: number) => void;
}

/**
 * A hair-thin, centered grab strip that widens on hover. Uses pointer events
 * with capture so the drag keeps tracking even when the cursor leaves the
 * element. No layout jank — parent supplies the current width.
 */
export function ColumnResizer({ edge, current, onChange }: Props) {
  const dragStart = useRef<{ x: number; start: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, start: current };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const delta = e.clientX - dragStart.current.x;
    const next = edge === 'right' ? dragStart.current.start + delta : dragStart.current.start - delta;
    onChange(next);
  };

  const end = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    dragStart.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  return (
    <div
      className="col-resizer"
      data-edge={edge}
      role="separator"
      aria-orientation="vertical"
      aria-label={edge === 'right' ? 'Resize sidebar' : 'Resize test panel'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
    />
  );
}
