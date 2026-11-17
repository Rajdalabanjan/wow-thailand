import React, { useEffect, useRef, useState } from 'react';

/**
 * A horizontally scrolling area with a second scrollbar at the TOP, kept in sync with the
 * normal one at the bottom. For wide tables, so people can scroll sideways without first
 * scrolling down to the end of the list.
 *
 * Usage: replace <div className="table-responsive">…</div> with <TopScrollbar>…</TopScrollbar>
 * The top bar only shows while the content is wider than the box.
 */
export default function TopScrollbar({ children, className = '', style }) {
  const topRef = useRef(null);
  const bodyRef = useRef(null);
  const [contentWidth, setContentWidth] = useState(0);
  const [overflowing, setOverflowing] = useState(false);

  // Track the content width (rows load later, columns change, the window resizes)
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return undefined;
    const measure = () => {
      setContentWidth(body.scrollWidth);
      setOverflowing(body.scrollWidth > body.clientWidth + 1);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    Array.from(body.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [children]);

  // Moving either scrollbar moves the other one. The echo scroll this causes finds both
  // already level and stops, so the two never chase each other.
  const follow = (from, to) => {
    if (!from || !to) return;
    if (Math.abs(to.scrollLeft - from.scrollLeft) > 1) to.scrollLeft = from.scrollLeft;
  };

  return (
    <>
      <div
        ref={topRef}
        className="top-scrollbar"
        aria-hidden="true"
        onScroll={() => follow(topRef.current, bodyRef.current)}
        style={{ display: overflowing ? 'block' : 'none' }}
      >
        <div style={{ width: contentWidth, height: 1 }} />
      </div>
      <div
        ref={bodyRef}
        className={`table-responsive ${className}`.trim()}
        style={style}
        onScroll={() => follow(bodyRef.current, topRef.current)}
      >
        {children}
      </div>
    </>
  );
}
