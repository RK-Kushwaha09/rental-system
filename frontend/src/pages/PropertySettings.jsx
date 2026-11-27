import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  Building,
  Building2,
  CheckCircle2,
  Pencil,
  SlidersHorizontal,
  DoorClosed,
  PieChart,
  Info,
  ChevronRight,
  LayoutGrid,
  Sliders,
  Landmark,
  MessageSquare,
  Download,
  Shield,
  LogOut,
  User,
  Check,
  X,
  Loader2,
  AlertCircle,
  Plus,
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { usePropertySetup } from '../context/PropertySetupContext';
import { propertyAPI } from '../services/api';

export default function PropertySettings() {
  const navigate = useNavigate();
  const { propertyName: ctxPropName, setPropertyName: setCtxPropName, owner: ctxOwner } = usePropertySetup();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Live Backend Data
  const [propertyData, setPropertyData] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [roomsList, setRoomsList] = useState([]);

  // Modals state
  const [editPropertyModalOpen, setEditPropertyModalOpen] = useState(false);
  const [editRatesModalOpen, setEditRatesModalOpen] = useState(false);
  const [editVpaModalOpen, setEditVpaModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [propForm, setPropForm] = useState({ propertyName: '', address: '', propertyType: '' });
  const [ratesForm, setRatesForm] = useState({ defaultBaseRent: '', defaultElectricityRate: '' });
  const [vpaForm, setVpaForm] = useState({ landlordVpa: '' });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [prop, stats, rooms] = await Promise.all([
        propertyAPI.getProperty().catch(() => null),
        propertyAPI.getDashboardStats().catch(() => null),
        propertyAPI.getRoomsInventory().catch(() => []),
      ]);

      if (prop) {
        setPropertyData(prop);
        setPropForm({
          propertyName: prop.propertyName || '',
          address: prop.address || '',
          propertyType: prop.propertyType || 'Co-living & Rental',
        });
        setRatesForm({
          defaultBaseRent: prop.defaultBaseRent ?? prop.defaultMonthlyRent ?? 1000,
          defaultElectricityRate: prop.defaultElectricityRate ?? 10,
        });
        setVpaForm({
          landlordVpa: prop.landlordVpa || '',
        });
        if (setCtxPropName && prop.propertyName) {
          setCtxPropName(prop.propertyName);
        }
      }

      if (stats) setStatsData(stats);
      if (Array.isArray(rooms)) setRoomsList(rooms);
    } catch (err) {
      console.error('Failed to load settings data:', err);
      setError('Failed to load property settings from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute live statistics and details
  const propertyName = propertyData?.propertyName || statsData?.propertyName || ctxPropName || 'Property';
  const address = propertyData?.address || statsData?.address || 'Surat';
  const propertyType = propertyData?.propertyType || 'Co-living & Rental';
  const propertyStatus = propertyData?.status || 'ACTIVE';

  const totalUnits = roomsList.length > 0 ? roomsList.length : (statsData?.totalUnits || 0);
  const occupiedUnits = roomsList.length > 0
    ? roomsList.filter((r) => r.status === 'OCCUPIED' || !!r.tenantName).length
    : (statsData?.occupiedCount || 0);
  const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
  const occupancyPercentage = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const monthlyPotential = roomsList.length > 0
    ? roomsList.reduce((acc, r) => acc + (Number(r.monthlyRent) || 0), 0)
    : (statsData?.monthlyPotential || propertyData?.monthlyPotential || 0);

  const defaultBaseRent = propertyData?.defaultBaseRent ?? propertyData?.defaultMonthlyRent ?? 1000;
  const defaultElectricityRate = propertyData?.defaultElectricityRate ?? 10;
  const landlordVpa = propertyData?.landlordVpa || '';

  const ownerName = propertyData?.ownerName || statsData?.ownerName || ctxOwner?.fullName || 'Owner';
  const ownerPhone = propertyData?.ownerPhone || ctxOwner?.mobile || '9974780060';

  const firstVacantRoom = roomsList.find((r) => r.status === 'VACANT' || !r.tenantName);

  // Floors text (e.g. Ground & 1st Floor)
  const uniqueFloors = [...new Set(roomsList.map((r) => r.floor || 'Ground'))].filter(Boolean);
  const floorsText = uniqueFloors.length > 0 ? uniqueFloors.join(' & ') : 'Ground';

  // Save Handlers
  const handleSaveProperty = async (e) => {
    e.preventDefault();
    if (!propForm.propertyName.trim()) {
      showToast('Property name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      await propertyAPI.updateProperty({
        propertyName: propForm.propertyName.trim(),
        address: propForm.address.trim(),
        propertyType: propForm.propertyType.trim(),
      });
      showToast('Property details updated successfully');
      setEditPropertyModalOpen(false);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to update property');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRates = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await propertyAPI.updateProperty({
        defaultBaseRent: Number(ratesForm.defaultBaseRent) || 1000,
        defaultElectricityRate: Number(ratesForm.defaultElectricityRate) || 10,
      });
      showToast('Default setup rates updated successfully');
      setEditRatesModalOpen(false);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to update setup rates');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVpa = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await propertyAPI.updateProperty({
        landlordVpa: vpaForm.landlordVpa.trim(),
      });
      showToast('Payment account details updated successfully');
      setEditVpaModalOpen(false);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to update UPI details');
    } finally {
      setSaving(false);
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--color-interactive)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginTop: '1px',
                }}
              >
                <span>🏢 {propertyName}</span>
                <ChevronDown size={12} strokeWidth={2.5} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <button
                type="button"
                className="icon-btn-header"
                onClick={() => navigate('/bills')}
                aria-label="Notifications"
                style={{ width: '36px', height: '36px' }}
              >
                <Bell size={19} />
              </button>
            </div>

            <div className="user-avatar-circle" title="Owner Profile" style={{ cursor: 'pointer', backgroundColor: '#0F172A', color: '#FFFFFF', width: '34px', height: '34px', fontSize: '13px' }}>
              {ownerName ? ownerName.charAt(0).toLowerCase() : 'g'}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="app-content" style={{ padding: '16px', gap: '14px', flex: 1, paddingBottom: '90px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: '12px' }}>
              <Loader2 size={36} className="animate-spin" color="var(--color-interactive)" />
              <div style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>Loading property settings & data...</div>
            </div>
          ) : error && !propertyData ? (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '16px', padding: '24px 16px', textAlign: 'center' }}>
              <AlertCircle size={32} color="#DC2626" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#991B1B' }}>{error}</div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={loadData}
                style={{ marginTop: '16px', fontSize: '13.5px' }}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Property Identity Card */}
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
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        backgroundColor: '#EFF6FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-interactive)',
                      }}
                    >
                      <Building size={22} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>{propertyName}</span>
                        <CheckCircle2 size={16} color="#16A34A" />
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '1px' }}>
                        {address} • {totalUnits} {totalUnits === 1 ? 'Unit' : 'Units'}
                      </div>

                      <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
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
                          {propertyType}
                        </span>
                        <span
                          style={{
                            backgroundColor: '#DCFCE7',
                            color: '#166534',
                            borderRadius: '4px',
                            padding: '1px 6px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                          }}
                        >
                          {propertyStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditPropertyModalOpen(true)}
                    title="Edit Property Details"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748B',
                      cursor: 'pointer',
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                </div>

                <div
                  style={{
                    backgroundColor: '#EFF6FF',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid #DBEAFE',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Monthly Potential</div>
                    <div className="tabular-nums" style={{ fontSize: '20px', fontWeight: 900, marginTop: '1px', color: '#0F172A' }}>
                      ₹{Number(monthlyPotential).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditPropertyModalOpen(true)}
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <SlidersHorizontal size={13} />
                    <span>Edit Property</span>
                  </button>
                </div>
              </div>

              {/* SECTION: PROPERTY STATISTICS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '0.04em' }}>
                    PROPERTY STATISTICS
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-interactive)' }}>
                    Live Snapshot
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {/* Total Units */}
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Total Units</span>
                      <DoorClosed size={16} color="#64748B" />
                    </div>
                    <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px', color: '#0F172A' }}>
                      {totalUnits}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>Configured rooms</div>
                  </div>

                  {/* Occupancy */}
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '14px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Occupancy</span>
                      <PieChart size={16} color="#16A34A" />
                    </div>
                    <div className="tabular-nums" style={{ fontSize: '24px', fontWeight: 900, marginTop: '4px', color: 'var(--color-text-main)' }}>
                      {occupancyPercentage}%{' '}
                      <span style={{ fontSize: '11.5px', color: '#16A34A', fontWeight: 700 }}>
                        ({occupiedUnits} occupied)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '5px', backgroundColor: '#EFF6FF', borderRadius: '4px', marginTop: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, occupancyPercentage)}%`, height: '100%', backgroundColor: 'var(--color-interactive)' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Vacant Unit / All Occupied Action Card */}
              {firstVacantRoom ? (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #DBEAFE',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: 'var(--shadow-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: '#EFF6FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-interactive)',
                      }}
                    >
                      <DoorClosed size={18} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800 }}>Room {firstVacantRoom.roomNumber}</span>
                        <span
                          style={{
                            backgroundColor: '#EFF6FF',
                            color: 'var(--color-interactive)',
                            borderRadius: '4px',
                            padding: '1px 6px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                          }}
                        >
                          VACANT
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '1px' }}>
                        Ready for immediate move-in • {vacantUnits} {vacantUnits === 1 ? 'unit' : 'units'} open
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/tenants/new?room=${firstVacantRoom.roomNumber}`)}
                    style={{
                      backgroundColor: 'var(--color-interactive)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Assign
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: 'var(--shadow-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                      }}
                    >
                      <CheckCircle2 size={20} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#166534' }}>All Units Occupied</span>
                        <span
                          style={{
                            backgroundColor: '#DCFCE7',
                            color: '#166534',
                            borderRadius: '4px',
                            padding: '1px 6px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                          }}
                        >
                          100% FULL
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#15803D', marginTop: '1px' }}>
                        All {totalUnits} configured rooms currently have active tenants
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/rooms')}
                    style={{
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    View Rooms
                  </button>
                </div>
              )}

              {/* SECTION: Default Setup Rates */}
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
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Default Setup Rates</div>
                    <div style={{ fontSize: '11.5px', color: '#64748B' }}>Base values pre-filled for new rooms</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditRatesModalOpen(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-interactive)',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <span>Edit Rates</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ backgroundColor: '#EFF6FF', borderRadius: '10px', padding: '10px', border: '1px solid #DBEAFE' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      BASE RENT
                    </div>
                    <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: 800, marginTop: '2px', color: '#0F172A' }}>
                      ₹{Number(defaultBaseRent).toLocaleString('en-IN')}{' '}
                      <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>/mo</span>
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#EFF6FF', borderRadius: '10px', padding: '10px', border: '1px solid #DBEAFE' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      ELECTRICITY SUB-METER
                    </div>
                    <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: 800, marginTop: '2px', color: '#0F172A' }}>
                      ₹{Number(defaultElectricityRate).toFixed(2)}{' '}
                      <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>/kWh</span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#EFF6FF',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    gap: '8px',
                    fontSize: '11.5px',
                    color: '#334155',
                    lineHeight: '1.4',
                    border: '1px solid #DBEAFE',
                  }}
                >
                  <Info size={15} color="var(--color-interactive)" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <strong>Important:</strong> Modifying default rates applies only to <strong>NEW rooms</strong> created in the future. Existing rooms keep their configured rates unless individually edited.
                  </div>
                </div>
              </div>

              {/* SECTION: MANAGEMENT & CONTROLS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-text-main)', letterSpacing: '0.04em' }}>
                  MANAGEMENT & CONTROLS
                </span>

                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-subtle)',
                  }}
                >
                  {/* Item 1: Manage Rooms & Layout */}
                  <div
                    onClick={() => navigate('/rooms')}
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-interactive)' }}>
                        <LayoutGrid size={17} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>Manage Rooms & Layout</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{totalUnits} units configured ({floorsText})</div>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#64748B" />
                  </div>

                  {/* Item 2: Billing & Sub-meter Settings */}
                  <div
                    onClick={() => navigate('/bills')}
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-interactive)' }}>
                        <Sliders size={17} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>Billing & Sub-meter Settings</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>Billing cycle: 1st - 5th of each month</div>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#64748B" />
                  </div>

                  {/* Item 3: Payment Account Details */}
                  <div
                    onClick={() => setEditVpaModalOpen(true)}
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-interactive)' }}>
                        <Landmark size={17} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>Payment Account Details</span>
                          <span style={{ backgroundColor: '#DBEAFE', color: 'var(--color-interactive)', fontSize: '10px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px' }}>
                            UPI
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          VPA: {landlordVpa || 'Configure UPI VPA'}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#64748B" />
                  </div>

                  {/* Item 4: WhatsApp Automation */}
                  <div
                    onClick={() => showToast('WhatsApp alerts & receipts are active for all tenants')}
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--color-border)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-interactive)' }}>
                        <MessageSquare size={17} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>WhatsApp Automation</span>
                          <span style={{ backgroundColor: '#DCFCE7', color: '#166534', fontSize: '10px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px' }}>
                            ON
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>Instant rent receipts & reminders</div>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#64748B" />
                  </div>

                  {/* Item 5: Data Backup & PDF Export */}
                  <div
                    onClick={() => showToast('Data backup is synchronized and saved securely on database')}
                    style={{
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-interactive)' }}>
                        <Download size={17} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>Data Backup & PDF Export</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>Download ledger records & tenant police verification</div>
                      </div>
                    </div>
                    <ChevronRight size={16} color="#64748B" />
                  </div>
                </div>
              </div>

              {/* Owner Profile Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: 'var(--shadow-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      backgroundColor: '#0F172A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                    }}
                  >
                    <Shield size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{ownerName}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>+91 {ownerPhone} • Owner</div>
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    localStorage.removeItem('rm_auth_token');
                    localStorage.removeItem('rm_owner');
                    navigate('/login');
                  }}
                >
                  <LogOut size={13} />
                  <span>Log Out</span>
                </button>
              </div>

              {/* Bottom Security Footer */}
              <div style={{ textAlign: 'center', padding: '6px 0 12px 0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                  RENTMANAGER PRO V2.4.12
                </div>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>
                  Encrypted with Bank-grade 256-bit SSL
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal 1: Edit Property Details */}
        {editPropertyModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(3px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '440px',
                padding: '20px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Edit Property Details</h3>
                <button
                  type="button"
                  onClick={() => setEditPropertyModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveProperty} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Property Name
                  </label>
                  <input
                    type="text"
                    value={propForm.propertyName}
                    onChange={(e) => setPropForm({ ...propForm, propertyName: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Area / City Address
                  </label>
                  <input
                    type="text"
                    value={propForm.address}
                    onChange={(e) => setPropForm({ ...propForm, address: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Property Type
                  </label>
                  <input
                    type="text"
                    value={propForm.propertyType}
                    onChange={(e) => setPropForm({ ...propForm, propertyType: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEditPropertyModalOpen(false)}
                    style={{
                      flex: 1,
                      height: '40px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: '#F8FAFC',
                      color: '#475569',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      flex: 1,
                      height: '40px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'var(--color-interactive)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Edit Default Setup Rates */}
        {editRatesModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(3px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '440px',
                padding: '20px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Edit Setup Rates</h3>
                <button
                  type="button"
                  onClick={() => setEditRatesModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveRates} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Default Base Rent (₹ / month)
                  </label>
                  <input
                    type="number"
                    value={ratesForm.defaultBaseRent}
                    onChange={(e) => setRatesForm({ ...ratesForm, defaultBaseRent: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Electricity Sub-meter Rate (₹ / kWh)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={ratesForm.defaultElectricityRate}
                    onChange={(e) => setRatesForm({ ...ratesForm, defaultElectricityRate: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.4' }}>
                  Note: Updating these values affects newly created rooms pre-fills.
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEditRatesModalOpen(false)}
                    style={{
                      flex: 1,
                      height: '40px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: '#F8FAFC',
                      color: '#475569',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      flex: 1,
                      height: '40px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'var(--color-interactive)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    <span>Save Rates</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 3: Edit UPI Payment Account */}
        {editVpaModalOpen && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(3px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '440px',
                padding: '20px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: '#0F172A' }}>UPI Account Details</h3>
                <button
                  type="button"
                  onClick={() => setEditVpaModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveVpa} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Landlord UPI VPA / QR ID
                  </label>
                  <input
                    type="text"
                    value={vpaForm.landlordVpa}
                    onChange={(e) => setVpaForm({ ...vpaForm, landlordVpa: e.target.value })}
                    placeholder="e.g. shreeresidency@okhdfcbank"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      fontSize: '13.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ fontSize: '11px', color: '#64748B', lineHeight: '1.4' }}>
                  This UPI ID will appear on tenant invoices and payment receipt links for direct rent settlements.
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEditVpaModalOpen(false)}
                    style={{
                      flex: 1,
                      height: '40px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: '#F8FAFC',
                      color: '#475569',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      flex: 1,
                      height: '40px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'var(--color-interactive)',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    <span>Save UPI VPA</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  );
}
