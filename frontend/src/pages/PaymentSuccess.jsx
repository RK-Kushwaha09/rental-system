import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  X,
  User,
  Check,
  CheckCircle2,
  FileText,
  CreditCard,
  Banknote,
  Building,
  RefreshCw,
  Share2,
  Download,
  ShieldCheck,
  Send,
  Loader2,
} from 'lucide-react';
import { paymentAPI } from '../services/api';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [payment, setPayment] = useState(location.state?.payment || null);
  const [loading, setLoading] = useState(!location.state?.payment);

  useEffect(() => {
    let isMounted = true;
    async function fetchReceiptIfNeeded() {
      if (payment) return;
      const recNum = searchParams.get('receiptNumber') || searchParams.get('invoiceNumber');
      if (recNum && recNum !== 'undefined' && recNum !== 'null') {
        setLoading(true);
        try {
          const data = await paymentAPI.getReceipt(recNum);
          if (!isMounted) return;
          setPayment(data);
        } catch (err) {
          console.error('Failed to fetch receipt:', err);
        } finally {
          if (isMounted) setLoading(false);
        }
      } else {
        // Fallback: fetch latest receipt
        setLoading(true);
        try {
          const data = await paymentAPI.getReceipt('latest');
          if (!isMounted) return;
          setPayment(data);
        } catch (err) {
          console.error('Failed to fetch fallback receipt:', err);
        } finally {
          if (isMounted) setLoading(false);
        }
      }
    }
    fetchReceiptIfNeeded();
    return () => {
      isMounted = false;
    };
  }, [searchParams, payment]);

  const p = payment || {
    receiptNumber: '#REC-000124',
    status: 'TRANSACTION SETTLED',
    amountReceived: 0,
    currency: 'INR',
    paymentMethod: 'UPI',
    transactionRef: 'TXN-PENDING',
    paymentDate: 'Today',
    tenantName: 'Tenant',
    assignedUnit: 'Room N/A',
    assignedFloor: 'Floor N/A',
    settledPercentage: '100% SETTLED',
    remainingBalance: 0,
  };

  const handleShareWhatsApp = () => {
    const text = `Payment Receipt ${p.receiptNumber}\n` +
      `Tenant: ${p.tenantName} (${p.assignedUnit})\n` +
      `Amount Received: ₹${Number(p.amountReceived || 0).toLocaleString('en-IN')}\n` +
      `Status: ${p.status}\n` +
      `Payment Method: ${p.paymentMethod}\n` +
      `Transaction Ref: ${p.transactionRef}\n` +
      `Date: ${p.paymentDate}\n` +
      `Remaining Balance: ₹${Number(p.remainingBalance || 0).toFixed(2)}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
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
            <h1 style={{ fontSize: '17px', fontWeight: 700 }}>Payment Success</h1>
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
        <div className="app-content" style={{ padding: '16px', gap: '16px', flex: 1, paddingBottom: '30px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '12px' }}>
              <Loader2 size={32} className="animate-spin" color="var(--color-interactive)" />
              <div style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>Loading receipt...</div>
            </div>
          ) : (
            <>
              {/* Centered Success Header */}
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '18px',
                    backgroundColor: '#4ADE80',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 20px rgba(74, 222, 128, 0.35)',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '2.5px solid #0F172A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={20} color="#0F172A" strokeWidth={3.5} />
                  </div>
                </div>

                <div style={{ marginTop: '2px' }}>
                  <span
                    style={{
                      backgroundColor: '#DCFCE7',
                      color: '#166534',
                      borderRadius: '9999px',
                      padding: '2px 10px',
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                    }}
                  >
                    ● {p.status || 'TRANSACTION SETTLED'}
                  </span>
                </div>

                <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '2px' }}>
                  Payment Recorded Successfully
                </h2>
                <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '300px' }}>
                  Ledger updated and tenant notified with payment receipt.
                </p>
              </div>

              {/* Card 1: Outstanding Due Cleared */}
              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #DBEAFE',
                  borderRadius: '16px',
                  padding: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #DBEAFE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#16A34A',
                    }}
                  >
                    <CheckCircle2 size={20} />
                  </div>

                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800 }}>
                      {Number(p.remainingBalance || 0) === 0 ? 'Outstanding Due Cleared' : 'Partial Payment Recorded'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '1px' }}>
                      Remaining Balance: <strong>₹{Number(p.remainingBalance || 0).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    backgroundColor: '#4ADE80',
                    color: '#0F172A',
                    borderRadius: '8px',
                    padding: '4px 8px',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    letterSpacing: '0.03em',
                  }}
                >
                  {p.settledPercentage || '100% SETTLED'}
                </span>
              </div>

              {/* Card 2: Official Receipt Details */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: 'var(--shadow-subtle)',
                }}
              >
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
                      <FileText size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>
                        OFFICIAL RECEIPT
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800 }}>{p.receiptNumber}</div>
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
                      fontWeight: 800,
                    }}
                  >
                    PAID
                  </span>
                </div>

                {/* Inner Amount Box */}
                <div
                  style={{
                    backgroundColor: '#EFF6FF',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid #DBEAFE',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Amount Received</div>
                    <div className="tabular-nums" style={{ fontSize: '22px', fontWeight: 900, marginTop: '2px' }}>
                      ₹{Number(p.amountReceived || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700 }}>{p.currency || 'INR'}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#16A34A',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    <Banknote size={20} />
                  </div>
                </div>

                {/* Details Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B' }}>
                      <User size={15} />
                      <span>Tenant Name</span>
                    </div>
                    <strong style={{ fontWeight: 800 }}>{p.tenantName}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B' }}>
                      <Building size={15} />
                      <span>Room</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                        {p.assignedFloor}
                      </span>
                      <strong style={{ fontWeight: 800 }}>{p.assignedUnit}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B' }}>
                      <CreditCard size={15} />
                      <span>Payment Method</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontWeight: 800, display: 'block' }}>{p.paymentMethod}</strong>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>Ref: {p.transactionRef}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748B' }}>
                      <CheckCircle2 size={15} />
                      <span>Payment Date</span>
                    </div>
                    <span style={{ fontWeight: 600 }}>{p.paymentDate}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => navigate(p.invoiceNumber ? `/bills/receipt?invoiceNumber=${encodeURIComponent(p.invoiceNumber)}` : '/bills')}
                  style={{
                    width: '100%',
                    height: '48px',
                    borderRadius: '12px',
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
                  }}
                >
                  <FileText size={16} />
                  <span>View Bill Receipt</span>
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="tenant-btn-whatsapp"
                    style={{ height: '42px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, border: '1px solid #DCFCE7' }}
                  >
                    <Send size={14} />
                    <span>Share WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn btn-secondary"
                    style={{ height: '42px', borderRadius: '10px', fontSize: '13px' }}
                  >
                    <Download size={14} />
                    <span>Download PDF</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/bills')}
                  className="btn btn-secondary"
                  style={{ height: '44px', borderRadius: '10px', marginTop: '4px', fontSize: '13px', fontWeight: 700 }}
                >
                  <ArrowLeft size={15} />
                  <span>Return to Bills Dashboard</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
