import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Bell,
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Zap,
  AlertTriangle,
  Clock,
  Info,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Phone,
  MessageSquare,
  FileText,
  Send,
  Eye,
  X,
  Calendar,
  CreditCard,
  Loader2,
  AlertCircle,
  Lock,
  Plus,
  DoorClosed,
  Check,
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { usePropertySetup } from '../context/PropertySetupContext';
import { billingAPI } from '../services/api';

const MONTH_ORDER = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12
};

function getCardSortKey(card) {
  const short = card.monthShort || (card.monthLabel ? card.monthLabel.slice(0, 3).toUpperCase() : '');
  const mIdx = MONTH_ORDER[short] || 0;
  const label = `${card.billingPeriod || ''} ${card.monthLabel || ''}`;
  let year = 2026;
  const match = label.match(/20\d\d/);
  if (match) year = parseInt(match[0], 10);
  return year * 100 + mIdx;
}

function RoomTimelineRow({ room, onAction, navigate }) {
  // Sort cards chronologically from oldest (left) to newest (right): Oct -> Nov -> Dec
  const rawCards = room.timeline || [];

  // Deduplicate: If an active bill generation card exists for a month (e.g. OCT or NOV),
  // eliminate any duplicate historical card that shares the same month and has no real payment receipt.
  const deduplicatedCards = rawCards.filter((card, idx, arr) => {
    const isActionable = card.cardState === 'READING_REQUIRED' || card.cardState === 'OPEN_BILLING';
    if (isActionable) return true;

    // Check if an actionable generation card exists for the same month
    const cardMonth = (card.monthShort || card.billingMonth || '').slice(0, 3).toUpperCase();
    const hasActiveConflict = arr.some((other) => {
      if (other.cardState !== 'READING_REQUIRED' && other.cardState !== 'OPEN_BILLING') return false;
      const otherMonth = (other.monthShort || other.billingMonth || '').slice(0, 3).toUpperCase();
      const otherLabel = (other.monthLabel || '').toUpperCase();
      return cardMonth && otherMonth && (cardMonth === otherMonth || card.monthLabel?.toUpperCase().includes(otherMonth) || otherLabel.includes(cardMonth));
    });

    if (hasActiveConflict && (!card.receiptNumber || card.amount === 0 || String(card.id).startsWith('bill_HIST-') || String(card.invoiceNumber).startsWith('HIST-'))) {
      return false; // Skip the phantom settled historical bill in favor of the active bill generation card!
    }
    return true;
  });

  const cards = [...deduplicatedCards].sort((a, b) => getCardSortKey(a) - getCardSortKey(b));

  const containerRef = useRef(null);

  // Compute index for active/current card (e.g. November)
  const computeInitialIndex = () => {
    const currentCard = cards.find((c) => c.isCurrent);
    if (currentCard) {
      const idx = cards.indexOf(currentCard);
      if (idx >= 0) return idx;
    }
    const pendingIdx = cards.findIndex((c) => c.cardState === 'PENDING');
    if (pendingIdx >= 0) return pendingIdx;

    const actionIdx = cards.findIndex(
      (c) => c.cardState === 'READING_REQUIRED' || c.cardState === 'OPEN_BILLING'
    );
    if (actionIdx >= 0) return actionIdx;

    const lastPaidIdx = cards.map((c) => c.cardState).lastIndexOf('PAID');
    if (lastPaidIdx >= 0) return lastPaidIdx;

    return 0;
  };

  const [activeIdx, setActiveIdx] = useState(computeInitialIndex);

  // Center on current card on mount or when cards change
  useEffect(() => {
    const targetIdx = computeInitialIndex();
    if (containerRef.current && targetIdx >= 0 && containerRef.current.children[targetIdx]) {
      const targetEl = containerRef.current.children[targetIdx];
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTo({
            left: targetEl.offsetLeft,
            behavior: 'auto',
          });
          setActiveIdx(targetIdx);
        }
      });
    }
  }, [cards.length, room.roomNumber]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollLeft = container.scrollLeft;
    const cardWidth = container.clientWidth;
    if (cardWidth <= 0) return;
    const newIdx = Math.round(scrollLeft / (cardWidth + 12));
    if (newIdx >= 0 && newIdx < cards.length && newIdx !== activeIdx) {
      setActiveIdx(newIdx);
    }
  };

  const scrollToCard = (idx) => {
    if (!containerRef.current || !containerRef.current.children[idx]) return;
    const targetEl = containerRef.current.children[idx];
    containerRef.current.scrollTo({
      left: targetEl.offsetLeft,
      behavior: 'smooth',
    });
    setActiveIdx(idx);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Section Title Header with clickable Month pills */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: 800,
          color: '#1E293B',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2px',
        }}
      >
        <span>ROOM {room.roomNumber}</span>
        {cards.length > 1 && (() => {
          const maxVisible = 3;
          let startIdx = 0;
          if (cards.length > maxVisible) {
            startIdx = activeIdx - 1;
            if (startIdx < 0) startIdx = 0;
            if (startIdx + maxVisible > cards.length) {
              startIdx = cards.length - maxVisible;
            }
          }
          const visibleCards = cards.length > maxVisible
            ? cards.slice(startIdx, startIdx + maxVisible).map((c, offset) => ({
                card: c,
                originalIndex: startIdx + offset,
              }))
            : cards.map((c, i) => ({ card: c, originalIndex: i }));

          const hasEarlier = cards.length > maxVisible && startIdx > 0;
          const hasLater = cards.length > maxVisible && startIdx + maxVisible < cards.length;

          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'none', letterSpacing: 'normal', marginRight: '2px' }}>
                Swipe:
              </span>

              {hasEarlier && (
                <button
                  type="button"
                  onClick={() => scrollToCard(Math.max(0, activeIdx - 1))}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0 2px',
                    color: '#94A3B8',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'color 0.15s ease',
                  }}
                  title="Previous month"
                >
                  <ChevronLeft size={13} strokeWidth={2.5} />
                </button>
              )}

              {visibleCards.map(({ card: c, originalIndex: i }) => {
                const isSelected = i === activeIdx;
                const shortLabel = c.monthShort || (c.monthLabel ? c.monthLabel.slice(0, 3).toUpperCase() : `M${i + 1}`);
                return (
                  <button
                    key={c.id || i}
                    type="button"
                    onClick={() => scrollToCard(i)}
                    style={{
                      border: isSelected ? '1px solid #0F172A' : '1px solid #E2E8F0',
                      backgroundColor: isSelected ? '#0F172A' : '#F8FAFC',
                      color: isSelected ? '#FFFFFF' : '#64748B',
                      borderRadius: '9999px',
                      padding: '2px 8px',
                      fontSize: '10.5px',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      lineHeight: '1.2',
                    }}
                    title={c.monthLabel || shortLabel}
                  >
                    <span>{shortLabel}</span>
                    {c.isCurrent && !isSelected && (
                      <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
                    )}
                  </button>
                );
              })}

              {hasLater && (
                <button
                  type="button"
                  onClick={() => scrollToCard(Math.min(cards.length - 1, activeIdx + 1))}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0 2px',
                    color: '#94A3B8',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'color 0.15s ease',
                  }}
                  title="Next month"
                >
                  <ChevronRight size={13} strokeWidth={2.5} />
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Horizontal Timeline Scroll Row */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '2px',
        }}
      >
        {cards.map((card) => {
          const isPaid = card.cardState === 'PAID';
          const isMeterReq = card.cardState === 'READING_REQUIRED';
          const isLocked = card.cardState === 'LOCKED';
          const isPending = card.cardState === 'PENDING';
          const isVacant = card.cardState === 'VACANT';
          const isOpenBilling = card.cardState === 'OPEN_BILLING';

          return (
            <div
              key={card.id || card.monthKey || Math.random()}
              style={{
                width: '100%',
                minWidth: '100%',
                maxWidth: '100%',
                scrollSnapAlign: 'start',
                flexShrink: 0,
                backgroundColor: '#FFFFFF',
                border: isPending ? '1px solid #FECACA' : '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: 'var(--shadow-subtle)',
                boxSizing: 'border-box',
              }}
            >
              {isPaid && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          backgroundColor: '#DCFCE7',
                          color: '#16A34A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 800,
                        }}
                      >
                        {card.tenantInitials || room.tenantInitials || (card.tenantName ? card.tenantName.charAt(0).toUpperCase() : 'G')}
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                          {card.tenantName || room.tenantName || 'Tenant'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '1px' }}>
                          {card.floor || room.floor || '1st Floor'}
                          {card.monthLabel ? ` • ${card.monthLabel}` : ''}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        backgroundColor: '#DCFCE7',
                        color: '#166534',
                        borderRadius: '9999px',
                        padding: '3px 10px',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.02em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Check size={12} strokeWidth={3} />
                      <span>PAID</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2px' }}>
                    <div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                        {card.paymentDate || '09 Oct 2026'} • Verified
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                        {card.powerUnits != null && card.powerUnits > 0
                          ? `Rent + Electricity (${Math.round(card.powerUnits)} units)`
                          : 'Rent + Electricity (10 units)'}
                      </div>
                    </div>

                    <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 900, color: '#16A34A', letterSpacing: '-0.02em' }}>
                      ₹{Number(card.amount || 1100).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Standardized Dashed Notice Box */}
                  <div
                    style={{
                      border: '1px dashed #CBD5E1',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11.5px',
                      color: '#64748B',
                      lineHeight: '1.4',
                    }}
                  >
                    <CheckCircle2 size={15} color="#16A34A" style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {card.receiptNumber ? `All charges settled in full • Receipt #${card.receiptNumber}` : 'All charges settled in full • Payment verified'}
                    </span>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => onAction(card, room)}
                      style={{
                        width: '100%',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        color: 'var(--color-interactive)',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      }}
                    >
                      <FileText size={15} color="var(--color-interactive)" />
                      <span>View Receipt</span>
                    </button>
                  </div>
                </>
              )}

              {(isLocked || isMeterReq || isOpenBilling) && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 800,
                        }}
                      >
                        {card.tenantInitials || room.tenantInitials || (card.tenantName ? card.tenantName.charAt(0).toUpperCase() : 'T')}
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                          {card.tenantName || room.tenantName || 'Tenant'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '1px' }}>
                          {card.floor || room.floor || 'Ground'}
                          {card.monthLabel ? ` • ${card.monthLabel}` : ''}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        backgroundColor: '#EFF6FF',
                        color: '#2563EB',
                        borderRadius: '9999px',
                        padding: '3px 10px',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {isLocked ? 'Upcoming' : (card.statusBadge || 'Upcoming')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2px' }}>
                    <div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                        Monthly Recurring Rent
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>
                          {isLocked
                            ? `Next Bill: ${card.dueDate || card.nextBillDate || '09 Dec 2026'}`
                            : `Due Date: ${card.dueDate || card.nextBillDate || '06 Nov 2026'}`}
                        </span>
                        {isLocked ? (
                          <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>
                            ⏳ in {card.daysUntilDue || card.daysRemaining || 21} days
                          </span>
                        ) : (
                          <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '1px 5px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 700 }}>
                            ⚡ Window Open
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A' }}>
                      ₹{Number(card.amount || room.monthlyRent || 1000).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Dashed Box: Exact same padding, border, background, and 1-line height for Room 101 and 102 */}
                  <div
                    style={{
                      border: '1px dashed #CBD5E1',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11.5px',
                      color: '#64748B',
                      lineHeight: '1.4',
                    }}
                  >
                    {isLocked ? (
                      <>
                        <Lock size={15} color="#94A3B8" style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {card.lockNotice || `Billing window opens on ${card.windowOpenDate || '04 Dec 2026'} (5 days before due date).`}
                        </span>
                      </>
                    ) : isMeterReq ? (
                      <>
                        <Clock size={15} color="#64748B" style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {`Submeter reading required to finalize bill. Last recorded: ${card.lastReading !== undefined && card.lastReading !== null ? card.lastReading : (card.lastRecorded || 10)} kWh.`}
                        </span>
                      </>
                    ) : (
                      <>
                        <Zap size={15} color="#2563EB" style={{ flexShrink: 0 }} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Billing window is now open. Ready to generate bill.
                        </span>
                      </>
                    )}
                  </div>

                  <div>
                    {isLocked ? (
                      <button
                        type="button"
                        disabled={true}
                        style={{
                          width: '100%',
                          height: '42px',
                          borderRadius: '10px',
                          backgroundColor: '#F1F5F9',
                          color: '#94A3B8',
                          border: '1px solid #E2E8F0',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'not-allowed',
                        }}
                      >
                        <Lock size={15} color="#94A3B8" />
                        <span>Generate Bill Now (Locked • in {card.daysUntilDue || card.daysRemaining || 21} days)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAction(card, room)}
                        style={{
                          width: '100%',
                          height: '42px',
                          borderRadius: '10px',
                          backgroundColor: '#0F172A',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
                        }}
                      >
                        <Zap size={15} color="#22C55E" fill="#22C55E" />
                        <span>Generate Bill Now</span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {isPending && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          backgroundColor: '#FEE2E2',
                          color: '#DC2626',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 800,
                        }}
                      >
                        {card.tenantInitials || room.tenantInitials || 'TN'}
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                          {card.tenantName || room.tenantName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '1px' }}>
                          {card.floor || room.floor || 'Ground'}
                          {card.monthLabel ? ` • ${card.monthLabel}` : ''}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        backgroundColor: '#FEE2E2',
                        color: '#DC2626',
                        borderRadius: '9999px',
                        padding: '3px 10px',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {card.statusBadge || 'Payment Due'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2px' }}>
                    <div>
                      <div style={{ fontSize: '11.5px', color: '#DC2626', fontWeight: 600 }}>
                        Due by {card.dueDate || 'Today'} • Pending Payment
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                        Invoice {card.invoiceNumber}
                      </div>
                    </div>

                    <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 900, color: '#DC2626', letterSpacing: '-0.02em' }}>
                      ₹{Number(card.amount || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Standardized Dashed Notice Box */}
                  <div
                    style={{
                      border: '1px dashed #FECACA',
                      backgroundColor: '#FEF2F2',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11.5px',
                      color: '#991B1B',
                      lineHeight: '1.4',
                    }}
                  >
                    <AlertCircle size={15} color="#DC2626" style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      Payment pending from tenant • Collect via UPI, Cash or Netbanking
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => onAction(card, room)}
                      style={{
                        flex: 1,
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <CreditCard size={15} />
                      <span>Record Payment</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/bills/receipt?invoiceNumber=${encodeURIComponent(card.invoiceNumber)}`)}
                      style={{
                        flex: 1,
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #DBEAFE',
                        color: 'var(--color-interactive)',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                        cursor: 'pointer',
                      }}
                    >
                      <Eye size={15} />
                      <span>View Bill</span>
                    </button>
                  </div>
                </>
              )}

              {isVacant && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          backgroundColor: '#F1F5F9',
                          color: '#64748B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <DoorClosed size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                          Room {room.roomNumber}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '1px' }}>
                          {room.floor || 'Ground'} • Available Unit
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        backgroundColor: '#DCFCE7',
                        color: '#166534',
                        borderRadius: '9999px',
                        padding: '3px 10px',
                        fontSize: '11px',
                        fontWeight: 800,
                        letterSpacing: '0.02em',
                      }}
                    >
                      VACANT
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '2px' }}>
                    <div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>
                        Ready for Onboarding
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '2px' }}>
                        Target monthly rent
                      </div>
                    </div>

                    <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A' }}>
                      ₹{Number(card.amount || room.monthlyRent || 0).toLocaleString('en-IN')}
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>/mo</span>
                    </div>
                  </div>

                  {/* Standardized Dashed Notice Box */}
                  <div
                    style={{
                      border: '1px dashed #CBD5E1',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11.5px',
                      color: '#64748B',
                      lineHeight: '1.4',
                    }}
                  >
                    <DoorClosed size={15} color="#64748B" style={{ flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      This room is currently vacant • Ready to onboard new or existing tenant
                    </span>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => onAction(card, room)}
                      style={{
                        width: '100%',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--color-interactive)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)',
                      }}
                    >
                      <Plus size={15} strokeWidth={2.5} />
                      <span>Onboard Tenant</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function BillsDashboard() {
  const navigate = useNavigate();
  const { propertyName, owner } = usePropertySetup();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billsData, setBillsData] = useState(null);

  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'PAID' | 'METER'
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  useEffect(() => {
    let isMounted = true;
    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const data = await billingAPI.getBillsDashboard();
        if (!isMounted) return;
        setBillsData(data);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load bills dashboard:', err);
        setError(err.message || 'Failed to load billing dashboard.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  // Safe accessor defaults
  const summaryCounts = billsData?.summaryCounts || { total: 0, generated: 0, pending: 0, paid: 0 };
  const financials = billsData?.financials || { targetRent: 0, collected: 0, outstanding: 0 };
  const collectionRate = Number(billsData?.collectionRate ?? 0);
  const statusTrack = billsData?.statusTrack || 'All Settled';
  const cycleMonth = billsData?.cycleMonth || 'Oct 2026';
  const cycleLabel = billsData?.cycleLabel || 'Billing Cycle';
  const rooms = billsData?.rooms || billsData?.roomTimelines || [];

  // Filter rooms based on activeFilter
  const filteredRooms = rooms.filter((r) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'PENDING') {
      return r.timeline?.some((c) => c.cardState === 'PENDING' || c.statusBadge?.toLowerCase().includes('due'));
    }
    if (activeFilter === 'PAID') {
      return r.timeline?.some((c) => c.cardState === 'PAID');
    }
    if (activeFilter === 'METER') {
      return r.timeline?.some((c) => c.cardState === 'READING_REQUIRED');
    }
    return true;
  });

  // Helper to handle card primary action
  const handleCardAction = (card, room) => {
    if (card.cardState === 'PAID') {
      if (card.receiptNumber) {
        navigate(`/payments/success?receiptNumber=${encodeURIComponent(card.receiptNumber)}`);
      } else if (card.invoiceNumber) {
        navigate(`/bills/receipt?invoiceNumber=${encodeURIComponent(card.invoiceNumber)}`);
      }
    } else if (card.cardState === 'PENDING') {
      if (card.invoiceNumber) {
        navigate(`/payments/record?invoiceNumber=${encodeURIComponent(card.invoiceNumber)}`);
      }
    } else if (card.cardState === 'READING_REQUIRED' || card.cardState === 'OPEN_BILLING' || card.cardState === 'LOCKED') {
      if (card.tenantId) {
        navigate(`/bills/create?tenantId=${encodeURIComponent(card.tenantId)}`);
      } else {
        navigate('/bills/create');
      }
    } else if (card.cardState === 'VACANT') {
      navigate(`/tenants/new?room=${encodeURIComponent(room.roomNumber)}`);
    }
  };

  return (
    <div className="app-viewport">
      <div className="app-shell" style={{ maxWidth: '520px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100,
              backgroundColor: '#0F172A',
              color: '#FFFFFF',
              padding: '10px 18px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} color="#4ADE80" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header */}
        <header
          style={{
            height: '64px',
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
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#60A5FA',
                boxShadow: '0 2px 6px rgba(15,23,42,0.15)',
              }}
            >
              <Building2 size={20} />
            </div>

            <div>
              <div style={{ fontSize: '15.5px', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '-0.01em' }}>
                RentManager Pro
              </div>
              <div
                onClick={() => navigate('/more')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--color-interactive)',
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  marginTop: '1px',
                }}
              >
                <span>{propertyName || 'Property'}</span>
                <ChevronDown size={13} strokeWidth={2.5} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => showToast('All notifications are up to date')}>
              <button
                type="button"
                className="icon-btn-header"
                aria-label="Notifications"
                style={{ width: '36px', height: '36px' }}
              >
                <Bell size={19} />
              </button>
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#DC2626',
                  border: '2px solid #FFFFFF',
                }}
              />
            </div>

            <div
              className="user-avatar-circle"
              onClick={() => navigate('/more')}
              title="Owner Profile"
              style={{ cursor: 'pointer', backgroundColor: '#0F172A', color: '#FFFFFF', width: '34px', height: '34px', fontSize: '13px' }}
            >
              {owner?.fullName ? owner.fullName.charAt(0) : <User size={17} />}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="app-content" style={{ padding: '16px', gap: '16px', flex: 1, paddingBottom: '90px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '12px' }}>
              <Loader2 size={36} className="animate-spin" color="var(--color-interactive)" />
              <div style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>Loading room-wise billing timelines...</div>
            </div>
          ) : error && !billsData ? (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '16px', padding: '24px 16px', textAlign: 'center' }}>
              <AlertCircle size={32} color="#DC2626" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#991B1B' }}>{error}</div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.location.reload()}
                style={{ marginTop: '16px', fontSize: '13.5px' }}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Page Title & Action Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '2px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-text-main)' }}>
                      Bills
                    </h1>
                    <span
                      style={{
                        backgroundColor: '#EFF6FF',
                        color: 'var(--color-interactive)',
                        border: '1px solid #DBEAFE',
                        borderRadius: '9999px',
                        padding: '2px 8px',
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      {cycleMonth}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
                    📍 {propertyName || 'Property'} • {cycleLabel}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => navigate('/bills/create')}
                    style={{
                      backgroundColor: 'var(--color-interactive)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(29, 78, 216, 0.25)',
                    }}
                  >
                    <FileText size={14} />
                    <span>Generate Bill</span>
                  </button>
                </div>
              </div>

              {/* Collection Rate & KPI Card */}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', letterSpacing: '0.04em' }}>
                    COLLECTION RATE
                  </span>
                  <span
                    style={{
                      backgroundColor: collectionRate > 0 ? '#DCFCE7' : '#EFF6FF',
                      color: collectionRate > 0 ? '#166534' : 'var(--color-interactive)',
                      borderRadius: '9999px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <TrendingUp size={12} strokeWidth={2.6} />
                    <span>{statusTrack}</span>
                  </span>
                </div>

                <div className="tabular-nums" style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-text-main)', marginTop: '-4px' }}>
                  {collectionRate.toFixed(1)}%
                </div>

                {/* Horizontal progress bar */}
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: '#EFF6FF',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, collectionRate)}%`,
                      height: '100%',
                      backgroundColor: 'var(--color-interactive)',
                      borderRadius: '9999px',
                    }}
                  />
                </div>

                {/* Counts Counter Box */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid #F1F5F9',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Total Units</div>
                    <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px' }}>
                      {summaryCounts.total}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Generated</div>
                    <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-interactive)', marginTop: '2px' }}>
                      {summaryCounts.generated}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Pending</div>
                    <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>
                      {summaryCounts.pending}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Paid</div>
                    <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800, color: '#16A34A', marginTop: '2px' }}>
                      {summaryCounts.paid}
                    </div>
                  </div>
                </div>

                {/* Target, Collected, Outstanding (3 Boxes) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      border: '1px solid #F1F5F9',
                    }}
                  >
                    <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>Target Rent</div>
                    <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 800, marginTop: '2px' }}>
                      ₹{Number(financials.targetRent).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#DCFCE7',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      border: '1px solid #BBF7D0',
                    }}
                  >
                    <div style={{ fontSize: '10.5px', color: '#166534', fontWeight: 600 }}>Collected</div>
                    <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 800, color: '#166534', marginTop: '2px' }}>
                      ₹{Number(financials.collected).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#FEE2E2',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      border: '1px solid #FECACA',
                    }}
                  >
                    <div style={{ fontSize: '10.5px', color: '#991B1B', fontWeight: 600 }}>Outstanding</div>
                    <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}>
                      ₹{Number(financials.outstanding).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter Tabs Row */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  paddingBottom: '2px',
                }}
              >
                {[
                  { id: 'ALL', label: `All (${summaryCounts.total})` },
                  { id: 'PENDING', label: `Pending (${summaryCounts.pending})` },
                  { id: 'PAID', label: `Paid (${summaryCounts.paid})` },
                  { id: 'METER', label: 'Meter Req.' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id)}
                    style={{
                      backgroundColor: activeFilter === tab.id ? 'var(--color-interactive)' : '#FFFFFF',
                      color: activeFilter === tab.id ? '#FFFFFF' : '#475569',
                      border: activeFilter === tab.id ? 'none' : '1px solid var(--color-border)',
                      borderRadius: '9999px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* SECTION: ROOM-WISE MONTHLY BILLING TIMELINES */}
              {filteredRooms.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {filteredRooms.map((room) => (
                    <RoomTimelineRow
                      key={room.roomId || room.roomNumber}
                      room={room}
                      onAction={handleCardAction}
                      navigate={navigate}
                    />
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    borderRadius: '16px',
                    padding: '36px 16px',
                    textAlign: 'center',
                    boxShadow: 'var(--shadow-subtle)',
                  }}
                >
                  <FileText size={36} color="#94A3B8" style={{ margin: '0 auto 10px auto' }} />
                  <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                    No Rooms Found
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px' }}>
                    {activeFilter !== 'ALL'
                      ? `No rooms have billing items matching the "${activeFilter}" filter.`
                      : 'Add rooms and onboard tenants to start managing monthly utility bills.'}
                  </div>
                  {activeFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setActiveFilter('ALL')}
                      style={{
                        marginTop: '14px',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #DBEAFE',
                        color: 'var(--color-interactive)',
                        borderRadius: '8px',
                        padding: '6px 16px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      View All Rooms
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  );
}
