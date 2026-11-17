import React from 'react';

/**
 * The WOW THAILAND temple mark (the same shape as the navbar logo).
 * Drawn in currentColor, so it takes the colour of its container:
 * gold on dark backgrounds (className="text-warning"), navy inside gold badges.
 */
export default function TempleMark({ size = 22, className = '', style, title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
      focusable="false"
    >
      <path d="M12 1.5L13.2 4.5H10.8L12 1.5Z" />
      <path d="M12 4.5L14 8H10L12 4.5Z" />
      <path d="M8 8.5L12 6L16 8.5L15 12H9L8 8.5Z" />
      <path d="M6 12.5L12 10L18 12.5L17 17H7L6 12.5Z" />
      <path d="M4 17.5L12 15.5L20 17.5L19.5 21H4.5L4 17.5Z" />
      <rect x="3" y="21" width="18" height="2" rx="0.5" opacity="0.85" />
    </svg>
  );
}
