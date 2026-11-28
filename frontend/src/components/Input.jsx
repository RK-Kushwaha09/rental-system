import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';

/**
 * Reusable Input component with icon prefix, custom rightLabel (e.g., hints or links),
 * country code prefix, validation checkmark, and password toggle support.
 */
export default function Input({
  label,
  rightLabel,
  hint,
  icon,
  prefix,
  suffix,
  isValid,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  className = '',
  inputClassName = '',
  disabled = false,
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === 'password';
  const effectiveType = isPasswordField ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`form-group ${className}`.trim()}>
      {(label || rightLabel) && (
        <div className="form-label-row">
          {label && (
            <label className="form-label">
              {label}
              {required && <span style={{ color: 'var(--color-error)', marginLeft: '2px' }}>*</span>}
            </label>
          )}
          {rightLabel && <div className="form-label-hint">{rightLabel}</div>}
        </div>
      )}

      <div
        className="input-container"
        style={error ? { borderColor: 'var(--color-error)' } : {}}
      >
        {prefix && <div className="input-prefix">{prefix}</div>}
        {icon && !prefix && <div className="input-icon-left">{icon}</div>}

        <input
          type={effectiveType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`input-field ${inputClassName}`.trim()}
          {...rest}
        />

        {isValid && (
          <div style={{ display: 'flex', alignItems: 'center', paddingRight: '8px', color: '#16A34A', flexShrink: 0 }}>
            <CheckCircle2 size={18} color="#16A34A" />
          </div>
        )}

        {suffix && !isValid && (
          <div style={{ display: 'flex', alignItems: 'center', paddingRight: '8px', flexShrink: 0 }}>
            {suffix}
          </div>
        )}

        {isPasswordField && (
          <button
            type="button"
            className="input-icon-btn"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {hint && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--color-neutral)',
            marginTop: '3px',
          }}
        >
          {hint}
        </div>
      )}

      {error && (
        <span
          style={{
            fontSize: '12px',
            color: 'var(--color-error)',
            marginTop: '2px',
            fontWeight: 500,
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
