import React, { useRef, useState, useLayoutEffect, useEffect, useCallback } from 'react';
import './HoverGlider.css';

const sameBox = (a, b) => a && b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;

function boxStyle(rect, visible) {
  if (!rect) return { opacity: 0 };
  return {
    transform: `translate3d(${rect.x}px, ${rect.y}px, 0)`,
    width: `${rect.w}px`,
    height: `${rect.h}px`,
    opacity: visible ? 1 : 0,
    transition: rect.instant ? 'none' : undefined
  };
}

/**
 * Premium navigation feel for a group of options (tabs, sidebar items):
 *  - a hover highlight glides behind whichever option the cursor is over;
 *  - the "selected" background (activeGliderClassName) glides to the option you click;
 *  - a soft ripple of light spreads from the point you click.
 * Mark each option with `data-glide`, and the selected one with `data-glide-active="true"`.
 * Only transform / width / height / opacity animate, so it stays smooth.
 */
export default function HoverGlider({ className = '', style, gliderClassName = '', activeGliderClassName = '', children, ...rest }) {
  const boxRef = useRef(null);
  const hoveredRef = useRef(null);
  const [hover, setHover] = useState(null);    // { x, y, w, h, on, instant }
  const [active, setActive] = useState(null);  // { x, y, w, h, instant }

  const measure = useCallback((el) => {
    const box = boxRef.current;
    if (!box || !el) return null;
    const b = box.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - b.left + box.scrollLeft, y: r.top - b.top + box.scrollTop, w: r.width, h: r.height };
  }, []);

  // Selected pill follows the selected option; hover highlight rests there (hidden) when idle
  const place = useCallback(() => {
    const box = boxRef.current;
    if (!box) return;
    const el = box.querySelector('[data-glide-active="true"]');
    const m = el ? measure(el) : null;
    if (activeGliderClassName) {
      setActive(prev => {
        if (!m) return prev ? null : prev;
        if (sameBox(prev, m)) return prev;
        return { ...m, instant: !prev };
      });
    }
    if (hoveredRef.current) return;
    setHover(prev => {
      if (!m) return prev && prev.on ? { ...prev, on: false } : prev;
      if (prev && !prev.on && sameBox(prev, m)) return prev;
      return { ...m, on: false, instant: !prev };
    });
  }, [measure, activeGliderClassName]);

  useLayoutEffect(() => { place(); });

  // Options can appear / move (groups opening, window resizing): re-measure
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    let frame = 0;
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (hoveredRef.current && !box.contains(hoveredRef.current)) hoveredRef.current = null;
        place();
      });
    };
    const observer = typeof MutationObserver === 'function' ? new MutationObserver(later) : null;
    if (observer) observer.observe(box, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-glide-active'] });
    window.addEventListener('resize', later);
    return () => {
      cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
      window.removeEventListener('resize', later);
    };
  }, [place]);

  const onPointerOver = (e) => {
    const item = e.target.closest && e.target.closest('[data-glide]');
    if (!item || !boxRef.current || !boxRef.current.contains(item) || hoveredRef.current === item) return;
    hoveredRef.current = item;
    const m = measure(item);
    if (m) setHover(prev => ({ ...m, on: true, instant: !prev }));
  };

  const onPointerLeave = () => {
    hoveredRef.current = null;
    place();
  };

  // A soft ripple of light from the exact point that was clicked
  const onPointerDown = (e) => {
    const item = e.target.closest && e.target.closest('[data-glide]');
    if (!item || !boxRef.current || !boxRef.current.contains(item)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = item.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const dot = document.createElement('span');
    dot.className = 'glide-ripple';
    dot.setAttribute('aria-hidden', 'true');
    dot.style.width = `${size}px`;
    dot.style.height = `${size}px`;
    dot.style.left = `${e.clientX - r.left - size / 2}px`;
    dot.style.top = `${e.clientY - r.top - size / 2}px`;
    item.appendChild(dot);
    window.setTimeout(() => { if (dot.parentNode) dot.parentNode.removeChild(dot); }, 700);
  };

  return (
    <div
      ref={boxRef}
      className={`hover-glide-scope ${className}`}
      style={{ position: 'relative', ...style }}
      onPointerOver={onPointerOver}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      {...rest}
    >
      <span aria-hidden="true" className={`hover-glider ${gliderClassName}`} style={boxStyle(hover, hover && hover.on)} />
      {activeGliderClassName && (
        <span aria-hidden="true" className={`hover-glider active-glider ${activeGliderClassName}`} style={boxStyle(active, Boolean(active))} />
      )}
      {children}
    </div>
  );
}

/**
 * Replays a short, smooth entrance (fade + slight rise) on `ref` whenever `key` changes,
 * without re-mounting anything (so no data reloads). `skip(prevKey, nextKey)` can opt out.
 */
export function useEnterAnimation(ref, key, skip) {
  const prevKey = useRef(key);
  useEffect(() => {
    const before = prevKey.current;
    prevKey.current = key;
    if (before === key) return;
    const el = ref.current;
    if (!el || typeof el.animate !== 'function') return;
    if (skip && skip(before, key)) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.animate(
      [
        { opacity: 0, transform: 'translate3d(0, 16px, 0)' },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' }
      ],
      { duration: 480, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}
