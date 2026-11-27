import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Phone,
  Home,
  Zap,
  Clock,
  Calculator,
  ShieldCheck,
  FileText,
  User,
  AlertCircle,
  Loader2,
  ChevronDown,
  Lock,
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { usePropertySetup } from '../context/PropertySetupContext';
import { billingAPI } from '../services/api';

export default function BillCreator() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { propertyName: setupPropName } = usePropertySetup();

  const tenantIdParam = searchParams.get('tenantId');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [draftData, setDraftData] = useState(null);

  const [selectedTenantId, setSelectedTenantId] = useState(tenantIdParam || '');
  const [currReading, setCurrReading] = useState('');

  // Fetch draft bill from backend
  useEffect(() => {
    let isMounted = true;
    async function loadDraft() {
      setLoading(true);
      setError('');
      try {
        const draft = await billingAPI.getDraftBill(selectedTenantId);
        if (!isMounted) return;
        setDraftData(draft);
        if (draft.tenant && draft.tenant.id && !selectedTenantId) {
          setSelectedTenantId(String(draft.tenant.id));
        }
        // Initialize current reading if available or empty
        if (draft.currentReading && draft.currentReading > (draft.previousReading || 0)) {
          setCurrReading(String(draft.currentReading));
        } else {
          setCurrReading('');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load draft bill:', err);
        setError(err.message || 'Failed to fetch draft billing data from server.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDraft();
    return () => {
      isMounted = false;
    };
  }, [selectedTenantId]);

  const handleTenantChange = (newTenantId) => {
    setSelectedTenantId(newTenantId);
    setSearchParams(newTenantId ? { tenantId: newTenantId } : {});
  };

  // Calculations
  const prevReading = Number(draftData?.previousReading ?? 0);
  const currReadingNum = currReading !== '' ? Number(currReading) : 0;
  const isReadingEntered = currReading !== '' && !isNaN(currReadingNum);
  const isReadingValid = isReadingEntered && currReadingNum >= prevReading;

  const unitsConsumed = isReadingValid ? Math.max(0, currReadingNum - prevReading) : 0;
  const ratePerUnit = Number(draftData?.ratePerUnit ?? draftData?.room?.electricityRate ?? 9.0);
  const electricityCharge = Math.round(unitsConsumed * ratePerUnit);
  const baseRent = Number(draftData?.baseMonthlyRent ?? draftData?.room?.monthlyRent ?? 5000);
  const pastDue = Number(draftData?.pastDue ?? draftData?.pastArrears ?? 0);
  const pastAdvance = Number(draftData?.pastAdvance ?? 0);
  const totalPayable = Math.max(0, baseRent + electricityCharge + pastDue - pastAdvance);

  const MONTHS = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  // Dynamic month helpers so that no month name is ever hardcoded
  const currentBillingMonth =
    draftData?.billingMonth ||
    new Date().toLocaleString('en-US', { month: 'long' }).toUpperCase();

  const currentReadingMonthLabel = currentBillingMonth.substring(0, 3).toUpperCase();

  const prevReadingMonthLabel = (() => {
    const raw = draftData?.previousReadingDate?.trim();
    let monthCandidate = '';

    if (raw && raw.toLowerCase() !== 'none') {
      monthCandidate = raw;
    } else {
      const bUpper = currentBillingMonth.toUpperCase().trim();
      const idx = MONTHS.findIndex((m) => bUpper.startsWith(m.substring(0, 3)));
      if (idx !== -1) {
        monthCandidate = MONTHS[(idx - 1 + 12) % 12];
      } else {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        monthCandidate = MONTHS[d.getMonth()];
      }
    }

    // Symmetrically format month as 3-letter abbreviation (e.g. 'DEC', 'OCT') to match currentReadingMonthLabel ('JAN', 'NOV')
    const foundMonth = MONTHS.find((m) =>
      monthCandidate.toUpperCase().startsWith(m.substring(0, 3))
    );
    if (foundMonth) {
      return foundMonth.substring(0, 3);
    }
    return monthCandidate;
  })();

  const handleGenerateBill = async () => {
    if (!draftData || !draftData.tenant) {
      setError('No tenant selected or available for billing.');
      return;
    }
    if (!isReadingValid) {
      setError(`Current meter reading must be greater than or equal to previous reading (${prevReading} kWh).`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        tenantId: draftData.tenant.id,
        roomId: draftData.room ? draftData.room.id : draftData.tenant.roomId,
        billingMonth: currentBillingMonth,
        billingPeriod: draftData.billingPeriod || `01 ${currentReadingMonthLabel} – ${new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()} ${currentReadingMonthLabel} ${new Date().getFullYear()}`,
        dueDate: draftData.dueDate || `05 ${new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleString('en-US', { month: 'short' })} ${new Date().getFullYear()}`,
        baseRent: baseRent,
        powerReadingPrev: prevReading,
        powerReadingCurr: currReadingNum,
        powerUnits: unitsConsumed,
        powerRate: ratePerUnit,
        powerAmount: electricityCharge,
        pastArrears: pastDue > 0 ? pastDue : (pastAdvance > 0 ? -pastAdvance : 0),
        totalPayable: totalPayable,
      };

      const res = await billingAPI.generateBill(payload);
      const invoiceNumber = res?.invoice?.invoiceNumber || res?.data?.invoiceNumber;
      if (invoiceNumber) {
        navigate(`/bills/receipt?invoiceNumber=${encodeURIComponent(invoiceNumber)}`);
      } else {
        navigate('/bills');
      }
    } catch (err) {
      console.error('Failed to generate bill:', err);
      setError(err.message || 'Error generating bill. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const tenant = draftData?.tenant;
  const room = draftData?.room;
  const availableTenants = draftData?.availableTenants || [];

  return (
    <div className="app-viewport">
      <div className="app-shell" style={{ maxWidth: '520px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header
          style={{
            height: '60px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid var(--color-border)',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="icon-btn-header"
              onClick={() => navigate('/bills')}
              aria-label="Back to Bills"
            >
              <ArrowLeft size={20} strokeWidth={2.2} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#0F172A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                }}
              >
                <Home size={15} />
              </div>
              <h1 style={{ fontSize: '17px', fontWeight: 700 }}>Bill Creator</h1>
            </div>
          </div>

          <div className="user-avatar-circle">
            <User size={18} />
          </div>
        </header>

        {/* Content */}
        <div className="app-content" style={{ padding: '16px', gap: '14px', flex: 1, paddingBottom: '24px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px' }}>
              <Loader2 size={32} className="animate-spin" color="var(--color-interactive)" />
              <div style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>Loading tenant & meter reading...</div>
            </div>
          ) : error && !draftData ? (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <AlertCircle size={28} color="#DC2626" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#991B1B' }}>{error}</div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.location.reload()}
                style={{ marginTop: '12px', fontSize: '13px' }}
              >
                Retry
              </button>
            </div>
          ) : draftData?.noTenants ? (
            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '32px 16px', textAlign: 'center' }}>
              <Home size={36} color="#94A3B8" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>No Active Tenants Found</h3>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '6px' }}>
                Please onboard or allocate a tenant to your property before generating monthly bills.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/tenants')}
                style={{ marginTop: '16px', fontSize: '13.5px' }}
              >
                Go to Tenants
              </button>
            </div>
          ) : (
            <>
              {/* Error banner if validation/submit failed */}
              {error && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #F87171', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} color="#DC2626" flexShrink={0} />
                  <span style={{ fontSize: '12.5px', color: '#B91C1C', fontWeight: 600 }}>{error}</span>
                </div>
              )}

              {/* Tenant Selector Dropdown (if multiple available) */}
              {availableTenants.length > 1 && (
                <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>SELECT TENANT:</span>
                  <select
                    value={selectedTenantId}
                    onChange={(e) => handleTenantChange(e.target.value)}
                    style={{
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      backgroundColor: '#F8FAFC',
                      color: 'var(--color-text-main)',
                      outline: 'none',
                    }}
                  >
                    {availableTenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName || t.name} (Room {t.roomNumber})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Billing Period Bar */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: 'var(--shadow-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700 }}>
                  <Calendar size={16} color="var(--color-interactive)" />
                  <span>{draftData.periodLabel || `Billing Period: ${new Date().toLocaleString('en-US', { month: 'long' })} ${new Date().getFullYear()}`}</span>
                </div>

                <span
                  style={{
                    backgroundColor: draftData?.canGenerate === false ? '#F1F5F9' : '#EFF6FF',
                    color: draftData?.canGenerate === false ? '#475569' : 'var(--color-interactive)',
                    border: '1px solid ' + (draftData?.canGenerate === false ? '#CBD5E1' : '#DBEAFE'),
                    borderRadius: '9999px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: draftData?.canGenerate === false ? '#64748B' : 'var(--color-interactive)' }} />
                  {draftData?.statusBadge || 'DRAFTING'}
                </span>
              </div>

              {/* Pre-billing window lock banner */}
              {draftData?.canGenerate === false && (
                <div
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                  }}
                >
                  <Lock size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#991B1B' }}>
                      Pre-Billing Window Locked
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#B91C1C', marginTop: '2px', lineHeight: '1.4' }}>
                      Billing window opens on {draftData.windowOpenDate || '01 Nov 2026'} ({draftData.countdownText || 'in 28 days'}). You cannot finalize or generate this bill until the window opens.
                    </div>
                  </div>
                </div>
              )}

              {/* Tenant Information Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: 'var(--shadow-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: '#DBEAFE',
                        color: '#1E40AF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '15px',
                      }}
                    >
                      {tenant?.initials || (tenant?.fullName ? tenant.fullName.substring(0, 2).toUpperCase() : 'TN')}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800 }}>{tenant?.fullName || tenant?.name || 'Tenant'}</span>
                        <span
                          style={{
                            backgroundColor: '#F1F5F9',
                            color: '#475569',
                            borderRadius: '4px',
                            padding: '1px 6px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                          }}
                        >
                          UNIT {room?.roomNumber || tenant?.unitNumber || tenant?.roomNumber || '101'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                        <Building2 size={12} />
                        <span>{draftData.propertyName || tenant?.property || setupPropName || 'Property'}</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href={`tel:${tenant?.mobile || ''}`}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748B',
                      cursor: 'pointer',
                      textDecoration: 'none',
                    }}
                  >
                    <Phone size={16} />
                  </a>
                </div>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748B' }}>
                    <Phone size={12} />
                    <span>{tenant?.mobile || 'No contact saved'}</span>
                  </div>
                  <span style={{ color: 'var(--color-interactive)', fontWeight: 600 }}>
                    {tenant?.agreementStatus || 'Active Agreement'}
                  </span>
                </div>
              </div>

              {/* Charges Breakdown Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 800 }}>Charges Breakdown</span>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Step 1 of 2</span>
              </div>

              {/* Item 1: Base Monthly Rent */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: 'var(--shadow-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#EFF6FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-interactive)',
                    }}
                  >
                    <Home size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>Monthly Room Rent</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800 }}>
                    ₹{baseRent.toLocaleString('en-IN')}.00
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                    {currentBillingMonth}
                  </div>
                </div>
              </div>

              {/* Item 2: Electricity Bill */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: 'var(--shadow-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: '#EFF6FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-interactive)',
                      }}
                    >
                      <Zap size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>Electricity Bill</div>
                    </div>
                  </div>

                  <span
                    style={{
                      backgroundColor: '#EFF6FF',
                      color: 'var(--color-interactive)',
                      border: '1px solid #DBEAFE',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    ₹{ratePerUnit.toFixed(2)} / UNIT
                  </span>
                </div>

                {/* Previous & Current Reading Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      PREVIOUS READING
                    </div>
                    <div className="tabular-nums" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                        {prevReading.toLocaleString('en-IN')}
                      </span>
                      <span
                        style={{
                          backgroundColor: '#E2E8F0',
                          color: '#475569',
                          borderRadius: '4px',
                          padding: '3px 6px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                        }}
                      >
                        Units
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                    From ({(prevReadingMonthLabel || '')
                        .replace(/\s*Reading\s*/i, '')
                        .trim()
                         .slice(0, 3)
                        .toUpperCase()}) Reading
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#EFF6FF',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      border: '1px solid #DBEAFE',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-interactive)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      CURRENT READING ({currentReadingMonthLabel})
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}>
                      <input
                        type="number"
                        value={currReading}
                        onChange={(e) => setCurrReading(e.target.value)}
                        placeholder="e.g. 1100"
                        className="tabular-nums"
                        style={{
                          width: '100%',
                          height: '30px',
                          fontSize: '15px',
                          fontWeight: currReading ? 800 : 500,
                          backgroundColor: '#FFFFFF',
                          border: isReadingEntered && !isReadingValid ? '1.5px solid #DC2626' : '1.5px solid var(--color-interactive)',
                          borderRadius: '6px',
                          padding: '0 8px',
                          outline: 'none',
                          color: 'var(--color-text-main)',
                        }}
                      />
                      <span
                        style={{
                          backgroundColor: '#DBEAFE',
                          color: 'var(--color-interactive)',
                          borderRadius: '4px',
                          padding: '4px 6px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Units
                      </span>
                    </div>
                    <div style={{ fontSize: '10.5px', color: isReadingEntered && !isReadingValid ? '#DC2626' : 'var(--color-interactive)', fontWeight: 600 }}>
                      {isReadingEntered && !isReadingValid ? `Must be ≥ ${prevReading}` : 'Enter current reading'}
                    </div>
                  </div>
                </div>

                {/* Net Consumption box */}
                <div
                  style={{
                    backgroundColor: '#EFF6FF',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    border: '1px solid #DBEAFE',
                    fontSize: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calculator size={14} color="var(--color-interactive)" />
                    <span style={{ fontWeight: 600, color: '#1E293B' }}>
                      Net Consumption:{' '}
                      <strong>
                        {currReadingNum > 0 ? currReadingNum.toLocaleString('en-IN') : '—'} – {prevReading.toLocaleString('en-IN')} = {unitsConsumed} Units
                      </strong>
                    </span>
                  </div>
                  <div style={{ color: 'var(--color-interactive)', fontWeight: 700, marginLeft: '20px' }}>
                    Cost: {unitsConsumed} units × ₹{ratePerUnit} = ₹{electricityCharge.toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Total Electricity Bill</span>
                  <strong className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800 }}>
                    ₹{electricityCharge.toLocaleString('en-IN')}.00
                  </strong>
                </div>
              </div>

              {/* Item 3: Balance Carry Forward (Past Arrears / Advance) */}
              {pastDue > 0 ? (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: 'var(--shadow-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: '#FEE2E2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#DC2626',
                      }}
                    >
                      <Clock size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>Past Arrears</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>Unpaid Previous Dues</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800, color: '#DC2626' }}>
                      + ₹{pastDue.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#DC2626', fontWeight: 800, textTransform: 'uppercase' }}>
                      OUTSTANDING
                    </div>
                  </div>
                </div>
              ) : pastAdvance > 0 ? (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: 'var(--shadow-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: '#DCFCE7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#16A34A',
                      }}
                    >
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>Advance Credit</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>Previous Overpayment Credit</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800, color: '#16A34A' }}>
                      - ₹{pastAdvance.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#16A34A', fontWeight: 800, textTransform: 'uppercase' }}>
                      CREDIT APPLIED
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: 'var(--shadow-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#475569',
                      }}
                    >
                      <Clock size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>Past Balance</div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>Settled (No outstanding dues)</div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800, color: '#475569' }}>
                      ₹0.00
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#16A34A', fontWeight: 800, textTransform: 'uppercase' }}>
                      SETTLED
                    </div>
                  </div>
                </div>
              )}

              {/* Dark Summary Invoice Card */}
              <div
                style={{
                  backgroundColor: '#0F172A',
                  borderRadius: '16px',
                  padding: '16px',
                  color: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 4px 15px rgba(15, 23, 42, 0.25)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94A3B8' }}>
                    SUMMARY INVOICE
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#94A3B8' }}>
                    <Calendar size={13} />
                    <span>Due: {draftData.dueDate || '05 Nov 2026'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94A3B8' }}>Room Rent</span>
                    <span className="tabular-nums" style={{ fontWeight: 700 }}>₹{baseRent.toLocaleString('en-IN')}.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#94A3B8' }}>Electricity Bill ({unitsConsumed} units)</span>
                    <span className="tabular-nums" style={{ fontWeight: 700 }}>₹{electricityCharge.toLocaleString('en-IN')}.00</span>
                  </div>
                  {pastDue > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#F87171' }}>Previous Due</span>
                      <span className="tabular-nums" style={{ fontWeight: 700, color: '#F87171' }}>+₹{pastDue.toFixed(2)}</span>
                    </div>
                  )}
                  {pastAdvance > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4ADE80' }}>Advance Deduction</span>
                      <span className="tabular-nums" style={{ fontWeight: 700, color: '#4ADE80' }}>-₹{pastAdvance.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div style={{ height: '1px', backgroundColor: '#334155' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.02em', textTransform: 'uppercase', color: '#FFFFFF' }}>
                      TOTAL CHARGES
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '2px', fontWeight: 500 }}>
                      Inclusive of all utilities
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                      ₹{totalPayable.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>INR (Indian Rupee)</div>
                  </div>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handleGenerateBill}
                disabled={submitting || !isReadingValid || draftData?.canGenerate === false}
                style={{
                  width: '100%',
                  height: '50px',
                  borderRadius: '12px',
                  backgroundColor: draftData?.canGenerate === false || !isReadingValid ? '#94A3B8' : 'var(--color-interactive)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '15px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: draftData?.canGenerate === false || !isReadingValid || submitting ? 'not-allowed' : 'pointer',
                  boxShadow: isReadingValid && draftData?.canGenerate !== false ? '0 4px 12px rgba(29, 78, 216, 0.25)' : 'none',
                  marginTop: '4px',
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Generating & Persisting Bill...</span>
                  </>
                ) : draftData?.canGenerate === false ? (
                  <>
                    <Lock size={18} />
                    <span>Generate Bill (Locked • {draftData?.countdownText || 'Window Not Open'})</span>
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    <span>Generate Bill (₹{totalPayable.toLocaleString('en-IN')})</span>
                  </>
                )}
              </button>

              {/* Tenant notification note */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: '#64748B' }}>
                <ShieldCheck size={14} color="#16A34A" />
                <span>Tenant will be notified with breakdown receipt.</span>
              </div>
            </>
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  );
}
