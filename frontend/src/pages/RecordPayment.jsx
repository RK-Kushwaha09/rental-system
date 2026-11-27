import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  X,
  User,
  Clock,
  CheckCircle2,
  QrCode,
  Banknote,
  Building,
  FileCheck,
  Calendar,
  ShieldCheck,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { billingAPI, paymentAPI } from '../services/api';

export default function RecordPayment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceNumberParam = searchParams.get('invoiceNumber');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bill, setBill] = useState(null);

  const [amountReceived, setAmountReceived] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // 'UPI' | 'Cash' | 'Bank' | 'Cheque'
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => {
    const d = new Date();
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  });
  const [sendReceipt, setSendReceipt] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadBillToPay() {
      setLoading(true);
      setError('');
      try {
        let invNumber = invoiceNumberParam;
        if (!invNumber || invNumber === 'undefined' || invNumber === 'null') {
          const dash = await billingAPI.getBillsDashboard();
          if (dash?.actionableBills?.length > 0) {
            invNumber = dash.actionableBills[0].invoiceNumber || dash.actionableBills[0].invoiceRef;
          } else if (dash?.paidBills?.length > 0) {
            invNumber = dash.paidBills[0].invoiceNumber || dash.paidBills[0].invoiceRef;
          }
        }

        if (!invNumber) {
          throw new Error('No bill invoice found to record payment.');
        }

        const data = await billingAPI.getInvoice(invNumber);
        if (!isMounted) return;
        setBill(data);
        const payable = Number(data.totalPayable || 0);
        setAmountReceived(payable);
        setTransactionRef(`UPI/${new Date().getFullYear()}/${Math.floor(1000000 + Math.random() * 9000000)}`);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load bill for payment:', err);
        setError(err.message || 'Bill details could not be loaded.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadBillToPay();
    return () => {
      isMounted = false;
    };
  }, [invoiceNumberParam]);

  const totalInvoiced = Number(bill?.totalPayable || 0);
  const remainingDue = Math.max(0, totalInvoiced - amountReceived);
  const isFullySettled = amountReceived >= totalInvoiced;
  const isOverpaid = amountReceived > totalInvoiced;
  const advanceAmount = isOverpaid ? amountReceived - totalInvoiced : 0;

  const handleConfirm = async () => {
    if (!bill) return;
    if (amountReceived <= 0) {
      setError('Please enter a valid received payment amount.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const payload = {
        invoiceNumber: bill.invoiceNumber,
        billId: bill.id,
        tenantId: bill.tenant?.id,
        amountReceived: Number(amountReceived),
        paymentMethod: paymentMethod === 'UPI' ? 'UPI (GPay)' : (paymentMethod === 'Cash' ? 'Cash Payment' : 'Bank Transfer'),
        transactionRef: transactionRef || `TXN-${Date.now()}`,
        paymentDate: paymentDate,
      };

      const res = await paymentAPI.recordPayment(payload);
      const receipt = res?.receipt || res;
      navigate('/payments/success', { state: { payment: receipt } });
    } catch (err) {
      console.error('Failed to record payment:', err);
      setError(err.message || 'Failed to record payment transaction.');
    } finally {
      setSubmitting(false);
    }
  };

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
              onClick={() => navigate(bill ? `/bills/receipt?invoiceNumber=${encodeURIComponent(bill.invoiceNumber)}` : '/bills')}
              aria-label="Back"
            >
              <ArrowLeft size={20} strokeWidth={2.2} />
            </button>
            <h1 style={{ fontSize: '17px', fontWeight: 700 }}>Record Payment</h1>
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
              <div style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>Loading bill to record payment...</div>
            </div>
          ) : error && !bill ? (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '14px', padding: '24px 16px', textAlign: 'center' }}>
              <AlertCircle size={32} color="#DC2626" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#991B1B' }}>{error}</div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/bills')}
                style={{ marginTop: '16px', fontSize: '13.5px' }}
              >
                Back to Bills
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #F87171', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} color="#DC2626" flexShrink={0} />
                  <span style={{ fontSize: '12.5px', color: '#B91C1C', fontWeight: 600 }}>{error}</span>
                </div>
              )}

              {/* Tenant Top Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: 'var(--shadow-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      backgroundColor: '#DBEAFE',
                      color: 'var(--color-interactive)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '16px',
                    }}
                  >
                    {bill.tenant?.initials || (bill.tenant?.fullName ? bill.tenant.fullName.substring(0, 2).toUpperCase() : 'TN')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '17px', fontWeight: 800 }}>{bill.tenant?.fullName || 'Tenant'}</span>
                      <span
                        style={{
                          backgroundColor: '#EFF6FF',
                          color: 'var(--color-interactive)',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        UNIT {bill.tenant?.unitNumber || '101'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '1px' }}>
                      {bill.billingPeriod || 'October 2026 Rent & Utilities'} • {bill.invoiceNumber}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Total Invoiced</div>
                    <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 900, marginTop: '2px' }}>
                      ₹{totalInvoiced.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Payment Due Date</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#DC2626', fontWeight: 700, fontSize: '13.5px', marginTop: '4px' }}>
                      <Clock size={14} />
                      <span>{bill.dueDate || '05 Nov 2026'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount Received Input Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 800 }}>Amount Received</span>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>INR (₹)</span>
                </div>

                <div
                  style={{
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #DBEAFE',
                    borderRadius: '12px',
                    height: '56px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 14px',
                  }}
                >
                  <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-main)', marginRight: '8px' }}>₹</span>
                  <input
                    type="number"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(Number(e.target.value) || 0)}
                    className="tabular-nums"
                    style={{
                      fontSize: '26px',
                      fontWeight: 900,
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      width: '100%',
                      color: 'var(--color-text-main)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setAmountReceived(0)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748B',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Quick settlement chips */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setAmountReceived(totalInvoiced)}
                    style={{
                      backgroundColor: amountReceived === totalInvoiced ? '#1E40AF' : '#F1F5F9',
                      color: amountReceived === totalInvoiced ? '#FFFFFF' : '#475569',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Exact Full (₹{totalInvoiced.toLocaleString('en-IN')})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmountReceived(Number(bill.baseRent || 5000))}
                    style={{
                      backgroundColor: amountReceived === Number(bill.baseRent || 5000) ? '#1E40AF' : '#F1F5F9',
                      color: amountReceived === Number(bill.baseRent || 5000) ? '#FFFFFF' : '#475569',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Rent Only (₹{Number(bill.baseRent || 5000).toLocaleString('en-IN')})
                  </button>
                </div>
              </div>

              {/* Dynamic Ledger Impact Banner */}
              <div
                style={{
                  backgroundColor: isFullySettled ? '#F0FDF4' : '#FFFBEB',
                  border: `1px solid ${isFullySettled ? '#BBF7D0' : '#FDE68A'}`,
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                {isFullySettled ? (
                  <CheckCircle2 size={18} color="#16A34A" flexShrink={0} />
                ) : (
                  <Clock size={18} color="#D97706" flexShrink={0} />
                )}
                <div style={{ fontSize: '12px', color: isFullySettled ? '#166534' : '#B45309', fontWeight: 600 }}>
                  {isOverpaid ? (
                    <span>Overpayment: <strong>₹{advanceAmount.toFixed(2)}</strong> will be credited to next month as Advance.</span>
                  ) : isFullySettled ? (
                    <span>Account will be <strong>100% Settled</strong> with zero outstanding due.</span>
                  ) : (
                    <span>Partial payment: <strong>₹{remainingDue.toFixed(2)}</strong> will remain outstanding as Due.</span>
                  )}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 800 }}>Payment Method</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'UPI', label: 'UPI / QR', icon: <QrCode size={16} /> },
                    { id: 'Cash', label: 'Cash', icon: <Banknote size={16} /> },
                    { id: 'Bank', label: 'Bank (NEFT)', icon: <Building size={16} /> },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      style={{
                        height: '44px',
                        borderRadius: '10px',
                        border: paymentMethod === m.id ? '2px solid var(--color-interactive)' : '1px solid var(--color-border)',
                        backgroundColor: paymentMethod === m.id ? '#EFF6FF' : '#FFFFFF',
                        color: paymentMethod === m.id ? 'var(--color-interactive)' : 'var(--color-text-main)',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reference & Date Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                    TRANSACTION REF
                  </label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="e.g. UPI/2026/8940217"
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      padding: '0 10px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                    PAYMENT DATE
                  </label>
                  <input
                    type="text"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      padding: '0 10px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Digital Receipt Checkbox Card */}
              <div
                onClick={() => setSendReceipt(!sendReceipt)}
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #DBEAFE',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={sendReceipt}
                  onChange={() => {}}
                  style={{ marginTop: '2px', accentColor: 'var(--color-interactive)', width: '16px', height: '16px' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main)' }}>
                    Send instant digital receipt
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '1px' }}>
                    Automated receipt for {bill.tenant?.fullName || 'tenant'} ({bill.tenant?.mobile || 'registered mobile'})
                  </div>
                </div>
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting || amountReceived <= 0}
                style={{
                  width: '100%',
                  height: '50px',
                  borderRadius: '12px',
                  backgroundColor: amountReceived <= 0 ? '#94A3B8' : 'var(--color-primary)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: amountReceived <= 0 || submitting ? 'not-allowed' : 'pointer',
                  marginTop: '4px',
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Recording Payment...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Confirm & Record Payment (₹{amountReceived.toLocaleString('en-IN')})</span>
                  </>
                )}
              </button>

              {/* Secondary Link */}
              <button
                type="button"
                onClick={() => navigate(bill ? `/bills/receipt?invoiceNumber=${encodeURIComponent(bill.invoiceNumber)}` : '/bills')}
                className="link-btn"
                style={{ fontSize: '13px', textAlign: 'center', display: 'block', width: '100%' }}
              >
                Discard & Return
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
