import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  FileText,
  CheckCircle2,
  ArrowRight,
  Info,
  Sparkles,
} from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import Stepper from '../components/Stepper';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { usePropertySetup } from '../context/PropertySetupContext';

export default function PropertySetup() {
  const navigate = useNavigate();
  const { propertyName, setPropertyName, address, setAddress } = usePropertySetup();

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (propertyName === 'Shree Residency') setPropertyName('');
    if (address === 'Ahmedabad, Gujarat') setAddress('');
  }, []);

  const validate = () => {
    const errs = {};
    if (!propertyName.trim()) {
      errs.propertyName = 'Property Name is required';
    }
    if (!address.trim()) {
      errs.address = 'Area / Address is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContinue = () => {
    if (validate()) {
      navigate('/setup/rooms');
    }
  };

  const handleSaveDraft = () => {
    // Saves state in context & localStorage
    navigate('/login');
  };

  return (
    <AuthLayout
      title="Property Setup"
      onBack={() => navigate('/login')}
      onClose={() => navigate('/login')}
    >
      <div className="app-content" style={{ paddingTop: '4px' }}>
        {/* Step Indicator */}
        <Stepper currentStep={1} />

        {/* Step 1 Tag */}
        <div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#EFF6FF',
              color: 'var(--color-interactive)',
              border: '1px solid #DBEAFE',
              borderRadius: '9999px',
              padding: '4px 12px',
              fontSize: '11.5px',
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            <Sparkles size={13} />
            Step 1 of 4 • Quick Onboarding
          </span>
        </div>

        {/* Headings */}
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-main)',
              lineHeight: '1.25',
            }}
          >
            Let's set up your property
          </h1>
          <p
            style={{
              fontSize: '13.5px',
              color: 'var(--color-neutral)',
              marginTop: '4px',
              lineHeight: '1.45',
            }}
          >
            Add your property details to get started.
          </p>
        </div>

        {/* Form Card */}
        <Card
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            padding: '16px',
          }}
        >
          <Input
            label="Property Name"
            icon={<Building2 size={19} />}
            placeholder="e.g. Shree Residency"
            value={propertyName}
            onChange={(e) => {
              setPropertyName(e.target.value);
              if (errors.propertyName) setErrors((prev) => ({ ...prev, propertyName: null }));
            }}
            error={errors.propertyName}
          />

          <Input
            label="Area / Address"
            icon={<MapPin size={19} />}
            placeholder="e.g. Ahmedabad, Gujarat"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              if (errors.address) setErrors((prev) => ({ ...prev, address: null }));
            }}
            error={errors.address}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--color-neutral)',
            }}
          >
            <Info size={14} color="var(--color-interactive)" />
            <span>Helps identify this property on monthly rent receipts.</span>
          </div>

          {/* Digital Receipts Ready Info Box */}
          <div
            style={{
              backgroundColor: '#EFF6FF',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              gap: '12px',
              border: '1px solid #DBEAFE',
              marginTop: '2px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#DBEAFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-interactive)',
                flexShrink: 0,
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: 'var(--color-text-main)',
                }}
              >
                Digital receipts ready
              </div>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--color-neutral)',
                  lineHeight: '1.4',
                  marginTop: '2px',
                }}
              >
                Your tenants will see{' '}
                <strong style={{ color: 'var(--color-text-main)' }}>
                  {propertyName?.trim() ? `"${propertyName.trim()}"` : 'your property'}
                </strong>{' '}
                printed directly on your PDF rent receipt and WhatsApp payment slips.
              </p>
            </div>
          </div>
        </Card>

        {/* Paperwork Trust Badge */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--color-neutral)',
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={16} color="var(--color-success)" />
          <span>Setup takes under 2 minutes • No paperwork required</span>
        </div>

        {/* Bottom Actions */}
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Button
            variant="blue"
            onClick={handleContinue}
            icon={<ArrowRight size={18} strokeWidth={2.4} />}
          >
            Continue to Rooms
          </Button>

          <button
            type="button"
            onClick={handleSaveDraft}
            className="link-btn"
            style={{ fontSize: '13.5px' }}
          >
            Save Draft & Exit
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
