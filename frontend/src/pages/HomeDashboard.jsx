import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Bell,
  User,
  ChevronDown,
  CheckCircle2,
  ArrowUpDown,
  Banknote,
  AlertTriangle,
  DoorClosed,
  TrendingUp,
  Clock,
  Check,
  MessageSquare,
  Phone,
  FileText,
  Zap,
  ChevronRight,
  Plus,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { usePropertySetup } from '../context/PropertySetupContext';
import { propertyAPI, billingAPI } from '../services/api';

export default function HomeDashboard() {
  const navigate = useNavigate();
  const { propertyName: contextPropName, owner } = usePropertySetup();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Primary data states from real backend APIs
  const [dashboardStats, setDashboardStats] = useState(null);
  const [billsDashboard, setBillsDashboard] = useState(null);
  const [roomsInventory, setRoomsInventory] = useState([]);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  }, []);

  // Fetch all dashboard data in parallel from real backend endpoints
  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, billsRes, roomsRes] = await Promise.allSettled([
        propertyAPI.getDashboardStats(),
        billingAPI.getBillsDashboard(),
        propertyAPI.getRoomsInventory(),
      ]);

      const stats = statsRes.status === 'fulfilled' ? statsRes.value : null;
      const bills = billsRes.status === 'fulfilled' ? billsRes.value : null;
      const rooms = roomsRes.status === 'fulfilled' ? roomsRes.value : [];

      if (!stats && !bills) {
        throw new Error('Unable to connect to server. Please check your connection.');
      }

      // If user has no property set up, redirect to property setup
      if (stats?.hasProperty === false && !stats?.propertyName) {
        navigate('/setup/property');
        return;
      }

      setDashboardStats(stats);
      setBillsDashboard(bills);
      setRoomsInventory(Array.isArray(rooms) ? rooms : []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      if (err.status === 401) {
        navigate('/login');
        return;
      }
      setError(err.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Unified property metadata
  const propertyName =
    dashboardStats?.propertyName ||
    billsDashboard?.propertyName ||
    contextPropName ||
    'My Property';

  const propertyAddress =
    dashboardStats?.address ||
    billsDashboard?.address ||
    'Ring Road, Surat';

  const ownerName =
    dashboardStats?.ownerName ||
    owner?.fullName ||
    'Property Owner';

  const ownerInitial = ownerName ? ownerName.trim().charAt(0).toUpperCase() : 'O';

  // Real financial overview data
  const financials = useMemo(() => {
    const collected = Number(
      billsDashboard?.financials?.collected ??
      dashboardStats?.collectedAmount ??
      0
    );

    const outstanding = Number(
      billsDashboard?.financials?.outstanding ??
      dashboardStats?.outstandingAmount ??
      0
    );

    const overdue = Number(
      dashboardStats?.overdueAmount ??
      0
    );

    const potential = Number(
      billsDashboard?.financials?.targetRent ??
      dashboardStats?.monthlyPotential ??
      0
    );

    const totalUnits = Number(
      dashboardStats?.totalUnits ??
      (roomsInventory.length > 0 ? roomsInventory.length : 3)
    );

    const occupiedCount = Number(
      dashboardStats?.occupiedCount ??
      roomsInventory.filter((r) => r.status === 'OCCUPIED').length ??
      totalUnits
    );

    const vacantCount = Number(
      dashboardStats?.vacantCount ??
      Math.max(0, totalUnits - occupiedCount)
    );

    const occupancyPercent =
      totalUnits > 0 ? Math.round((occupiedCount / totalUnits) * 100) : 0;

    const collectionRate = Number(billsDashboard?.collectionRate ?? (outstanding === 0 && collected > 0 ? 100 : 0));
    const statusTrack = billsDashboard?.statusTrack || (outstanding === 0 ? 'On Track' : 'Action Needed');

    return {
      collected,
      outstanding,
      overdue,
      potential,
      totalUnits,
      occupiedCount,
      vacantCount,
      occupancyPercent,
      collectionRate,
      statusTrack,
    };
  }, [dashboardStats, billsDashboard, roomsInventory]);

  // Real Action Items computation
  const actionItems = useMemo(() => {
    const items = [];

    // 1. Unpaid / Overdue Bills
    const actionableBills = billsDashboard?.actionableBills || [];
    const actionableDues = dashboardStats?.actionableDues || [];
    const allPendingBills = actionableBills.length > 0 ? actionableBills : actionableDues;

    allPendingBills.forEach((bill, idx) => {
      const amount = Number(bill.outstandingAmount ?? bill.totalPayable ?? bill.amount ?? 0);
      if (amount > 0) {
        items.push({
          id: `pay_${bill.id || bill.billId || idx}`,
          type: 'PAYMENT_DUE',
          title: `Room ${bill.roomNumber || ''} • ${bill.tenantName || 'Tenant'}`,
          subtitle: bill.subtitle || bill.billingMonth ? `${bill.billingMonth || ''} Bill` : 'Monthly Rent & Electricity Due',
          amount,
          isOverdue: (bill.status && bill.status.toUpperCase() === 'OVERDUE') || (bill.dueBadge && bill.dueBadge.toUpperCase().includes('OVERDUE')),
          dueDate: bill.dueDate || 'Due Today',
          mobile: bill.mobile || '',
          invoiceNumber: bill.invoiceNumber || '',
          tenantId: bill.tenantId,
        });
      }
    });

    // 2. Meter Reading Required
    const timelines = billsDashboard?.roomTimelines || billsDashboard?.rooms || [];
    timelines.forEach((room) => {
      const cards = room.timeline || room.cards || [];
      const readingCard = cards.find((c) => c.cardState === 'READING_REQUIRED');
      if (readingCard) {
        items.push({
          id: `meter_${room.roomId || room.roomNumber}`,
          type: 'METER_READING',
          title: `Room ${room.roomNumber} • ${room.tenantName || 'Tenant'}`,
          subtitle: `Submeter reading required for ${readingCard.monthLabel || 'Current Cycle'}`,
          warningText: readingCard.warningText || 'Enter latest meter units to calculate electricity charge.',
          lastReading: readingCard.lastReading,
          tenantId: readingCard.tenantId || room.tenant?.id || room.tenantId,
          roomNumber: room.roomNumber,
        });
      }

      // 3. Bill Ready to Generate (Open Billing Window)
      const openBillCard = cards.find((c) => c.cardState === 'OPEN_BILLING');
      if (openBillCard) {
        items.push({
          id: `bill_${room.roomId || room.roomNumber}`,
          type: 'BILL_READY',
          title: `Room ${room.roomNumber} • ${room.tenantName || 'Tenant'}`,
          subtitle: `Billing cycle open for ${openBillCard.monthLabel || 'Current Cycle'}`,
          amount: openBillCard.amount || room.monthlyRent,
          tenantId: openBillCard.tenantId || room.tenant?.id || room.tenantId,
          roomNumber: room.roomNumber,
        });
      }
    });

    // Meter Attention fallback from dashboardStats if not already present
    if (dashboardStats?.meterAttention && !items.some((i) => i.type === 'METER_READING')) {
      items.push({
        id: `meter_stat_${dashboardStats.meterAttention.roomNumber}`,
        type: 'METER_READING',
        title: `Room ${dashboardStats.meterAttention.roomNumber} • ${dashboardStats.meterAttention.tenantName}`,
        subtitle: 'Submeter reading pending',
        warningText: 'Submit reading to finalize electricity bill',
        roomNumber: dashboardStats.meterAttention.roomNumber,
      });
    }

    // 4. Vacant Rooms needing onboarding
    const vacantList = roomsInventory.filter((r) => r.status === 'VACANT');
    vacantList.forEach((r) => {
      items.push({
        id: `vacant_${r.roomId || r.roomNumber}`,
        type: 'VACANT_ROOM',
        title: `Room ${r.roomNumber} • Vacant Unit`,
        subtitle: `Ready for tenant onboarding • ₹${Number(r.monthlyRent || 0).toLocaleString('en-IN')}/mo target`,
        roomNumber: r.roomNumber,
        monthlyRent: r.monthlyRent,
      });
    });

    return items;
  }, [billsDashboard, dashboardStats, roomsInventory]);

  // Unified Room & Tenant Overview List
  const unifiedRooms = useMemo(() => {
    const timelines = billsDashboard?.roomTimelines || billsDashboard?.rooms || [];

    // Base on inventory or timelines
    const sourceList = roomsInventory.length > 0 ? roomsInventory : timelines;

    return sourceList.map((room) => {
      const roomNum = String(room.roomNumber || '');
      const timelineMatch = timelines.find((t) => String(t.roomNumber) === roomNum);
      const inventoryMatch = roomsInventory.find((r) => String(r.roomNumber) === roomNum);

      const cards = timelineMatch?.timeline || timelineMatch?.cards || [];

      const tenantName =
        room.tenantName ||
        timelineMatch?.tenantName ||
        timelineMatch?.tenant?.fullName ||
        inventoryMatch?.tenantName ||
        (room.status === 'VACANT' ? 'Vacant Unit' : 'Active Tenant');

      const isVacant = (room.status === 'VACANT') || (timelineMatch?.status === 'VACANT') || (inventoryMatch?.status === 'VACANT');

      // Determine smart status badge
      let badgeLabel = 'Active';
      let badgeStyle = { bg: '#EFF6FF', text: 'var(--color-interactive)' };
      let actionRoute = `/rooms/${room.roomId || room.id || roomNum}`;

      if (isVacant) {
        badgeLabel = 'Vacant';
        badgeStyle = { bg: '#F1F5F9', text: '#64748B' };
        actionRoute = `/tenants/new?room=${encodeURIComponent(roomNum)}`;
      } else {
        const hasPending = cards.find((c) => c.cardState === 'PENDING');
        const hasReadingReq = cards.find((c) => c.cardState === 'READING_REQUIRED');
        const hasOpenBill = cards.find((c) => c.cardState === 'OPEN_BILLING');
        const hasPaid = cards.find((c) => c.cardState === 'PAID');

        if (hasPending) {
          badgeLabel = `Due ₹${Number(hasPending.totalPayable || hasPending.amount || 0).toLocaleString('en-IN')}`;
          badgeStyle = { bg: '#FEE2E2', text: '#DC2626' };
          actionRoute = hasPending.invoiceNumber ? `/payments/record?invoiceNumber=${encodeURIComponent(hasPending.invoiceNumber)}` : `/payments/record`;
        } else if (hasReadingReq) {
          badgeLabel = '⚡ Reading Needed';
          badgeStyle = { bg: '#FEF3C7', text: '#B45309' };
          actionRoute = hasReadingReq.tenantId ? `/bills/create?tenantId=${encodeURIComponent(hasReadingReq.tenantId)}` : `/bills/create`;
        } else if (hasOpenBill) {
          badgeLabel = '📄 Bill Ready';
          badgeStyle = { bg: '#DBEAFE', text: '#1D4ED8' };
          actionRoute = hasOpenBill.tenantId ? `/bills/create?tenantId=${encodeURIComponent(hasOpenBill.tenantId)}` : `/bills/create`;
        } else if (hasPaid) {
          badgeLabel = '✓ Paid (Oct)';
          badgeStyle = { bg: '#DCFCE7', text: '#166534' };
          actionRoute = hasPaid.receiptNumber ? `/payments/success?receiptNumber=${encodeURIComponent(hasPaid.receiptNumber)}` : `/bills`;
        } else {
          badgeLabel = '⏳ Upcoming';
          badgeStyle = { bg: '#F1F5F9', text: '#475569' };
          actionRoute = `/bills`;
        }
      }

      const monthlyRent = Number(room.monthlyRent || timelineMatch?.monthlyRent || inventoryMatch?.monthlyRent || 0);
      const floor = room.floor || timelineMatch?.floor || inventoryMatch?.floor || 'Ground';
      const subMeterReading = room.currentReading || inventoryMatch?.currentReading || null;

      return {
        roomId: room.roomId || room.id || roomNum,
        roomNumber: roomNum,
        floor,
        tenantName,
        isVacant,
        monthlyRent,
        subMeterReading,
        badgeLabel,
        badgeStyle,
        actionRoute,
        tenantId: timelineMatch?.tenant?.id || inventoryMatch?.tenantId,
      };
    });
  }, [billsDashboard, roomsInventory]);

  // Real settled receipts list
  const recentReceipts = useMemo(() => {
    const bReceipts = billsDashboard?.recentReceipts || [];
    const sReceipts = dashboardStats?.recentReceipts || [];
    const source = bReceipts.length > 0 ? bReceipts : sReceipts;

    return source.map((r, idx) => ({
      id: r.receiptNumber || `rcpt_${idx}`,
      receiptNumber: r.receiptNumber || '#REC-VERIFIED',
      tenantName: r.tenantName || 'Tenant',
      roomNumber: r.roomNumber || '',
      amount: Number(r.amount || 0),
      date: r.paymentDate || r.date || 'Recent',
      method: r.paymentMethod || r.method || 'Verified Payment',
      status: r.status || 'PAID',
    }));
  }, [billsDashboard, dashboardStats]);

  // Loading view
  if (loading) {
    return (
      <div className="app-viewport">
        <div className="app-shell" style={{ maxWidth: '520px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <header
            style={{
              height: '64px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid var(--color-border)',
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
                }}
              >
                <Building2 size={20} />
              </div>
              <span style={{ fontSize: '15.5px', fontWeight: 800, color: 'var(--color-text-main)' }}>RentManager Pro</span>
            </div>
          </header>
          <div className="app-content" style={{ padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', flex: 1 }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #E2E8F0', borderTopColor: 'var(--color-interactive)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '13.5px', color: '#64748B', fontWeight: 600 }}>Loading owner dashboard...</span>
          </div>
          <BottomNav />
        </div>
      </div>
    );
  }

  // Error view
  if (error) {
    return (
      <div className="app-viewport">
        <div className="app-shell" style={{ maxWidth: '520px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <header
            style={{
              height: '64px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span style={{ fontSize: '15.5px', fontWeight: 800, color: 'var(--color-text-main)' }}>RentManager Pro</span>
          </header>
          <div className="app-content" style={{ padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', flex: 1, textAlign: 'center' }}>
            <AlertTriangle size={40} color="#DC2626" />
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main)' }}>{error}</div>
            <button
              type="button"
              onClick={fetchAllData}
              style={{
                backgroundColor: 'var(--color-interactive)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={15} />
              <span>Retry</span>
            </button>
          </div>
          <BottomNav />
        </div>
      </div>
    );
  }

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
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  marginTop: '1px',
                }}
              >
                <span>🏢 {propertyName}</span>
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
                  backgroundColor: actionItems.length > 0 ? '#DC2626' : '#16A34A',
                  border: '2px solid #FFFFFF',
                }}
              />
            </div>

            <div
              className="user-avatar-circle"
              onClick={() => navigate('/more')}
              title={`Logged in as ${ownerName}`}
              style={{ cursor: 'pointer', backgroundColor: '#0F172A', color: '#FFFFFF', width: '34px', height: '34px', fontSize: '13px' }}
            >
              {ownerInitial ? ownerInitial : <User size={17} />}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="app-content" style={{ padding: '16px', gap: '16px', flex: 1, paddingBottom: '90px' }}>
          
          {/* Property Identity Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: 'var(--shadow-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-interactive)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 10px rgba(29, 78, 216, 0.25)',
                }}
              >
                <Building2 size={22} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                    {propertyName}
                  </span>
                  <CheckCircle2 size={16} color="var(--color-interactive)" fill="#DBEAFE" />
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  📍 {propertyAddress}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/setup/property')}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--color-interactive)',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              <span>SWITCH</span>
              <ArrowUpDown size={12} strokeWidth={2.5} />
            </button>
          </div>

          {/* ======================================================== */}
          {/* SECTION 1: ACTION REQUIRED — HIGHEST PRIORITY           */}
          {/* ======================================================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: actionItems.length > 0 ? '#DC2626' : '#16A34A',
                    display: 'inline-block',
                  }}
                />
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '0.04em' }}>
                  ACTION REQUIRED TODAY
                </span>
              </div>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: actionItems.length > 0 ? '#DC2626' : '#16A34A',
                  backgroundColor: actionItems.length > 0 ? '#FEE2E2' : '#DCFCE7',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                }}
              >
                {actionItems.length > 0 ? `${actionItems.length} Needs Attention` : 'All Clear'}
              </span>
            </div>

            {actionItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {actionItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: item.isOverdue ? '1.5px solid #FCA5A5' : '1px solid var(--color-border)',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      boxShadow: 'var(--shadow-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    {/* Item Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            backgroundColor:
                              item.type === 'METER_READING' ? '#FEF3C7' :
                              item.type === 'PAYMENT_DUE' ? '#FEE2E2' :
                              item.type === 'BILL_READY' ? '#DBEAFE' : '#F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color:
                              item.type === 'METER_READING' ? '#D97706' :
                              item.type === 'PAYMENT_DUE' ? '#DC2626' :
                              item.type === 'BILL_READY' ? '#1D4ED8' : '#475569',
                          }}
                        >
                          {item.type === 'METER_READING' && <Zap size={18} fill="#D97706" />}
                          {item.type === 'PAYMENT_DUE' && <Clock size={18} />}
                          {item.type === 'BILL_READY' && <FileText size={18} />}
                          {item.type === 'VACANT_ROOM' && <DoorClosed size={18} />}
                        </div>

                        <div>
                          <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '1px' }}>
                            {item.subtitle}
                          </div>
                        </div>
                      </div>

                      {item.amount != null && (
                        <div style={{ textAlign: 'right' }}>
                          <div className="tabular-nums" style={{ fontSize: '16px', fontWeight: 900, color: item.isOverdue ? '#DC2626' : 'var(--color-text-main)' }}>
                            ₹{item.amount.toLocaleString('en-IN')}
                          </div>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              color: item.isOverdue ? '#DC2626' : '#64748B',
                              backgroundColor: item.isOverdue ? '#FEE2E2' : '#F1F5F9',
                              padding: '1px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            {item.isOverdue ? 'OVERDUE' : (item.dueDate || 'PENDING')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Warning or explanation text if available */}
                    {item.warningText && (
                      <div
                        style={{
                          backgroundColor: '#FFFBEB',
                          border: '1px solid #FDE68A',
                          borderRadius: '8px',
                          padding: '8px 10px',
                          fontSize: '11.5px',
                          color: '#92400E',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Zap size={13} color="#D97706" />
                        <span>{item.warningText}</span>
                      </div>
                    )}

                    {/* Action buttons row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {item.type === 'PAYMENT_DUE' && (
                        <>
                          {item.mobile && (
                            <>
                              <a
                                href={`https://wa.me/91${item.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${item.title.split('•')[1]?.trim() || 'Tenant'}, this is a reminder regarding your rent & electricity dues of ₹${item.amount.toLocaleString('en-IN')}. Please pay at your earliest convenience.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '10px',
                                  backgroundColor: '#F0FDF4',
                                  border: '1px solid #BBF7D0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#16A34A',
                                  textDecoration: 'none',
                                }}
                                title="Send WhatsApp Reminder"
                              >
                                <MessageSquare size={17} />
                              </a>

                              <a
                                href={`tel:+91${item.mobile.replace(/\D/g, '')}`}
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '10px',
                                  backgroundColor: '#EFF6FF',
                                  border: '1px solid #DBEAFE',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--color-interactive)',
                                  textDecoration: 'none',
                                }}
                                title="Call Tenant"
                              >
                                <Phone size={17} />
                              </a>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => navigate(item.invoiceNumber ? `/payments/record?invoiceNumber=${encodeURIComponent(item.invoiceNumber)}` : '/payments/record')}
                            style={{
                              flex: 1,
                              height: '40px',
                              borderRadius: '10px',
                              backgroundColor: '#0F172A',
                              color: '#FFFFFF',
                              border: 'none',
                              fontSize: '13px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            <Check size={16} strokeWidth={2.5} />
                            <span>Record Payment</span>
                          </button>
                        </>
                      )}

                      {item.type === 'METER_READING' && (
                        <button
                          type="button"
                          onClick={() => navigate(item.tenantId ? `/bills/create?tenantId=${encodeURIComponent(item.tenantId)}` : '/bills/create')}
                          style={{
                            width: '100%',
                            height: '40px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--color-interactive)',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(29, 78, 216, 0.2)',
                          }}
                        >
                          <Zap size={15} fill="#FFFFFF" />
                          <span>Enter Units & Generate Bill</span>
                        </button>
                      )}

                      {item.type === 'BILL_READY' && (
                        <button
                          type="button"
                          onClick={() => navigate(item.tenantId ? `/bills/create?tenantId=${encodeURIComponent(item.tenantId)}` : '/bills/create')}
                          style={{
                            width: '100%',
                            height: '40px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--color-interactive)',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <FileText size={15} />
                          <span>Generate Monthly Bill</span>
                        </button>
                      )}

                      {item.type === 'VACANT_ROOM' && (
                        <button
                          type="button"
                          onClick={() => navigate(`/tenants/new?room=${encodeURIComponent(item.roomNumber)}`)}
                          style={{
                            width: '100%',
                            height: '40px',
                            borderRadius: '10px',
                            backgroundColor: '#0F172A',
                            color: '#FFFFFF',
                            border: 'none',
                            fontSize: '13px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <Plus size={16} strokeWidth={2.5} />
                          <span>Onboard Tenant for Room {item.roomNumber}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Compact Positive State when no actions are pending */
              <div
                style={{
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #BBF7D0',
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
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: '#DCFCE7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#16A34A',
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#166534' }}>
                      All Caught Up!
                    </div>
                    <div style={{ fontSize: '12px', color: '#15803D', marginTop: '1px' }}>
                      All units occupied, submeters recorded, and rent collections are on track.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => navigate('/bills')}
                    style={{
                      flex: 1,
                      height: '34px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #86EFAC',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#166534',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                    }}
                  >
                    <FileText size={13} />
                    <span>View Bills</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/rooms')}
                    style={{
                      flex: 1,
                      height: '34px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #86EFAC',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#166534',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                    }}
                  >
                    <DoorClosed size={13} />
                    <span>View Rooms</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/bills/create')}
                    style={{
                      flex: 1,
                      height: '34px',
                      backgroundColor: '#16A34A',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={13} strokeWidth={2.5} />
                    <span>New Bill</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* SECTION 2: FINANCIAL OVERVIEW (2x2 KPI GRID)             */}
          {/* ======================================================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '0.04em' }}>
                FINANCIAL OVERVIEW
              </span>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                Oct 2026 Cycle
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {/* Card 1: Collected */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '14px',
                  boxShadow: 'var(--shadow-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>Collected</span>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: '#EFF6FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-interactive)',
                    }}
                  >
                    <Banknote size={16} />
                  </div>
                </div>

                <div className="tabular-nums" style={{ fontSize: '23px', fontWeight: 900, color: 'var(--color-text-main)' }}>
                  ₹{financials.collected.toLocaleString('en-IN')}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#16A34A', fontWeight: 700 }}>
                  <TrendingUp size={13} strokeWidth={2.5} />
                  <span>{financials.collectionRate}% on track</span>
                </div>
              </div>

              {/* Card 2: Outstanding */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '14px',
                  boxShadow: 'var(--shadow-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>Outstanding</span>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: financials.outstanding > 0 ? '#FEE2E2' : '#F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: financials.outstanding > 0 ? '#DC2626' : '#64748B',
                    }}
                  >
                    <AlertTriangle size={15} />
                  </div>
                </div>

                <div className="tabular-nums" style={{ fontSize: '23px', fontWeight: 900, color: financials.outstanding > 0 ? '#DC2626' : 'var(--color-text-main)' }}>
                  ₹{financials.outstanding.toLocaleString('en-IN')}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11.5px',
                    color: financials.outstanding > 0 ? '#DC2626' : '#64748B',
                    fontWeight: 700,
                  }}
                >
                  {financials.outstanding > 0 ? (
                    <>
                      <Clock size={13} strokeWidth={2.5} />
                      <span>{financials.overdue > 0 ? `₹${financials.overdue.toLocaleString('en-IN')} overdue` : 'Pending dues'}</span>
                    </>
                  ) : (
                    <>
                      <Check size={13} strokeWidth={2.5} color="#16A34A" />
                      <span style={{ color: '#16A34A' }}>0 pending dues</span>
                    </>
                  )}
                </div>
              </div>

              {/* Card 3: Occupancy */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '14px',
                  boxShadow: 'var(--shadow-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>Occupancy</span>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: '#EFF6FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-interactive)',
                    }}
                  >
                    <DoorClosed size={16} />
                  </div>
                </div>

                <div className="tabular-nums" style={{ fontSize: '23px', fontWeight: 900, color: 'var(--color-text-main)' }}>
                  {financials.occupiedCount}{' '}
                  <span style={{ fontSize: '15px', color: '#64748B', fontWeight: 600 }}>/ {financials.totalUnits} Units</span>
                </div>

                {/* Progress bar */}
                <div
                  style={{
                    width: '100%',
                    height: '5px',
                    backgroundColor: '#EFF6FF',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    marginTop: '1px',
                  }}
                >
                  <div
                    style={{
                      width: `${financials.occupancyPercent}%`,
                      height: '100%',
                      backgroundColor: 'var(--color-interactive)',
                      borderRadius: '9999px',
                    }}
                  />
                </div>

                <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                  {financials.occupancyPercent}% occupied
                </div>
              </div>

              {/* Card 4: Rent Potential */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '14px',
                  boxShadow: 'var(--shadow-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>Rent Potential</span>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: '#F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748B',
                    }}
                  >
                    <Building2 size={16} />
                  </div>
                </div>

                <div className="tabular-nums" style={{ fontSize: '23px', fontWeight: 900, color: 'var(--color-text-main)' }}>
                  ₹{financials.potential.toLocaleString('en-IN')}
                </div>

                <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, marginTop: '4px' }}>
                  From {financials.occupiedCount} active {financials.occupiedCount === 1 ? 'room' : 'rooms'}
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 3: ROOM & TENANT OVERVIEW                         */}
          {/* ======================================================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '0.04em' }}>
                ROOM & TENANT OVERVIEW
              </span>

              <span
                onClick={() => navigate('/rooms')}
                style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-interactive)', cursor: 'pointer' }}
              >
                Manage Rooms ({unifiedRooms.length})
              </span>
            </div>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-subtle)',
              }}
            >
              {unifiedRooms.length > 0 ? (
                unifiedRooms.map((room, idx) => (
                  <div
                    key={room.roomNumber}
                    onClick={() => navigate(room.actionRoute)}
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: idx < unifiedRooms.length - 1 ? '1px solid var(--color-border)' : 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* Room Number Box */}
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: room.isVacant ? '#F1F5F9' : '#EFF6FF',
                          border: `1px solid ${room.isVacant ? '#E2E8F0' : '#DBEAFE'}`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 900, color: room.isVacant ? '#64748B' : 'var(--color-interactive)' }}>
                          {room.roomNumber}
                        </span>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#94A3B8' }}>
                          {room.floor ? room.floor.split(' ')[0] : 'Fl'}
                        </span>
                      </div>

                      {/* Tenant & Rent Info */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                            {room.tenantName}
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '1px' }}>
                          ₹{room.monthlyRent.toLocaleString('en-IN')}/mo
                          {room.subMeterReading != null && ` • ⚡ ${room.subMeterReading} units`}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge & Chevron */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          backgroundColor: room.badgeStyle.bg,
                          color: room.badgeStyle.text,
                          borderRadius: '9999px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.02em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {room.badgeLabel}
                      </span>
                      <ChevronRight size={15} color="#94A3B8" />
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                  No rooms added yet.
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 4: RECENT VERIFIED RECEIPTS                      */}
          {/* ======================================================== */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '0.04em' }}>
                RECENT VERIFIED RECEIPTS
              </span>

              <span
                onClick={() => navigate('/tenants')}
                style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-interactive)', cursor: 'pointer' }}
              >
                View Ledger
              </span>
            </div>

            {recentReceipts.length > 0 ? (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-subtle)',
                }}
              >
                {recentReceipts.map((receipt, idx) => (
                  <div
                    key={receipt.id}
                    onClick={() => navigate(`/payments/success?receiptNumber=${encodeURIComponent(receipt.receiptNumber)}`)}
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: idx < recentReceipts.length - 1 ? '1px solid var(--color-border)' : 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          backgroundColor: '#DCFCE7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#16A34A',
                          flexShrink: 0,
                        }}
                      >
                        <CheckCircle2 size={18} />
                      </div>

                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 800 }}>
                          {receipt.tenantName} {receipt.roomNumber ? `• Rm ${receipt.roomNumber}` : ''}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                          {receipt.receiptNumber} • {receipt.date} • {receipt.method}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div className="tabular-nums" style={{ fontSize: '14.5px', fontWeight: 800, color: '#16A34A' }}>
                        +₹{receipt.amount.toLocaleString('en-IN')}
                      </div>
                      <span
                        style={{
                          backgroundColor: '#DCFCE7',
                          color: '#166534',
                          borderRadius: '4px',
                          padding: '1px 6px',
                          fontSize: '10px',
                          fontWeight: 800,
                        }}
                      >
                        PAID
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '24px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow-subtle)',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: '#EFF6FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-interactive)',
                  }}
                >
                  <Receipt size={20} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                  No Payment Receipts Yet
                </div>
                <div style={{ fontSize: '12px', color: '#64748B', maxWidth: '280px', lineHeight: '1.4' }}>
                  Recorded rent and electricity receipts will appear here automatically once payments are logged.
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/payments/record')}
                  style={{
                    marginTop: '6px',
                    backgroundColor: '#0F172A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Record Payment
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  );
}
