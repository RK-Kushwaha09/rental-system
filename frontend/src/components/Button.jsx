import React from 'react';

/**
 * Reusable Button Component for RentManager Pro
 * Variants:
 * - primary: Solid dark navy (#0F172A)
 * - blue: Solid interactive blue (#1D4ED8)
 * - secondary: Light blue tint (#EFF6FF)
 * - ghost: Transparent
 */
export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  onClick,
  disabled = false,
  className = '',
  icon = null,
  iconPosition = 'right',
  ...rest
}) {
  const variantClass = {
    primary: 'btn-primary',
    blue: 'btn-blue',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
  }[variant] || 'btn-primary';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variantClass} ${className}`.trim()}
      {...rest}
    >
      {icon && iconPosition === 'left' && <span className="btn-icon">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span className="btn-icon">{icon}</span>}
    </button>
  );
}
