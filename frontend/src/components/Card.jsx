import React from 'react';

/**
 * Reusable Card component for RentManager Pro
 * Variants:
 * - default: Clean white card with subtle border
 * - blue: Light blue background (#EFF6FF) for information and summary callouts
 * - highlight: Highlighted border with white background
 */
export default function Card({
  children,
  variant = 'default',
  className = '',
  onClick,
  style = {},
  ...rest
}) {
  const variantStyles = {
    default: {
      backgroundColor: 'var(--bg-card)',
      borderColor: 'var(--color-border)',
    },
    blue: {
      backgroundColor: 'var(--color-interactive-light)',
      borderColor: 'var(--color-interactive-border)',
    },
    highlight: {
      backgroundColor: 'var(--bg-card)',
      borderColor: 'var(--color-interactive)',
    },
  }[variant] || {};

  return (
    <div
      className={`card ${className}`.trim()}
      onClick={onClick}
      style={{ ...variantStyles, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
