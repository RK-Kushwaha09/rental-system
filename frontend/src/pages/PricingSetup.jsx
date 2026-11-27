import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SlidersHorizontal,
  Info,
  Zap,
  Banknote,
  ShieldCheck,
  ArrowRight,
  IndianRupee,
} from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import Stepper from '../components/Stepper';
import Button from '../components/Button';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import Input from '../components/Input';
import { usePropertySetup } from '../context/PropertySetupContext';

export default function PricingSetup() {
  const navigate = useNavigate();
  const {
    roomCount,
    defaultMonthlyRent,
    setDefaultMonthlyRent,
    defaultElectricityRate,
    setDefaultElectricityRate,
  } = usePropertySetup();

  // Ensure fields start empty by clearing legacy demo values
  useEffect(() => {
    if (
      defaultMonthlyRent === 7999 ||
      defaultMonthlyRent === 8000 ||
      defaultMonthlyRent === '7999' ||
      defaultMonthlyRent === '8000'
    ) {
      setDefaultMonthlyRent('');
    }
    if (
      defaultElectricityRate === 8.5 ||
      defaultElectricityRate === '8.5' ||
      defaultElectricityRate === '8.50'
    ) {
      setDefaultElectricityRate('');
    }
  }, []);

  const handleRentChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setDefaultMonthlyRent(val);
  };

  const handleElectricityChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    const parts = val.split('.');
    if (parts.length > 2) {
      val = parts[0] + '.' + parts.slice(1).join('');
    }
    setDefaultElectricityRate(val);
  };

  // Calculated potential (Only Rooms x Monthly Rent)
  const rentNum = parseFloat(defaultMonthlyRent);
  const roomsNum = parseInt(roomCount, 10) || 0;
  const hasValidRent = !isNaN(rentNum) && rentNum > 0;
  const totalPotential = hasValidRent ? roomsNum * rentNum : 0;

  const formatCurrency = (val) => {
    if (!val && val !== 0) return '0';
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <AuthLayout
      title="Property Setup"
      onBack={() => navigate('/setup/rooms')}
      onClose={() => navigate('/login')}
    >
      <div className="app-content" style={{ paddingTop: '4px' }}>
        {/* Stepper */}
        <Stepper currentStep={3} />

        {/* Step 3 Tag */}
        <div>
          <StatusBadge
            variant="tag"
            label="STANDARD BILLING DEFAULTS"
            icon={<SlidersHorizontal size={13} />}
          />
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
            Set your default rates
          </h1>
          <p
            style={{
              fontSize: '13.5px',
              color: 'var(--color-neutral)',
              marginTop: '4px',
              lineHeight: '1.45',
            }}
          >
            Configure standard rates to automatically pre-fill monthly bills for your {roomCount} rooms.
          </p>
        </div>

        {/* Default Rates Form Card */}
        <Card
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            padding: '16px',
          }}
        >
          {/* Monthly Rent Field */}
          <Input
            label="Default Monthly Room Rent"
            rightLabel={
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-interactive)',
                }}
              >
                Per Occupancy
              </span>
            }
            icon={<IndianRupee size={18} strokeWidth={2.2} />}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={defaultMonthlyRent || ''}
            onChange={handleRentChange}
            placeholder="e.g. 8000"
            inputClassName="tabular-nums"
            hint={
              <>
                <Info size={14} />
                <span>Standard monthly base rent applied per room</span>
              </>
            }
          />

          {/* Electricity Rate Field */}
          <Input
            label="Default Electricity Rate"
            rightLabel={
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-neutral)',
                }}
              >
                Flat Unit Cost
              </span>
            }
            icon={<IndianRupee size={18} strokeWidth={2.2} />}
            type="text"
            inputMode="decimal"
            value={defaultElectricityRate || ''}
            onChange={handleElectricityChange}
            placeholder="e.g. 8.5"
            inputClassName="tabular-nums"
            hint={
              <>
                <Zap size={14} color="var(--color-neutral)" />
                <span>Per kWh unit rate for sub-meter calculation</span>
              </>
            }
          />
        </Card>

        {/* Estimated Monthly Potential Card */}
        <div
          style={{
            backgroundColor: '#EFF6FF',
            borderRadius: '14px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid #DBEAFE',
          }}
        >
          {/* Left: Icon + Title & Subtitle Stack */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: '#DBEAFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-interactive)',
                flexShrink: 0,
              }}
            >
              <Banknote size={22} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '13.5px',
                  color: '#334155',
                  fontWeight: 700,
                  lineHeight: '1.3',
                }}
              >
                Estimated Monthly Potential
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-interactive)',
                  marginTop: '4px',
                }}
              >
                {hasValidRent
                  ? `${roomsNum} rooms × ₹${formatCurrency(rentNum)}`
                  : `${roomsNum} rooms × ₹—`}
              </span>
            </div>
          </div>

          {/* Right: Calculated Amount */}
          <div style={{ textAlign: 'right', flexShrink: 0, minHeight: '26px' }}>
            {hasValidRent ? (
              <span
                className="tabular-nums"
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: 'var(--color-text-main)',
                  letterSpacing: '-0.02em',
                }}
              >
                ₹{formatCurrency(totalPotential)}
              </span>
            ) : null}
          </div>
        </div>

        {/* Rates Disclaimer Information Card */}
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
          <ShieldCheck size={20} color="var(--color-interactive)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.45' }}>
            These rates will be applied to your rooms by default. You can change the rent or electricity rate for an individual room later.
          </p>
        </div>

        {/* Bottom Actions */}
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Button
            variant="primary"
            onClick={() => navigate('/setup/review')}
            icon={<ArrowRight size={18} strokeWidth={2.4} />}
          >
            Continue to Review
          </Button>

          <button
            type="button"
            onClick={() => navigate('/setup/rooms')}
            className="link-btn"
            style={{ fontSize: '13.5px' }}
          >
            Back to Rooms
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
