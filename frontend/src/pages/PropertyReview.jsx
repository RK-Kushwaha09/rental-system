import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Building2,
  MapPin,
  Pencil,
  DoorClosed,
  Info,
  Database,
  ArrowRight,
} from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import Stepper from '../components/Stepper';
import Button from '../components/Button';
import Card from '../components/Card';
import { usePropertySetup } from '../context/PropertySetupContext';
import { propertyAPI } from '../services/api';

export default function PropertyReview() {
  const navigate = useNavigate();
  const {
    propertyName,
    address,
    roomCount,
    rooms,
    defaultMonthlyRent,
    defaultElectricityRate,
    createProperty,
  } = usePropertySetup();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const totalPotential = (Number(roomCount) || 0) * (Number(defaultMonthlyRent) || 0);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleCreateProperty = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const propertyData = createProperty();
      await propertyAPI.createProperty(propertyData);
      navigate('/rooms');
    } catch (err) {
      console.error('Failed to create property:', err);
      setErrorMessage(err.message || 'Failed to create property. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Property Setup"
      onBack={() => navigate('/setup/pricing')}
      onClose={() => navigate('/login')}
    >
      <div className="app-content" style={{ paddingTop: '4px', gap: '14px' }}>
        {/* Stepper with all 3 previous completed & 4 active */}
        <Stepper currentStep={4} />

        {/* Step 4 Pill Tag */}
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
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <CheckCircle size={13} strokeWidth={2.4} />
            FINAL STEP
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
            Review and create property
          </h1>
          <p
            style={{
              fontSize: '13.5px',
              color: 'var(--color-neutral)',
              marginTop: '4px',
              lineHeight: '1.45',
            }}
          >
            Double-check your setup details. You can start managing tenants and generating bills right after creation.
          </p>
        </div>

        {/* CARD 1: PROPERTY DETAILS */}
        <Card style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-interactive)',
                }}
              >
                <Building2 size={16} />
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: 'var(--color-text-main)',
                  textTransform: 'uppercase',
                }}
              >
                PROPERTY DETAILS
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/setup/property')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-interactive)',
                fontSize: '12.5px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                borderRadius: '6px',
              }}
            >
              <Pencil size={13} />
              <span>Edit</span>
            </button>
          </div>

          {/* Details Body */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <img
              src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=200&q=80"
              alt="Property thumbnail"
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '12px',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <h2
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: 'var(--color-text-main)',
                  lineHeight: '1.2',
                }}
              >
                {propertyName || 'Shree Residency'}
              </h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--color-neutral)',
                  fontSize: '12.5px',
                }}
              >
                <MapPin size={14} color="var(--color-interactive)" />
                <span>{address || 'Ahmedabad, Gujarat'}</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '3px' }}>
                <span
                  style={{
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    borderRadius: '9999px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  Co-living & Rental
                </span>
                <span
                  style={{
                    backgroundColor: '#EFF6FF',
                    color: 'var(--color-interactive)',
                    borderRadius: '9999px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  Active Zone 1
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* CARD 2: ROOMS INVENTORY */}
        <Card style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-interactive)',
                }}
              >
                <DoorClosed size={16} />
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: 'var(--color-text-main)',
                  textTransform: 'uppercase',
                }}
              >
                ROOMS INVENTORY
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/setup/rooms')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-interactive)',
                fontSize: '12.5px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                borderRadius: '6px',
              }}
            >
              <Pencil size={13} />
              <span>Edit</span>
            </button>
          </div>

          {/* Registered count & room type */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 800,
                color: 'var(--color-text-main)',
              }}
            >
              {roomCount} Rooms Registered
            </div>

            <span
              style={{
                backgroundColor: '#EFF6FF',
                color: 'var(--color-interactive)',
                border: '1px solid #DBEAFE',
                borderRadius: '9999px',
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {['Single', 'Double', 'Family'].includes(rooms[0]?.roomType) ? rooms[0]?.roomType : 'Single'}
            </span>
          </div>

          {/* Unit Chips Viewport (compact 2-row layout with vertical scroll for many rooms) */}
          <div
            style={{
              maxHeight: '88px',
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              paddingRight: '2px',
            }}
          >
            {rooms.map((r) => (
              <span
                key={r.id}
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #DBEAFE',
                  color: 'var(--color-text-main)',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <DoorClosed size={14} color="#64748B" />
                <span>{r.roomNumber}</span>
              </span>
            ))}
          </div>

          {/* Vacant Info Box */}
          <div
            style={{
              backgroundColor: '#EFF6FF',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              gap: '10px',
              border: '1px solid #DBEAFE',
              alignItems: 'flex-start',
            }}
          >
            <Info size={17} color="var(--color-interactive)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.45' }}>
              All {roomCount} rooms will start as <strong style={{ color: 'var(--color-text-main)' }}>VACANT</strong>. You can add tenants after creating the property.
            </p>
          </div>
        </Card>

        {/* CARD 3: DEFAULT RATES & TARIFFS */}
        <Card style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-interactive)',
                  fontWeight: 800,
                  fontSize: '15px',
                }}
              >
                ₹
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: 'var(--color-text-main)',
                  textTransform: 'uppercase',
                }}
              >
                DEFAULT RATES & TARIFFS
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/setup/pricing')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-interactive)',
                fontSize: '12.5px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                borderRadius: '6px',
              }}
            >
              <Pencil size={13} />
              <span>Edit</span>
            </button>
          </div>

          {/* Rates breakdown rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-interactive)',
                  }}
                />
                <span style={{ fontSize: '13.5px', color: 'var(--color-text-main)', fontWeight: 500 }}>
                  Monthly Room Rent
                </span>
              </div>
              <div className="tabular-nums" style={{ fontSize: '14.5px' }}>
                <strong style={{ fontWeight: 800 }}>₹{formatCurrency(defaultMonthlyRent)}</strong>{' '}
                <span style={{ color: 'var(--color-neutral)', fontSize: '13px' }}>/ mo</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-neutral)',
                  }}
                />
                <span style={{ fontSize: '13.5px', color: 'var(--color-text-main)', fontWeight: 500 }}>
                  Electricity Tariff
                </span>
              </div>
              <div className="tabular-nums" style={{ fontSize: '14.5px' }}>
                <strong style={{ fontWeight: 800 }}>₹{Number(defaultElectricityRate).toFixed(2)}</strong>{' '}
                <span style={{ color: 'var(--color-neutral)', fontSize: '13px' }}>/ unit</span>
              </div>
            </div>

            <div
              style={{
                height: '1px',
                backgroundColor: 'var(--color-border)',
                margin: '2px 0',
              }}
            />

            {/* Total Potential Monthly */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    color: 'var(--color-text-main)',
                    textTransform: 'uppercase',
                  }}
                >
                  TOTAL POTENTIAL MONTHLY
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-neutral)', marginTop: '1px' }}>
                  Based on 100% occupancy
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div
                  className="tabular-nums"
                  style={{
                    fontSize: '22px',
                    fontWeight: 800,
                    color: 'var(--color-interactive)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  ₹{formatCurrency(totalPotential)}
                  <span style={{ fontSize: '16px' }}>.00</span>
                </div>
                <div
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--color-success)',
                    marginTop: '2px',
                  }}
                >
                  + Utilities metered
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Final Database Write Notice Box */}
        <div
          style={{
            backgroundColor: '#EFF6FF',
            borderRadius: '14px',
            padding: '14px',
            display: 'flex',
            gap: '12px',
            border: '1px solid #DBEAFE',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#DBEAFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-interactive)',
              flexShrink: 0,
            }}
          >
            <Database size={16} />
          </div>
          <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.45' }}>
            Only after pressing <strong style={{ color: 'var(--color-text-main)' }}>"Create Property"</strong> will your ledger entries, ledger records, and <strong style={{ color: 'var(--color-text-main)' }}>{roomCount} unit identifiers</strong> be written permanently to your dashboard.
          </p>
        </div>

        {/* Primary Action Button & Subtitle */}
        <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {errorMessage && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '13px',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              {errorMessage}
            </div>
          )}
          <Button
            variant="primary"
            disabled={loading}
            onClick={handleCreateProperty}
            icon={<ArrowRight size={18} strokeWidth={2.4} />}
            style={{ height: '52px', fontSize: '15.5px' }}
          >
            {loading ? 'Creating Property...' : 'Create Property & Go to Rooms'}
          </Button>

          <p
            style={{
              fontSize: '12px',
              color: 'var(--color-neutral)',
              textAlign: 'center',
              marginTop: '2px',
              marginBottom: '16px',
            }}
          >
            Navigates directly to your Rooms management dashboard.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
