import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, X, User } from 'lucide-react';

/**
 * AuthLayout encapsulates the application shell:
 * - Centered max-width shell on desktop/tablet with neutral outer backdrop
 * - 100% full-width mobile view
 * - Consistent top header with Back arrow, Page Title, Close button, and User Avatar circle
 */
export default function AuthLayout({
  title = 'Property Setup',
  showBack = true,
  onBack,
  showClose = true,
  onClose,
  showUser = true,
  children,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      // Sensible back navigation based on current pathname
      if (location.pathname === '/setup/rooms') {
        navigate('/setup/property');
      } else if (location.pathname === '/setup/pricing') {
        navigate('/setup/rooms');
      } else if (location.pathname === '/setup/review') {
        navigate('/setup/pricing');
      } else if (location.pathname === '/signup') {
        navigate('/login');
      } else if (location.pathname === '/setup/property') {
        navigate('/login');
      } else {
        navigate(-1);
      }
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="app-viewport">
      <div className="app-shell">
        <header className="app-header">
          <div style={{ display: 'flex', alignContent: 'center', alignItems: 'center', gap: '10px' }}>
            {showBack && (
              <button
                type="button"
                className="icon-btn-header"
                onClick={handleBack}
                aria-label="Go back"
              >
                <ArrowLeft size={20} strokeWidth={2.2} />
              </button>
            )}
            <span
              style={{
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-heading)',
                fontSize: '17px',
                fontWeight: 700,
                color: 'var(--color-text-main)',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {showClose && (
              <button
                type="button"
                className="icon-btn-header"
                onClick={handleClose}
                aria-label="Close"
              >
                <X size={20} strokeWidth={2.2} />
              </button>
            )}
            {showUser && (
              <div
                className="user-avatar-circle"
                title="Owner Account"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/login')}
              >
                <User size={18} strokeWidth={2.4} />
              </div>
            )}
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
