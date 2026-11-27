import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Contact,
  Lock,
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { usePropertySetup } from '../context/PropertySetupContext';
import { authAPI } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const { setOwner, createdProperty } = usePropertySetup();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpMobile, setOtpMobile] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Forgot Password Modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your mobile number or email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await authAPI.login({ identifier: identifier.trim(), password });

      if (!response || response.status === 'ERROR' || !response.token) {
        setError(response?.message || 'Invalid mobile/email or password.');
        return;
      }

      setOwner((prev) => ({
        ...prev,
        ...response.user,
        isLoggedIn: true,
      }));

      // Navigate to /home if setup is completed, otherwise to /setup/property
      if (response.user?.hasProperty || response.user?.setupCompleted) {
        navigate('/home');
      } else {
        navigate('/setup/property');
      }
    } catch (err) {
      if (err.isNetworkError || err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('Unable to connect')) {
        setError('Unable to connect to server. Please try again.');
      } else {
        setError(err.message || 'Invalid mobile/email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    const cleanMobile = otpMobile.replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length < 10) {
      setOtpError('Please enter a valid 10-digit mobile number');
      return;
    }
    try {
      setOtpLoading(true);
      setOtpError('');
      await authAPI.requestOtp(cleanMobile);
      setOtpSent(true);
    } catch (err) {
      if (err.isNetworkError || err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('Unable to connect')) {
        setOtpError('Unable to connect to server. Please try again.');
      } else {
        setOtpError(err.message || 'Failed to send OTP.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const cleanOtp = otpValue.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setOtpError('Please enter the 6-digit OTP');
      return;
    }
    try {
      setOtpLoading(true);
      setOtpError('');
      const cleanMobile = otpMobile.replace(/\D/g, '');
      const res = await authAPI.verifyOtp(cleanMobile, cleanOtp);

      if (!res || res.status === 'ERROR' || !res.token) {
        setOtpError(res?.message || 'Invalid OTP entered.');
        return;
      }

      setOwner((prev) => ({
        ...prev,
        ...res.user,
        isLoggedIn: true,
      }));
      setShowOtpModal(false);
      if (res.user?.hasProperty || res.user?.setupCompleted) {
        navigate('/home');
      } else {
        navigate('/setup/property');
      }
    } catch (err) {
      if (err.isNetworkError || err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('Unable to connect')) {
        setOtpError('Unable to connect to server. Please try again.');
      } else {
        setOtpError(err.message || 'OTP verification failed. Please try again.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <AuthLayout title="Login" showBack={true} onBack={() => navigate('/login')}>
      <div className="app-content" style={{ paddingTop: '8px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              backgroundColor: 'var(--color-primary)',
              margin: '0 auto 14px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 10px rgba(15, 23, 42, 0.15)',
            }}
          >
            <Building2 size={26} strokeWidth={2.2} />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: '4px',
            }}
          >
            <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em' }}>
              RentManager Pro
            </h1>
            <span
              style={{
                backgroundColor: 'var(--color-interactive-light)',
                color: 'var(--color-interactive)',
                border: '1px solid var(--color-interactive-border)',
                borderRadius: '6px',
                padding: '2px 6px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.04em',
              }}
            >
              IN
            </span>
          </div>

          <p style={{ color: 'var(--color-neutral)', fontSize: '14px', fontWeight: 500 }}>
            Simple rental management. Smarter billing.
          </p>
        </div>

        {/* Tab Switcher: Login / Create Account */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#F1F5F9',
            borderRadius: '12px',
            padding: '4px',
            marginTop: '4px',
          }}
        >
          <button
            type="button"
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#FFFFFF',
              color: 'var(--color-text-main)',
              fontWeight: 700,
              fontSize: '14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              cursor: 'pointer',
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => navigate('/signup')}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--color-neutral)',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'color 0.15s ease',
            }}
          >
            Create Account
          </button>
        </div>

        {/* Login Form */}
        <form autoComplete="off" onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '6px' }}>
          <Input
            label="Mobile Number or Email"
            icon={<Contact size={19} />}
            placeholder="+91 98765 43210 or email"
            autoComplete="off"
            name="login-identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />

          <Input
            label="Password"
            rightLabel={
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setForgotSubmitted(false);
                }}
                className="link-blue"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}
              >
                Forgot Password?
              </button>
            }
            icon={<Lock size={19} />}
            type="password"
            placeholder="Enter your password"
            autoComplete="new-password"
            name="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          >
            {loading ? 'Authenticating...' : 'Login to Owner Portal'}
          </Button>
        </form>

        {/* Divider */}
        <div className="divider-with-text">
          <div className="divider-line" />
          <span className="divider-label">OR</span>
          <div className="divider-line" />
        </div>

        {/* Login with Fast OTP */}
        <button
          type="button"
          onClick={() => setShowOtpModal(true)}
          className="btn btn-secondary"
          style={{ width: '100%' }}
        >
          <MessageSquare size={18} strokeWidth={2.2} />
          <span>Login with Fast OTP</span>
        </button>

        {/* Feature / Trial Callout Card */}
        <Card
          variant="blue"
          style={{
            display: 'flex',
            gap: '14px',
            alignItems: 'center',
            padding: '14px',
            marginTop: '8px',
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=160&q=80"
            alt="Property units"
            style={{
              width: '62px',
              height: '62px',
              borderRadius: '10px',
              objectFit: 'cover',
              flexShrink: 0,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={18} color="var(--color-interactive)" />
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--color-text-main)',
                }}
              >
                Setup takes under 2 mins
              </span>
            </div>
            <p
              style={{
                fontSize: '12px',
                color: 'var(--color-neutral)',
                lineHeight: '1.35',
              }}
            >
              Add units, track tenant meter surges, and automate WhatsApp UPI rent links.
            </p>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: 'var(--color-interactive)',
                fontSize: '13px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                cursor: 'pointer',
                marginTop: '3px',
                textAlign: 'left',
              }}
            >
              <span>Start 30-Day Free Trial</span>
              <ChevronRight size={15} strokeWidth={2.5} />
            </button>
          </div>
        </Card>

        {/* Bottom Tagline */}
        <p
          style={{
            fontSize: '11.5px',
            color: 'var(--color-neutral)',
            textAlign: 'center',
            marginTop: '12px',
            marginBottom: '16px',
            lineHeight: '1.4',
            fontWeight: 500,
          }}
        >
          Engineered for Indian Landlords, Resident Managers & PG Operators
        </p>
      </div>

      {/* Fast OTP Modal */}
      {showOtpModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Fast OTP Verification</h3>
              <button
                type="button"
                onClick={() => {
                  setShowOtpModal(false);
                  setOtpSent(false);
                  setOtpError('');
                  setOtpValue('');
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748B' }}>
              Instant login via 6-digit verification code sent to your registered mobile number.
            </p>

            {otpError && (
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
                {otpError}
              </div>
            )}

            {!otpSent ? (
              <>
                <Input
                  label="Registered Mobile Number"
                  prefix={<span style={{ fontWeight: 600, marginRight: '6px' }}>🇮🇳 +91</span>}
                  placeholder="98765 43210"
                  value={otpMobile}
                  onChange={(e) => setOtpMobile(e.target.value)}
                />
                <Button variant="primary" disabled={otpLoading} onClick={handleSendOtp}>
                  {otpLoading ? 'Sending...' : 'Send OTP →'}
                </Button>
              </>
            ) : (
              <>
                <Input
                  label="Enter 6-Digit OTP"
                  placeholder="Enter 6-digit OTP"
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value)}
                  maxLength={6}
                />
                <Button variant="blue" disabled={otpLoading} onClick={handleVerifyOtp}>
                  {otpLoading ? 'Verifying...' : 'Verify & Continue →'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 100,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Reset Password</h3>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            {forgotSubmitted ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <CheckCircle2 size={40} color="var(--color-success)" style={{ margin: '0 auto 10px' }} />
                <p style={{ fontSize: '14px', fontWeight: 600 }}>Reset instructions sent!</p>
                <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  Please check your SMS and email for the password reset link.
                </p>
                <Button
                  variant="primary"
                  style={{ marginTop: '16px' }}
                  onClick={() => setShowForgotModal(false)}
                >
                  Close
                </Button>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '13px', color: '#64748B' }}>
                  Enter your registered mobile or email to receive a password recovery link.
                </p>
                <Input
                  label="Mobile or Email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
                <Button
                  variant="primary"
                  onClick={() => setForgotSubmitted(true)}
                  disabled={!forgotEmail}
                >
                  Send Recovery Link →
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
