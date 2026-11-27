import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  X,
  User,
  CheckCircle2,
  Calendar,
  Building,
  Phone,
  DoorClosed,
  Zap,
  Clock,
  Share2,
  Download,
  Printer,
  CreditCard,
  Copy,
  Check,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { usePropertySetup } from '../context/PropertySetupContext';
import { billingAPI } from '../services/api';

export default function BillReceipt() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { propertyName: setupPropName, owner: setupOwner } = usePropertySetup();

  const invoiceNumberParam = searchParams.get('invoiceNumber');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invoice, setInvoice] = useState(null);
  const [copiedVpa, setCopiedVpa] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchInvoiceData() {
      setLoading(true);
      setError('');
      try {
        let invNumber = invoiceNumberParam;
        if (!invNumber || invNumber === 'undefined' || invNumber === 'null') {
          // If no invoiceNumber provided or passed as literal 'undefined', fetch dashboard to locate latest generated or paid bill
          const dash = await billingAPI.getBillsDashboard();
          if (dash?.actionableBills?.length > 0) {
            invNumber = dash.actionableBills[0].invoiceNumber || dash.actionableBills[0].invoiceRef;
          } else if (dash?.paidBills?.length > 0) {
            invNumber = dash.paidBills[0].invoiceNumber || dash.paidBills[0].invoiceRef;
          }
        }

        if (!invNumber) {
          throw new Error('No invoice found to display.');
        }

        const data = await billingAPI.getInvoice(invNumber);
        if (!isMounted) return;
        setInvoice(data);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load invoice receipt:', err);
        setError(err.message || 'Invoice could not be loaded.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchInvoiceData();
    return () => {
      isMounted = false;
    };
  }, [invoiceNumberParam]);

  const handleCopyVpa = () => {
    if (invoice?.landlordVpa) {
      navigator.clipboard?.writeText(invoice.landlordVpa);
      setCopiedVpa(true);
      setTimeout(() => setCopiedVpa(false), 2000);
    }
  };

  const prevReading = Number(invoice?.powerReadingPrev ?? 0);
  const currReading = Number(invoice?.powerReadingCurr ?? 0);
  const powerUnits = Number(invoice?.powerUnits ?? Math.max(0, currReading - prevReading));
  const powerRate = Number(invoice?.powerRate ?? 0);
  const powerAmount = Number(invoice?.powerAmount ?? Math.round(powerUnits * powerRate));
  const baseRent = Number(invoice?.baseRent ?? 0);
  const currentSubtotal = baseRent + powerAmount;
  const rawPastArrears = Number(invoice?.pastArrears ?? 0);
  const backendPayable = Number(invoice?.amountPayable ?? invoice?.totalPayable ?? 0);

  // If invoice has explicit pastArrears, use it. Otherwise, derive from backend amountPayable vs currentSubtotal
  const pastArrears = rawPastArrears !== 0 
    ? rawPastArrears 
    : (backendPayable > 0 && backendPayable !== currentSubtotal 
        ? (backendPayable - currentSubtotal) 
        : 0);

  const totalPayable = backendPayable > 0 ? backendPayable : Math.max(0, currentSubtotal + pastArrears);

  const handleShareWhatsApp = () => {
    if (!invoice) return;
    const tenantPhone = (invoice.tenant?.mobile || '').replace(/\D/g, '');
    const rateStr = powerRate % 1 === 0 ? powerRate.toFixed(0) : powerRate.toFixed(2);
    const text = `Rent Invoice ${invoice.invoiceNumber}\n` +
      `Property: ${invoice.propertyName}\n` +
      `Tenant: ${invoice.tenant?.fullName || 'Tenant'} (Room ${invoice.tenant?.unitNumber || ''})\n` +
      `Period: ${invoice.billingPeriod}\n` +
      `Monthly Room Rent: ₹${baseRent.toLocaleString('en-IN')}\n` +
      `Electricity Bill (${powerUnits} units @ ₹${rateStr}/unit): ₹${powerAmount.toLocaleString('en-IN')}\n` +
      (pastArrears > 0 ? `Previous Due: +₹${pastArrears.toFixed(2)}\n` : (pastArrears < 0 ? `Previous Advance: -₹${Math.abs(pastArrears).toFixed(2)}\n` : '')) +
      `Total Payable: ₹${totalPayable.toLocaleString('en-IN')}\n` +
      `Due Date: ${invoice.dueDate}\n` +
      `UPI Payment: ${invoice.landlordVpa}`;
    const url = tenantPhone
      ? `https://wa.me/91${tenantPhone.slice(-10)}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="app-viewport">
      <div className="app-shell" style={{ maxWidth: '520px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header
          className="no-print"
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
            <h1 style={{ fontSize: '17px', fontWeight: 700 }}>Bill Receipt</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="icon-btn-header"
              onClick={() => navigate('/bills')}
              aria-label="Close"
            >
              <X size={20} strokeWidth={2.2} />
            </button>
            <div className="user-avatar-circle">
              <User size={18} />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="app-content" style={{ padding: '16px', gap: '14px', flex: 1, paddingBottom: '30px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px' }}>
              <Loader2 size={32} className="animate-spin" color="var(--color-interactive)" />
              <div style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>Loading bill receipt...</div>
            </div>
          ) : error || !invoice ? (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '14px', padding: '24px 16px', textAlign: 'center' }}>
              <AlertCircle size={32} color="#DC2626" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#991B1B' }}>{error || 'Invoice not found'}</div>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '6px' }}>
                Please generate a bill first from the Bill Creator.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/bills/create')}
                style={{ marginTop: '16px', fontSize: '13.5px' }}
              >
                Generate Bill
              </button>
            </div>
          ) : (
            <>
              {/* Top Invoice Banner */}
              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #DBEAFE',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: invoice.status === 'PAID' ? '#DCFCE7' : '#DBEAFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: invoice.status === 'PAID' ? '#16A34A' : 'var(--color-interactive)',
                    flexShrink: 0,
                  }}
                >
                  <CheckCircle2 size={22} strokeWidth={2.5} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        backgroundColor: invoice.status === 'PAID' ? '#DCFCE7' : '#DBEAFE',
                        color: invoice.status === 'PAID' ? '#166534' : 'var(--color-interactive)',
                        borderRadius: '9999px',
                        padding: '1px 7px',
                        fontSize: '10.5px',
                        fontWeight: 800,
                      }}
                    >
                      ● {invoice.status || 'BILL GENERATED & ISSUED'}
                    </span>
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 800, marginTop: '2px', color: 'var(--color-text-main)' }}>
                    {invoice.invoiceNumber}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                    <Calendar size={13} strokeWidth={2.2} color="#475569" />
                    <span>Generated on {invoice.generatedAt || '28 Oct 2026 • 04:30 PM'}</span>
                  </div>
                </div>
              </div>

              {/* Official Rent Receipt Paper Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                {/* Top decorative blue line */}
                <div style={{ height: '5px', backgroundColor: 'var(--color-interactive)' }} />

                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Receipt Header */}
                  <div>
                    <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--color-interactive)', letterSpacing: '0.06em' }}>
                      RENT RECEIPT
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                      {invoice.propertyName || setupPropName || 'Property'}
                    </h2>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      {invoice.propertyAddress || 'Navrangpura, Ahmedabad, Gujarat'}
                    </div>
                  </div>

                  {/* Owner Info Box */}
                  <div
                    style={{
                      backgroundColor: '#EFF6FF',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      border: '1px solid #DBEAFE',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--color-text-main)' }}>
                      <User size={14} color="var(--color-interactive)" />
                      <span>{invoice.ownerName || setupOwner?.fullName || 'Property Owner'} (Owner)</span>
                    </div>
                    <div style={{ color: 'var(--color-interactive)', fontWeight: 600 }}>
                      {invoice.ownerPhone || ''}
                    </div>
                  </div>

                  {/* Tenant & Assigned Unit Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '12px',
                      padding: '12px',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                        TENANT NAME
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '2px' }}>
                        {invoice.tenant?.fullName || 'Tenant'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {invoice.tenant?.mobile || ''}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                        ROOM
                      </div>
                      <div style={{ fontSize: '14px', fontWeight: 800, marginTop: '2px' }}>
                        Room {invoice.tenant?.unitNumber || '101'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {invoice.tenant?.floor || 'Ground Fl'} • Residential
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                        BILLING PERIOD
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '2px' }}>
                        {invoice.billingPeriod || '01 Oct – 31 Oct 2026'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10.5px', fontWeight: 700, color: (invoice.status === 'PAID' || Number(invoice.closingDue ?? 0) === 0) ? '#16A34A' : '#DC2626', textTransform: 'uppercase' }}>
                        {(invoice.status === 'PAID' || Number(invoice.closingDue ?? 0) === 0) ? 'PAYMENT STATUS' : 'PAYMENT DUE DATE'}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: (invoice.status === 'PAID' || Number(invoice.closingDue ?? 0) === 0) ? '#16A34A' : '#DC2626', marginTop: '2px' }}>
                        {(invoice.status === 'PAID' || Number(invoice.closingDue ?? 0) === 0) ? 'Paid & Settled' : (invoice.dueDate || '05 Nov 2026')}
                      </div>
                    </div>
                  </div>

                  {/* Bill Breakdown Section */}
                  <div className="divider-with-text">
                    <div className="divider-line" />
                    <span className="divider-label">BILL BREAKDOWN</span>
                    <div className="divider-line" />
                  </div>

                  {/* Item 1: Monthly Room Rent */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building size={16} color="var(--color-interactive)" />
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700 }}>1. Monthly Room Rent</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {invoice.billingPeriod || (invoice.billingMonth ? `${invoice.billingMonth} 2026` : 'Current Period')}
                        </div>
                      </div>
                    </div>
                    <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 800 }}>
                      ₹{baseRent.toLocaleString('en-IN')}.00
                    </div>
                  </div>

                  {/* Item 2: Electricity Bill */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Zap size={16} color="var(--color-interactive)" />
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 700 }}>2. Electricity Bill</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            Sub-meter #{invoice.tenant?.unitNumber ? `E-${invoice.tenant.unitNumber}` : 'METER'}
                          </div>
                        </div>
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 800 }}>
                        ₹{powerAmount.toLocaleString('en-IN')}.00
                      </div>
                    </div>

                    {/* Compact Calculation Breakdown Panel */}
                    <div
                      style={{
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Electricity Consumption
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11.5px' }}>
                        <div>
                          <div style={{ color: '#64748B', fontSize: '10.5px' }}>Previous meter reading</div>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '12px' }}>
                            {prevReading.toLocaleString('en-IN')} kWh
                          </div>
                        </div>
                        <div>
                          <div style={{ color: '#64748B', fontSize: '10.5px' }}>Current meter reading</div>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '12px' }}>
                            {currReading.toLocaleString('en-IN')} kWh
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', borderTop: '1px dashed #E2E8F0', paddingTop: '5px' }}>
                        <span style={{ color: '#64748B' }}>Units consumed:</span>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>
                          {currReading.toLocaleString('en-IN')} − {prevReading.toLocaleString('en-IN')} = <span style={{ color: 'var(--color-interactive)' }}>{powerUnits.toLocaleString('en-IN')} units</span>
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px' }}>
                        <span style={{ color: '#64748B' }}>Electricity rate:</span>
                        <span style={{ fontWeight: 700, color: '#0F172A' }}>
                          ₹{powerRate % 1 === 0 ? powerRate.toFixed(0) : powerRate.toFixed(2)} per unit
                        </span>
                      </div>

                      <div
                        style={{
                          backgroundColor: '#EFF6FF',
                          border: '1px solid #DBEAFE',
                          borderRadius: '6px',
                          padding: '6px 8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '11.5px',
                          marginTop: '2px',
                        }}
                      >
                        <span style={{ color: '#1E40AF', fontWeight: 600 }}>Electricity charge calculation:</span>
                        <span style={{ fontWeight: 800, color: '#1E40AF' }}>
                          {powerUnits.toLocaleString('en-IN')} units × ₹{powerRate % 1 === 0 ? powerRate.toFixed(0) : powerRate.toFixed(2)} = ₹{powerAmount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Item 3: Previous Due / Previous Advance (Only when applicable) */}
                  {pastArrears > 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={16} color="#DC2626" />
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#991B1B' }}>3. Previous Due</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>Added to bill (past balance carry-forward)</div>
                        </div>
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 800, color: '#DC2626' }}>
                        +₹{pastArrears.toLocaleString('en-IN')}.00
                      </div>
                    </div>
                  ) : pastArrears < 0 ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={16} color="#16A34A" />
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#166534' }}>3. Previous Advance</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>Subtracted from bill (paid in advance)</div>
                        </div>
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 800, color: '#16A34A' }}>
                        -₹{Math.abs(pastArrears).toLocaleString('en-IN')}.00
                      </div>
                    </div>
                  ) : null}

                  {/* Divider separating items breakdown and calculation summary */}
                  <div style={{ borderTop: '1px solid var(--color-border, #E2E8F0)', margin: '2px 0' }} />

                  {/* Total Calculation Dark Box */}
                  <div
                    style={{
                      backgroundColor: '#0F172A',
                      borderRadius: '14px',
                      padding: '14px 16px',
                      color: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    {/* Room Rent */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#CBD5E1' }}>
                      <span>Room Rent</span>
                      <span className="tabular-nums" style={{ color: '#FFFFFF', fontWeight: 600 }}>
                        ₹{baseRent.toLocaleString('en-IN')}.00
                      </span>
                    </div>

                    {/* Electricity Bill */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#CBD5E1' }}>
                      <span>Electricity Bill</span>
                      <span className="tabular-nums" style={{ color: '#FFFFFF', fontWeight: 600 }}>
                        +₹{powerAmount.toLocaleString('en-IN')}.00
                      </span>
                    </div>

                    <div style={{ height: '1px', backgroundColor: '#334155', margin: '2px 0' }} />

                    {pastArrears !== 0 ? (
                      <>
                        {/* Total (Subtotal of Room Rent + Electricity Bill) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#CBD5E1', fontWeight: 700 }}>
                          <span>Total</span>
                          <span className="tabular-nums" style={{ color: '#FFFFFF' }}>
                            ₹{currentSubtotal.toLocaleString('en-IN')}.00
                          </span>
                        </div>

                        {/* Previous Advance / Previous Due */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                          <span style={{ color: pastArrears < 0 ? '#86EFAC' : '#FCA5A5', fontWeight: 600 }}>
                            {pastArrears < 0 ? 'Previous Advance' : 'Previous Due'}
                          </span>
                          <span className="tabular-nums" style={{ color: pastArrears < 0 ? '#4ADE80' : '#F87171', fontWeight: 800 }}>
                            {pastArrears < 0 ? `-₹${Math.abs(pastArrears).toLocaleString('en-IN')}.00` : `+₹${pastArrears.toLocaleString('en-IN')}.00`}
                          </span>
                        </div>

                        <div style={{ height: '1px', backgroundColor: '#334155', margin: '2px 0' }} />
                      </>
                    ) : null}

                    {/* Net Payable */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>Net Payable</div>
                      <div
                        className="tabular-nums"
                        style={{ fontSize: '24px', fontWeight: 900, color: '#4ADE80', letterSpacing: '-0.02em' }}
                      >
                        ₹{totalPayable.toLocaleString('en-IN')}
                      </div>
                    </div>

                    {Number(invoice.amountReceived || 0) > 0 && (
                      <>
                        <div style={{ height: '1px', backgroundColor: '#334155', margin: '2px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: '#94A3B8' }}>
                          <span>Amount Received</span>
                          <span className="tabular-nums" style={{ color: '#4ADE80', fontWeight: 700 }}>
                            -₹{Number(invoice.amountReceived).toLocaleString('en-IN')}.00
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', color: '#FFFFFF', fontWeight: 800 }}>
                          <span>Remaining Balance</span>
                          <span className="tabular-nums" style={{ color: (invoice.status === 'PAID' || Number(invoice.closingDue ?? 0) === 0) ? '#4ADE80' : '#F87171' }}>
                            {invoice.status === 'PAID' || Number(invoice.closingDue ?? 0) === 0 ? (
                              invoice.settledInInvoice || invoice.settledBySubsequent ? '₹0.00 (Settled in Next Bill)' : '₹0.00'
                            ) : (
                              `₹${Number(invoice.closingDue ?? (totalPayable - Number(invoice.amountReceived || 0))).toLocaleString('en-IN')}.00`
                            )}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Payment Status / UPI Block */}
                  {invoice.status === 'PAID' || (Number(invoice.closingDue ?? 0) === 0 && Number(invoice.amountReceived || 0) > 0) ? (
                    <div
                      style={{
                        backgroundColor: '#F0FDF4',
                        border: '1px solid #BBF7D0',
                        borderRadius: '14px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 800, fontSize: '14px' }}>
                        <CheckCircle2 size={18} color="#16A34A" />
                        <span>Payment Received & Fully Settled</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569' }}>
                        Received <strong>₹{Number(invoice.amountReceived || invoice.totalPayable || 0).toLocaleString('en-IN')}.00</strong> on {invoice.paymentDate || 'Today'}
                        {invoice.paymentMethod ? ` via ${invoice.paymentMethod}` : ''}
                      </div>
                      {invoice.receiptNumber && (
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          Official Payment Receipt: <strong>{invoice.receiptNumber}</strong>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #DBEAFE',
                        borderRadius: '14px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                        Quick Pay via UPI
                      </div>

                      <div
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #DBEAFE',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          fontWeight: 700,
                          color: 'var(--color-interactive)',
                        }}
                      >
                        <span>{invoice.landlordVpa || 'shreeresidency@okhdfcbank'}</span>
                        <button
                          type="button"
                          onClick={handleCopyVpa}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-interactive)' }}
                          title="Copy UPI VPA"
                        >
                          {copiedVpa ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
                        </button>
                      </div>

                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        Scan or transfer from any UPI app (GPay, PhonePe, Paytm)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => window.print()}
                    style={{ height: '44px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <Download size={15} />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    style={{
                      height: '44px',
                      borderRadius: '8px',
                      backgroundColor: '#064E3B',
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <Send size={15} />
                    <span>Share WhatsApp</span>
                  </button>
                </div>

                {invoice.status === 'PAID' || (Number(invoice.closingDue ?? 0) === 0 && Number(invoice.amountReceived || 0) > 0) ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (invoice.receiptNumber) {
                        navigate(`/payments/success?receiptNumber=${encodeURIComponent(invoice.receiptNumber)}`);
                      } else {
                        navigate(`/payments/success?invoiceNumber=${encodeURIComponent(invoice.invoiceNumber)}`);
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '48px',
                      borderRadius: '10px',
                      backgroundColor: '#166534',
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      marginTop: '4px',
                    }}
                  >
                    <CheckCircle2 size={18} />
                    <span>View Official Payment Receipt {invoice.receiptNumber ? `(${invoice.receiptNumber})` : ''}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate(`/payments/record?invoiceNumber=${encodeURIComponent(invoice.invoiceNumber)}`)}
                    style={{
                      width: '100%',
                      height: '48px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--color-primary)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      marginTop: '4px',
                    }}
                  >
                    <CreditCard size={16} />
                    <span>Record Payment Received</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
