import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  X,
  User,
  MoreVertical,
  Phone,
  MessageSquare,
  Zap,
  CreditCard,
  FileText,
  UserCheck,
  Pencil,
  AlertCircle,
  Building,
  CheckCircle2,
  AlertTriangle,
  History,
  Trash2,
  Plus,
  Save,
  Check,
  Calendar,
  LogOut,
  Table,
  BookOpen,
} from 'lucide-react';
import { usePropertySetup } from '../context/PropertySetupContext';
import { propertyAPI, tenantAPI } from '../services/api';

export default function RoomDetail() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { propertyName } = usePropertySetup();

  const [roomData, setRoomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBillingHistory, setShowBillingHistory] = useState(false);
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [historyFormRecords, setHistoryFormRecords] = useState([]);
  const [savingHistory, setSavingHistory] = useState(false);
  const [historyToast, setHistoryToast] = useState('');

  // Dropdown menu & Edit Room states
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showTenantMenu, setShowTenantMenu] = useState(false);
  const [historyViewMode, setHistoryViewMode] = useState('table');
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editMonthlyRent, setEditMonthlyRent] = useState('');
  const [editElectricityRate, setEditElectricityRate] = useState('');
  const [editFloor, setEditFloor] = useState('Ground Fl');
  const [editRoomType, setEditRoomType] = useState('Single');
  const [savingRoom, setSavingRoom] = useState(false);
  const [editRoomError, setEditRoomError] = useState('');
  const [showVacateModal, setShowVacateModal] = useState(false);
  const [vacating, setVacating] = useState(false);

  const handleTenantLeave = async () => {
    try {
      setVacating(true);
      const targetRoomId = roomData?.roomId || roomId || roomData?.roomNumber;
      if (targetRoomId) {
        await propertyAPI.vacateRoom(targetRoomId).catch(() => null);
      }
      if (roomData?.currentTenant?.id) {
        await tenantAPI.vacate(roomData.currentTenant.id).catch(() => null);
      }

      // Immediately set room to VACANT in UI
      setRoomData((prev) => ({
        ...prev,
        status: 'VACANT',
        currentTenant: null,
        tenantName: null,
        tenantMobile: null,
        agreementsCount: 0,
      }));

      setShowVacateModal(false);

      // Re-fetch room data to ensure sync with backend
      fetchRoom();
    } catch (err) {
      console.error('Failed to vacate tenant:', err);
      setRoomData((prev) => ({
        ...prev,
        status: 'VACANT',
        currentTenant: null,
        tenantName: null,
        tenantMobile: null,
        agreementsCount: 0,
      }));
      setShowVacateModal(false);
    } finally {
      setVacating(false);
    }
  };

  const openEditRoomModal = () => {
    if (!roomData) return;
    setEditRoomNumber(roomData.roomNumber || '');
    setEditMonthlyRent(roomData.monthlyRent !== undefined && roomData.monthlyRent !== null ? String(roomData.monthlyRent) : '');
    setEditElectricityRate(roomData.electricityRate !== undefined && roomData.electricityRate !== null ? String(roomData.electricityRate) : '');
    setEditFloor(roomData.floor || 'Ground Fl');
    setEditRoomType(roomData.type || roomData.roomType || 'Single');
    setEditRoomError('');
    setShowMoreMenu(false);
    setShowEditRoomModal(true);
  };

  const handleSaveRoom = async (e) => {
    e?.preventDefault();
    if (!editRoomNumber.trim()) {
      setEditRoomError('Room number is required.');
      return;
    }
    const rentNum = parseFloat(editMonthlyRent);
    if (isNaN(rentNum) || rentNum < 0) {
      setEditRoomError('Please enter a valid monthly rent.');
      return;
    }
    const rateNum = parseFloat(editElectricityRate);
    if (isNaN(rateNum) || rateNum < 0) {
      setEditRoomError('Please enter a valid electricity rate.');
      return;
    }

    try {
      setSavingRoom(true);
      setEditRoomError('');
      const payload = {
        roomNumber: editRoomNumber.trim(),
        monthlyRent: rentNum,
        electricityRate: rateNum,
        floor: editFloor.trim(),
        roomType: editRoomType.trim(),
        type: editRoomType.trim(),
      };
      await propertyAPI.updateRoom(roomData.roomNumber || roomId, payload);

      setRoomData((prev) => ({
        ...prev,
        roomNumber: editRoomNumber.trim(),
        monthlyRent: rentNum,
        electricityRate: rateNum,
        floor: editFloor.trim(),
        type: editRoomType.trim(),
        roomType: editRoomType.trim(),
      }));

      setShowEditRoomModal(false);
      showToast(`Room ${editRoomNumber.trim()} updated successfully!`);

      if (editRoomNumber.trim() !== String(roomId).trim()) {
        navigate(`/rooms/${encodeURIComponent(editRoomNumber.trim())}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to update room:', err);
      setEditRoomError(err.message || 'Failed to save room details.');
    } finally {
      setSavingRoom(false);
    }
  };

  const fetchRoom = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await propertyAPI.getRoomDetail(roomId);
      setRoomData(data);
    } catch (err) {
      console.error('Failed to load room detail:', err);
      if (err.status === 401) {
        navigate('/login');
        return;
      }
      setError(err.message || 'Room not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoom();
  }, [roomId]);

  const showToast = (msg) => {
    setHistoryToast(msg);
    setTimeout(() => setHistoryToast(''), 3000);
  };

  const openHistoryEditor = () => {
    const defaultRent = Number(roomData?.monthlyRent || 5000);
    const defaultRate = Number(roomData?.electricityRate || 9);

    const rawBills = roomData?.bills || [];
    // Filter out trailing unbilled diary notes with no payment and no date
    const sourceBills = rawBills.filter((bill, idx, arr) => {
      const isTrailing = idx === arr.length - 1;
      const hasReceived = bill.amountReceived !== null && bill.amountReceived !== undefined && Number(bill.amountReceived) > 0;
      const hasDate = bill.paymentDate && String(bill.paymentDate).trim() !== '' && bill.paymentDate !== 'Not recorded' && bill.paymentDate !== 'Historical Record';
      const isHistorical = Boolean(bill.invoiceNumber && String(bill.invoiceNumber).startsWith('HIST-'));
      if (isTrailing && isHistorical && !hasReceived && !hasDate) return false;
      return true;
    });

    if (sourceBills.length > 0) {
      const mapped = sourceBills.map((b, idx) => ({
        key: `month_${idx + 1}_${Date.now()}`,
        name: b.billingPeriod || b.name || `Month ${idx + 1}`,
        month: b.billingMonth || `M${idx + 1}`,
        prevReading: b.prevReading !== null && b.prevReading !== undefined ? b.prevReading : '',
        currReading: b.currReading !== null && b.currReading !== undefined ? b.currReading : '',
        monthlyRent: b.monthlyRent !== null && b.monthlyRent !== undefined ? b.monthlyRent : defaultRent,
        electricityRate: b.electricityRate !== null && b.electricityRate !== undefined ? b.electricityRate : defaultRate,
        amountReceived: b.amountReceived !== null && b.amountReceived !== undefined ? b.amountReceived : '',
        paymentDate: b.paymentDate && b.paymentDate !== 'Not recorded' ? b.paymentDate : '',
      }));
      setHistoryFormRecords(mapped);
    } else {
      setHistoryFormRecords([
        {
          key: 'jul',
          name: 'July 2026',
          month: 'JUL',
          prevReading: 1000,
          currReading: 1050,
          monthlyRent: defaultRent,
          electricityRate: defaultRate,
          amountReceived: 5450,
          paymentDate: '10 Jul 2026',
        },
        {
          key: 'aug',
          name: 'August 2026',
          month: 'AUG',
          prevReading: 1050,
          currReading: 1080,
          monthlyRent: defaultRent,
          electricityRate: defaultRate,
          amountReceived: 5270,
          paymentDate: '10 Aug 2026',
        },
        {
          key: 'sep',
          name: 'September 2026',
          month: 'SEP',
          prevReading: 1080,
          currReading: 1120,
          monthlyRent: defaultRent,
          electricityRate: defaultRate,
          amountReceived: 5360,
          paymentDate: '10 Sep 2026',
        },
      ]);
    }
    setIsEditingHistory(true);
  };

  const handleUpdateRecordField = (idx, field, val) => {
    setHistoryFormRecords((prev) => {
      const copy = [...prev];
      const target = { ...copy[idx], [field]: val };
      copy[idx] = target;

      if (field === 'currReading' && idx + 1 < copy.length) {
        copy[idx + 1] = {
          ...copy[idx + 1],
          prevReading: val,
        };
      }
      return copy;
    });
  };

  const handleAddMonth = () => {
    const defaultRent = Number(roomData?.monthlyRent || 5000);
    const defaultRate = Number(roomData?.electricityRate || 9);
    const lastRec = historyFormRecords[historyFormRecords.length - 1];
    const prevR = lastRec?.currReading || '';

    const nextIndex = historyFormRecords.length + 1;
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    let nextName = `Month ${nextIndex} 2026`;
    let nextShort = `M${nextIndex}`;
    if (lastRec?.name) {
      for (let i = 0; i < monthNames.length; i++) {
        if (lastRec.name.toLowerCase().includes(monthNames[i].toLowerCase())) {
          const nextM = monthNames[(i + 1) % 12];
          nextName = `${nextM} 2026`;
          nextShort = nextM.substring(0, 3).toUpperCase();
          break;
        }
      }
    }

    setHistoryFormRecords((prev) => [
      ...prev,
      {
        key: `month_${Date.now()}_${nextIndex}`,
        name: nextName,
        month: nextShort,
        prevReading: prevR,
        currReading: prevR !== '' ? Number(prevR) + 30 : '',
        monthlyRent: defaultRent,
        electricityRate: defaultRate,
        amountReceived: '',
        paymentDate: '',
      },
    ]);
  };

  const handleRemoveMonth = (idx) => {
    if (historyFormRecords.length <= 1) return;
    setHistoryFormRecords((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveHistory = async () => {
    try {
      setSavingHistory(true);
      let runningAdvance = 0;
      let runningDue = 0;

      const formatted = historyFormRecords.map((r, i) => {
        const prev = r.prevReading !== '' && r.prevReading !== null ? Number(r.prevReading) : null;
        const curr = r.currReading !== '' && r.currReading !== null ? Number(r.currReading) : null;
        const units = prev !== null && curr !== null ? Math.max(0, curr - prev) : 0;
        const rent = Number(r.monthlyRent || 0);
        const rate = Number(r.electricityRate || 0);
        const elec = Math.round(units * rate);
        const total = rent + elec;

        const prevBalDue = runningDue;
        const prevBalAdv = runningAdvance;
        const netPayable = Math.max(0, total + prevBalDue - prevBalAdv);

        const hasRec = r.amountReceived !== '' && r.amountReceived !== null && r.amountReceived !== undefined;
        const received = hasRec ? Number(r.amountReceived) : null;

        let status = 'SETTLED';
        let closingDue = 0;
        let closingAdvance = 0;

        if (received !== null) {
          const diff = received - (total + prevBalDue - prevBalAdv);
          if (diff > 0) {
            status = 'ADVANCE';
            closingAdvance = diff;
            runningAdvance = diff;
            runningDue = 0;
          } else if (diff < 0) {
            status = 'DUE';
            closingDue = Math.abs(diff);
            runningDue = Math.abs(diff);
            runningAdvance = 0;
          } else {
            status = 'SETTLED';
            runningAdvance = 0;
            runningDue = 0;
          }
        } else {
          // No payment received yet for this month!
          const dueAmt = Math.max(0, total + prevBalDue - prevBalAdv);
          if (dueAmt > 0) {
            status = 'DUE';
            closingDue = dueAmt;
            runningDue = dueAmt;
            runningAdvance = 0;
          } else {
            status = 'SETTLED';
            runningAdvance = 0;
            runningDue = 0;
          }
        }

        return {
          name: r.name || `Month ${i + 1}`,
          month: r.month || 'HIST',
          monthlyRent: rent,
          electricityRate: rate,
          prevReading: prev,
          currReading: curr,
          unitsConsumed: units,
          electricityAmount: elec,
          totalBill: total,
          amountPayable: netPayable,
          amountReceived: received,
          paymentDate: r.paymentDate || null,
          closingDue,
          closingAdvance,
          balance: closingDue > 0 ? -closingDue : closingAdvance,
          status,
        };
      });

      await propertyAPI.saveRoomHistory(roomId, formatted);
      await fetchRoom();
      setIsEditingHistory(false);
      showToast('Billing history saved successfully!');
    } catch (err) {
      console.error('Failed to save room history:', err);
      alert(err.message || 'Failed to save billing history');
    } finally {
      setSavingHistory(false);
    }
  };

  if (loading) {
    return (
      <div className="app-viewport">
        <div className="app-shell" style={{ maxWidth: '520px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <header
            style={{
              height: '60px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <button
              type="button"
              className="icon-btn-header"
              onClick={() => navigate('/rooms')}
              aria-label="Back to Rooms"
            >
              <ArrowLeft size={20} strokeWidth={2.2} />
            </button>
            <h1 style={{ fontSize: '17px', fontWeight: 700, marginLeft: '10px' }}>Tenant Detail</h1>
          </header>
          <div className="app-content" style={{ padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', flex: 1 }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #E2E8F0', borderTopColor: 'var(--color-interactive)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '13.5px', color: '#64748B', fontWeight: 600 }}>Loading room details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !roomData) {
    return (
      <div className="app-viewport">
        <div className="app-shell" style={{ maxWidth: '520px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <header
            style={{
              height: '60px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <button
              type="button"
              className="icon-btn-header"
              onClick={() => navigate('/rooms')}
              aria-label="Back to Rooms"
            >
              <ArrowLeft size={20} strokeWidth={2.2} />
            </button>
            <h1 style={{ fontSize: '17px', fontWeight: 700, marginLeft: '10px' }}>Tenant Detail</h1>
          </header>
          <div className="app-content" style={{ padding: '40px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', flex: 1, textAlign: 'center' }}>
            <AlertTriangle size={40} color="#DC2626" />
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-text-main)' }}>{error || 'Room not found'}</div>
            <button
              type="button"
              onClick={() => navigate('/rooms')}
              style={{
                backgroundColor: 'var(--color-interactive)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Back to Rooms
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isVacant = String(roomData.status || '').toUpperCase() === 'VACANT';

  // Sequential accounting ledger for tenant history records
  const billsWithLedger = (() => {
    if (!roomData?.bills || roomData.bills.length === 0) return [];

    // Filter out trailing unbilled diary notes that have no payment received and no payment date
    // These belong to upcoming cycles (to be billed in /bills), not completed history!
    const validBills = roomData.bills.filter((bill, idx, arr) => {
      const isTrailing = idx === arr.length - 1;
      const hasReceived = bill.amountReceived !== null && bill.amountReceived !== undefined && Number(bill.amountReceived) > 0;
      const hasDate = bill.paymentDate && String(bill.paymentDate).trim() !== '' && bill.paymentDate !== 'Not recorded' && bill.paymentDate !== 'Historical Record';
      const isHistorical = Boolean(bill.invoiceNumber && String(bill.invoiceNumber).startsWith('HIST-'));

      if (isTrailing && isHistorical && !hasReceived && !hasDate) {
        return false;
      }
      return true;
    });

    if (validBills.length === 0) return [];

    const lastIdx = validBills.length - 1;

    return validBills.map((bill, idx) => {
      const isLastRecord = idx === lastIdx;
      const isDiaryRecord = Boolean(
        bill.isDiaryRecord ||
        (bill.invoiceNumber && String(bill.invoiceNumber).startsWith('HIST-')) ||
        bill.source === 'DIARY' ||
        (!bill.invoiceNumber && bill.paymentDate && bill.paymentDate !== 'Not recorded')
      );

      const consumed = bill.unitsConsumed !== null && bill.unitsConsumed !== undefined
        ? Number(bill.unitsConsumed)
        : (bill.currReading && bill.prevReading ? Math.max(0, Number(bill.currReading) - Number(bill.prevReading)) : 0);

      const rent = Number(bill.monthlyRent || 0);
      const rate = Number(bill.electricityRate || 0);
      const electricityAmount = bill.electricityAmount !== null && bill.electricityAmount !== undefined
        ? Number(bill.electricityAmount)
        : Math.round(consumed * rate);

      const totalBill = bill.totalBill !== null && bill.totalBill !== undefined
        ? Number(bill.totalBill)
        : (rent + electricityAmount);

      const hasReceived = bill.amountReceived !== null && bill.amountReceived !== undefined && bill.amountReceived !== '';
      const amountReceived = hasReceived ? Number(bill.amountReceived) : null;

      const paymentDate = bill.paymentDate && String(bill.paymentDate).trim() !== ''
        ? String(bill.paymentDate).trim()
        : 'Not recorded';

      // Domain Rule (Indian Landlord Diary Accounting):
      // Past differences (e.g. 19 Ext, 51 Ext, 57 बाकी, 66 Ext) were settled in cash in subsequent payments.
      // Therefore, DO NOT write intermediate advances or dues on past months!
      // All earlier diary months are marked "Diary Settled".
      // ONLY the chronologically LAST completed record carries the net remaining balance (e.g. 4 बाकी -> ₹4 Due).
      let closingText = isDiaryRecord ? 'Diary Settled' : '₹0 Settled';
      let closingStatus = isDiaryRecord ? 'DIARY_SETTLED' : 'SETTLED';
      let closingColor = '#166534';
      let closingBg = '#DCFCE7';
      let prevBalanceText = 'None';
      let amountPayable = totalBill;

      if (isLastRecord) {
        // Last completed month: preserve the actual net balance remaining
        if (bill.closingDue !== null && bill.closingDue !== undefined && Number(bill.closingDue) > 0) {
          const dueVal = Number(bill.closingDue);
          closingText = `₹${dueVal.toLocaleString('en-IN')} Due`;
          closingStatus = 'DUE';
          closingColor = '#991B1B';
          closingBg = '#FEE2E2';
        } else if (bill.closingAdvance !== null && bill.closingAdvance !== undefined && Number(bill.closingAdvance) > 0) {
          const advVal = Number(bill.closingAdvance);
          closingText = `₹${advVal.toLocaleString('en-IN')} Advance`;
          closingStatus = 'ADVANCE';
          closingColor = '#1D4ED8';
          closingBg = '#EFF6FF';
        } else if (bill.balance !== null && bill.balance !== undefined && Number(bill.balance) !== 0) {
          const bal = Number(bill.balance);
          if (bal < 0) {
            closingText = `₹${Math.abs(bal).toLocaleString('en-IN')} Due`;
            closingStatus = 'DUE';
            closingColor = '#991B1B';
            closingBg = '#FEE2E2';
          } else {
            closingText = `₹${bal.toLocaleString('en-IN')} Advance`;
            closingStatus = 'ADVANCE';
            closingColor = '#1D4ED8';
            closingBg = '#EFF6FF';
          }
        } else if (isDiaryRecord) {
          // In physical diaries, if no closing due/advance is noted, the account is settled
          closingText = 'Diary Settled';
          closingStatus = 'DIARY_SETTLED';
          closingColor = '#166534';
          closingBg = '#DCFCE7';
        } else if (hasReceived) {
          const diff = Number(amountReceived) - totalBill;
          if (diff < 0) {
            const dueVal = Math.abs(diff);
            closingText = `₹${dueVal.toLocaleString('en-IN')} Due`;
            closingStatus = 'DUE';
            closingColor = '#991B1B';
            closingBg = '#FEE2E2';
          } else if (diff > 0) {
            closingText = `₹${diff.toLocaleString('en-IN')} Advance`;
            closingStatus = 'ADVANCE';
            closingColor = '#1D4ED8';
            closingBg = '#EFF6FF';
          } else {
            closingText = '₹0 Settled';
            closingStatus = 'SETTLED';
            closingColor = '#166534';
            closingBg = '#DCFCE7';
          }
        }
      } else {
        // All earlier months: Settled!
        closingText = isDiaryRecord ? 'Diary Settled' : '₹0 Settled';
        closingStatus = isDiaryRecord ? 'DIARY_SETTLED' : 'SETTLED';
        closingColor = '#166534';
        closingBg = '#DCFCE7';
      }

      return {
        ...bill,
        isDiaryRecord,
        consumed,
        rent,
        rate,
        electricityAmount,
        totalBill,
        prevBalanceText,
        amountPayable,
        amountReceived,
        hasReceived,
        paymentDate,
        closingText,
        closingStatus,
        closingColor,
        closingBg,
      };
    });
  })();

  // Dynamic meter readings derived from room data and saved historical records
  const initialReading = roomData?.submeter?.initialReading !== undefined && roomData?.submeter?.initialReading !== null
    ? Number(roomData.submeter.initialReading)
    : (billsWithLedger.length > 0 && billsWithLedger[0].prevReading !== null ? Number(billsWithLedger[0].prevReading) : null);

  const currentReading = roomData?.submeter?.currentReading !== undefined && roomData?.submeter?.currentReading !== null
    ? Number(roomData.submeter.currentReading)
    : (billsWithLedger.length > 0 && billsWithLedger[billsWithLedger.length - 1].currReading !== null ? Number(billsWithLedger[billsWithLedger.length - 1].currReading) : null);

  const unitsBilled = roomData?.submeter?.unitsBilled !== undefined && roomData?.submeter?.unitsBilled !== null && Number(roomData.submeter.unitsBilled) > 0
    ? Math.round(Number(roomData.submeter.unitsBilled))
    : (currentReading !== null && initialReading !== null ? Math.round(currentReading - initialReading) : 0);

  const renderExcelLedgerTable = (records = []) => {
    if (!records || records.length === 0) {
      return (
        <div
          style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            padding: '24px 16px',
            textAlign: 'center',
            border: '1px dashed #CBD5E1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-interactive)',
            }}
          >
            <Table size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-main)' }}>
              No historical records found
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
              Add previous rent, meter readings and payment records.
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowBillingHistory(true);
              openHistoryEditor();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--color-interactive)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            <Plus size={14} />
            <span>Add Records</span>
          </button>
        </div>
      );
    }

    const totalUnits = records.reduce((sum, b) => sum + (Number(b.consumed) || 0), 0);
    const totalRent = records.reduce((sum, b) => sum + (Number(b.rent) || 0), 0);
    const totalElec = records.reduce((sum, b) => sum + (Number(b.electricityAmount) || 0), 0);
    const totalBilled = records.reduce((sum, b) => sum + (Number(b.totalBill) || 0), 0);
    const totalPaid = records.reduce((sum, b) => sum + (Number(b.amountReceived) || 0), 0);
    const lastRecord = records[records.length - 1];

    const hasDiaryRecords = records.some((b) => b.isDiaryRecord);
    const hasAppRecords = records.some((b) => !b.isDiaryRecord);

    return (
      <div
        style={{
          width: '100%',
          overflowX: 'auto',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          backgroundColor: '#FFFFFF',
          WebkitOverflowScrolling: 'touch',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11.5px',
            textAlign: 'left',
            minWidth: '520px',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
              <th
                style={{
                  padding: '9px 12px',
                  fontWeight: 800,
                  color: '#475569',
                  fontSize: '10.5px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  position: 'sticky',
                  left: 0,
                  backgroundColor: '#F8FAFC',
                  zIndex: 2,
                  boxShadow: '2px 0 4px rgba(0,0,0,0.03)',
                  borderRight: '1px solid #E2E8F0',
                  whiteSpace: 'nowrap',
                }}
              >
                Month / Period
              </th>
              <th
                style={{
                  padding: '9px 8px',
                  fontWeight: 800,
                  color: '#475569',
                  fontSize: '10.5px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                }}
              >
                Meter (Units)
              </th>
              <th
                style={{
                  padding: '9px 10px',
                  fontWeight: 800,
                  color: '#475569',
                  fontSize: '10.5px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  textAlign: 'right',
                }}
              >
                Rent
              </th>
              <th
                style={{
                  padding: '9px 10px',
                  fontWeight: 800,
                  color: '#475569',
                  fontSize: '10.5px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  textAlign: 'right',
                }}
              >
                Elec
              </th>
              <th
                style={{
                  padding: '9px 10px',
                  fontWeight: 800,
                  color: '#475569',
                  fontSize: '10.5px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  textAlign: 'right',
                }}
              >
                Total
              </th>
              <th
                style={{
                  padding: '9px 10px',
                  fontWeight: 800,
                  color: '#475569',
                  fontSize: '10.5px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  textAlign: 'right',
                }}
              >
                Paid
              </th>
              <th
                style={{
                  padding: '9px 12px',
                  fontWeight: 800,
                  color: '#475569',
                  fontSize: '10.5px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                }}
              >
                Balance / Status
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((bill, idx) => {
              const isDiary = Boolean(bill.isDiaryRecord);
              const isEven = idx % 2 === 0;
              const rowBg = isEven ? '#FFFFFF' : '#FAFCFF';
              const rowBorder = '1px solid #E2E8F0';
              const stickyBorder = '1px solid #E2E8F0';

              const isFirstNormalRecord = !isDiary && idx > 0 && records[idx - 1]?.isDiaryRecord;

              return (
                <React.Fragment key={bill.id || idx}>
                  {/* Subtle Section Divider when transition from Diary to Normal Live App Record happens */}
                  {isFirstNormalRecord && (
                    <tr style={{ backgroundColor: '#EFF6FF', borderTop: '2px solid #BFDBFE', borderBottom: '1px solid #BFDBFE' }}>
                      <td
                        colSpan={7}
                        style={{
                          padding: '6px 12px',
                          fontSize: '10.5px',
                          fontWeight: 800,
                          color: '#1E40AF',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        ⚡ Live App Records & Verified Digital Receipts
                      </td>
                    </tr>
                  )}

                  <tr
                    style={{
                      backgroundColor: rowBg,
                      borderBottom: rowBorder,
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    {/* Sticky Month Name */}
                    <td
                      style={{
                        padding: '8px 12px',
                        fontWeight: 700,
                        color: 'var(--color-text-main)',
                        position: 'sticky',
                        left: 0,
                        backgroundColor: rowBg,
                        zIndex: 1,
                        boxShadow: '2px 0 4px rgba(0,0,0,0.03)',
                        borderRight: stickyBorder,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ fontSize: '12px' }}>{bill.billingPeriod || bill.name || `Month ${idx + 1}`}</span>
                          {isDiary && (
                            <span
                              style={{
                                fontSize: '8.5px',
                                fontWeight: 800,
                                color: '#166534',
                                backgroundColor: '#DCFCE7',
                                padding: '1px 4px',
                                borderRadius: '4px',
                                border: '1px solid #BBF7D0',
                                letterSpacing: '0.02em',
                              }}
                            >
                              DIARY
                            </span>
                          )}
                        </div>
                        {bill.paymentDate && bill.paymentDate !== 'Not recorded' && (
                          <span style={{ fontSize: '9.5px', color: '#94A3B8', fontWeight: 500 }}>
                            Paid: {bill.paymentDate}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Meter Consumed */}
                    <td style={{ padding: '8px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '12px' }}>
                        {Math.round(bill.consumed || 0)} kWh
                      </span>
                      {bill.prevReading !== null && bill.currReading !== null && (
                        <span style={{ fontSize: '9.5px', color: '#94A3B8', display: 'block', marginTop: '1px' }}>
                          {Math.round(bill.prevReading)} → {Math.round(bill.currReading)}
                        </span>
                      )}
                    </td>

                    {/* Rent */}
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }} className="tabular-nums">
                      ₹{Number(bill.rent || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Electricity */}
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }} className="tabular-nums">
                      ₹{Number(bill.electricityAmount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Total Bill */}
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: 'var(--color-interactive)', whiteSpace: 'nowrap' }} className="tabular-nums">
                      ₹{Number(bill.totalBill || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Paid Amount */}
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }} className="tabular-nums">
                      {bill.amountReceived !== null && bill.amountReceived !== undefined ? (
                        <span style={{ color: '#166534', fontWeight: 700 }}>
                          ₹{Number(bill.amountReceived).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>-</span>
                      )}
                    </td>

                    {/* Closing Status Badge */}
                    <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          backgroundColor: bill.closingBg,
                          color: bill.closingColor,
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '10.5px',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          border: isDiary && bill.closingStatus === 'DIARY_SETTLED' ? '1px solid #BBF7D0' : 'none',
                        }}
                      >
                        {isDiary && bill.closingStatus === 'DIARY_SETTLED' && <Check size={11} strokeWidth={3} />}
                        <span>{bill.closingText}</span>
                      </span>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#F1F5F9', borderTop: '2px solid #CBD5E1', fontWeight: 800 }}>
              <td
                style={{
                  padding: '9px 12px',
                  color: 'var(--color-text-main)',
                  position: 'sticky',
                  left: 0,
                  backgroundColor: '#F1F5F9',
                  zIndex: 1,
                  boxShadow: '2px 0 4px rgba(0,0,0,0.03)',
                  borderRight: '1px solid #CBD5E1',
                  whiteSpace: 'nowrap',
                  fontSize: '11px',
                  letterSpacing: '0.02em',
                }}
              >
                TOTAL ({records.length} M)
              </td>
              <td style={{ padding: '9px 8px', textAlign: 'center', color: '#0F172A', whiteSpace: 'nowrap', fontSize: '11.5px' }}>
                {Math.round(totalUnits)} kWh
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'right', color: '#0F172A', whiteSpace: 'nowrap', fontSize: '11.5px' }} className="tabular-nums">
                ₹{totalRent.toLocaleString('en-IN')}
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'right', color: '#0F172A', whiteSpace: 'nowrap', fontSize: '11.5px' }} className="tabular-nums">
                ₹{totalElec.toLocaleString('en-IN')}
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--color-interactive)', whiteSpace: 'nowrap', fontSize: '12px' }} className="tabular-nums">
                ₹{totalBilled.toLocaleString('en-IN')}
              </td>
              <td style={{ padding: '9px 10px', textAlign: 'right', color: '#166534', whiteSpace: 'nowrap', fontSize: '12px' }} className="tabular-nums">
                ₹{totalPaid.toLocaleString('en-IN')}
              </td>
              <td style={{ padding: '9px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                {lastRecord ? (
                  <span
                    style={{
                      backgroundColor: lastRecord.closingBg,
                      color: lastRecord.closingColor,
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '10.5px',
                      fontWeight: 800,
                    }}
                  >
                    {lastRecord.closingText}
                  </span>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  return (
    <div className="app-viewport">
      {historyToast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            padding: '10px 18px',
            borderRadius: '24px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={16} color="#4ADE80" />
          <span>{historyToast}</span>
        </div>
      )}
      <div className="app-shell" style={{ maxWidth: '520px', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Top Header */}
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
              onClick={() => navigate('/rooms')}
              aria-label="Back to Rooms"
            >
              <ArrowLeft size={20} strokeWidth={2.2} />
            </button>
            <h1 style={{ fontSize: '17px', fontWeight: 700 }}>Tenant Detail</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="icon-btn-header"
              onClick={() => navigate('/rooms')}
              aria-label="Close"
            >
              <X size={20} strokeWidth={2.2} />
            </button>
            <div className="user-avatar-circle">
              <User size={18} />
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="app-content" style={{ padding: '16px', gap: '14px', flex: 1, paddingBottom: '30px' }}>
          {/* Sub-Header Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                borderRadius: '9999px',
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.03em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: isVacant ? '#94A3B8' : '#22C55E' }} />
              Room {roomData.roomNumber} ({roomData.status})
            </span>
          </div>

          {/* Current Tenant (or Vacant Onboarding) */}
          {!isVacant && roomData.currentTenant ? (
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
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '0.03em' }}>
                  Current Tenant
                </span>

                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowTenantMenu((prev) => !prev)}
                    style={{
                      background: showTenantMenu ? '#F1F5F9' : 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: '6px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Tenant Options"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {showTenantMenu && (
                    <>
                      <div
                        style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                        onClick={() => setShowTenantMenu(false)}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          marginTop: '6px',
                          backgroundColor: '#FFFFFF',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                          border: '1px solid #E2E8F0',
                          minWidth: '200px',
                          zIndex: 50,
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setShowTenantMenu(false);
                            const tId = roomData.currentTenant?.id || roomData.currentTenant?.tenantId || '';
                            navigate(`/tenants/edit/${tId}?room=${encodeURIComponent(roomData.roomNumber)}`);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#1E293B',
                            background: 'none',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            width: '100%',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <Pencil size={15} color="#3B82F6" />
                          <span>Edit Tenant Details</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
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
                    fontSize: '14px',
                    fontWeight: 800,
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {roomData.currentTenant.initials || 'TN'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name and Icon Actions Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        color: 'var(--color-text-main)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {roomData.tenantName || roomData.currentTenant.fullName}
                    </span>

                    {/* Compact Icon-Only Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <a
                        href={`tel:${roomData.tenantMobile?.replace(/\s+/g, '')}`}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: '#F1F5F9',
                          color: '#0F172A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none',
                        }}
                        aria-label="Call Tenant"
                      >
                        <Phone size={15} />
                      </a>
                      <a
                        href={`https://wa.me/${roomData.tenantMobile?.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: '#F1F5F9',
                          color: '#0F172A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none',
                        }}
                        aria-label="WhatsApp Tenant"
                      >
                        <MessageSquare size={15} />
                      </a>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>
                    {roomData.tenantMobile || roomData.currentTenant.mobile}
                  </div>

                  {/* Joined Date as simple normal text */}
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
                    Joined: {roomData.currentTenant.joinedDate || 'Recently'}
                  </div>

                  {roomData.currentTenant?.emergencyContact && (
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      Emergency: {roomData.currentTenant.emergencyContact}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : isVacant ? (
            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #DBEAFE',
                borderRadius: '16px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                Vacant Room Ready
              </div>
              <p style={{ fontSize: '12.5px', color: '#64748B' }}>
                This room is ready for immediate onboarding with standard rent of ₹{Number(roomData.monthlyRent).toLocaleString('en-IN')}/mo.
              </p>
              <button
                type="button"
                onClick={() => navigate(`/tenants/new?room=${roomData.roomNumber}`)}
                className="btn btn-primary"
                style={{ height: '42px', fontSize: '13px', fontWeight: 700, marginTop: '4px' }}
              >
                + Onboard Tenant to Room {roomData.roomNumber}
              </button>
            </div>
          ) : null}

          {/* Room Information Card: Room Identification & Rates */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--color-text-main)' }}>
                  Room {roomData.roomNumber}
                </span>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  {roomData.floor} • 1 {roomData.type}
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowMoreMenu((prev) => !prev)}
                  style={{
                    background: showMoreMenu ? '#F1F5F9' : 'none',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Room Options"
                >
                  <MoreVertical size={18} />
                </button>

                {showMoreMenu && (
                  <>
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                      onClick={() => setShowMoreMenu(false)}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: '100%',
                        marginTop: '6px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #E2E8F0',
                        minWidth: '200px',
                        zIndex: 50,
                        padding: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={openEditRoomModal}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#1E293B',
                          background: 'none',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Pencil size={15} color="#3B82F6" />
                        <span>Edit Room Details</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowBillingHistory(true);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#1E293B',
                          background: 'none',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          width: '100%',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <History size={15} color="#6366F1" />
                        <span>Billing History</span>
                      </button>

                      {isVacant ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreMenu(false);
                            navigate(`/tenants/new?room=${encodeURIComponent(roomData.roomNumber)}`);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#1E293B',
                            background: 'none',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            width: '100%',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <Plus size={15} color="#10B981" />
                          <span>Onboard Tenant</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setShowMoreMenu(false);
                            navigate('/bills');
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#1E293B',
                            background: 'none',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            width: '100%',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <FileText size={15} color="#10B981" />
                          <span>Generate Bill</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Rates Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  border: '1px solid #DBEAFE',
                }}
              >
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Monthly Rent</div>
                <div className="tabular-nums" style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px' }}>
                  ₹{Number(roomData.monthlyRent || 0).toLocaleString('en-IN')}{' '}
                  <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>/mo</span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  border: '1px solid #DBEAFE',
                }}
              >
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Electricity Rate</div>
                <div className="tabular-nums" style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px' }}>
                  ₹{Number(roomData.electricityRate || 0).toFixed(2)}{' '}
                  <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>/unit</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Due Banner (Red Card) - only for occupied with dues */}
          {!isVacant && roomData.dueStatus && (
            <div
              style={{
                backgroundColor: '#FEE2E2',
                border: '1px solid #FECACA',
                borderRadius: '16px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                  }}
                >
                  ● {roomData.dueStatus}
                </span>

                <span style={{ fontSize: '11px', fontWeight: 700, color: '#991B1B' }}>
                  {roomData.dueTitle || 'Payment Due'}
                </span>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#991B1B', fontWeight: 600 }}>Amount Pending</div>
                <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 900, color: '#991B1B', marginTop: '1px' }}>
                  ₹{Number(roomData.amountPending || 0).toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ fontSize: '11px', color: '#7F1D1D', fontWeight: 600 }}>
                {roomData.breakdown || 'Rent + Electricity'}
              </div>
            </div>
          )}

          {/* Card 4: Submeter & Utility */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              boxShadow: 'var(--shadow-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '0.03em' }}>
                Submeter & Utility
              </div>
              {!isVacant && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBillingHistory(true);
                      setIsEditingHistory(false);
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--color-interactive)',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: 0,
                    }}
                  >
                    <History size={13} />
                    <span>View History</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBillingHistory(true);
                      openHistoryEditor();
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--color-interactive)',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: 0,
                    }}
                  >
                    <Pencil size={12} />
                    <span>Edit</span>
                  </button>
                </div>
              )}
            </div>

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #DBEAFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-interactive)',
                  }}
                >
                  <Zap size={16} />
                </div>

                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800 }}>
                    Submeter {roomData.submeter?.id || `#E-${roomData.roomNumber}`}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                    {initialReading !== null && currentReading !== null
                      ? `Initial: ${Math.round(initialReading)} • Current: ${Math.round(currentReading)}`
                      : (roomData.submeter?.readingDetails || 'Initial: 0 • Current: 0')}
                  </div>
                </div>
              </div>

              <span
                style={{
                  backgroundColor: '#DCFCE7',
                  color: '#166534',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 800,
                }}
              >
                {unitsBilled} Units Billed
              </span>
            </div>
          </div>

          {/* History Ledger (Excel Form) on Tenant Detail */}
          {!isVacant && (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #DBEAFE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-interactive)',
                    }}
                  >
                    <Table size={16} />
                  </div>
                  <div>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                      Billing & Payment History
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        {billsWithLedger.length > 0
                          ? `${billsWithLedger.length} Month${billsWithLedger.length > 1 ? 's' : ''} Record • Compact Excel View`
                          : 'No historical records added yet'}
                      </span>
                      {billsWithLedger.some((b) => b.isDiaryRecord) && (
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 800,
                            color: '#166534',
                            backgroundColor: '#DCFCE7',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            border: '1px solid #BBF7D0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <BookOpen size={10} />
                          <span>Diary Import</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBillingHistory(true);
                      openHistoryEditor();
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      backgroundColor: '#EFF6FF',
                      border: '1px solid #DBEAFE',
                      color: 'var(--color-interactive)',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="Edit Records"
                  >
                    <Pencil size={11} />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBillingHistory(true);
                      setIsEditingHistory(false);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      backgroundColor: '#F1F5F9',
                      border: '1px solid var(--color-border)',
                      color: '#475569',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    title="Full View"
                  >
                    <History size={11} />
                    <span>View History</span>
                  </button>
                </div>
              </div>

              {renderExcelLedgerTable(billsWithLedger)}
            </div>
          )}

          {/* Action Buttons Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
            <button
              type="button"
              onClick={() => navigate('/tenants')}
              style={{
                width: '100%',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-main)',
                fontSize: '13.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-subtle)',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            >
              <UserCheck size={16} />
              <span>View Profile</span>
            </button>

            {!isVacant && roomData.currentTenant && (
              <button
                type="button"
                onClick={() => setShowVacateModal(true)}
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '14.5px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.28)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#B91C1C';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#DC2626';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <LogOut size={18} strokeWidth={2.4} />
                <span>Tenant Leave</span>
              </button>
            )}
          </div>
        </div>

        {/* EDIT ROOM DETAILS MODAL */}
        {showEditRoomModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '440px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '18px 20px',
                  borderBottom: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                    Edit Room {roomData?.roomNumber}
                  </h3>
                  <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#64748B' }}>
                    Update monthly rent, electricity tariff & room info
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditRoomModal(false)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px',
                    color: '#64748B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveRoom} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {editRoomError && (
                  <div
                    style={{
                      padding: '10px 14px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      borderRadius: '10px',
                      color: '#DC2626',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{editRoomError}</span>
                  </div>
                )}

                {/* Room Number */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Room Number / Identifier
                  </label>
                  <input
                    type="text"
                    value={editRoomNumber}
                    onChange={(e) => setEditRoomNumber(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#0F172A',
                      outline: 'none',
                      backgroundColor: '#F8FAFC',
                    }}
                    placeholder="e.g. 105"
                  />
                </div>

                {/* Rent & Electricity Rate Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Monthly Rent (₹)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', fontWeight: 700, fontSize: '14px' }}>
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editMonthlyRent}
                        onChange={(e) => setEditMonthlyRent(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '10px 12px 10px 28px',
                          borderRadius: '10px',
                          border: '1px solid #CBD5E1',
                          fontSize: '15px',
                          fontWeight: 700,
                          color: '#0F172A',
                          outline: 'none',
                        }}
                        placeholder="1700"
                      />
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>Base monthly rent</span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Electricity Rate
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', fontWeight: 700, fontSize: '14px' }}>
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={editElectricityRate}
                        onChange={(e) => setEditElectricityRate(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '10px 12px 10px 28px',
                          borderRadius: '10px',
                          border: '1px solid #CBD5E1',
                          fontSize: '15px',
                          fontWeight: 700,
                          color: '#0F172A',
                          outline: 'none',
                        }}
                        placeholder="9.00"
                      />
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'block' }}>₹ per kWh unit</span>
                  </div>
                </div>

                {/* Floor & Room Type Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Floor
                    </label>
                    <select
                      value={editFloor}
                      onChange={(e) => setEditFloor(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '14px',
                        color: '#0F172A',
                        outline: 'none',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <option value="Ground Fl">Ground Fl</option>
                      <option value="1st Floor">1st Floor</option>
                      <option value="2nd Floor">2nd Floor</option>
                      <option value="3rd Floor">3rd Floor</option>
                      <option value="4th Floor">4th Floor</option>
                      <option value="5th Floor">5th Floor</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Room Type
                    </label>
                    <select
                      value={editRoomType}
                      onChange={(e) => setEditRoomType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '14px',
                        color: '#0F172A',
                        outline: 'none',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <option value="Single">Single</option>
                      <option value="Double">Double</option>
                      <option value="1RK">1RK</option>
                      <option value="1BHK">1BHK</option>
                      <option value="2BHK">2BHK</option>
                      <option value="Shared">Shared</option>
                    </select>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' }}>
                  <button
                    type="button"
                    onClick={() => setShowEditRoomModal(false)}
                    disabled={savingRoom}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                      color: '#475569',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: savingRoom ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingRoom}
                    style={{
                      flex: 2,
                      padding: '12px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#0F172A',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: savingRoom ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {savingRoom ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Save Room Details</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* BILLING HISTORY MODAL / VIEW */}
        {showBillingHistory && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(3px)',
              zIndex: 100,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-end',
            }}
            onClick={() => setShowBillingHistory(false)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '520px',
                maxHeight: '90vh',
                backgroundColor: '#F8FAFC',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '16px 20px',
                  backgroundColor: '#FFFFFF',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingHistory) {
                        setIsEditingHistory(false);
                      } else {
                        setShowBillingHistory(false);
                      }
                    }}
                    className="icon-btn-header"
                    style={{ border: 'none', background: '#F1F5F9', cursor: 'pointer', borderRadius: '8px', padding: '6px' }}
                    aria-label="Back"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--color-text-main)' }}>
                      {isEditingHistory ? 'Edit Billing History' : 'Billing History'}
                    </h2>
                    <p style={{ fontSize: '11.5px', color: '#64748B', margin: '2px 0 0 0' }}>
                      Room {roomData.roomNumber} • {roomData.currentTenant?.fullName || roomData.tenantName || 'Tenant'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {!isEditingHistory && (
                    <button
                      type="button"
                      onClick={openHistoryEditor}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: '#EFF6FF',
                        color: 'var(--color-interactive)',
                        border: '1px solid #BFDBFE',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Pencil size={13} />
                      <span>Edit</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowBillingHistory(false);
                      setIsEditingHistory(false);
                    }}
                    style={{
                      border: 'none',
                      background: '#F1F5F9',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#64748B',
                    }}
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div
                style={{
                  padding: '16px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  flex: 1,
                }}
              >
                {isEditingHistory ? (
                  /* ================= HISTORICAL RECORDS EDITING MODE ================= */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Guidance / Info Banner */}
                    <div
                      style={{
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                      }}
                    >
                      <AlertCircle size={18} color="#2563EB" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ fontSize: '12px', color: '#1E40AF', lineHeight: '1.4' }}>
                        <strong>Historical Meter & Rent Ledger:</strong> Edit or enter past readings, rents, and payments. The current reading of each month automatically carries over to the next month.
                      </div>
                    </div>

                    {/* Month Editor Cards */}
                    {historyFormRecords.map((rec, idx) => {
                      const prevVal = rec.prevReading !== '' && rec.prevReading !== null ? Number(rec.prevReading) : null;
                      const currVal = rec.currReading !== '' && rec.currReading !== null ? Number(rec.currReading) : null;
                      const units = prevVal !== null && currVal !== null ? Math.max(0, currVal - prevVal) : 0;
                      const rentVal = Number(rec.monthlyRent || 0);
                      const rateVal = Number(rec.electricityRate || 0);
                      const elecVal = Math.round(units * rateVal);
                      const totalBillVal = rentVal + elecVal;
                      const recVal = rec.amountReceived !== '' && rec.amountReceived !== null ? Number(rec.amountReceived) : null;

                      let statusBadge = null;
                      if (recVal !== null) {
                        const diff = recVal - totalBillVal;
                        if (diff === 0) {
                          statusBadge = <span style={{ backgroundColor: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>Settled (₹0)</span>;
                        } else if (diff > 0) {
                          statusBadge = <span style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>Advance ₹{diff.toLocaleString('en-IN')}</span>;
                        } else {
                          statusBadge = <span style={{ backgroundColor: '#FEE2E2', color: '#991B1B', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>Due ₹{Math.abs(diff).toLocaleString('en-IN')}</span>;
                        }
                      }

                      return (
                        <div
                          key={rec.key || idx}
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid var(--color-border)',
                            borderRadius: '16px',
                            padding: '14px',
                            boxShadow: 'var(--shadow-subtle)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                          }}
                        >
                          {/* Card Header: Month Name & Delete */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  backgroundColor: '#F1F5F9',
                                  color: '#334155',
                                  borderRadius: '6px',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                }}
                              >
                                #{idx + 1}
                              </span>
                              <input
                                type="text"
                                value={rec.name}
                                onChange={(e) => handleUpdateRecordField(idx, 'name', e.target.value)}
                                placeholder="e.g. July 2026"
                                style={{
                                  fontSize: '14px',
                                  fontWeight: 800,
                                  color: 'var(--color-text-main)',
                                  border: '1px solid #CBD5E1',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  backgroundColor: '#F8FAFC',
                                  outline: 'none',
                                  maxWidth: '160px',
                                }}
                              />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {statusBadge}
                              {historyFormRecords.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMonth(idx)}
                                  style={{
                                    border: 'none',
                                    background: '#FEE2E2',
                                    color: '#DC2626',
                                    borderRadius: '6px',
                                    padding: '6px 8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                  title="Remove Month"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 1. Meter Reading Inputs */}
                          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '10px 12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Meter Reading
                              </span>
                              <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--color-interactive)' }}>
                                {units} Units Consumed
                              </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '10.5px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                                  Previous Reading
                                </label>
                                <input
                                  type="number"
                                  value={rec.prevReading}
                                  onChange={(e) => handleUpdateRecordField(idx, 'prevReading', e.target.value)}
                                  placeholder="0"
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--color-border)',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    outline: 'none',
                                    backgroundColor: '#FFFFFF',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '10.5px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                                  Current Reading
                                </label>
                                <input
                                  type="number"
                                  value={rec.currReading}
                                  onChange={(e) => handleUpdateRecordField(idx, 'currReading', e.target.value)}
                                  placeholder="0"
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--color-border)',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    outline: 'none',
                                    backgroundColor: '#FFFFFF',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* 2. Rent & Electricity Rate Inputs */}
                          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '10px 12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Charges & Total Bill
                              </span>
                              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                                Total: ₹{totalBillVal.toLocaleString('en-IN')}
                              </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '10.5px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                                  Monthly Rent (₹)
                                </label>
                                <input
                                  type="number"
                                  value={rec.monthlyRent}
                                  onChange={(e) => handleUpdateRecordField(idx, 'monthlyRent', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--color-border)',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    outline: 'none',
                                    backgroundColor: '#FFFFFF',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '10.5px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                                  Elec Rate (₹/unit)
                                </label>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={rec.electricityRate}
                                  onChange={(e) => handleUpdateRecordField(idx, 'electricityRate', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--color-border)',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    outline: 'none',
                                    backgroundColor: '#FFFFFF',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
                              <span>Elec: {units} × ₹{rateVal} = ₹{elecVal.toLocaleString('en-IN')}</span>
                              <span>Rent: ₹{rentVal.toLocaleString('en-IN')}</span>
                            </div>
                          </div>

                          {/* 3. Payment Received & Date */}
                          <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '10px 12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Payment Collected
                            </span>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '10.5px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                                  Amount Received (₹)
                                </label>
                                <input
                                  type="number"
                                  placeholder={String(totalBillVal)}
                                  value={rec.amountReceived}
                                  onChange={(e) => handleUpdateRecordField(idx, 'amountReceived', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--color-border)',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    outline: 'none',
                                    backgroundColor: '#FFFFFF',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '10.5px', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                                  Payment Date
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. 10 Sep 2026"
                                  value={rec.paymentDate}
                                  onChange={(e) => handleUpdateRecordField(idx, 'paymentDate', e.target.value)}
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--color-border)',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    outline: 'none',
                                    backgroundColor: '#FFFFFF',
                                    boxSizing: 'border-box',
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Month Button */}
                    <button
                      type="button"
                      onClick={handleAddMonth}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px dashed #94A3B8',
                        borderRadius: '12px',
                        padding: '12px',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--color-interactive)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <Plus size={16} />
                      <span>Add Another Month</span>
                    </button>
                  </div>
                ) : (
                  /* ================= READ-ONLY VIEW MODE ================= */
                  <>
                    {/* Meter & Tenant Summary Banner */}
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--color-border)',
                        borderRadius: '16px',
                        padding: '14px 16px',
                        boxShadow: 'var(--shadow-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Zap size={16} color="var(--color-interactive)" />
                          <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                            {roomData.submeter?.id || `#E-${roomData.roomNumber}`}
                          </span>
                        </div>
                        <span
                          style={{
                            backgroundColor: '#DCFCE7',
                            color: '#166534',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 800,
                          }}
                        >
                          {unitsBilled} Units Billed
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                        <div style={{ backgroundColor: '#EFF6FF', borderRadius: '10px', padding: '8px 10px' }}>
                          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>Initial Reading</div>
                          <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px' }}>
                            {initialReading !== null ? Math.round(initialReading) : '-'}
                          </div>
                        </div>
                        <div style={{ backgroundColor: '#EFF6FF', borderRadius: '10px', padding: '8px 10px' }}>
                          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>Current Reading</div>
                          <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px' }}>
                            {currentReading !== null ? Math.round(currentReading) : '-'}
                          </div>
                        </div>
                        <div style={{ backgroundColor: '#F8FAFC', borderRadius: '10px', padding: '8px 10px', border: '1px solid var(--color-border)' }}>
                          <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>Tenant Joined</div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-main)', marginTop: '4px', whiteSpace: 'nowrap' }}>
                            {roomData.currentTenant?.joinedDate || 'Recently'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Baseline Move-in Reading Card (if initialReading exists) */}
                    {initialReading !== null && (
                      <div
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--color-border)',
                          borderRadius: '14px',
                          padding: '12px 14px',
                          boxShadow: 'var(--shadow-subtle)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                            Initial Move-in Reading
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            Tenant Onboarding Baseline
                          </div>
                        </div>
                        <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-interactive)' }}>
                          Reading: {Math.round(initialReading)}
                        </div>
                      </div>
                    )}

                    {/* Chronological Historical Month Cards */}
                    {(!billsWithLedger || billsWithLedger.length === 0) ? (
                      <div
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '16px',
                          padding: '32px 20px',
                          textAlign: 'center',
                          color: '#64748B',
                          fontSize: '13px',
                          border: '1px dashed #CBD5E1',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            backgroundColor: '#F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748B',
                          }}
                        >
                          <FileText size={24} />
                        </div>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                            No historical records available
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                            Add past meter readings, monthly rent, and payments for this tenant.
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={openHistoryEditor}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: 'var(--color-interactive)',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '10px 18px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            marginTop: '6px',
                          }}
                        >
                          <Plus size={16} />
                          <span>Add Historical Records</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* View Switcher: Excel Table vs Cards */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 2px 0' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                            Ledger Records ({billsWithLedger.length})
                          </span>
                          <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px', gap: '3px', border: '1px solid #E2E8F0' }}>
                            <button
                              type="button"
                              onClick={() => setHistoryViewMode('table')}
                              style={{
                                border: 'none',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: historyViewMode === 'table' ? '#FFFFFF' : 'transparent',
                                color: historyViewMode === 'table' ? 'var(--color-interactive)' : '#64748B',
                                boxShadow: historyViewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                              }}
                            >
                              <Table size={12} />
                              <span>Excel View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setHistoryViewMode('cards')}
                              style={{
                                border: 'none',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: historyViewMode === 'cards' ? '#FFFFFF' : 'transparent',
                                color: historyViewMode === 'cards' ? 'var(--color-interactive)' : '#64748B',
                                boxShadow: historyViewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                              }}
                            >
                              <FileText size={12} />
                              <span>Card View</span>
                            </button>
                          </div>
                        </div>

                        {historyViewMode === 'table' ? (
                          renderExcelLedgerTable(billsWithLedger)
                        ) : (
                          billsWithLedger.map((bill, bIdx) => {
                            const isDiary = Boolean(bill.isDiaryRecord);
                            return (
                            <div
                              key={bill.id || bIdx}
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
                              {/* Month Header */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                                    {String(bill.billingPeriod || bill.name || `Month ${bIdx + 1}`).toUpperCase()}
                                  </span>
                                  {isDiary && (
                                    <span
                                      style={{
                                        fontSize: '9.5px',
                                        fontWeight: 800,
                                        color: '#166534',
                                        backgroundColor: '#DCFCE7',
                                        padding: '2px 6px',
                                        borderRadius: '6px',
                                        border: '1px solid #BBF7D0',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                      }}
                                    >
                                      <BookOpen size={10} />
                                      <span>Diary Record</span>
                                    </span>
                                  )}
                                </div>
                                <span
                                  style={{
                                    backgroundColor: bill.closingBg,
                                    color: bill.closingColor,
                                    borderRadius: '9999px',
                                    padding: '3px 10px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    border: isDiary && bill.closingStatus === 'DIARY_SETTLED' ? '1px solid #BBF7D0' : 'none',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  {isDiary && bill.closingStatus === 'DIARY_SETTLED' && <Check size={11} strokeWidth={3} />}
                                  <span>{bill.closingText}</span>
                                </span>
                              </div>

                            {/* 1. Meter Reading Section */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Meter Reading
                              </div>
                              <div
                                style={{
                                  backgroundColor: '#F8FAFC',
                                  borderRadius: '10px',
                                  padding: '10px 12px',
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr 1fr',
                                  gap: '8px',
                                  border: '1px solid #E2E8F0',
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>Previous</div>
                                  <div className="tabular-nums" style={{ fontSize: '13.5px', fontWeight: 800, marginTop: '2px' }}>
                                    {bill.prevReading !== null ? Math.round(bill.prevReading) : '-'}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>Current</div>
                                  <div className="tabular-nums" style={{ fontSize: '13.5px', fontWeight: 800, marginTop: '2px' }}>
                                    {bill.currReading !== null ? Math.round(bill.currReading) : '-'}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>Consumed</div>
                                  <div className="tabular-nums" style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-interactive)', marginTop: '2px' }}>
                                    {Math.round(bill.consumed)} units
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 2. Billing Section */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Billing
                              </div>
                              <div
                                style={{
                                  backgroundColor: '#F8FAFC',
                                  borderRadius: '10px',
                                  padding: '10px 12px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '5px',
                                  border: '1px solid #E2E8F0',
                                  fontSize: '12px',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                                  <span>Monthly Rent:</span>
                                  <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>
                                    ₹{bill.rent.toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                                  <span>Electricity Rate:</span>
                                  <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>
                                    ₹{bill.rate.toFixed(2)} / unit
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                                  <span>Electricity ({Math.round(bill.consumed)} units):</span>
                                  <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>
                                    ₹{bill.electricityAmount.toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontWeight: 800,
                                    color: 'var(--color-text-main)',
                                    borderTop: '1px dashed #CBD5E1',
                                    paddingTop: '6px',
                                    marginTop: '2px',
                                  }}
                                >
                                  <span>Total Bill:</span>
                                  <span className="tabular-nums" style={{ color: 'var(--color-interactive)', fontSize: '13.5px' }}>
                                    ₹{bill.totalBill.toLocaleString('en-IN')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 3. Payment & Balance Section */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Payment & Balance
                              </div>
                              <div
                                style={{
                                  backgroundColor: '#F8FAFC',
                                  borderRadius: '10px',
                                  padding: '10px 12px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '5px',
                                  border: '1px solid #E2E8F0',
                                  fontSize: '12px',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                                  <span>Previous Balance:</span>
                                  <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>
                                    {bill.prevBalanceText}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                                  <span>Amount Payable:</span>
                                  <span className="tabular-nums" style={{ fontWeight: 800, color: 'var(--color-text-main)' }}>
                                    ₹{bill.amountPayable.toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                                  <span>Amount Received:</span>
                                  <span className="tabular-nums" style={{ fontWeight: 800, color: bill.hasReceived ? '#16A34A' : 'var(--color-text-main)' }}>
                                    {bill.hasReceived ? `₹${bill.amountReceived.toLocaleString('en-IN')}` : '₹0'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748B' }}>
                                  <span>Payment Date:</span>
                                  <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>
                                    {bill.paymentDate}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 4. Closing Balance Banner */}
                            <div
                              style={{
                                backgroundColor: bill.closingBg,
                                border: `1px solid ${bill.closingStatus === 'DUE' ? '#FECACA' : bill.closingStatus === 'ADVANCE' ? '#DBEAFE' : '#BBF7D0'}`,
                                borderRadius: '10px',
                                padding: '10px 12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <span style={{ fontSize: '12px', fontWeight: 700, color: bill.closingColor }}>
                                Closing Balance:
                              </span>
                              <span className="tabular-nums" style={{ fontSize: '13.5px', fontWeight: 900, color: bill.closingColor }}>
                                {bill.closingText}
                              </span>
                            </div>
                          </div>
                          );
                        })
                      )}

                        {/* Edit or Add More Records CTA Button */}
                        <div style={{ marginTop: '4px', marginBottom: '8px' }}>
                          <button
                            type="button"
                            onClick={openHistoryEditor}
                            style={{
                              width: '100%',
                              backgroundColor: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '12px',
                              padding: '12px',
                              fontSize: '13px',
                              fontWeight: 700,
                              color: 'var(--color-interactive)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <Pencil size={15} />
                            <span>Edit or Add Historical Records</span>
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer (When in Edit Mode) */}
              {isEditingHistory && (
                <div
                  style={{
                    padding: '14px 16px',
                    backgroundColor: '#FFFFFF',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsEditingHistory(false)}
                    disabled={savingHistory}
                    style={{
                      flex: 1,
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveHistory}
                    disabled={savingHistory}
                    style={{
                      flex: 2,
                      backgroundColor: 'var(--color-interactive)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: savingHistory ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: savingHistory ? 0.7 : 1,
                      boxShadow: '0 4px 12px rgba(29, 78, 216, 0.25)',
                    }}
                  >
                    <Save size={16} />
                    <span>{savingHistory ? 'Saving Changes...' : 'Save Billing History'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TENANT LEAVE CONFIRMATION MODAL */}
        {showVacateModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px',
              backdropFilter: 'blur(3px)',
            }}
            onClick={() => !vacating && setShowVacateModal(false)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                maxWidth: '420px',
                width: '100%',
                padding: '24px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: '#FEE2E2',
                    color: '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <LogOut size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Confirm Tenant Leave
                  </h3>
                  <p style={{ fontSize: '12.5px', color: '#64748B', margin: '2px 0 0' }}>
                    Vacate Room {roomData.roomNumber}
                  </p>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '13px',
                  color: '#991B1B',
                  lineHeight: '1.45',
                }}
              >
                Are you sure <strong>{roomData.currentTenant?.fullName || 'the tenant'}</strong> is leaving <strong>Room {roomData.roomNumber}</strong>?
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#B91C1C' }}>
                  This will mark the tenant as vacated, and Room {roomData.roomNumber} will immediately become <strong>VACANT</strong> and ready for new onboarding.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  disabled={vacating}
                  onClick={() => setShowVacateModal(false)}
                  style={{
                    flex: 1,
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: '#F8FAFC',
                    color: '#475569',
                    border: '1px solid #CBD5E1',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: vacating ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={vacating}
                  onClick={handleTenantLeave}
                  style={{
                    flex: 1.5,
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: vacating ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
                    opacity: vacating ? 0.7 : 1,
                  }}
                >
                  <LogOut size={15} />
                  <span>{vacating ? 'Vacating...' : 'Confirm Leave'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

