import React from 'react';

/**
 * Reusable StatusBadge component
 * Supports:
 * - status: 'VACANT', 'OCCUPIED', 'PENDING'
 * - variant: 'tag', 'profile', 'custom'
 */
export default function StatusBadge({
  status,
  label,
  icon = null,
  variant = 'status',
  className = '',
  style = {},
}) {
  if (variant === 'profile') {
    return (
      <div
        className={`status-profile-tag ${className}`.trim()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: 'var(--color-success)',
          textTransform: 'uppercase',
          ...style,
        }}
      >
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-success)',
          }}
        />
        <span>{label || 'ACTIVE PROFILE'}</span>
      </div>
    );
  }

  if (variant === 'tag') {
    return (
      <div
        className={`badge-pill-header ${className}`.trim()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          ...style,
        }}
      >
        {icon && <span>{icon}</span>}
        <span>{label}</span>
      </div>
    );
  }

  const effectiveStatus = (status || label || 'VACANT').toUpperCase();
  const isVacant = effectiveStatus === 'VACANT';
  const isOccupied = effectiveStatus === 'OCCUPIED';

  const badgeClass = isVacant
    ? 'badge-vacant'
    : isOccupied
    ? 'badge-occupied'
    : 'badge-vacant';

  return (
    <span className={`badge ${badgeClass} ${className}`.trim()} style={style}>
      {icon && <span>{icon}</span>}
      <span>{label || effectiveStatus}</span>
    </span>
  );
}
