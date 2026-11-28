import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Contact,
  Mail,
  Lock,
  ArrowRight,
  Clock,
  ChevronRight,
  Building,
  CheckCircle2,
} from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import { usePropertySetup } from '../context/PropertySetupContext';
import { authAPI } from '../services/api';

export default function Signup() {
  const navigate = useNavigate();
  const { setOwner } = usePropertySetup();

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    if (e) e.preventDefault();

    if (!fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await authAPI.signup({
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        password,
      });

      // Save owner profile in context
      setOwner({
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        isLoggedIn: true,
      });

      // Navigate to Step 1 of Property Setup
      navigate('/setup/property');
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Signup" onBack={() => navigate('/login')} onClose={() => navigate('/login')}>
      <div className="app-content" style={{ paddingTop: '4px' }}>
        {/* Header Card with Bank-Grade Ledger Badge & Watermark */}
        <div
          style={{
            backgroundColor: '#EFF6FF',
            borderRadius: '16px',
            padding: '20px 18px',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid #DBEAFE',
          }}
        >
          {/* Subtle Home Watermark Graphic */}
          <div
            style={{
              position: 'absolute',
              right: '-10px',
              bottom: '-15px',
              opacity: 0.12,
              pointerEvents: 'none',
            }}
          >
            <Building size={120} strokeWidth={1.5} color="#1D4ED8" />
          </div>

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'inline-flex' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#E0E7FE',
                  color: '#3730A3',
                  borderRadius: '9999px',
                  padding: '3px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                }}
              >
                <ShieldCheck size={14} />
                RENTAL MANAGEMENT
              </span>
            </div>

            <h1
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: 'var(--color-text-main)',
                letterSpacing: '-0.02em',
                lineHeight: '1.25',
              }}
            >
              Create your RentManager <br />
              Pro account
            </h1>

            <p style={{ fontSize: '13px', color: 'var(--color-neutral)', fontWeight: 500 }}>
              Simple rental management. Smarter billing.
            </p>
          </div>
        </div>

        {/* Signup Form Card */}
        <form autoComplete="off" onSubmit={handleSignup}>
          <Card
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              padding: '18px 16px',
            }}
          >
            <Input
              label="Full Name"
              icon={<Contact size={18} />}
              placeholder="Enter full name"
              autoComplete="off"
              name="signup-full-name"
              value={fullName}
              isValid={fullName.trim().length >= 3}
              onChange={(e) => setFullName(e.target.value)}
            />

            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <div className="input-container" style={{ paddingRight: '12px' }}>
                <div className="badge-country">
                  <span>🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  placeholder="Mobile number"
                  autoComplete="off"
                  name="signup-mobile"
                  className="input-field"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
                {mobile.length === 10 && <CheckCircle2 size={18} color="#16A34A" style={{ flexShrink: 0 }} />}
              </div>
            </div>

            <Input
              label="Email Address"
              icon={<Mail size={18} />}
              type="email"
              placeholder="Email address"
              autoComplete="off"
              name="signup-email"
              value={email}
              isValid={email.includes('@') && email.includes('.') && email.trim().length >= 5}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Password"
              icon={<Lock size={18} />}
              type="password"
              placeholder="Password (min 8 chars)"
              autoComplete="new-password"
              name="signup-password"
              value={password}
              isValid={password.length >= 8}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Input
              label="Confirm Password"
              icon={<Lock size={18} />}
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              isValid={confirmPassword.length >= 8 && confirmPassword === password}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {error && (
              <div
                style={{
                  backgroundColor: 'var(--color-error-bg)',
                  border: '1px solid var(--color-error-border)',
                  color: 'var(--color-error)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              icon={<ArrowRight size={18} strokeWidth={2.4} />}
              style={{ marginTop: '4px' }}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <p
              style={{
                fontSize: '11px',
                color: 'var(--color-neutral)',
                textAlign: 'center',
                lineHeight: '1.4',
                marginTop: '4px',
              }}
            >
              By continuing, you agree to our Terms of Service & Privacy Policy for safe landlord-tenant transactions.
            </p>
          </Card>
        </form>

        {/* Already have an account link */}
        <div style={{ textAlign: 'center', margin: '4px 0 8px 0' }}>
          <span style={{ fontSize: '13.5px', color: 'var(--color-neutral)' }}>
            Already have an account?{' '}
          </span>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="link-blue"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13.5px',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <span>Login</span>
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        </div>

        {/* Bottom Instant Setup Preview Card */}
        <div
          style={{
            backgroundColor: '#EFF6FF',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid #DBEAFE',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-interactive)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              flexShrink: 0,
            }}
          >
            <Clock size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 800,
                color: 'var(--color-interactive)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              INSTANT SETUP
            </div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text-main)',
                marginTop: '1px',
              }}
            >
              Next: Set up your property in under 2...
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
