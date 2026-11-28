import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Contact,
  Lock,
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  Building2,
  CheckCircle2,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { usePropertySetup } from '../context/PropertySetupContext';
import { authAPI } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const { setOwner } = usePropertySetup();

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

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleIdentifierChange = (e) => {
    const val = e.target.value;
    if (/^\d+$/.test(val)) {
      setIdentifier(val.slice(0, 10));
    } else {
      setIdentifier(val);
    }
  };

  const isIdentifierValid =
    /^\d{10}$/.test(identifier.trim()) ||
    (identifier.includes('@') && identifier.includes('.') && identifier.trim().length >= 5);

  const isPasswordValid = password.length >= 6;

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your 10-digit mobile number or email');
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

  // Forgot Password Handlers
  const handleForgotIdentifierChange = (e) => {
    const val = e.target.value;
    if (/^\d+$/.test(val)) {
      setForgotIdentifier(val.slice(0, 10));
    } else {
      setForgotIdentifier(val);
    }
  };

  const isForgotIdValid =
    /^\d{10}$/.test(forgotIdentifier.trim()) ||
    (forgotIdentifier.includes('@') && forgotIdentifier.includes('.') && forgotIdentifier.trim().length >= 5);

  const handleForgotSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotError('Please enter your registered mobile number or email');
      return;
    }
    const cleanMobile = forgotIdentifier.replace(/\D/g, '');
    const isMobile = cleanMobile.length === 10;
    const isEmail = forgotIdentifier.includes('@') && forgotIdentifier.includes('.');
    if (!isMobile && !isEmail) {
      setForgotError('Please enter a valid 10-digit mobile number or email');
      return;
    }

    try {
      setForgotLoading(true);
      setForgotError('');
      setForgotSuccess('');
      const reqId = isMobile ? cleanMobile : forgotIdentifier.trim();
      const res = await authAPI.requestOtp(reqId);
      setForgotSuccess(res?.message || 'OTP sent successfully! (Test OTP: 123456)');
      setForgotStep(2);
    } catch (err) {
      if (err.isNetworkError || err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('Unable to connect')) {
        setForgotError('Unable to connect to server. Please try again.');
      } else {
        setForgotError(err.message || 'Failed to send OTP. Please check your credentials.');
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResetPassword = async (e) => {
    if (e) e.preventDefault();
    const cleanOtp = forgotOtp.trim();
    if (cleanOtp.length !== 6) {
      setForgotError('Please enter the 6-digit OTP');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match');
      return;
    }

    try {
      setForgotLoading(true);
      setForgotError('');
      const cleanMobile = forgotIdentifier.replace(/\D/g, '');
      const isMobile = cleanMobile.length === 10;
      const reqId = isMobile ? cleanMobile : forgotIdentifier.trim();

      const res = await authAPI.resetPassword({
        identifier: reqId,
        otp: cleanOtp,
        newPassword: forgotNewPassword,
      });

      if (!res || res.status === 'ERROR' || !res.token) {
        setForgotError(res?.message || 'Password reset failed. Please try again.');
        return;
      }

      setOwner((prev) => ({
        ...prev,
        ...res.user,
        isLoggedIn: true,
      }));
      setShowForgotModal(false);

      if (res.user?.hasProperty || res.user?.setupCompleted) {
        navigate('/home');
      } else {
        navigate('/setup/property');
      }
    } catch (err) {
      if (err.isNetworkError || err.name === 'TypeError' || err.message?.includes('Failed to fetch') || err.message?.includes('Unable to connect')) {
        setForgotError('Unable to connect to server. Please try again.');
      } else {
        setForgotError(err.message || 'Password reset failed. Please check OTP and try again.');
      }
    } finally {
      setForgotLoading(false);
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
            rightLabel="10 digits or email"
            icon={<Contact size={19} />}
            placeholder="10-digit mobile number or email"
            autoComplete="off"
            name="login-identifier"
            value={identifier}
            isValid={isIdentifierValid}
            onChange={handleIdentifierChange}
          />

          <Input
            label="Password"
            rightLabel={
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setForgotStep(1);
                  setForgotError('');
                  setForgotSuccess('');
                  setForgotIdentifier(identifier.trim());
                  setForgotOtp('');
                  setForgotNewPassword('');
                  setForgotConfirmPassword('');
                }}
                className="link-blue"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
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
            isValid={isPasswordValid}
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
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '18px' }}
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
                  placeholder="9876543210"
                  type="tel"
                  maxLength={10}
                  value={otpMobile}
                  isValid={otpMobile.length === 10}
                  onChange={(e) => setOtpMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
                <Button
                  variant="primary"
                  disabled={otpLoading || otpMobile.length !== 10}
                  onClick={handleSendOtp}
                >
                  {otpLoading ? 'Sending...' : 'Send OTP →'}
                </Button>
              </>
            ) : (
              <>
                <Input
                  label="Enter 6-Digit OTP"
                  placeholder="Enter 6-digit OTP (e.g. 123456)"
                  type="tel"
                  maxLength={6}
                  value={otpValue}
                  isValid={otpValue.length === 6}
                  onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpValue('');
                      setOtpError('');
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-interactive)', fontSize: '12.5px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ← Change Number
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpLoading}
                    style={{ background: 'none', border: 'none', color: 'var(--color-interactive)', fontSize: '12.5px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Resend OTP
                  </button>
                </div>
                <Button
                  variant="blue"
                  disabled={otpLoading || otpValue.length !== 6}
                  onClick={handleVerifyOtp}
                >
                  {otpLoading ? 'Verifying...' : 'Verify & Continue →'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Forgot / Reset Password Modal */}
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
              maxWidth: '400px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} color="var(--color-interactive)" />
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
                  {forgotStep === 1 ? 'Reset Password' : 'Set New Password'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            {forgotError && (
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
                {forgotError}
              </div>
            )}

            {forgotSuccess && (
              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  color: '#15803D',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                {forgotSuccess}
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.4' }}>
                  Enter your registered 10-digit mobile number or email. We'll verify your identity with an OTP so you can set a new password.
                </p>

                <Input
                  label="Registered Mobile or Email"
                  rightLabel="10 digits strictly"
                  icon={<Contact size={18} />}
                  placeholder="e.g. 9876543210 or user@gmail.com"
                  value={forgotIdentifier}
                  isValid={isForgotIdValid}
                  onChange={handleForgotIdentifierChange}
                />

                <Button
                  type="submit"
                  variant="primary"
                  disabled={forgotLoading || !isForgotIdValid}
                >
                  {forgotLoading ? 'Sending OTP...' : 'Send Verification OTP →'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleForgotResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: '1.4' }}>
                  Enter the 6-digit OTP sent for <strong>{forgotIdentifier}</strong> and create your new secure password.
                </p>

                <Input
                  label="Enter 6-Digit OTP"
                  rightLabel="Universal test OTP: 123456"
                  placeholder="Enter 6-digit OTP"
                  type="tel"
                  maxLength={6}
                  value={forgotOtp}
                  isValid={forgotOtp.length === 6}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />

                <Input
                  label="New Password"
                  rightLabel="Min 6 characters"
                  icon={<Lock size={18} />}
                  type="password"
                  placeholder="Enter new password"
                  value={forgotNewPassword}
                  isValid={forgotNewPassword.length >= 6}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                />

                <Input
                  label="Confirm New Password"
                  rightLabel="Must match"
                  icon={<Lock size={18} />}
                  type="password"
                  placeholder="Confirm new password"
                  value={forgotConfirmPassword}
                  isValid={forgotConfirmPassword.length >= 6 && forgotConfirmPassword === forgotNewPassword}
                  onChange={(e) => setForgotConfirmPassword(e.target.value)}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setForgotOtp('');
                      setForgotError('');
                      setForgotSuccess('');
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-interactive)', fontSize: '12.5px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ← Change ID / Mobile
                  </button>
                  <button
                    type="button"
                    onClick={handleForgotSendOtp}
                    disabled={forgotLoading}
                    style={{ background: 'none', border: 'none', color: 'var(--color-interactive)', fontSize: '12.5px', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                  >
                    <RotateCcw size={12} />
                    Resend OTP
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={
                    forgotLoading ||
                    forgotOtp.length !== 6 ||
                    forgotNewPassword.length < 6 ||
                    forgotNewPassword !== forgotConfirmPassword
                  }
                >
                  {forgotLoading ? 'Updating Password...' : 'Reset Password & Login →'}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}