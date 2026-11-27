import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Bell,
  User,
  ChevronDown,
  Plus,
  DoorClosed,
  Phone,
  MessageSquare,
  Zap,
  CheckCircle2,
  ChevronRight,
  AlertCircle,
  FileText,
  UserPlus,
  X,
  AlertTriangle,
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { usePropertySetup } from '../context/PropertySetupContext';
import { propertyAPI } from '../services/api';

export default function Rooms() {
  const navigate = useNavigate();
  const { propertyName: ctxPropName, owner, defaultMonthlyRent: ctxRent, defaultElectricityRate: ctxRate } = usePropertySetup();

  const [roomsList, setRoomsList] = useState([]);
  const [propertyDetails, setPropertyDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'OCCUPIED' | 'VACANT'

  // Add Room Modal State
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomRent, setNewRoomRent] = useState('');
  const [newRoomElectricityRate, setNewRoomElectricityRate] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  /**
   * Automatically calculates the next available room number based on existing room numbers.
   * Finds the first gap in sequence, or max + 1.
   * e.g. [101] -> 102; [101, 102, 104] -> 103; [101..104] -> 105.
   */
  const getNextAvailableRoomNumber = (rooms) => {
    if (!rooms || rooms.length === 0) return '101';

    const nums = rooms
      .map((r) => {
        const val = typeof r === 'object' ? r.roomNumber : r;
        const parsed = parseInt(String(val).replace(/\D/g, ''), 10);
        return isNaN(parsed) ? null : parsed;
      })
      .filter((n) => n !== null);

    if (nums.length === 0) return '101';

    const numSet = new Set(nums);
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const base = min >= 100 ? Math.floor(min / 100) * 100 + 1 : 1;

    for (let candidate = base; candidate <= max; candidate++) {
      if (!numSet.has(candidate)) {
        return String(candidate);
      }
    }
    return String(max + 1);
  };

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError(null);
      const [roomsData, propData] = await Promise.all([
        propertyAPI.getRoomsInventory(),
        propertyAPI.getProperty().catch(() => null),
      ]);
      setRoomsList(Array.isArray(roomsData) ? roomsData : []);
      if (propData) {
        setPropertyDetails(propData);
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
      if (err.status === 401) {
        navigate('/login');
        return;
      }
      setError(err.message || 'Failed to load rooms inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    return roomsList.filter((room) => {
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'OCCUPIED') return room.status === 'OCCUPIED';
      if (activeFilter === 'VACANT') return room.status === 'VACANT';
      return true;
    });
  }, [roomsList, activeFilter]);

  const occupiedCount = roomsList.filter((r) => r.status === 'OCCUPIED').length;
  const vacantCount = roomsList.filter((r) => r.status === 'VACANT').length;
  const totalPotential = roomsList.reduce((sum, r) => sum + (Number(r.monthlyRent) || 0), 0);

  // Duplicate room check
  const isDuplicateNumber = useMemo(() => {
    const trimmed = String(newRoomNumber || '').trim().toLowerCase();
    if (!trimmed) return false;
    return roomsList.some((r) => String(r.roomNumber || '').trim().toLowerCase() === trimmed);
  }, [newRoomNumber, roomsList]);

  const handleOpenAddModal = async () => {
    try {
      const [roomsData, propData] = await Promise.all([
        propertyAPI.getRoomsInventory(),
        propertyAPI.getProperty().catch(() => null),
      ]);
      const currentRooms = Array.isArray(roomsData) ? roomsData : roomsList;
      setRoomsList(currentRooms);
      if (propData) {
        setPropertyDetails(propData);
      }

      const suggested = getNextAvailableRoomNumber(currentRooms);
      setNewRoomNumber(suggested);

      const propDefaultRent =
        propData?.defaultBaseRent ??
        propData?.defaultMonthlyRent ??
        propertyDetails?.defaultBaseRent ??
        ctxRent ??
        '';
      setNewRoomRent(propDefaultRent !== '' && propDefaultRent !== null ? propDefaultRent : '');

      const propDefaultRate =
        propData?.defaultElectricityRate ??
        propertyDetails?.defaultElectricityRate ??
        ctxRate ??
        '';
      setNewRoomElectricityRate(propDefaultRate !== '' && propDefaultRate !== null ? propDefaultRate : '');
    } catch {
      const suggested = getNextAvailableRoomNumber(roomsList);
      setNewRoomNumber(suggested);
      const propDefaultRent = propertyDetails?.defaultBaseRent ?? ctxRent ?? '';
      setNewRoomRent(propDefaultRent !== '' && propDefaultRent !== null ? propDefaultRent : '');
      const propDefaultRate = propertyDetails?.defaultElectricityRate ?? ctxRate ?? '';
      setNewRoomElectricityRate(propDefaultRate !== '' && propDefaultRate !== null ? propDefaultRate : '');
    }

    setModalError(null);
    setShowAddRoomModal(true);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    const trimmedNum = String(newRoomNumber || '').trim();
    if (!trimmedNum) {
      setModalError('Please enter a room number.');
      return;
    }
    if (isDuplicateNumber) {
      setModalError(`Room ${trimmedNum} already exists in this property.`);
      return;
    }

    try {
      setModalSubmitting(true);
      setModalError(null);

      const parsedRent = newRoomRent !== '' && !isNaN(Number(newRoomRent))
        ? Number(newRoomRent)
        : (propertyDetails?.defaultBaseRent ?? 0);

      const parsedRate = newRoomElectricityRate !== '' && !isNaN(Number(newRoomElectricityRate))
        ? Number(newRoomElectricityRate)
        : (propertyDetails?.defaultElectricityRate ?? 0);

      await propertyAPI.createRoom({
        roomNumber: trimmedNum,
        monthlyRent: parsedRent,
        electricityRate: parsedRate,
        floor: 'Ground Fl',
        roomType: 'Single',
      });

      setShowAddRoomModal(false);
      setNewRoomNumber('');
      await fetchRooms();
    } catch (err) {
      console.error('Failed to create room:', err);
      setModalError(err.message || 'Failed to add room.');
    } finally {
      setModalSubmitting(false);
    }
  };

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
            <span style={{ fontSize: '13.5px', color: '#64748B', fontWeight: 600 }}>Loading rooms inventory...</span>
          </div>
          <BottomNav />
        </div>
      </div>
    );
  }

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
              onClick={fetchRooms}
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
              Retry
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
                <span>🏢 {propertyDetails?.propertyName || ctxPropName || 'My Property'}</span>
                <ChevronDown size={13} strokeWidth={2.5} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => navigate('/home')}>
              <button
                type="button"
                className="icon-btn-header"
                aria-label="Notifications"
                style={{ width: '36px', height: '36px' }}
              >
                <Bell size={19} />
              </button>
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
          {/* Page Title & Add Room Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-text-main)' }}>
              Rooms <span style={{ color: 'var(--color-interactive)' }}>({roomsList.length})</span>
            </h1>

            <button
              type="button"
              onClick={handleOpenAddModal}
              style={{
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(15,23,42,0.15)',
              }}
            >
              <Plus size={16} strokeWidth={2.6} />
              <span>Add Room</span>
            </button>
          </div>

          {/* Monthly Rent Potential Card */}
          <div
            style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #DBEAFE',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: 'var(--shadow-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#166534',
                    border: '1px solid #BBF7D0',
                    borderRadius: '9999px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
                  {occupiedCount} Occupied
                </span>

                <span
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#64748B',
                    border: '1px solid #E2E8F0',
                    borderRadius: '9999px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#64748B' }} />
                  {vacantCount} Vacant
                </span>
              </div>

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
                <Building2 size={18} />
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
              Monthly Rent Potential
            </div>

            <div className="tabular-nums" style={{ fontSize: '26px', fontWeight: 900, color: 'var(--color-text-main)' }}>
              ₹{Number(totalPotential).toLocaleString('en-IN')}
            </div>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              style={{
                backgroundColor: activeFilter === 'ALL' ? 'var(--color-interactive)' : '#FFFFFF',
                color: activeFilter === 'ALL' ? '#FFFFFF' : '#475569',
                border: activeFilter === 'ALL' ? 'none' : '1px solid var(--color-border)',
                borderRadius: '9999px',
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              All ({roomsList.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('OCCUPIED')}
              style={{
                backgroundColor: activeFilter === 'OCCUPIED' ? 'var(--color-interactive)' : '#FFFFFF',
                color: activeFilter === 'OCCUPIED' ? '#FFFFFF' : '#475569',
                border: activeFilter === 'OCCUPIED' ? 'none' : '1px solid var(--color-border)',
                borderRadius: '9999px',
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Occupied ({occupiedCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('VACANT')}
              style={{
                backgroundColor: activeFilter === 'VACANT' ? 'var(--color-interactive)' : '#FFFFFF',
                color: activeFilter === 'VACANT' ? '#FFFFFF' : '#475569',
                border: activeFilter === 'VACANT' ? 'none' : '1px solid var(--color-border)',
                borderRadius: '9999px',
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Vacant ({vacantCount})
            </button>
          </div>

          {/* Rooms Inventory List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredRooms.map((room) => {
              const isOccupied = room.status === 'OCCUPIED';

              return (
                <div
                  key={room.id}
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
                  {/* Room Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '10px',
                          backgroundColor: '#EFF6FF',
                          border: '1px solid #DBEAFE',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '15px',
                          fontWeight: 800,
                          color: 'var(--color-interactive)',
                        }}
                      >
                        {room.roomNumber}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                            Room {room.roomNumber}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748B' }}>
                            {room.floor}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '1px' }}>
                          {room.type}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        backgroundColor: isOccupied ? '#EFF6FF' : '#F1F5F9',
                        color: isOccupied ? 'var(--color-interactive)' : '#475569',
                        border: isOccupied ? '1px solid #DBEAFE' : '1px solid #E2E8F0',
                        borderRadius: '9999px',
                        padding: '3px 8px',
                        fontSize: '10.5px',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <span
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          backgroundColor: isOccupied ? 'var(--color-interactive)' : '#64748B',
                        }}
                      />
                      {room.status}
                    </span>
                  </div>

                  {/* Tenant Strip (if occupied) */}
                  {isOccupied && (
                    <div
                      style={{
                        backgroundColor: '#F8FAFC',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid #F1F5F9',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#DBEAFE',
                            color: '#1E40AF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: 800,
                          }}
                        >
                          {room.tenantInitials || 'AP'}
                        </div>

                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                            {room.tenantName}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                            {room.tenantMobile}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a
                          href={`tel:${room.tenantMobile?.replace(/\s+/g, '')}`}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-main)',
                            textDecoration: 'none',
                          }}
                          title="Call Tenant"
                        >
                          <Phone size={15} />
                        </a>

                        <a
                          href={`https://wa.me/${room.tenantMobile?.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-main)',
                            textDecoration: 'none',
                          }}
                          title="WhatsApp Message"
                        >
                          <MessageSquare size={15} />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Vacant Onboarding Strip */}
                  {!isOccupied && (
                    <div
                      style={{
                        backgroundColor: '#EFF6FF',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        border: '1px solid #DBEAFE',
                      }}
                    >
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          backgroundColor: '#DBEAFE',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-interactive)',
                        }}
                      >
                        <UserPlus size={18} />
                      </div>

                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                          {room.onboardingTitle || 'Ready for Onboarding'}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '1px' }}>
                          {room.onboardingSubtitle || 'Generate lease agreement & issue key access'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rates Row (2 Boxes) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div
                      style={{
                        backgroundColor: '#EFF6FF',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        border: '1px solid #DBEAFE',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                          {isOccupied ? 'Monthly Rent' : 'Standard Rent'}
                        </span>
                        {room.isCustomRent && (
                          <span
                            style={{
                              backgroundColor: '#DBEAFE',
                              color: 'var(--color-interactive)',
                              borderRadius: '3px',
                              padding: '1px 4px',
                              fontSize: '9.5px',
                              fontWeight: 800,
                            }}
                          >
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px' }}>
                        ₹{Number(room.monthlyRent ?? propertyDetails?.defaultBaseRent ?? 0).toLocaleString('en-IN')}{' '}
                        <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>/mo</span>
                      </div>
                    </div>

                    <div
                      style={{
                        backgroundColor: '#EFF6FF',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        border: '1px solid #DBEAFE',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                        Electricity
                      </div>
                      <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px' }}>
                        ₹{Number(room.electricityRate ?? propertyDetails?.defaultElectricityRate ?? 0).toFixed(2)}{' '}
                        <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>/unit</span>
                      </div>
                    </div>
                  </div>

                  {/* Meter Reading Logged (Room 101) */}
                  {room.meterStatus && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569' }}>
                        <Zap size={14} color="#16A34A" />
                        <span>{room.meterStatus}</span>
                      </div>

                      <span style={{ color: '#16A34A', fontWeight: 700, fontSize: '11.5px' }}>
                        Up to date
                      </span>
                    </div>
                  )}

                  {/* Pending Bill Warning (Room 204) */}
                  {room.pendingWarning && (
                    <div
                      style={{
                        backgroundColor: '#FEE2E2',
                        border: '1px solid #FECACA',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} color="#DC2626" />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B' }}>
                            {room.pendingWarning}
                          </div>
                          <div className="tabular-nums" style={{ fontSize: '12.5px', fontWeight: 800, color: '#DC2626' }}>
                            ₹{Number(room.pendingAmount || 9239).toLocaleString('en-IN')} Due
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate('/payments/record')}
                        style={{
                          backgroundColor: '#DC2626',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Collect
                      </button>
                    </div>
                  )}

                  {/* Bottom Action Buttons */}
                  {isOccupied ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/rooms/${room.roomNumber}`)}
                      style={{
                        width: '100%',
                        height: '40px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--color-border)',
                        borderRadius: '10px',
                        color: 'var(--color-text-main)',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <span>View Room</span>
                      <ChevronRight size={15} />
                    </button>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/rooms/${room.roomNumber}`)}
                        style={{
                          height: '40px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--color-border)',
                          borderRadius: '10px',
                          color: 'var(--color-text-main)',
                          fontSize: '13px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <span>View Room</span>
                        <ChevronRight size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/tenants/new?room=${room.roomNumber}`)}
                        style={{
                          height: '40px',
                          backgroundColor: 'var(--color-interactive)',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={15} strokeWidth={2.6} />
                        <span>Add Tenant</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal: Add Room */}
        {showAddRoomModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '16px',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '420px',
                backgroundColor: '#FFFFFF',
                borderRadius: '18px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800 }}>Add New Room</h3>
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                >
                  <X size={20} />
                </button>
              </div>

              {modalError && (
                <div style={{ fontSize: '12px', color: '#DC2626', fontWeight: 600 }}>
                  {modalError}
                </div>
              )}

              <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Room Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 102"
                    value={newRoomNumber}
                    onChange={(e) => {
                      setNewRoomNumber(e.target.value);
                      if (modalError) setModalError(null);
                    }}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      padding: '0 12px',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Monthly Rent (₹)
                    </label>
                    <input
                      type="number"
                      value={newRoomRent}
                      onChange={(e) => setNewRoomRent(e.target.value)}
                      style={{
                        width: '100%',
                        height: '40px',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border)',
                        padding: '0 10px',
                        fontSize: '13px',
                        fontWeight: 700,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      Electricity Rate (₹/unit)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={newRoomElectricityRate}
                      onChange={(e) => setNewRoomElectricityRate(e.target.value)}
                      style={{
                        width: '100%',
                        height: '40px',
                        borderRadius: '8px',
                        border: '1px solid var(--color-border)',
                        padding: '0 10px',
                        fontSize: '13px',
                        fontWeight: 700,
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddRoomModal(false)}
                    style={{
                      flex: 1,
                      height: '42px',
                      borderRadius: '10px',
                      backgroundColor: '#F1F5F9',
                      border: 'none',
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
                    disabled={modalSubmitting}
                    style={{
                      flex: 1,
                      height: '42px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--color-interactive)',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {modalSubmitting ? 'Adding...' : 'Add Room'}
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
