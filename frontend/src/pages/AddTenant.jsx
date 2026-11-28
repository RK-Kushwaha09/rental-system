import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  X,
  User,
  Check,
  CheckCircle2,
  Calendar,
  Building,
  DoorClosed,
  CreditCard,
  Banknote,
  Info,
  Users,
  FileText,
  ChevronDown,
  ChevronRight,
  Calculator,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Zap,
  Pencil,
  UploadCloud,
  Camera,
  Trash2,
  Plus,
  Eye,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Table,
  Link2,
} from 'lucide-react';
import { usePropertySetup } from '../context/PropertySetupContext';
import { propertyAPI, tenantAPI } from '../services/api';
import { getPrevious3CompletedMonths, getPastCompletedMonths, formatPaymentDateWithoutYear } from '../utils/dateUtils';

export default function AddTenant() {
  const navigate = useNavigate();
  const { tenantId: routeTenantId } = useParams();
  const [searchParams] = useSearchParams();
  const editTenantId = routeTenantId || searchParams.get('editTenantId') || searchParams.get('tenantId') || null;
  const isEditMode = Boolean(editTenantId);
  const preselectedRoom = searchParams.get('room') || '';

  const { defaultMonthlyRent, defaultElectricityRate } = usePropertySetup();

  // Tenant Information State
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(preselectedRoom);
  const [selectedFloor, setSelectedFloor] = useState('Ground');
  const [monthlyRent, setMonthlyRent] = useState(defaultMonthlyRent || 0);
  const [electricityRate, setElectricityRate] = useState(defaultElectricityRate || 0);
  const [joiningDate, setJoiningDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [moveInReading, setMoveInReading] = useState('');

  // Real Vacant Rooms State
  const [vacantRooms, setVacantRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Tenant Type Selection: 'NEW' | 'EXISTING'
  const [tenantType, setTenantType] = useState('NEW');

  // Dynamic Historical Months: Exactly 3 previous completed months in ASCENDING order (oldest -> newest)
  const initialMonths = useMemo(() => getPrevious3CompletedMonths(), []);
  const [historyMonths] = useState(initialMonths);

  // Default expanded month: the oldest month (first displayed in ascending order)
  const [expandedMonth, setExpandedMonth] = useState(() => initialMonths[0]?.key || '');

  // Opening Balance State for the FIRST Historical Month: 'NONE' | 'ADVANCE' | 'DUE'
  const [openingBalanceType, setOpeningBalanceType] = useState('NONE');
  const [openingBalanceAmount, setOpeningBalanceAmount] = useState('');

  // Dynamic Historical Records State (starts empty - no fake/demo data)
  const [historyRecords, setHistoryRecords] = useState(() => {
    const initial = {};
    for (const m of initialMonths) {
      initial[m.key] = {
        name: m.name,
        key: m.key,
        prevReading: '',
        currReading: '',
        rent: defaultMonthlyRent || 0,
        rate: defaultElectricityRate || 0,
        amountReceived: '',
        paymentDate: '',
        isRentCustom: false,
        isRateCustom: false,
        isPrevReadingCustom: false,
      };
    }
    return initial;
  });

  // AI-Powered Diary Scanner & Spreadsheet States
  const [existingImportMode, setExistingImportMode] = useState('DIARY'); // 'DIARY' | 'MANUAL'
  const [diaryFiles, setDiaryFiles] = useState([]); // [{ id, file, name, size, previewUrl }]
  const [scanning, setScanning] = useState(false);
  const [scanElapsed, setScanElapsed] = useState(0);
  const [scanError, setScanError] = useState(null);
  const [scanSummary, setScanSummary] = useState(null);
  const [spreadsheetRows, setSpreadsheetRows] = useState([]);
  const [previewModalImage, setPreviewModalImage] = useState(null);
  const [editingCoveredIdx, setEditingCoveredIdx] = useState(null);
  const [focusedNumberCell, setFocusedNumberCell] = useState(null); // { idx, field }
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    let interval = null;
    if (scanning) {
      setScanElapsed(0);
      interval = setInterval(() => {
        setScanElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      setScanElapsed(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [scanning]);

  // Cleans numeric inputs: handles backspace, strips non-digits, removes leading zeros like "031" -> "31", "057" -> "57", "04" -> "4"
  const cleanNumberInput = (rawVal) => {
    if (rawVal === '' || rawVal === null || rawVal === undefined) return '';
    const digitsOnly = String(rawVal).replace(/\D/g, '');
    if (!digitsOnly) return '';
    const stripped = digitsOnly.replace(/^0+/, '');
    return stripped === '' ? '0' : stripped;
  };

  // Helper to recalculate running arithmetic across all spreadsheet rows
  const recalculateSpreadsheet = (rows, baseRate, baseRent) => {
    return rows.map((row) => {
      const rent = row.monthlyRent !== '' && row.monthlyRent !== null && row.monthlyRent !== undefined
        ? Number(row.monthlyRent)
        : (baseRent || 0);
      const rate = row.electricityRate !== '' && row.electricityRate !== null && row.electricityRate !== undefined
        ? Number(row.electricityRate)
        : (baseRate || 10);

      const prevR = row.prevReading !== '' && row.prevReading !== null && row.prevReading !== undefined
        ? Number(row.prevReading)
        : null;
      const currR = row.currReading !== '' && row.currReading !== null && row.currReading !== undefined
        ? Number(row.currReading)
        : null;

      let units = null;
      if (currR !== null && prevR !== null && currR >= prevR) {
        units = currR - prevR;
      } else if (row.unitsConsumed !== '' && row.unitsConsumed !== null && row.unitsConsumed !== undefined) {
        units = Number(row.unitsConsumed);
      }

      const hasReading = units !== null;
      const elecAmount = hasReading ? Math.round(units * rate) : null;
      const totalBill = rent + (elecAmount !== null ? elecAmount : 0);

      const netPayable = totalBill; // Current billing cycle bill

      // Combined payment coverage check
      const isCombinedCovered = Boolean(
        row.paymentCoveredBy &&
        (row.amountReceived === '' || row.amountReceived === null || row.amountReceived === undefined)
      );

      // Keep cells completely independent and strip leading zeros (e.g. 031 -> 31)
      const rawDue = (row.previousDue !== '' && row.previousDue !== null && row.previousDue !== undefined)
        ? cleanNumberInput(row.previousDue)
        : '';
      const rawAdv = (row.previousAdvance !== '' && row.previousAdvance !== null && row.previousAdvance !== undefined)
        ? cleanNumberInput(row.previousAdvance)
        : '';

      const cleanDueCell = (rawDue === '0' || rawDue === 0) ? '' : rawDue;
      const cleanAdvCell = (rawAdv === '0' || rawAdv === 0) ? '' : rawAdv;

      const due = cleanDueCell !== '' ? Number(cleanDueCell) : 0;
      const advance = cleanAdvCell !== '' ? Number(cleanAdvCell) : 0;

      return {
        ...row,
        monthlyRent: rent,
        electricityRate: rate,
        prevReading: prevR,
        currReading: currR,
        unitsConsumed: units,
        electricityAmount: elecAmount,
        readingRecorded: hasReading,
        totalBill: totalBill,
        netPayable: netPayable,
        previousDue: cleanDueCell,
        previousAdvance: cleanAdvCell,
        closingDue: due,
        closingAdvance: advance,
        amountReceived: isCombinedCovered ? '' : (row.amountReceived !== null && row.amountReceived !== undefined ? row.amountReceived : ''),
        isCombinedCovered,
        balance: due > 0 ? due : (advance > 0 ? -advance : 0),
      };
    });
  };

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newFiles = files.map((file, i) => ({
      id: `img_${Date.now()}_${i}`,
      file,
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
      previewUrl: URL.createObjectURL(file),
    }));

    setDiaryFiles((prev) => [...prev, ...newFiles]);
    setScanError(null);
  };

  const removeDiaryFile = (id) => {
    setDiaryFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleScanDiary = async () => {
    if (diaryFiles.length === 0) {
      setScanError('Please upload at least one diary photo to scan.');
      return;
    }

    setScanning(true);
    setScanError(null);

    try {
      const formData = new FormData();
      diaryFiles.forEach((item) => {
        formData.append('files', item.file);
      });
      if (fullName) formData.append('tenantName', fullName);
      if (selectedRoom) formData.append('roomNumber', String(selectedRoom));
      if (monthlyRent) formData.append('monthlyRent', String(monthlyRent));
      if (electricityRate) formData.append('electricityRate', String(electricityRate));
      const customKey = localStorage.getItem('rm_gemini_api_key');
      if (customKey && customKey.trim()) formData.append('apiKey', customKey.trim());

      const res = await tenantAPI.scanDiary(formData);
      const resultData = res?.invoice || res?.data || res;
      const rawExtracted = resultData?.records || [];
      // Filter out trailing unbilled diary notes that have no payment received and no payment date
      const extractedRecords = rawExtracted.filter((r, idx, arr) => {
        const isTrailing = idx === arr.length - 1;
        const hasPayment = r.amountReceived !== '' && r.amountReceived !== null && r.amountReceived !== undefined && Number(r.amountReceived) > 0;
        const hasDate = r.paymentDate && String(r.paymentDate).trim() !== '';
        if (isTrailing && !hasPayment && !hasDate && !r.isCombinedCovered) {
          return false;
        }
        return true;
      });

      if (extractedRecords.length > 0) {
        // Domain Rule: In physical landlord diaries, past differences (e.g. 19 Ext, 51 Ext, 57 बाकी, 66 Ext)
        // were settled in cash in subsequent payments. Only the chronologically LAST active financial record's
        // remaining balance (e.g. 4 बाकी) is carried forward. All earlier months are marked Settled (0 due, 0 advance).
        let lastBalIdx = -1;
        extractedRecords.forEach((r, i) => {
          const rawNote = String(r.rawNote || r.notes || '').toLowerCase();
          const hasBaki = rawNote.includes('बाकी') || rawNote.includes('baki') || Number(r.previousDue) > 0;
          const hasExt = rawNote.includes('ext') || rawNote.includes('extra') || Number(r.previousAdvance) > 0;
          if (hasBaki || hasExt) {
            lastBalIdx = i;
          }
        });

        const enriched = extractedRecords.map((r, idx) => {
          let cleanDue = '';
          let cleanAdv = '';
          let isReview = false;

          if (idx === lastBalIdx) {
            const rawDue = r.previousDue !== undefined && r.previousDue !== null ? cleanNumberInput(r.previousDue) : '';
            const rawAdv = r.previousAdvance !== undefined && r.previousAdvance !== null ? cleanNumberInput(r.previousAdvance) : '';
            cleanDue = (rawDue === '0' || rawDue === 0) ? '' : rawDue;
            cleanAdv = (rawAdv === '0' || rawAdv === 0) ? '' : rawAdv;
            isReview = true;
          }

          return {
            ...r,
            geminiNotes: r.notes || '',
            originalNotes: r.notes || '',
            paymentDate: formatToDdMmYyyy(r.paymentDate),
            previousDue: cleanDue,
            previousAdvance: cleanAdv,
            reviewRequired: isReview,
            isManualDue: cleanDue !== '' && Number(cleanDue) > 0,
            isManualAdvance: cleanAdv !== '' && Number(cleanAdv) > 0,
            originalPaymentCoveredBy: r.paymentCoveredBy || (r.isCombinedCovered ? 'combined payment' : null),
            isCustomPayment: false,
          };
        });
        const recalculated = recalculateSpreadsheet(enriched, electricityRate, monthlyRent);
        setSpreadsheetRows(recalculated);
        setScanSummary(resultData?.summary || {
          totalMonths: extractedRecords.length,
          readyCount: extractedRecords.filter((r) => !r.reviewRequired).length,
          reviewRequiredCount: extractedRecords.filter((r) => r.reviewRequired).length,
          notes: 'Handwritten records successfully extracted from diary photos.',
        });
      } else {
        setScanError('No historical records could be identified. You can add months manually using the spreadsheet.');
      }
    } catch (err) {
      console.error('Diary scan error:', err);
      setScanError(err?.message || 'Failed to scan diary. Please check your image or enter records in the spreadsheet.');
    } finally {
      setScanning(false);
    }
  };

  // Updates numbers inside Gemini review notes without erasing the original explanation
  const updateNoteWithNumber = (originalNote, field, newValue) => {
    if (!originalNote) {
      if (field === 'previousAdvance' && newValue) return `+${newValue} Ext`;
      if (field === 'previousDue' && newValue) return `${newValue} बाकी`;
      if (field === 'amountReceived' && newValue) return `${newValue} जमा`;
      return '';
    }

    let text = originalNote;
    const numVal = (newValue !== '' && newValue !== null && newValue !== undefined) ? Number(newValue) : null;

    const extRegex = /(\+?\d+)\s*(ext|Ext|EXT)/;
    const bakiRegex = /(\d+)\s*(बाकी|baki|Baki|due|Due)/;
    const jamaRegex = /(\d+)\s*(जमा|jama|Jama)/;

    if (field === 'previousAdvance') {
      if (numVal !== null && numVal > 0) {
        if (extRegex.test(text)) {
          text = text.replace(extRegex, `+${numVal} Ext`);
        } else {
          text = `${text} (+${numVal} Ext)`;
        }
      } else {
        text = text.replace(extRegex, '').replace(/\s*\(\+\d+\s*Ext\)/, '').trim();
      }
    } else if (field === 'previousDue') {
      if (numVal !== null && numVal > 0) {
        if (bakiRegex.test(text)) {
          text = text.replace(bakiRegex, `${numVal} $2`);
        } else {
          text = `${text} (${numVal} बाकी)`;
        }
      } else {
        text = text.replace(bakiRegex, '').replace(/\s*\(\d+\s*बाकी\)/, '').trim();
      }
    } else if (field === 'amountReceived') {
      if (numVal !== null && numVal > 0) {
        if (jamaRegex.test(text)) {
          text = text.replace(jamaRegex, `${numVal} $2`);
        } else {
          text = `${text} (${numVal} जमा)`;
        }
      }
    }

    return text;
  };

  const updateSpreadsheetCell = (index, field, value) => {
    setSpreadsheetRows((prev) => {
      const updated = [...prev];
      const prevRow = updated[index];
      const target = { ...prevRow, [field]: value };

      if (field === 'previousDue') {
        const numDue = value !== '' && value !== null ? Number(value) : 0;
        if (numDue > 0) {
          target.previousAdvance = '';
        }
      }
      if (field === 'previousAdvance') {
        const numAdv = value !== '' && value !== null ? Number(value) : 0;
        if (numAdv > 0) {
          target.previousDue = '';
        }
      }
      if (field === 'amountReceived') {
        if (value !== '' && value !== null && value !== undefined) {
          target.isCombinedCovered = false;
        }
      }

      // Mark modified and update numbers inside the review note while preserving Gemini's original review!
      if (['previousAdvance', 'previousDue', 'amountReceived', 'monthlyRent', 'prevReading', 'currReading'].includes(field)) {
        target.isUserEdited = true;
        target.reviewRequired = true;

        // Base note to work on: prefer original Gemini note so nothing gets lost
        const baseNote = prevRow.geminiNotes || prevRow.notes || '';
        target.notes = updateNoteWithNumber(baseNote, field, value);
      }

      if (target.unclearFields && target.unclearFields.includes(field)) {
        target.unclearFields = target.unclearFields.filter((f) => f !== field);
      }

      updated[index] = target;
      return recalculateSpreadsheet(updated, electricityRate, monthlyRent);
    });
  };


  const addSpreadsheetRow = () => {
    setSpreadsheetRows((prev) => {
      if (prev.length >= 12) {
        alert('Maximum of 12 historical months supported.');
        return prev;
      }

      const lastRow = prev[prev.length - 1];
      const now = new Date();
      let nextMonthDate = new Date(now.getFullYear(), now.getMonth() - (prev.length + 1), 1);

      const mFull = nextMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const mShort = nextMonthDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const yr = nextMonthDate.getFullYear();

      const newRow = {
        id: `row_${Date.now()}_${Math.random()}`,
        month: mFull,
        monthShort: mShort,
        year: yr,
        monthlyRent: monthlyRent || 0,
        electricityRate: electricityRate || 10,
        prevReading: lastRow ? lastRow.currReading : (moveInReading ? Number(moveInReading) : ''),
        currReading: lastRow ? lastRow.currReading : '',
        unitsConsumed: 0,
        electricityAmount: 0,
        totalBill: monthlyRent || 0,
        amountReceived: '',
        paymentDate: '',
        previousDue: '',
        previousAdvance: '',
        closingDue: 0,
        closingAdvance: 0,
        reviewRequired: false,
        unclearFields: [],
        notes: 'Manually added month',
      };

      const updated = [...prev, newRow];
      return recalculateSpreadsheet(updated, electricityRate, monthlyRent);
    });
  };

  const deleteSpreadsheetRow = (index) => {
    setSpreadsheetRows((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return recalculateSpreadsheet(updated, electricityRate, monthlyRent);
    });
  };

  const markRowReady = (index) => {
    setSpreadsheetRows((prev) => {
      const updated = [...prev];
      const target = updated[index];
      let note = target.notes || target.geminiNotes || target.originalNotes || '';

      if (note.includes('needs review')) {
        note = note.replace(/needs review\.?/i, '(Verified by owner)');
      }

      updated[index] = {
        ...target,
        reviewRequired: false,
        isConfirmed: true,
        notes: note,
        unclearFields: [],
      };
      return updated;
    });
  };

  const startBlankSpreadsheet = () => {
    const defaultPastMonths = getPastCompletedMonths(3);
    const rows = defaultPastMonths.map((m, idx) => ({
      id: `row_init_${idx}`,
      key: m.key,
      month: m.name,
      monthShort: m.shortName,
      year: m.year,
      monthlyRent: monthlyRent || 0,
      electricityRate: electricityRate || 10,
      prevReading: '',
      currReading: '',
      unitsConsumed: 0,
      electricityAmount: 0,
      totalBill: monthlyRent || 0,
      amountReceived: '',
      paymentDate: '',
      previousDue: '',
      previousAdvance: '',
      closingDue: 0,
      closingAdvance: 0,
      reviewRequired: false,
      unclearFields: [],
      notes: 'Initial month template',
    }));
    setSpreadsheetRows(recalculateSpreadsheet(rows, electricityRate, monthlyRent));
  };

  const spreadsheetSummary = useMemo(() => {
    const totalBilled = spreadsheetRows.reduce((acc, r) => acc + (Number(r.totalBill) || 0), 0);
    const totalReceived = spreadsheetRows.reduce((acc, r) => acc + (Number(r.amountReceived) || 0), 0);
    const totalRent = spreadsheetRows.reduce((acc, r) => acc + (Number(r.monthlyRent) || 0), 0);
    const totalElec = spreadsheetRows.reduce((acc, r) => acc + (Number(r.electricityAmount) || 0), 0);

    // Identify the chronologically last row that has remaining balance
    const rowsWithBalance = spreadsheetRows.filter((r) =>
      Number(r.closingDue) > 0 || Number(r.closingAdvance) > 0 || Number(r.previousDue) > 0 || Number(r.previousAdvance) > 0
    );
    const activeBalanceRow = rowsWithBalance.length > 0 ? rowsWithBalance[rowsWithBalance.length - 1] : null;
    const netDue = activeBalanceRow ? (Number(activeBalanceRow.closingDue || activeBalanceRow.previousDue) || 0) : 0;
    const netAdvance = activeBalanceRow ? (Number(activeBalanceRow.closingAdvance || activeBalanceRow.previousAdvance) || 0) : 0;

    const readyCount = spreadsheetRows.filter((r) => !r.reviewRequired).length;
    const reviewCount = spreadsheetRows.filter((r) => r.reviewRequired).length;

    return {
      totalBilled,
      totalReceived,
      totalRent,
      totalElec,
      netDue,
      netAdvance,
      readyCount,
      reviewCount,
    };
  }, [spreadsheetRows]);

  // Converts any date format (ISO YYYY-MM-DD, D/M/YY, D-M-YYYY, DD/MM/YYYY, MM/DD/YYYY, raw digits) to strict DD/MM/YYYY
  const formatToDdMmYyyy = (dateStr) => {
    if (!dateStr) return '';
    const trimmed = String(dateStr).trim();
    if (!trimmed) return '';

    // If ISO YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const y = isoMatch[1];
      const m = isoMatch[2].padStart(2, '0');
      const d = isoMatch[3].padStart(2, '0');
      return `${d}/${m}/${y}`;
    }

    // If raw 6 digits like "081126" (DDMMYY)
    const pureDigits = trimmed.replace(/\D/g, '');
    if (pureDigits.length === 6 && /^\d{6}$/.test(trimmed)) {
      const d = pureDigits.slice(0, 2);
      const m = pureDigits.slice(2, 4);
      const y = '20' + pureDigits.slice(4, 6);
      return `${d}/${m}/${y}`;
    }

    // If raw 8 digits like "08112026" (DDMMYYYY)
    if (pureDigits.length === 8 && /^\d{8}$/.test(trimmed)) {
      const d = pureDigits.slice(0, 2);
      const m = pureDigits.slice(2, 4);
      const y = pureDigits.slice(4, 8);
      return `${d}/${m}/${y}`;
    }

    // If DD/MM/YYYY or MM/DD/YYYY or D/M/YY
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (dmyMatch) {
      const p1 = parseInt(dmyMatch[1], 10);
      const p2 = parseInt(dmyMatch[2], 10);
      let y = dmyMatch[3];
      if (y.length === 2) y = '20' + y;

      // Smart check: If p1 <= 12 and p2 > 12, p2 is DAY and p1 is MONTH (MM/DD/YYYY format)
      let d = p1;
      let m = p2;
      if (p1 <= 12 && p2 > 12) {
        d = p2;
        m = p1;
      }
      return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    }

    return trimmed;
  };

  const handleDateChange = (idx, rawVal) => {
    if (!rawVal || !rawVal.trim()) {
      updateSpreadsheetCell(idx, 'paymentDate', '');
      return;
    }

    const prevVal = spreadsheetRows[idx]?.paymentDate || '';
    const isDeleting = rawVal.length < prevVal.length;

    if (isDeleting) {
      let cleaned = rawVal;
      if (cleaned.endsWith('/')) {
        cleaned = cleaned.slice(0, -1);
      }
      updateSpreadsheetCell(idx, 'paymentDate', cleaned);
      return;
    }

    // User typing forward: strictly extract digits, max 8 digits (DDMMYYYY)
    const digits = rawVal.replace(/\D/g, '').slice(0, 8);
    if (!digits) {
      updateSpreadsheetCell(idx, 'paymentDate', '');
      return;
    }

    let formatted = '';
    if (digits.length <= 2) {
      formatted = digits.length === 2 ? `${digits}/` : digits;
    } else if (digits.length <= 4) {
      const dd = digits.slice(0, 2);
      const mm = digits.slice(2);
      formatted = mm.length === 2 ? `${dd}/${mm}/` : `${dd}/${mm}`;
    } else {
      const dd = digits.slice(0, 2);
      const mm = digits.slice(2, 4);
      const yyyy = digits.slice(4, 8);
      formatted = `${dd}/${mm}/${yyyy}`;
    }

    updateSpreadsheetCell(idx, 'paymentDate', formatted);
  };

  const handleDateBlur = (idx, rawVal) => {
    if (!rawVal || !rawVal.trim()) {
      updateSpreadsheetCell(idx, 'paymentDate', '');
      return;
    }
    const formatted = formatToDdMmYyyy(rawVal);
    updateSpreadsheetCell(idx, 'paymentDate', formatted);
  };

  // Strictly converts DD/MM/YYYY, MM/DD/YYYY, or ISO to standard ISO YYYY-MM-DD
  const parseDateToIso = (dateStr) => {
    if (!dateStr) return '';
    const trimmed = String(dateStr).trim();
    if (!trimmed) return '';

    // If already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    // Strictly parse DD/MM/YYYY, MM/DD/YYYY, or D/M/YY
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
    if (dmyMatch) {
      const p1 = parseInt(dmyMatch[1], 10);
      const p2 = parseInt(dmyMatch[2], 10);
      let yr = dmyMatch[3];
      if (yr.length === 2) yr = '20' + yr;

      let day = p1;
      let month = p2;
      if (p1 <= 12 && p2 > 12) {
        day = p2;
        month = p1;
      }
      return `${yr}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    try {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch (e) {}
    return '';
  };

  // Normalize room floor strictly into allowed options (Ground to 5th Floor)
  const normalizeFloor = (fl) => {
    if (!fl) return 'Ground';
    const str = String(fl).trim().toLowerCase();
    if (str.includes('ground') || str === 'g' || str === '0') return 'Ground';
    if (str.includes('1')) return '1st Floor';
    if (str.includes('2')) return '2nd Floor';
    if (str.includes('3')) return '3rd Floor';
    if (str.includes('4')) return '4th Floor';
    if (str.includes('5')) return '5th Floor';
    return 'Ground';
  };

  // Load real room inventory from backend and populate tenant if in edit mode
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoadingRooms(true);
        const inventory = await propertyAPI.getRoomsInventory();
        if (!isMounted) return;

        let tenantData = null;
        if (isEditMode) {
          try {
            tenantData = await tenantAPI.getTenantById(editTenantId);
          } catch (tErr) {
            console.error('Failed to load tenant for editing:', tErr);
          }
        }

        const targetRoomNumber = tenantData?.roomNumber || tenantData?.unitNumber || preselectedRoom;

        let availableRooms = (inventory || []).filter((r) => r.status === 'VACANT');
        if (targetRoomNumber) {
          const matchRoom = (inventory || []).find((r) => String(r.roomNumber) === String(targetRoomNumber));
          if (matchRoom && !availableRooms.some((r) => String(r.roomNumber) === String(targetRoomNumber))) {
            availableRooms = [matchRoom, ...availableRooms];
          }
        }
        setVacantRooms(availableRooms);

        if (tenantData) {
          // Prepopulate all saved tenant fields
          setFullName(tenantData.fullName || tenantData.name || '');
          const rawPhone = (tenantData.mobile || '').replace(/^\+91\s?/, '');
          setPhone(rawPhone);
          const rawEmergency = (tenantData.emergencyContact || '').replace(/^\+91\s?/, '');
          setEmergencyContact(rawEmergency);

          if (targetRoomNumber) {
            setSelectedRoom(targetRoomNumber);
          }
          if (tenantData.floor) {
            setSelectedFloor(normalizeFloor(tenantData.floor));
          }
          if (tenantData.monthlyRent !== undefined && tenantData.monthlyRent !== null) {
            setMonthlyRent(tenantData.monthlyRent);
          }
          if (tenantData.electricityRate !== undefined && tenantData.electricityRate !== null) {
            setElectricityRate(tenantData.electricityRate);
          }
          if (tenantData.joinedDate) {
            const iso = parseDateToIso(tenantData.joinedDate);
            if (iso) setJoiningDate(iso);
          }
          if (tenantData.moveInReading !== undefined && tenantData.moveInReading !== null) {
            setMoveInReading(tenantData.moveInReading);
          }
        } else if (preselectedRoom) {
          const match = (inventory || []).find(
            (r) => String(r.roomNumber) === String(preselectedRoom) || String(r.roomId) === String(preselectedRoom)
          );
          if (match) {
            setSelectedRoom(match.roomNumber);
            const rRent = match.monthlyRent !== undefined ? match.monthlyRent : (defaultMonthlyRent || 0);
            const rRate = match.electricityRate !== undefined ? match.electricityRate : (defaultElectricityRate || 0);
            setMonthlyRent(rRent);
            setElectricityRate(rRate);
            setSelectedFloor(normalizeFloor(match.floor));

            const rReading = match.currentReading ?? match.latestReading ?? match.moveInReading ?? match.subMeter?.currentReading ?? '';
            setMoveInReading(rReading !== '' && rReading !== null && rReading !== undefined ? rReading : '');

            // Single source of truth: sync room rent into ALL 3 historical months
            setHistoryRecords((prev) => {
              const updated = { ...prev };
              for (const m of initialMonths) {
                const rec = updated[m.key] || {};
                updated[m.key] = {
                  ...rec,
                  rent: rRent,
                  rate: rRate,
                };
              }
              return updated;
            });
          }
        } else if (availableRooms.length > 0) {
          setSelectedRoom(availableRooms[0].roomNumber);
          const rRent = availableRooms[0].monthlyRent !== undefined ? availableRooms[0].monthlyRent : (defaultMonthlyRent || 0);
          const rRate = availableRooms[0].electricityRate !== undefined ? availableRooms[0].electricityRate : (defaultElectricityRate || 0);
          setMonthlyRent(rRent);
          setElectricityRate(rRate);
          setSelectedFloor(normalizeFloor(availableRooms[0].floor));

          const rReading = availableRooms[0].currentReading ?? availableRooms[0].latestReading ?? availableRooms[0].moveInReading ?? availableRooms[0].subMeter?.currentReading ?? '';
          setMoveInReading(rReading !== '' && rReading !== null && rReading !== undefined ? rReading : '');

          // Single source of truth: sync room rent into ALL 3 historical months
          setHistoryRecords((prev) => {
            const updated = { ...prev };
            for (const m of initialMonths) {
              const rec = updated[m.key] || {};
              updated[m.key] = {
                ...rec,
                rent: rRent,
                rate: rRate,
              };
            }
            return updated;
          });
        }
      } catch (err) {
        console.error('Failed to load room inventory:', err);
      } finally {
        if (isMounted) setLoadingRooms(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [editTenantId, isEditMode, preselectedRoom, initialMonths]);

  // Single Source of Truth: When room rent changes, update room and all 3 historical months
  const handleMonthlyRentChange = (val) => {
    const num = val === '' ? '' : Number(val);
    setMonthlyRent(num);

    // Update selected room in vacantRooms state
    if (selectedRoom) {
      setVacantRooms((prev) =>
        prev.map((r) =>
          String(r.roomNumber) === String(selectedRoom) || String(r.roomId) === String(selectedRoom)
            ? { ...r, monthlyRent: num }
            : r
        )
      );
    }

    // Automatically sync into all 3 historical months
    setHistoryRecords((prev) => {
      const updated = { ...prev };
      for (const m of historyMonths) {
        if (updated[m.key]) {
          updated[m.key] = {
            ...updated[m.key],
            rent: num,
          };
        }
      }
      return updated;
    });
  };

  const handleRoomChange = (roomNum) => {
    setSelectedRoom(roomNum);
    const match = vacantRooms.find(
      (r) => String(r.roomNumber) === String(roomNum) || String(r.roomId) === String(roomNum)
    );
    if (match) {
      const rRent = match.monthlyRent !== undefined ? match.monthlyRent : (defaultMonthlyRent || 0);
      const rRate = match.electricityRate !== undefined ? match.electricityRate : (defaultElectricityRate || 0);
      setMonthlyRent(rRent);
      setElectricityRate(rRate);
      setSelectedFloor(normalizeFloor(match.floor));

      // Meter reading at move-in: default to room's current/latest reading if available
      const rReading = match.currentReading ?? match.latestReading ?? match.moveInReading ?? match.subMeter?.currentReading ?? '';
      setMoveInReading(rReading !== '' && rReading !== null && rReading !== undefined ? rReading : '');

      // Single source of truth: sync room rent into ALL 3 historical months
      setHistoryRecords((prev) => {
        const updated = { ...prev };
        for (const m of historyMonths) {
          const rec = updated[m.key] || {};
          updated[m.key] = {
            ...rec,
            rent: rRent,
            rate: rRate,
          };
        }
        return updated;
      });
    }
  };

  const handleRecordChange = (monthKey, field, val) => {
    if (field === 'rent') {
      // Room-based rent sync: changing rent updates the room's rent and all months
      handleMonthlyRentChange(val);
      return;
    }

    setHistoryRecords((prev) => {
      const current = prev[monthKey] || {};
      const updated = {
        ...current,
        [field]: val,
      };
      if (field === 'prevReading') {
        updated.isPrevReadingCustom = true;
      }

      const newMap = {
        ...prev,
        [monthKey]: updated,
      };

      // Auto-carry forward currReading into next month's prevReading if not manually customized
      if (field === 'currReading') {
        const currentIdx = historyMonths.findIndex((m) => m.key === monthKey);
        if (currentIdx >= 0 && currentIdx < historyMonths.length - 1) {
          const nextMonthKey = historyMonths[currentIdx + 1].key;
          const nextRec = prev[nextMonthKey] || {};
          if (!nextRec.isPrevReadingCustom) {
            newMap[nextMonthKey] = {
              ...nextRec,
              prevReading: val,
            };
          }
        }
      }

      return newMap;
    });
  };


  const defaultMetric = {
    isEntered: false,
    hasReadings: false,
    hasPayment: false,
    units: 0,
    powerBill: 0,
    totalBill: 0,
    prevAdvance: 0,
    prevDue: 0,
    amountPayable: 0,
    received: 0,
    balance: 0,
    isAdvance: false,
    isDue: false,
    isSettled: false,
    advanceAmount: 0,
    dueAmount: 0,
    closingAdvance: 0,
    closingDue: 0,
  };

  // Real sequential forward ledger across the 3 historical months
  const reconciliation = useMemo(() => {
    const metricsMap = {};
    let runningAdvance = 0;
    let runningDue = 0;

    // Initial opening balance applies to the first month
    if (openingBalanceType === 'ADVANCE') {
      runningAdvance = Number(openingBalanceAmount) || 0;
    } else if (openingBalanceType === 'DUE') {
      runningDue = Number(openingBalanceAmount) || 0;
    }

    let totalBilled = 0;
    let totalReceived = 0;
    let totalDue = 0;
    let totalCredit = 0;
    let lastEnteredMonthKey = null;

    if (openingBalanceType === 'ADVANCE') {
      totalCredit += Number(openingBalanceAmount) || 0;
    } else if (openingBalanceType === 'DUE') {
      totalDue += Number(openingBalanceAmount) || 0;
    }

    for (let i = 0; i < historyMonths.length; i++) {
      const m = historyMonths[i];
      const rec = historyRecords[m.key] || {};

      const prevStr = rec.prevReading !== undefined && rec.prevReading !== null ? String(rec.prevReading).trim() : '';
      const currStr = rec.currReading !== undefined && rec.currReading !== null ? String(rec.currReading).trim() : '';
      const recStr = rec.amountReceived !== undefined && rec.amountReceived !== null ? String(rec.amountReceived).trim() : '';

      const hasReadings = prevStr !== '' && currStr !== '';
      const hasPayment = recStr !== '';
      const isEntered = hasReadings || hasPayment;

      const prev = Number(prevStr) || 0;
      const curr = Number(currStr) || 0;
      const rent = Number(monthlyRent !== '' && monthlyRent !== undefined ? monthlyRent : (rec.rent || 0));
      const rate = Number(electricityRate !== '' && electricityRate !== undefined ? electricityRate : (rec.rate || 0));
      const received = Number(recStr) || 0;


      const units = hasReadings ? Math.max(0, curr - prev) : 0;
      const powerBill = Math.round(units * rate);
      const totalBill = rent + powerBill;

      // Previous balance carried into this month
      const prevAdvance = runningAdvance;
      const prevDue = runningDue;

      // Amount Payable = Total Bill + Previous Due - Previous Advance
      const netPayableRaw = totalBill + prevDue - prevAdvance;
      const amountPayable = Math.max(0, netPayableRaw);

      let closingAdvance = 0;
      let closingDue = 0;
      let balance = 0;
      let isAdvance = false;
      let isDue = false;
      let isSettled = false;

      if (isEntered) {
        lastEnteredMonthKey = m.key;
        totalBilled += totalBill;
        if (hasPayment) {
          totalReceived += received;
        }

        const diff = received - totalBill;
        if (diff > 0) {
          totalCredit += diff;
        } else if (diff < 0) {
          totalDue += Math.abs(diff);
        }

        // Closing result = Amount Received - Amount Payable (received - netPayableRaw)
        const netClosing = received - netPayableRaw;
        balance = netClosing;

        if (netClosing > 0) {
          closingAdvance = netClosing;
          closingDue = 0;
          isAdvance = true;
        } else if (netClosing < 0) {
          closingDue = Math.abs(netClosing);
          closingAdvance = 0;
          isDue = true;
        } else {
          isSettled = true;
        }

        // Forward this month's closing result to next month
        runningAdvance = closingAdvance;
        runningDue = closingDue;
      }

      metricsMap[m.key] = {
        isEntered,
        hasReadings,
        hasPayment,
        units,
        powerBill,
        totalBill,
        prevAdvance,
        prevDue,
        amountPayable,
        received,
        balance,
        isAdvance,
        isDue,
        isSettled,
        advanceAmount: closingAdvance,
        dueAmount: closingDue,
        closingAdvance,
        closingDue,
      };
    }

    let finalClosingAdvance = 0;
    let finalClosingDue = 0;
    let finalStatus = 'SETTLED';

    if (lastEnteredMonthKey) {
      const lastMetric = metricsMap[lastEnteredMonthKey];
      finalClosingAdvance = lastMetric.closingAdvance;
      finalClosingDue = lastMetric.closingDue;
      finalStatus = lastMetric.isSettled ? 'SETTLED' : (lastMetric.isAdvance ? 'ADVANCE' : 'DUE');
    } else {
      if (openingBalanceType === 'ADVANCE') {
        finalClosingAdvance = Number(openingBalanceAmount) || 0;
        finalStatus = finalClosingAdvance > 0 ? 'ADVANCE' : 'SETTLED';
      } else if (openingBalanceType === 'DUE') {
        finalClosingDue = Number(openingBalanceAmount) || 0;
        finalStatus = finalClosingDue > 0 ? 'DUE' : 'SETTLED';
      }
    }

    const netDue = finalClosingDue > 0 ? finalClosingDue : (finalClosingAdvance > 0 ? -finalClosingAdvance : 0);

    return {
      metricsMap,
      totalBilled,
      totalReceived,
      totalDue,
      totalCredit,
      finalClosingAdvance,
      finalClosingDue,
      finalStatus,
      netDue,
    };
  }, [historyMonths, historyRecords, openingBalanceType, openingBalanceAmount, monthlyRent, electricityRate]);

  const handleSaveTenant = async () => {
    if (!fullName || !fullName.trim()) {
      setError('Please enter tenant full name.');
      return;
    }
    if (!phone || !phone.trim()) {
      setError('Please enter tenant phone number.');
      return;
    }
    if (!selectedRoom) {
      setError('Please select a room to assign.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanPhone = phone.trim().startsWith('+91') ? phone.trim() : `+91 ${phone.trim()}`;
      const cleanEmergency = emergencyContact && emergencyContact.trim()
        ? (emergencyContact.trim().startsWith('+91') ? emergencyContact.trim() : `+91 ${emergencyContact.trim()}`)
        : null;

      if (isEditMode) {
        await tenantAPI.updateTenant(editTenantId, {
          fullName: fullName.trim(),
          mobile: cleanPhone,
          emergencyContact: cleanEmergency,
          roomId: selectedRoom,
          roomNumber: selectedRoom,
          floor: selectedFloor,
          monthlyRent: monthlyRent !== '' ? Number(monthlyRent) : 0,
          electricityRate: electricityRate !== '' ? Number(electricityRate) : 0,
          joinedDate: joiningDate,
          moveInReading: moveInReading !== '' && moveInReading !== null && moveInReading !== undefined ? Number(moveInReading) : null,
        });

        if (selectedRoom) {
          navigate(`/rooms/${selectedRoom}`);
        } else {
          navigate('/tenants');
        }
        return;
      }

      let enteredHistorical = [];
      let finalOpeningBalance = 0;

      if (tenantType === 'EXISTING') {
        if (existingImportMode === 'DIARY' && spreadsheetRows.length > 0) {
          // Filter out trailing unbilled rows that have no payment received and no payment date (upcoming cycle notes in diary)
          const validHistoryRows = spreadsheetRows.filter((r) => {
            const hasPayment = r.amountReceived !== '' && r.amountReceived !== null && r.amountReceived !== undefined && Number(r.amountReceived) > 0;
            const hasDate = r.paymentDate && String(r.paymentDate).trim() !== '';
            const isCovered = Boolean(r.isCombinedCovered || r.paymentCoveredBy);
            const hasReadings = (r.currReading !== '' && r.currReading !== null && Number(r.currReading) > 0) &&
                                (r.prevReading !== '' && r.prevReading !== null);
            return hasPayment || hasDate || isCovered || hasReadings;
          });

          enteredHistorical = validHistoryRows.map((r, idx) => {
            const bRent = r.monthlyRent !== '' && r.monthlyRent !== null ? Number(r.monthlyRent) : 0;
            const pR = r.prevReading !== '' && r.prevReading !== null ? Number(r.prevReading) : null;
            const cR = r.currReading !== '' && r.currReading !== null ? Number(r.currReading) : null;
            const uCons = r.unitsConsumed !== '' && r.unitsConsumed !== null ? Number(r.unitsConsumed) : 0;
            const eRate = r.electricityRate !== '' && r.electricityRate !== null ? Number(r.electricityRate) : Number(electricityRate || 0);
            const eAmt = r.electricityAmount !== '' && r.electricityAmount !== null ? Number(r.electricityAmount) : (uCons * eRate);
            const tBill = r.totalBill !== '' && r.totalBill !== null ? Number(r.totalBill) : (bRent + eAmt);
            const pDue = r.previousDue !== '' && r.previousDue !== null ? Number(r.previousDue) : 0;
            const pAdv = r.previousAdvance !== '' && r.previousAdvance !== null ? Number(r.previousAdvance) : 0;
            const amtPayable = tBill;
            const amtRec = r.amountReceived !== '' && r.amountReceived !== null ? Number(r.amountReceived) : null;
            const cDue = r.closingDue !== '' && r.closingDue !== null ? Number(r.closingDue) : 0;
            const cAdv = r.closingAdvance !== '' && r.closingAdvance !== null ? Number(r.closingAdvance) : 0;

            let status = 'SETTLED';
            if (cDue > 0) {
              status = 'DUE';
            } else if (cAdv > 0) {
              status = 'ADVANCE';
            } else if (amtRec === null && !r.isCombinedCovered && !r.paymentCoveredBy) {
              status = 'DUE';
            }

            return {
              key: r.key || `HIST-${idx + 1}`,
              name: r.month || `Month ${idx + 1}`,
              month: r.monthShort || 'HIST',
              year: r.year || new Date().getFullYear(),
              prevReading: pR,
              currReading: cR,
              unitsConsumed: uCons,
              monthlyRent: bRent,
              electricityRate: eRate,
              electricityAmount: eAmt,
              totalBill: tBill,
              amountPayable: amtPayable,
              amountReceived: amtRec,
              paymentDate: r.paymentDate || null,
              closingAdvance: cAdv,
              closingDue: cDue,
              balance: cDue > 0 ? cDue : (cAdv > 0 ? -cAdv : 0),
              isEntered: true,
              status,
            };
          });

          finalOpeningBalance = spreadsheetSummary.netDue > 0
            ? -spreadsheetSummary.netDue
            : (spreadsheetSummary.netAdvance > 0 ? spreadsheetSummary.netAdvance : 0);
        } else {
          enteredHistorical = historyMonths.map((m) => {
            const rec = historyRecords[m.key] || {};
            const met = reconciliation.metricsMap[m.key] || defaultMetric;
            return {
              key: m.key,
              name: m.name,
              month: m.shortName,
              year: m.year,
              prevReading: rec.prevReading !== '' ? Number(rec.prevReading) : null,
              currReading: rec.currReading !== '' ? Number(rec.currReading) : null,
              unitsConsumed: met.units,
              monthlyRent: rec.rent !== '' ? Number(rec.rent) : 0,
              electricityRate: rec.rate !== '' ? Number(rec.rate) : 0,
              electricityAmount: met.powerBill,
              totalBill: met.totalBill,
              amountPayable: met.amountPayable,
              amountReceived: rec.amountReceived !== '' ? Number(rec.amountReceived) : null,
              paymentDate: rec.paymentDate || null,
              closingAdvance: met.closingAdvance,
              closingDue: met.closingDue,
              balance: met.balance,
              isEntered: met.isEntered,
              status: met.isSettled ? 'SETTLED' : (met.isAdvance ? 'ADVANCE' : (met.isDue ? 'DUE' : 'NOT_ENTERED')),
            };
          }).filter((h) => h.isEntered);

          finalOpeningBalance = reconciliation.netDue;
        }
      }

      await tenantAPI.create({
        fullName: fullName.trim(),
        mobile: cleanPhone,
        emergencyContact: cleanEmergency,
        roomId: selectedRoom,
        roomNumber: selectedRoom,
        floor: selectedFloor,
        monthlyRent: monthlyRent !== '' ? Number(monthlyRent) : 0,
        electricityRate: electricityRate !== '' ? Number(electricityRate) : 0,
        joinedDate: joiningDate,
        openingBalance: tenantType === 'EXISTING' ? finalOpeningBalance : 0,
        moveInReading: tenantType === 'NEW' && moveInReading !== '' && moveInReading !== null && moveInReading !== undefined ? Number(moveInReading) : null,
        historicalRecords: enteredHistorical,
      });

      // Navigate back to room detail or tenants list
      if (preselectedRoom) {
        navigate(`/rooms/${selectedRoom}`);
      } else {
        navigate('/tenants');
      }
    } catch (err) {
      setError(err?.message || 'Failed to save tenant. Please verify details and try again.');
    } finally {
      setLoading(false);
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
              onClick={() => (selectedRoom ? navigate(`/rooms/${selectedRoom}`) : navigate('/tenants'))}
              aria-label={isEditMode ? "Back to Room" : "Back to Tenants"}
            >
              <ArrowLeft size={20} strokeWidth={2.2} />
            </button>
            <div>
              <h1 style={{ fontSize: '17px', fontWeight: 700, lineHeight: '1.2' }}>
                {isEditMode ? 'Edit Tenant' : 'Add New Tenant'}
              </h1>
              <p style={{ fontSize: '11px', color: '#64748B' }}>
                {isEditMode ? 'Update tenant details, room assignment and rates.' : 'Add basic tenant details to start their lease.'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="icon-btn-header"
              onClick={() => (selectedRoom ? navigate(`/rooms/${selectedRoom}`) : navigate('/tenants'))}
              aria-label="Close"
            >
              <X size={20} strokeWidth={2.2} />
            </button>
            <div className="user-avatar-circle">
              <User size={18} />
            </div>
          </div>
        </header>

        {/* Content Form */}
        <div className="app-content" style={{ padding: '16px', gap: '16px', flex: 1, paddingBottom: '30px' }}>
          {error && (
            <div
              style={{
                backgroundColor: '#FEE2E2',
                border: '1px solid #FECACA',
                borderRadius: '12px',
                padding: '12px 14px',
                color: '#DC2626',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* CARD 1: Tenant Information */}
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
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '32px' }}>
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
                  <Building size={16} />
                </div>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-text-main)' }}>Tenant Information</span>
              </div>

              <span
                style={{
                  color: '#64748B',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                Primary Details
              </span>
            </div>

            {/* Full Name */}
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div className="input-container">
                <div className="input-icon-left">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="form-group">
              <label className="form-label">Phone / WhatsApp</label>
              <div className="input-container" style={{ paddingRight: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    paddingRight: '8px',
                    borderRight: '1px solid var(--color-border)',
                    marginRight: '8px',
                    fontWeight: 700,
                    fontSize: '13.5px',
                  }}
                >
                  <span>🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field"
                />
                {phone.trim().length >= 10 && <CheckCircle2 size={18} color="#16A34A" />}
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="form-group">
              <label className="form-label">Emergency Contact (Optional)</label>
              <div className="input-container" style={{ paddingRight: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    paddingRight: '8px',
                    borderRight: '1px solid var(--color-border)',
                    marginRight: '8px',
                    fontWeight: 700,
                    fontSize: '13.5px',
                  }}
                >
                  <span>🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  placeholder="98765 43210"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {/* Joining / Move-in Date */}
            <div className="form-group">
              <label className="form-label">Joining / Move-in Date</label>
              <div className="input-container">
                <div className="input-icon-left">
                  <Calendar size={18} />
                </div>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="input-field"
                  style={{ cursor: 'pointer' }}
                />
              </div>
            </div>

            {/* Room & Floor Selection (Side-by-side) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Room Dropdown */}
              <div className="form-group">
                <label className="form-label">Room</label>
                <div className="input-container">
                  <div className="input-icon-left">
                    <DoorClosed size={18} />
                  </div>
                  <select
                    value={selectedRoom}
                    onChange={(e) => handleRoomChange(e.target.value)}
                    className="input-field"
                    style={{ cursor: 'pointer', appearance: 'auto' }}
                    disabled={loadingRooms || (!selectedRoom && vacantRooms.length === 0)}
                  >
                    {loadingRooms ? (
                      <option value="">Loading...</option>
                    ) : vacantRooms.length === 0 ? (
                      <option value="">No rooms available</option>
                    ) : (
                      vacantRooms.map((r) => (
                        <option key={r.roomNumber} value={r.roomNumber}>
                          Room {r.roomNumber}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Floor Dropdown */}
              <div className="form-group">
                <label className="form-label">Floor</label>
                <div className="input-container">
                  <div className="input-icon-left">
                    <Building size={18} />
                  </div>
                  <select
                    value={selectedFloor}
                    onChange={(e) => setSelectedFloor(e.target.value)}
                    className="input-field"
                    style={{ cursor: 'pointer', appearance: 'auto' }}
                  >
                    <option value="Ground">Ground</option>
                    <option value="1st Floor">1st Floor</option>
                    <option value="2nd Floor">2nd Floor</option>
                    <option value="3rd Floor">3rd Floor</option>
                    <option value="4th Floor">4th Floor</option>
                    <option value="5th Floor">5th Floor</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: Tenant Status */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '32px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                Tenant Status
              </span>
              <span
                style={{
                  backgroundColor: '#EFF6FF',
                  color: 'var(--color-interactive)',
                  border: '1px solid #DBEAFE',
                  borderRadius: '9999px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                Billing Setup
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', lineHeight: '1.4', margin: 0 }}>
              Choose how this tenant's billing starts.
            </p>

            {/* Two Selectable Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
              {/* Card 1: New Tenant */}
              <div
                onClick={() => setTenantType('NEW')}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
                  padding: '14px',
                  cursor: 'pointer',
                  border: tenantType === 'NEW' ? '2px solid var(--color-interactive)' : '1px solid var(--color-border)',
                  boxShadow: tenantType === 'NEW' ? '0 0 0 1px var(--color-interactive)' : 'var(--shadow-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      backgroundColor: tenantType === 'NEW' ? '#DBEAFE' : '#F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: tenantType === 'NEW' ? 'var(--color-interactive)' : '#64748B',
                    }}
                  >
                    <Users size={18} />
                  </div>

                  {tenantType === 'NEW' && (
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-interactive)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                      }}
                    >
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-main)' }}>New Tenant</div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: tenantType === 'NEW' ? 'var(--color-interactive)' : '#64748B',
                      marginTop: '2px',
                      lineHeight: '1.35',
                      fontWeight: 500,
                    }}
                  >
                    Starting fresh from today with zero past entries
                  </div>
                </div>
              </div>

              {/* Card 2: Existing Tenant */}
              <div
                onClick={() => setTenantType('EXISTING')}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
                  padding: '14px',
                  cursor: 'pointer',
                  border: tenantType === 'EXISTING' ? '2px solid var(--color-interactive)' : '1px solid var(--color-border)',
                  boxShadow: tenantType === 'EXISTING' ? '0 0 0 1px var(--color-interactive)' : 'var(--shadow-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  position: 'relative',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      backgroundColor: tenantType === 'EXISTING' ? '#DBEAFE' : '#F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: tenantType === 'EXISTING' ? 'var(--color-interactive)' : '#64748B',
                    }}
                  >
                    <FileText size={18} />
                  </div>

                  {tenantType === 'EXISTING' && (
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-interactive)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                      }}
                    >
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-main)' }}>Existing Tenant</div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: tenantType === 'EXISTING' ? 'var(--color-interactive)' : '#64748B',
                      marginTop: '2px',
                      lineHeight: '1.35',
                      fontWeight: 500,
                    }}
                  >
                    Import past meter logs & balance reconciliations
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: New Tenant Billing & Move-in */}
          {tenantType === 'NEW' && (
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
              {/* Meter Reading at Move-in */}
              <div className="form-group">
                <label className="form-label">Meter Reading at Move-in</label>
                <div className="input-container" style={{ paddingRight: '12px' }}>
                  <div className="input-icon-left">
                    <Zap size={18} color="#64748B" />
                  </div>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 1025"
                    value={moveInReading !== undefined ? moveInReading : ''}
                    onChange={(e) => setMoveInReading(e.target.value)}
                    className="input-field tabular-nums"
                    style={{ fontWeight: 700 }}
                  />
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>kWh</span>
                </div>
              </div>

              {/* Room Pricing */}
              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #DBEAFE',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCard size={15} color="var(--color-interactive)" />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-main)' }}>Room Pricing</span>
                  </div>
                  <span
                    style={{
                      backgroundColor: '#EFF6FF',
                      color: 'var(--color-interactive)',
                      border: '1px solid #DBEAFE',
                      borderRadius: '9999px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    Standard Rates
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Monthly Rent (Room-based Single Source of Truth) */}
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '10px', border: '1px solid #DBEAFE' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Monthly Rent</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-main)' }}>₹</span>
                      <input
                        type="number"
                        value={monthlyRent}
                        onChange={(e) => handleMonthlyRentChange(e.target.value)}
                        style={{
                          border: 'none',
                          outline: 'none',
                          fontSize: '15px',
                          fontWeight: 800,
                          color: 'var(--color-text-main)',
                          width: '100%',
                          backgroundColor: 'transparent',
                          padding: 0,
                          fontFamily: 'inherit',
                        }}
                        placeholder="8000"
                      />
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap' }}>/ month</span>
                    </div>
                  </div>

                  {/* Electricity Rate (Editable) */}
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '10px', border: '1px solid #DBEAFE' }}>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Electricity Rate</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-main)' }}>₹</span>
                      <input
                        type="number"
                        step="any"
                        value={electricityRate}
                        onChange={(e) => setElectricityRate(e.target.value === '' ? '' : Number(e.target.value))}
                        style={{
                          border: 'none',
                          outline: 'none',
                          fontSize: '15px',
                          fontWeight: 800,
                          color: 'var(--color-text-main)',
                          width: '100%',
                          backgroundColor: 'transparent',
                          padding: 0,
                          fontFamily: 'inherit',
                        }}
                        placeholder="10"
                      />
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap' }}>/ unit</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PAGE 3: REVEALED WHEN EXISTING TENANT IS SELECTED */}
          {tenantType === 'EXISTING' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
              {/* Header */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={17} color="var(--color-interactive)" />
                    <span style={{ fontSize: '15px', fontWeight: 800 }}>Historical Records</span>
                  </div>
                  <span
                    style={{
                      backgroundColor: '#EFF6FF',
                      color: 'var(--color-interactive)',
                      border: '1px solid #DBEAFE',
                      borderRadius: '9999px',
                      padding: '2px 8px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                    }}
                  >
                    UP TO 12 MONTHS
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                  Add previous rent and electricity records.
                </p>
              </div>

              {/* Mode Toggle Switcher */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  padding: '3px',
                  backgroundColor: '#F1F5F9',
                  borderRadius: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setExistingImportMode('DIARY')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '7px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    border: 'none',
                    backgroundColor: existingImportMode === 'DIARY' ? '#FFFFFF' : 'transparent',
                    color: existingImportMode === 'DIARY' ? '#0F172A' : '#64748B',
                    boxShadow: existingImportMode === 'DIARY' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={14} color="#2563EB" />
                  <span>AI Diary Scan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExistingImportMode('MANUAL')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '7px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    border: 'none',
                    backgroundColor: existingImportMode === 'MANUAL' ? '#FFFFFF' : 'transparent',
                    color: existingImportMode === 'MANUAL' ? '#0F172A' : '#64748B',
                    boxShadow: existingImportMode === 'MANUAL' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Pencil size={13} />
                  <span>Manual Entry</span>
                </button>
              </div>

              {/* MODE 1: AI DIARY SCANNER & SPREADSHEET PREVIEW */}
              {existingImportMode === 'DIARY' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Photo Upload Card */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--color-border)',
                      borderRadius: '14px',
                      padding: '14px',
                      boxShadow: 'var(--shadow-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '8px',
                          backgroundColor: '#EFF6FF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#2563EB',
                        }}
                      >
                        <Camera size={15} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                          Upload Diary Photos
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                          Upload photos of your rent diary.
                        </div>
                      </div>
                    </div>

                    {/* Hidden File Input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFilesSelected}
                      style={{ display: 'none' }}
                    />

                    {/* Dropzone Container */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: '1.5px dashed #93C5FD',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '10px',
                        padding: '16px 12px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
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
                          margin: '0 auto 6px',
                        }}
                      >
                        <UploadCloud size={18} />
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                        + Add Diary Photos
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                        JPG, PNG or WebP
                      </div>
                    </div>

                    {/* Uploaded Images Preview Grid */}
                    {diaryFiles.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                            Uploaded Diary Pages ({diaryFiles.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: 'var(--color-interactive)',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Plus size={13} />
                            <span>Add Page</span>
                          </button>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                            gap: '10px',
                          }}
                        >
                          {diaryFiles.map((item, idx) => (
                            <div
                              key={item.id}
                              style={{
                                border: '1px solid #E2E8F0',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                backgroundColor: '#FFFFFF',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                              }}
                            >
                              <div
                                style={{
                                  height: '90px',
                                  backgroundColor: '#0F172A',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  position: 'relative',
                                }}
                                onClick={() => setPreviewModalImage({ url: item.previewUrl, name: item.name, pageIndex: idx + 1 })}
                              >
                                <img
                                  src={item.previewUrl}
                                  alt={`Page ${idx + 1}`}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    opacity: 0.9,
                                  }}
                                />
                                <span
                                  style={{
                                    position: 'absolute',
                                    top: '4px',
                                    left: '4px',
                                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                                    color: '#FFFFFF',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  Page {idx + 1}
                                </span>
                              </div>

                              <div style={{ padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '11px', color: '#64748B' }}>
                                  {item.size}
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewModalImage({ url: item.previewUrl, name: item.name, pageIndex: idx + 1 })}
                                    style={{
                                      backgroundColor: '#EFF6FF',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '3px',
                                      cursor: 'pointer',
                                      color: '#2563EB',
                                    }}
                                    title="View Full Image"
                                  >
                                    <Eye size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeDiaryFile(item.id)}
                                    style={{
                                      backgroundColor: '#FEE2E2',
                                      border: 'none',
                                      borderRadius: '4px',
                                      padding: '3px',
                                      cursor: 'pointer',
                                      color: '#DC2626',
                                    }}
                                    title="Remove Page"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Scan Button */}
                    <button
                      type="button"
                      onClick={handleScanDiary}
                      disabled={scanning || diaryFiles.length === 0}
                      style={{
                        width: '100%',
                        height: '42px',
                        borderRadius: '10px',
                        backgroundColor: '#0F172A',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '7px',
                        border: 'none',
                        cursor: scanning || diaryFiles.length === 0 ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.15)',
                        opacity: scanning || diaryFiles.length === 0 ? 0.6 : 1,
                      }}
                    >
                      {scanning ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          <span>Scanning with AI ({scanElapsed}s)...</span>
                        </>
                      ) : (
                        <>
                          <Zap size={15} color="#22C55E" fill="#22C55E" />
                          <span>Scan with AI</span>
                        </>
                      )}
                    </button>

                    {/* Dynamic Scanning Progress Feedback */}
                    {scanning && (
                      <div
                        style={{
                          backgroundColor: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          fontSize: '11.5px',
                          color: '#15803D',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Sparkles size={14} color="#16A34A" />
                          <span>Reading handwritten records ({scanElapsed}s)...</span>
                        </div>
                        {scanElapsed >= 15 && (
                          <button
                            type="button"
                            onClick={() => {
                              setScanning(false);
                              if (spreadsheetRows.length === 0) startBlankSpreadsheet();
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#15803D',
                              textDecoration: 'underline',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: '2px 4px',
                            }}
                          >
                            Skip
                          </button>
                        )}
                      </div>
                    )}

                    {/* Scan Error Alert */}
                    {scanError && (
                      <div
                        style={{
                          backgroundColor: '#FEF2F2',
                          border: '1px solid #FECACA',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '12px',
                          color: '#DC2626',
                        }}
                      >
                        <AlertCircle size={15} style={{ flexShrink: 0 }} />
                        <span>{scanError}</span>
                      </div>
                    )}

                    {/* Option to start blank spreadsheet without photo */}
                    {spreadsheetRows.length === 0 && !scanning && (
                      <div style={{ textAlign: 'center', paddingTop: '2px' }}>
                        <button
                          type="button"
                          onClick={startBlankSpreadsheet}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-interactive)',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <Pencil size={12} />
                          <span>Or enter records manually without photo</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SPREADSHEET COMPONENT (Visible after scan or start) */}
                  {spreadsheetRows.length > 0 && (
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--color-border)',
                        borderRadius: '14px',
                        padding: '14px',
                        boxShadow: 'var(--shadow-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {/* Spreadsheet Header & Status Strip */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Table size={16} color="var(--color-interactive)" />
                              <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A' }}>
                                Review Extracted Records
                              </span>
                            </div>
                            <span
                              style={{
                                backgroundColor: '#EFF6FF',
                                color: 'var(--color-interactive)',
                                border: '1px solid #DBEAFE',
                                padding: '1px 8px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: 700,
                              }}
                            >
                              {spreadsheetRows.length} months detected
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            Click any cell to edit.
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={addSpreadsheetRow}
                            disabled={spreadsheetRows.length >= 12}
                            style={{
                              backgroundColor: '#EFF6FF',
                              border: '1px solid #DBEAFE',
                              borderRadius: '7px',
                              padding: '5px 10px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: 'var(--color-interactive)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: spreadsheetRows.length >= 12 ? 'not-allowed' : 'pointer',
                              opacity: spreadsheetRows.length >= 12 ? 0.6 : 1,
                            }}
                          >
                            <Plus size={12} />
                            <span>Add Month</span>
                          </button>
                        </div>
                      </div>

                      {/* Scrollable Spreadsheet Table */}
                      <div
                        style={{
                          width: '100%',
                          overflowX: 'auto',
                          border: '1px solid #E2E8F0',
                          borderRadius: '10px',
                          WebkitOverflowScrolling: 'touch',
                        }}
                      >
                        <table
                          style={{
                            width: '100%',
                            minWidth: '880px',
                            borderCollapse: 'collapse',
                            fontSize: '12px',
                            textAlign: 'left',
                          }}
                        >
                          <thead>
                            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #CBD5E1' }}>
                              <th style={{ padding: '8px 6px', fontWeight: 800, color: '#475569', width: '30px', textAlign: 'center' }}>#</th>
                              <th style={{ padding: '8px 8px', fontWeight: 800, color: '#475569', minWidth: '110px' }}>Month</th>
                              <th style={{ padding: '8px 8px', fontWeight: 800, color: '#475569', minWidth: '80px' }}>Rent (₹)</th>
                              <th style={{ padding: '8px 8px', fontWeight: 800, color: '#475569', minWidth: '85px' }}>Prev Reading</th>
                              <th style={{ padding: '8px 8px', fontWeight: 800, color: '#475569', minWidth: '85px' }}>Curr Reading</th>
                              <th style={{ padding: '8px 8px', fontWeight: 800, color: '#475569', minWidth: '60px' }}>Units</th>
                              <th style={{ padding: '8px 8px', fontWeight: 800, color: '#475569', minWidth: '80px' }}>Elec (₹)</th>
                              <th style={{ padding: '8px 8px', fontWeight: 800, color: '#475569', minWidth: '95px' }}>Amount Recv (₹)</th>
                              <th style={{ padding: '8px 8px', fontWeight: 800, color: '#475569', minWidth: '130px' }}>Payment Date (DD/MM/YYYY)</th>
                              <th style={{ padding: '8px 8px', fontWeight: 800, color: '#475569', minWidth: '105px' }}>Payment Due (₹)</th>
                              <th style={{ padding: '8px 8px', fontWeight: 800, color: '#475569', minWidth: '85px' }}>Advance (₹)</th>
                              <th style={{ padding: '8px 8px', fontWeight: 800, color: '#475569', minWidth: '115px' }}>Status</th>
                              <th style={{ padding: '8px 6px', fontWeight: 800, color: '#475569', width: '36px', textAlign: 'center' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {spreadsheetRows.map((row, idx) => {
                              const isReview = Boolean(row.reviewRequired);
                              return (
                                <tr
                                  key={row.id || idx}
                                  style={{
                                    borderBottom: '1px solid #E2E8F0',
                                    backgroundColor: isReview ? '#FFFBEB' : (idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'),
                                  }}
                                >
                                  {/* Row index */}
                                  <td style={{ padding: '6px', textAlign: 'center', fontWeight: 700, color: '#94A3B8' }}>
                                    {idx + 1}
                                  </td>

                                  {/* Month */}
                                  <td style={{ padding: '6px' }}>
                                    <input
                                      type="text"
                                      value={row.month || ''}
                                      onChange={(e) => updateSpreadsheetCell(idx, 'month', e.target.value)}
                                      style={{
                                        width: '100%',
                                        padding: '4px 6px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        border: '1px solid #CBD5E1',
                                        borderRadius: '6px',
                                        backgroundColor: '#FFFFFF',
                                      }}
                                    />
                                  </td>

                                  {/* Rent */}
                                  <td style={{ padding: '6px' }}>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={
                                        focusedNumberCell?.idx === idx && focusedNumberCell?.field === 'monthlyRent'
                                          ? (row.monthlyRent === '0' || row.monthlyRent === 0 || row.monthlyRent === '' ? '' : (row.monthlyRent ?? ''))
                                          : (row.monthlyRent === '' || row.monthlyRent === null || row.monthlyRent === undefined || row.monthlyRent === '0' || row.monthlyRent === 0 ? '0' : row.monthlyRent)
                                      }
                                      onFocus={(e) => {
                                        setFocusedNumberCell({ idx, field: 'monthlyRent' });
                                        e.target.select();
                                      }}
                                      onBlur={() => {
                                        setFocusedNumberCell(null);
                                        if (row.monthlyRent === '' || row.monthlyRent === null || row.monthlyRent === undefined) {
                                          updateSpreadsheetCell(idx, 'monthlyRent', '0');
                                        }
                                      }}
                                      onChange={(e) => updateSpreadsheetCell(idx, 'monthlyRent', cleanNumberInput(e.target.value))}
                                      placeholder="0"
                                      className="tabular-nums"
                                      style={{
                                        width: '100%',
                                        padding: '4px 6px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        border: row.unclearFields?.includes('monthlyRent') ? '1px solid #F59E0B' : '1px solid #CBD5E1',
                                        borderRadius: '6px',
                                        backgroundColor: '#FFFFFF',
                                        textAlign: 'center',
                                      }}
                                    />
                                  </td>

                                  {/* Prev Reading */}
                                  <td style={{ padding: '6px' }}>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={
                                        focusedNumberCell?.idx === idx && focusedNumberCell?.field === 'prevReading'
                                          ? (row.prevReading === '0' || row.prevReading === 0 || row.prevReading === '' ? '' : (row.prevReading ?? ''))
                                          : (row.prevReading !== null && row.prevReading !== undefined ? row.prevReading : '')
                                      }
                                      onFocus={(e) => {
                                        setFocusedNumberCell({ idx, field: 'prevReading' });
                                        e.target.select();
                                      }}
                                      onBlur={() => setFocusedNumberCell(null)}
                                      onChange={(e) => updateSpreadsheetCell(idx, 'prevReading', cleanNumberInput(e.target.value))}
                                      placeholder="Not Recorded"
                                      className="tabular-nums"
                                      style={{
                                        width: '100%',
                                        padding: '4px 6px',
                                        fontSize: '11.5px',
                                        fontStyle: (row.prevReading === null || row.prevReading === undefined || row.prevReading === '') ? 'italic' : 'normal',
                                        color: (row.prevReading === null || row.prevReading === undefined || row.prevReading === '') ? '#94A3B8' : '#0F172A',
                                        border: row.unclearFields?.includes('prevReading') ? '1px solid #F59E0B' : '1px solid #CBD5E1',
                                        borderRadius: '6px',
                                        backgroundColor: (row.prevReading === null || row.prevReading === undefined || row.prevReading === '') ? '#F8FAFC' : '#FFFFFF',
                                        textAlign: 'center',
                                      }}
                                    />
                                  </td>

                                  {/* Curr Reading */}
                                  <td style={{ padding: '6px' }}>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={
                                        focusedNumberCell?.idx === idx && focusedNumberCell?.field === 'currReading'
                                          ? (row.currReading === '0' || row.currReading === 0 || row.currReading === '' ? '' : (row.currReading ?? ''))
                                          : (row.currReading !== null && row.currReading !== undefined ? row.currReading : '')
                                      }
                                      onFocus={(e) => {
                                        setFocusedNumberCell({ idx, field: 'currReading' });
                                        e.target.select();
                                      }}
                                      onBlur={() => setFocusedNumberCell(null)}
                                      onChange={(e) => updateSpreadsheetCell(idx, 'currReading', cleanNumberInput(e.target.value))}
                                      placeholder="Not Recorded"
                                      className="tabular-nums"
                                      style={{
                                        width: '100%',
                                        padding: '4px 6px',
                                        fontSize: '11.5px',
                                        fontWeight: (row.currReading !== null && row.currReading !== undefined && row.currReading !== '') ? 700 : 400,
                                        fontStyle: (row.currReading === null || row.currReading === undefined || row.currReading === '') ? 'italic' : 'normal',
                                        color: (row.currReading === null || row.currReading === undefined || row.currReading === '') ? '#94A3B8' : '#0F172A',
                                        border: row.unclearFields?.includes('currReading') ? '1px solid #F59E0B' : '1px solid #CBD5E1',
                                        borderRadius: '6px',
                                        backgroundColor: (row.currReading === null || row.currReading === undefined || row.currReading === '') ? '#F8FAFC' : '#FFFFFF',
                                        textAlign: 'center',
                                      }}
                                    />
                                  </td>

                                  {/* Units (auto) - Clearly distinguishes Not Recorded from actual zero */}
                                  <td style={{ padding: '6px', textAlign: 'center' }}>
                                    {row.unitsConsumed !== null && row.unitsConsumed !== undefined ? (
                                      <span
                                        className="tabular-nums"
                                        style={{
                                          backgroundColor: '#F1F5F9',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          color: '#334155',
                                        }}
                                      >
                                        {row.unitsConsumed}
                                      </span>
                                    ) : (
                                      <span
                                        style={{
                                          backgroundColor: '#F8FAFC',
                                          border: '1px dashed #CBD5E1',
                                          padding: '2px 5px',
                                          borderRadius: '4px',
                                          fontSize: '10px',
                                          color: '#94A3B8',
                                          fontStyle: 'italic',
                                          display: 'inline-block',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        Not Recorded
                                      </span>
                                    )}
                                  </td>

                                  {/* Electricity Amount (auto) */}
                                  <td style={{ padding: '6px' }}>
                                    {row.electricityAmount !== null && row.electricityAmount !== undefined ? (
                                      <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                                        ₹{Number(row.electricityAmount).toLocaleString('en-IN')}
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '11.5px', color: '#94A3B8', fontStyle: 'italic' }}>
                                        —
                                      </span>
                                    )}
                                  </td>

                                  {/* Amount Received */}
                                  <td style={{ padding: '6px' }}>
                                    {row.isCombinedCovered && editingCoveredIdx !== idx ? (
                                      <div
                                        onClick={() => setEditingCoveredIdx(idx)}
                                        title="Click to enter payment amount"
                                        style={{
                                          fontSize: '10.5px',
                                          color: '#1D4ED8',
                                          backgroundColor: '#EFF6FF',
                                          border: '1px solid #BFDBFE',
                                          borderRadius: '6px',
                                          padding: '4px 6px',
                                          fontWeight: 700,
                                          whiteSpace: 'nowrap',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          cursor: 'pointer',
                                          userSelect: 'none',
                                        }}
                                      >
                                        <Link2 size={12} />
                                        <span>{row.paymentCoveredBy ? `Covered (${row.paymentCoveredBy.split(' ')[0]})` : 'Covered'}</span>
                                      </div>
                                    ) : (
                                      <input
                                        type="text"
                                        inputMode="numeric"
                                        autoFocus={editingCoveredIdx === idx}
                                        value={
                                          focusedNumberCell?.idx === idx && focusedNumberCell?.field === 'amountReceived'
                                            ? (row.amountReceived === '0' || row.amountReceived === 0 || row.amountReceived === '' ? '' : (row.amountReceived ?? ''))
                                            : (row.amountReceived === '' || row.amountReceived === null || row.amountReceived === undefined || row.amountReceived === '0' || row.amountReceived === 0 ? '0' : row.amountReceived)
                                        }
                                        onFocus={(e) => {
                                          setFocusedNumberCell({ idx, field: 'amountReceived' });
                                          e.target.select();
                                        }}
                                        onChange={(e) => updateSpreadsheetCell(idx, 'amountReceived', cleanNumberInput(e.target.value))}
                                        onBlur={(e) => {
                                          setFocusedNumberCell(null);
                                          if (editingCoveredIdx === idx) {
                                            const val = String(e.target.value || '').trim();
                                            if (val === '') {
                                              updateSpreadsheetCell(idx, 'amountReceived', '');
                                            }
                                            setEditingCoveredIdx(null);
                                          } else {
                                            if (row.amountReceived === '' || row.amountReceived === null || row.amountReceived === undefined) {
                                              updateSpreadsheetCell(idx, 'amountReceived', '0');
                                            }
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.target.blur();
                                          } else if (e.key === 'Escape') {
                                            if (editingCoveredIdx === idx) {
                                              updateSpreadsheetCell(idx, 'amountReceived', '');
                                              setEditingCoveredIdx(null);
                                            }
                                          }
                                        }}
                                        placeholder="0"
                                        className="tabular-nums"
                                        style={{
                                          width: '100%',
                                          padding: '4px 6px',
                                          fontSize: '12px',
                                          fontWeight: 700,
                                          color: '#16A34A',
                                          border: row.unclearFields?.includes('amountReceived') ? '1px solid #F59E0B' : (editingCoveredIdx === idx ? '1.5px solid #3B82F6' : '1px solid #CBD5E1'),
                                          borderRadius: '6px',
                                          backgroundColor: '#FFFFFF',
                                          textAlign: 'center',
                                        }}
                                      />
                                    )}
                                  </td>

                                  {/* Payment Date (DD/MM/YYYY with calendar picker) */}
                                  <td style={{ padding: '6px' }}>
                                    <div
                                      style={{
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        width: '100%',
                                        minWidth: '115px',
                                      }}
                                    >
                                      <input
                                        type="text"
                                        maxLength={10}
                                        value={row.paymentDate || ''}
                                        onChange={(e) => handleDateChange(idx, e.target.value)}
                                        onBlur={(e) => handleDateBlur(idx, e.target.value)}
                                        placeholder={row.isCombinedCovered ? 'Covered' : 'DD/MM/YYYY'}
                                        style={{
                                          width: '100%',
                                          padding: '4px 22px 4px 6px',
                                          fontSize: '11.5px',
                                          fontWeight: 700,
                                          border: row.unclearFields?.includes('paymentDate') ? '1px solid #F59E0B' : '1px solid #CBD5E1',
                                          borderRadius: '6px',
                                          backgroundColor: '#FFFFFF',
                                          color: '#0F172A',
                                          textAlign: 'center',
                                        }}
                                      />
                                      <label
                                        style={{
                                          position: 'absolute',
                                          right: '4px',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: '#64748B',
                                        }}
                                        title="Open Calendar"
                                      >
                                        <Calendar size={13} />
                                        <input
                                          type="date"
                                          value={parseDateToIso(row.paymentDate)}
                                          onChange={(e) => {
                                            if (e.target.value) {
                                              updateSpreadsheetCell(idx, 'paymentDate', formatToDdMmYyyy(e.target.value));
                                            } else {
                                              updateSpreadsheetCell(idx, 'paymentDate', '');
                                            }
                                          }}
                                          style={{
                                            position: 'absolute',
                                            top: 0,
                                            right: 0,
                                            width: '14px',
                                            height: '14px',
                                            opacity: 0,
                                            cursor: 'pointer',
                                          }}
                                        />
                                      </label>
                                    </div>
                                  </td>

                                  {/* Payment Due - Fully editable without spinners, click to clear 0 */}
                                  <td style={{ padding: '6px' }}>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={
                                        focusedNumberCell?.idx === idx && focusedNumberCell?.field === 'previousDue'
                                          ? (row.previousDue === '0' || row.previousDue === 0 || row.previousDue === '' ? '' : (row.previousDue || ''))
                                          : (row.previousDue === '' || row.previousDue === null || row.previousDue === undefined || row.previousDue === '0' || row.previousDue === 0 ? '0' : row.previousDue)
                                      }
                                      onChange={(e) => updateSpreadsheetCell(idx, 'previousDue', cleanNumberInput(e.target.value))}
                                      onFocus={(e) => {
                                        setFocusedNumberCell({ idx, field: 'previousDue' });
                                        e.target.select();
                                      }}
                                      onBlur={() => {
                                        setFocusedNumberCell(null);
                                        if (row.previousDue === '' || row.previousDue === null || row.previousDue === undefined) {
                                          updateSpreadsheetCell(idx, 'previousDue', '0');
                                        }
                                      }}
                                      className="tabular-nums"
                                      placeholder="0"
                                      style={{
                                        width: '100%',
                                        padding: '4px 6px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        border: row.unclearFields?.includes('previousDue') ? '2px solid #F59E0B' : '1px solid #CBD5E1',
                                        borderRadius: '6px',
                                        backgroundColor: row.unclearFields?.includes('previousDue') ? '#FFFBEB' : '#FFFFFF',
                                        color: Number(row.previousDue) > 0 ? '#DC2626' : '#0F172A',
                                        textAlign: 'center',
                                      }}
                                    />
                                  </td>

                                  {/* Advance - Fully editable without spinners, click to clear 0 */}
                                  <td style={{ padding: '6px' }}>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={
                                        focusedNumberCell?.idx === idx && focusedNumberCell?.field === 'previousAdvance'
                                          ? (row.previousAdvance === '0' || row.previousAdvance === 0 || row.previousAdvance === '' ? '' : (row.previousAdvance || ''))
                                          : (row.previousAdvance === '' || row.previousAdvance === null || row.previousAdvance === undefined || row.previousAdvance === '0' || row.previousAdvance === 0 ? '0' : row.previousAdvance)
                                      }
                                      onChange={(e) => updateSpreadsheetCell(idx, 'previousAdvance', cleanNumberInput(e.target.value))}
                                      onFocus={(e) => {
                                        setFocusedNumberCell({ idx, field: 'previousAdvance' });
                                        e.target.select();
                                      }}
                                      onBlur={() => {
                                        setFocusedNumberCell(null);
                                        if (row.previousAdvance === '' || row.previousAdvance === null || row.previousAdvance === undefined) {
                                          updateSpreadsheetCell(idx, 'previousAdvance', '0');
                                        }
                                      }}
                                      className="tabular-nums"
                                      placeholder="0"
                                      style={{
                                        width: '100%',
                                        padding: '4px 6px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        border: row.unclearFields?.includes('previousAdvance') ? '1px solid #F59E0B' : '1px solid #CBD5E1',
                                        borderRadius: '6px',
                                        backgroundColor: '#FFFFFF',
                                        color: Number(row.previousAdvance) > 0 ? '#16A34A' : '#0F172A',
                                        textAlign: 'center',
                                      }}
                                    />
                                  </td>

                                  {/* Status / Review with Live Note Updating */}
                                  <td style={{ padding: '6px' }}>
                                    {isReview ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <span
                                            style={{
                                              backgroundColor: row.isUserEdited ? '#EFF6FF' : '#FEF3C7',
                                              color: row.isUserEdited ? '#1D4ED8' : '#92400E',
                                              padding: '2px 6px',
                                              borderRadius: '4px',
                                              fontSize: '10.5px',
                                              fontWeight: 700,
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                            }}
                                          >
                                            <AlertCircle size={10} />
                                            <span>
                                              {Number(row.previousDue) > 0
                                                ? `${row.previousDue} बाकी`
                                                : Number(row.previousAdvance) > 0
                                                ? `+${row.previousAdvance} Ext`
                                                : 'Review'}
                                            </span>
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => markRowReady(idx)}
                                            style={{
                                              backgroundColor: '#DCFCE7',
                                              color: '#166534',
                                              border: '1px solid #86EFAC',
                                              borderRadius: '4px',
                                              padding: '2px 7px',
                                              fontSize: '11px',
                                              fontWeight: 800,
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                            }}
                                            title="Click OK to confirm values"
                                          >
                                            <Check size={11} strokeWidth={2.8} />
                                            <span>OK</span>
                                          </button>
                                        </div>
                                        {row.rawNote && (
                                          <div style={{ fontSize: '9.5px', color: '#475569', fontStyle: 'italic', lineHeight: '1.2' }}>
                                            {row.rawNote}
                                          </div>
                                        )}
                                        {row.notes && !row.rawNote && (
                                          <div style={{ fontSize: '10.5px', color: row.isUserEdited ? '#1E40AF' : '#B45309', fontWeight: 700, lineHeight: '1.2' }}>
                                            {row.notes}
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                          <span
                                            style={{
                                              backgroundColor: '#DCFCE7',
                                              color: '#166534',
                                              padding: '2px 6px',
                                              borderRadius: '4px',
                                              fontSize: '10.5px',
                                              fontWeight: 700,
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                              width: 'fit-content',
                                            }}
                                          >
                                            <Check size={11} strokeWidth={2.8} />
                                            <span>
                                              {row.isConfirmed && Number(row.previousDue) > 0
                                                ? `Confirmed (${row.previousDue} बाकी)`
                                                : row.isConfirmed && Number(row.previousAdvance) > 0
                                                ? `Confirmed (+${row.previousAdvance} Ext)`
                                                : 'Settled'}
                                            </span>
                                          </span>
                                          {(row.rawNote || row.notes || Number(row.previousAdvance) > 0 || Number(row.previousDue) > 0) && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSpreadsheetRows((prev) => {
                                                  const updated = [...prev];
                                                  updated[idx] = { ...updated[idx], reviewRequired: true };
                                                  return updated;
                                                });
                                              }}
                                              style={{
                                                backgroundColor: 'transparent',
                                                color: '#64748B',
                                                border: 'none',
                                                fontSize: '10px',
                                                cursor: 'pointer',
                                                padding: '1px 4px',
                                                textDecoration: 'underline',
                                              }}
                                              title="Review or adjust this row"
                                            >
                                              Edit
                                            </button>
                                          )}
                                        </div>
                                        {row.rawNote && (
                                          <div style={{ fontSize: '9.5px', color: '#64748B', fontStyle: 'italic', lineHeight: '1.2' }}>
                                            {row.rawNote}
                                          </div>
                                        )}
                                        {row.notes && !row.rawNote && (
                                          <div style={{ fontSize: '9.5px', color: '#166534', lineHeight: '1.2', fontWeight: 600 }}>
                                            {row.notes}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </td>

                                  {/* Delete Row */}
                                  <td style={{ padding: '6px', textAlign: 'center' }}>
                                    <button
                                      type="button"
                                      onClick={() => deleteSpreadsheetRow(idx)}
                                      style={{
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: '#94A3B8',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        borderRadius: '4px',
                                      }}
                                      title="Delete Row"
                                    >
                                      <Trash2 size={13} color="#EF4444" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Add Month button at bottom of table */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                        <button
                          type="button"
                          onClick={addSpreadsheetRow}
                          disabled={spreadsheetRows.length >= 12}
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px dashed #93C5FD',
                            borderRadius: '8px',
                            padding: '6px 14px',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--color-interactive)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: spreadsheetRows.length >= 12 ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <Plus size={13} />
                          <span>Add Missing Month</span>
                        </button>
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                          {spreadsheetRows.length} of 12 months entered
                        </span>
                      </div>
                    </div>
                  )}

                  {/* SPREADSHEET HISTORICAL BALANCE SUMMARY CARD */}
                  {spreadsheetRows.length > 0 && (
                    <div
                      style={{
                        backgroundColor: '#0F172A',
                        borderRadius: '16px',
                        padding: '16px',
                        color: '#FFFFFF',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 4px 15px rgba(15, 23, 42, 0.3)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            backgroundColor: '#1E293B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#34D399',
                          }}
                        >
                          <Banknote size={16} />
                        </div>
                        <span style={{ fontSize: '15px', fontWeight: 800 }}>Historical Balance Summary</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#94A3B8' }}>Total Rent Billed</span>
                          <strong className="tabular-nums" style={{ color: '#FFFFFF' }}>
                            ₹{spreadsheetSummary.totalRent.toLocaleString('en-IN')}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#94A3B8' }}>Total Electricity Billed</span>
                          <strong className="tabular-nums" style={{ color: '#FFFFFF' }}>
                            ₹{spreadsheetSummary.totalElec.toLocaleString('en-IN')}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#94A3B8' }}>Total Payments Received</span>
                          <strong className="tabular-nums" style={{ color: '#34D399' }}>
                            ₹{spreadsheetSummary.totalReceived.toLocaleString('en-IN')}
                          </strong>
                        </div>
                      </div>

                      <div style={{ height: '1px', backgroundColor: '#334155', margin: '2px 0' }} />

                      <div
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '12px',
                          padding: '12px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          color: '#0F172A',
                        }}
                      >
                        <span style={{ fontSize: '14px', fontWeight: 800 }}>
                          Net Carry-Forward Balance
                        </span>
                        <div
                          className="tabular-nums"
                          style={{
                            fontSize: '18px',
                            fontWeight: 900,
                            color: spreadsheetSummary.netDue > 0
                              ? '#DC2626'
                              : spreadsheetSummary.netAdvance > 0
                              ? '#16A34A'
                              : '#0284C7',
                          }}
                        >
                          {spreadsheetSummary.netDue > 0
                            ? `₹${spreadsheetSummary.netDue.toLocaleString('en-IN')} Due`
                            : spreadsheetSummary.netAdvance > 0
                            ? `₹${spreadsheetSummary.netAdvance.toLocaleString('en-IN')} Advance`
                            : '₹0 Settled'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 2: MANUAL ENTRY CARDS */}
              {existingImportMode === 'MANUAL' && (
                <>
                  {/* DYNAMIC 3 HISTORICAL MONTH CARDS (ASCENDING CHRONOLOGICAL ORDER: OLDEST -> NEWEST) */}
              {historyMonths.map((m, idx) => {
                const record = historyRecords[m.key] || {
                  prevReading: '',
                  currReading: '',
                  rent: monthlyRent || 0,
                  rate: electricityRate || 0,
                  amountReceived: '',
                  paymentDate: '',
                };
                const metric = reconciliation.metricsMap[m.key] || defaultMetric;
                const isExpanded = expandedMonth === m.key;

                return (
                  <div
                    key={m.key}
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--color-border)',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      boxShadow: 'var(--shadow-subtle)',
                    }}
                  >
                    {/* Header bar */}
                    <div
                      onClick={() => setExpandedMonth(isExpanded ? '' : m.key)}
                      style={{
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        backgroundColor: '#FFFFFF',
                        borderBottom: isExpanded ? '1px solid var(--color-border)' : 'none',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={16} color="var(--color-interactive)" />
                          <span style={{ fontSize: '14px', fontWeight: 700 }}>{m.name}</span>
                        </div>
                        {!isExpanded && metric.isEntered && (
                          <div style={{ fontSize: '11px', color: '#64748B', marginLeft: '24px', marginTop: '1px' }}>
                            {metric.units} units • Bill ₹{metric.totalBill.toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {metric.isEntered ? (
                          metric.isAdvance ? (
                            <span
                              style={{
                                backgroundColor: '#DCFCE7',
                                color: '#166534',
                                borderRadius: '9999px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Check size={11} strokeWidth={3} />
                              <span>₹{metric.advanceAmount.toLocaleString('en-IN')} Advance Credit</span>
                            </span>
                          ) : metric.isDue ? (
                            <span
                              style={{
                                backgroundColor: '#FEE2E2',
                                color: '#DC2626',
                                borderRadius: '9999px',
                                padding: '3px 8px',
                                fontSize: '10.5px',
                                fontWeight: 800,
                              }}
                            >
                              ₹{metric.dueAmount.toLocaleString('en-IN')} OUTSTANDING DUE
                            </span>
                          ) : (
                            <span
                              style={{
                                backgroundColor: '#EFF6FF',
                                color: 'var(--color-interactive)',
                                borderRadius: '9999px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Check size={11} strokeWidth={3} />
                              <span>SETTLED</span>
                            </span>
                          )
                        ) : (
                          <span
                            style={{
                              backgroundColor: '#F1F5F9',
                              color: '#64748B',
                              borderRadius: '9999px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            Not Entered
                          </span>
                        )}

                        {isExpanded ? <ChevronDown size={17} color="#64748B" /> : <ChevronRight size={17} color="#64748B" />}
                      </div>
                    </div>

                    {/* Expanded Body */}
                    {isExpanded && (
                      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Dynamic Meter Readings */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '12px' }}>
                              {m.prevMonthName} Reading
                            </label>
                            <div className="input-container" style={{ height: '42px', padding: '0 10px' }}>
                              <input
                                type="number"
                                placeholder="e.g. 10"
                                value={record.prevReading !== undefined ? record.prevReading : ''}
                                onChange={(e) => handleRecordChange(m.key, 'prevReading', e.target.value)}
                                className="input-field tabular-nums"
                                style={{ fontWeight: 700 }}
                              />
                              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>kWh</span>
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '12px' }}>
                              {m.monthName} Reading
                            </label>
                            <div className="input-container" style={{ height: '42px', padding: '0 10px' }}>
                              <input
                                type="number"
                                placeholder="e.g. 20"
                                value={record.currReading !== undefined ? record.currReading : ''}
                                onChange={(e) => handleRecordChange(m.key, 'currReading', e.target.value)}
                                className="input-field tabular-nums"
                                style={{ fontWeight: 700 }}
                              />
                              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>kWh</span>
                            </div>
                          </div>
                        </div>

                        {/* Rent & Rate */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '12px' }}>Monthly Rent</label>
                            <div className="input-container" style={{ height: '42px', padding: '0 10px' }}>
                              <span style={{ marginRight: '6px', fontWeight: 700, color: '#64748B' }}>₹</span>
                              <input
                                type="number"
                                placeholder="5000"
                                value={monthlyRent !== '' && monthlyRent !== undefined ? monthlyRent : (record.rent !== undefined ? record.rent : '')}
                                onChange={(e) => handleMonthlyRentChange(e.target.value)}
                                className="input-field tabular-nums"
                                style={{ fontWeight: 700 }}
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '12px' }}>Electricity Rate</label>
                            <div className="input-container" style={{ height: '42px', padding: '0 10px', backgroundColor: '#F8FAFC' }}>
                              <span style={{ marginRight: '6px', fontWeight: 700, color: '#64748B' }}>₹</span>
                              <input
                                type="number"
                                step="0.1"
                                value={Number(electricityRate).toFixed(2)}
                                readOnly
                                className="input-field tabular-nums"
                                style={{ fontWeight: 700, color: '#64748B', cursor: 'not-allowed' }}
                              />
                              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>/u</span>
                            </div>
                          </div>
                        </div>

                        {/* Opening Balance (FIRST HISTORICAL MONTH ONLY) */}
                        {idx === 0 && (
                          <div
                            style={{
                              backgroundColor: '#F8FAFC',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              border: '1px solid #E2E8F0',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label className="form-label" style={{ fontSize: '12px', margin: 0, fontWeight: 700 }}>
                                Opening Balance
                              </label>
                              <span style={{ fontSize: '11px', color: '#64748B' }}>
                                Prior to {m.name}
                              </span>
                            </div>

                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: openingBalanceType === 'NONE' ? '1fr' : '1fr 1fr',
                                gap: '10px',
                              }}
                            >
                              <div className="input-container" style={{ height: '42px', padding: '0 8px', backgroundColor: '#FFFFFF' }}>
                                <select
                                  value={openingBalanceType}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setOpeningBalanceType(val);
                                    if (val === 'NONE') setOpeningBalanceAmount('');
                                  }}
                                  style={{
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '13.5px',
                                    fontWeight: 700,
                                    color: 'var(--color-text-main)',
                                    width: '100%',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <option value="NONE">None</option>
                                  <option value="ADVANCE">Advance</option>
                                  <option value="DUE">Due</option>
                                </select>
                              </div>

                              {openingBalanceType !== 'NONE' && (
                                <div className="input-container" style={{ height: '42px', padding: '0 10px', backgroundColor: '#FFFFFF' }}>
                                  <span style={{ marginRight: '6px', fontWeight: 700, color: '#64748B' }}>₹</span>
                                  <input
                                    type="number"
                                    placeholder={openingBalanceType === 'ADVANCE' ? 'Opening Advance (e.g. 100)' : 'Opening Due (e.g. 200)'}
                                    value={openingBalanceAmount}
                                    onChange={(e) => setOpeningBalanceAmount(e.target.value)}
                                    className="input-field tabular-nums"
                                    style={{ fontWeight: 700, fontSize: '14px' }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Amount Received & Payment Date (Equal 1fr 1fr Split) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '12px' }}>Amount Received</label>
                            <div className="input-container" style={{ height: '44px', padding: '0 10px' }}>
                              <span style={{ marginRight: '6px', fontWeight: 800, fontSize: '15px' }}>₹</span>
                              <input
                                type="number"
                                placeholder="0"
                                value={record.amountReceived !== undefined ? record.amountReceived : ''}
                                onChange={(e) => handleRecordChange(m.key, 'amountReceived', e.target.value)}
                                className="input-field tabular-nums"
                                style={{ fontSize: '15px', fontWeight: 800 }}
                              />
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '12px' }}>Payment Date</label>
                            <div
                              className="input-container"
                              onClick={(e) => {
                                const dateInp = e.currentTarget.querySelector('input[type="date"]');
                                if (dateInp) {
                                  if (typeof dateInp.showPicker === 'function') {
                                    try {
                                      dateInp.showPicker();
                                    } catch (_) {
                                      dateInp.focus();
                                    }
                                  } else {
                                    dateInp.focus();
                                  }
                                }
                              }}
                              style={{
                                height: '44px',
                                padding: '0 10px',
                                position: 'relative',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', pointerEvents: 'none' }}>
                                <Calendar size={17} color="#64748B" style={{ flexShrink: 0 }} />
                                <span
                                  style={{
                                    fontSize: '13.5px',
                                    fontWeight: record.paymentDate ? 700 : 500,
                                    color: record.paymentDate ? 'var(--color-text-main)' : '#94A3B8',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {record.paymentDate ? formatPaymentDateWithoutYear(record.paymentDate) : 'Select date'}
                                </span>
                              </div>
                              <input
                                type="date"
                                value={record.paymentDate || ''}
                                onChange={(e) => handleRecordChange(m.key, 'paymentDate', e.target.value)}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  opacity: 0,
                                  cursor: 'pointer',
                                  zIndex: 2,
                                }}
                                aria-label={`${m.name} Payment Date`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Breakdown Box */}
                        <div
                          style={{
                            backgroundColor: '#F8FAFC',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            border: '1px solid #E2E8F0',
                            fontSize: '11.5px',
                            color: '#475569',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>
                              Units Consumed: <strong>{metric.units} units</strong> ({record.currReading || 0} - {record.prevReading || 0})
                            </span>
                            <span>
                              Electricity: <strong>₹{metric.powerBill.toLocaleString('en-IN')}</strong> ({metric.units} × ₹{electricityRate || 0})
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>
                              Total Bill: <strong>₹{metric.totalBill.toLocaleString('en-IN')}</strong> (₹{monthlyRent || 0} + ₹{metric.powerBill.toLocaleString('en-IN')})
                            </span>
                            <span>
                              {metric.prevAdvance > 0 ? (
                                <span style={{ color: '#166534', fontWeight: 600 }}>
                                  Previous Advance: -₹{metric.prevAdvance.toLocaleString('en-IN')}
                                </span>
                              ) : metric.prevDue > 0 ? (
                                <span style={{ color: '#DC2626', fontWeight: 600 }}>
                                  Previous Due: +₹{metric.prevDue.toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span style={{ color: '#64748B' }}>
                                  Previous Balance: None
                                </span>
                              )}
                            </span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>
                              Amount Payable: <strong style={{ color: '#0F172A', fontSize: '12px' }}>₹{metric.amountPayable.toLocaleString('en-IN')}</strong>
                            </span>
                            <span>
                              Amount Received: <strong style={{ color: '#0F172A', fontSize: '12px' }}>₹{(record.amountReceived !== '' ? Number(record.amountReceived) : 0).toLocaleString('en-IN')}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Result Banner */}
                        {metric.isEntered ? (
                          metric.isAdvance ? (
                            <div
                              style={{
                                backgroundColor: '#DCFCE7',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#166534',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Check size={14} strokeWidth={3} />
                                <span>₹{metric.advanceAmount.toLocaleString('en-IN')} Advance Credit</span>
                              </div>
                              <span
                                style={{
                                  backgroundColor: '#BBF7D0',
                                  borderRadius: '4px',
                                  padding: '1px 6px',
                                  fontSize: '10px',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                ADVANCE
                              </span>
                            </div>
                          ) : metric.isDue ? (
                            <div
                              style={{
                                backgroundColor: '#FEE2E2',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#DC2626',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertCircle size={14} />
                                <span>₹{metric.dueAmount.toLocaleString('en-IN')} Outstanding Due</span>
                              </div>
                              <span
                                style={{
                                  backgroundColor: '#FECACA',
                                  borderRadius: '4px',
                                  padding: '1px 6px',
                                  fontSize: '10px',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                DUE
                              </span>
                            </div>
                          ) : (
                            <div
                              style={{
                                backgroundColor: '#EFF6FF',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: 'var(--color-interactive)',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Check size={14} strokeWidth={3} />
                                <span>Settled (₹0 Due)</span>
                              </div>
                              <span
                                style={{
                                  backgroundColor: '#DBEAFE',
                                  borderRadius: '4px',
                                  padding: '1px 6px',
                                  fontSize: '10px',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                SETTLED
                              </span>
                            </div>
                          )
                        ) : (
                          <div
                            style={{
                              backgroundColor: '#F8FAFC',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#64748B',
                              border: '1px solid #E2E8F0',
                            }}
                          >
                            <span>Enter readings & amount received to calculate billing status.</span>
                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>Pending</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* HISTORICAL BALANCE SUMMARY CARD */}
              <div
                style={{
                  backgroundColor: '#0F172A',
                  borderRadius: '16px',
                  padding: '16px',
                  color: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 4px 15px rgba(15, 23, 42, 0.3)',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: '#1E293B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#34D399',
                    }}
                  >
                    <Banknote size={16} />
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 800 }}>Historical Balance Summary</span>
                </div>

                {/* Outstanding Due & Advance Credit */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#94A3B8' }}>Outstanding Due</span>
                    <strong className="tabular-nums" style={{ color: '#F87171', fontSize: '14px' }}>
                      ₹{reconciliation.totalDue.toLocaleString('en-IN')}
                    </strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#94A3B8' }}>Advance Credit</span>
                    <strong className="tabular-nums" style={{ color: '#34D399', fontSize: '14px' }}>
                      ₹{reconciliation.totalCredit.toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', backgroundColor: '#334155', margin: '2px 0' }} />

                {/* Net Balance (The most visually important result) */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: '#0F172A',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                    Net Balance
                  </span>

                  <div
                    className="tabular-nums"
                    style={{
                      fontSize: '18px',
                      fontWeight: 900,
                      color: reconciliation.finalClosingDue > 0
                        ? '#DC2626'
                        : reconciliation.finalClosingAdvance > 0
                        ? '#16A34A'
                        : '#0284C7',
                    }}
                  >
                    {reconciliation.finalClosingDue > 0
                      ? `₹${reconciliation.finalClosingDue.toLocaleString('en-IN')} Due`
                      : reconciliation.finalClosingAdvance > 0
                      ? `₹${reconciliation.finalClosingAdvance.toLocaleString('en-IN')} Advance`
                      : '₹0 Settled'}
                  </div>
                </div>
              </div>
                </>
              )}
            </div>
          )}

          {/* Sticky Bottom Actions */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => (selectedRoom ? navigate(`/rooms/${selectedRoom}`) : navigate('/tenants'))}
              style={{
                flex: 1,
                height: '46px',
                backgroundColor: '#F8FAFC',
                color: '#475569',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveTenant}
              disabled={loading || (!selectedRoom && vacantRooms.length === 0)}
              style={{
                flex: 2,
                height: '46px',
                backgroundColor: 'var(--color-interactive)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: loading || (!selectedRoom && vacantRooms.length === 0) ? 0.7 : 1,
                cursor: loading || (!selectedRoom && vacantRooms.length === 0) ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              <span>
                {loading
                  ? (isEditMode ? 'Saving Changes...' : 'Saving...')
                  : isEditMode
                  ? 'Save Changes'
                  : tenantType === 'EXISTING'
                  ? 'Verify & Save'
                  : 'Save & Add Tenant'}
              </span>
              <ArrowRight size={16} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </div>

      {/* Zoom Modal for Diary Page Inspection */}
      {previewModalImage && (
        <div
          onClick={() => setPreviewModalImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 800,
                    backgroundColor: 'var(--color-interactive)',
                    color: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  Page {previewModalImage.pageIndex}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {previewModalImage.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalImage(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div
              style={{
                overflow: 'auto',
                maxHeight: 'calc(90vh - 55px)',
                padding: '14px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#1E293B',
              }}
            >
              <img
                src={previewModalImage.url}
                alt="Diary Page Zoom Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
