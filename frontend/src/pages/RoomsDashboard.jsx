import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  DoorClosed,
  Zap,
  Plus,
  UserPlus,
  Pencil,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  LogOut,
  Sliders,
  DollarSign,
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import BottomNav from '../components/BottomNav';
import { usePropertySetup } from '../context/PropertySetupContext';

export default function RoomsDashboard() {
  const navigate = useNavigate();
  const {
    owner,
    createdProperty,
    propertyName,
    address,
    rooms,
    setRooms,
    defaultMonthlyRent,
    defaultElectricityRate,
    resetSetup,
  } = usePropertySetup();

  // Active property data (fallback to state if not yet permanently created)
  const currentPropName = createdProperty?.propertyName || propertyName || 'Shree Residency';
  const currentAddress = createdProperty?.address || address || 'Ahmedabad, Gujarat';
  const currentRooms = createdProperty?.rooms || rooms || [];
  const currentRent = createdProperty?.defaultMonthlyRent || defaultMonthlyRent || 8000;
  const currentRate = createdProperty?.defaultElectricityRate || defaultElectricityRate || 8.5;

  // Selected room for action modals
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [modalType, setModalType] = useState(null); // 'assignTenant' | 'editRate' | 'addRoom'
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [editRoomRent, setEditRoomRent] = useState('');
  const [editRoomRate, setEditRoomRate] = useState('');

  // Calculate totals
  const totalRooms = currentRooms.length;
  const vacantRooms = currentRooms.filter((r) => r.status === 'VACANT').length;
  const occupiedRooms = totalRooms - vacantRooms;
  const totalPotential = currentRooms.reduce(
    (sum, r) => sum + (Number(r.monthlyRent) || currentRent),
    0
  );

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleOpenEditRate = (room) => {
    setSelectedRoom(room);
    setEditRoomRent(room.monthlyRent || currentRent);
    setEditRoomRate(room.electricityRate || currentRate);
    setModalType('editRate');
  };

  const handleSaveRoomRate = () => {
    if (selectedRoom) {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === selectedRoom.id
            ? {
                ...r,
                monthlyRent: Number(editRoomRent) || r.monthlyRent,
                electricityRate: Number(editRoomRate) || r.electricityRate,
              }
            : r
        )
      );
    }
    setModalType(null);
  };

  const handleAddRoom = () => {
    if (newRoomNumber.trim()) {
      const newRoom = {
        id: `room-${Date.now()}`,
        roomNumber: newRoomNumber.trim(),
        status: 'VACANT',
        monthlyRent: currentRent,
        electricityRate: currentRate,
      };
      setRooms((prev) => [...prev, newRoom]);
      setNewRoomNumber('');
      setModalType(null);
    }
  };

  const handleRestartWizard = () => {
    resetSetup();
    navigate('/setup/property');
  };

  return (
    <div className="app-viewport">
      <div className="app-shell" style={{ maxWidth: '640px' }}>
        {/* Top App Bar */}
        <header
          style={{
            height: '64px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--color-border)',
            backgroundColor: '#FFFFFF',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <Building2 size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontWeight: 800, fontSize: '15px' }}>RentManager Pro</span>
                <span
                  style={{
                    backgroundColor: '#EFF6FF',
                    color: '#1D4ED8',
                    border: '1px solid #DBEAFE',
                    borderRadius: '4px',
                    padding: '1px 4px',
                    fontSize: '10px',
                    fontWeight: 800,
                  }}
                >
                  IN
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-neutral)' }}>Owner Portal</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleRestartWizard}
              title="Test Onboarding Wizard Again"
              style={{
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={13} />
              <span>Restart Flow</span>
            </button>

            <div
              className="user-avatar-circle"
              title={`${owner?.fullName || 'Owner'} (${owner?.email || ''})`}
            >
              {owner?.fullName ? owner.fullName.charAt(0) : 'R'}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="app-content" style={{ padding: '16px', gap: '16px' }}>
          {/* Success Banner */}
          <div
            style={{
              backgroundColor: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <CheckCircle2 size={18} color="var(--color-success)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '12.5px', color: '#166534', fontWeight: 600 }}>
              Property setup complete! Bank-grade rental ledger active with {totalRooms} vacant units.
            </div>
          </div>

          {/* Property Identity Card */}
          <Card style={{ padding: '18px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <StatusBadge variant="profile" label="ACTIVE PROFILE" />
                </div>
                <h1 style={{ fontSize: '20px', fontWeight: 800 }}>{currentPropName}</h1>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--color-neutral)',
                    fontSize: '13px',
                    marginTop: '2px',
                  }}
                >
                  <MapPin size={15} />
                  <span>{currentAddress}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalType('addRoom')}
                className="btn btn-primary"
                style={{
                  height: '36px',
                  padding: '0 12px',
                  fontSize: '13px',
                  width: 'auto',
                }}
              >
                <Plus size={15} />
                <span>Add Unit</span>
              </button>
            </div>
          </Card>

          {/* KPI Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
            }}
          >
            {/* Total Units */}
            <Card style={{ padding: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-neutral)', fontWeight: 600 }}>
                Total Inventory
              </div>
              <div
                className="tabular-nums"
                style={{ fontSize: '24px', fontWeight: 800, marginTop: '2px' }}
              >
                {totalRooms} <span style={{ fontSize: '13px', color: 'var(--color-neutral)', fontWeight: 500 }}>Units</span>
              </div>
              <div style={{ marginTop: '4px' }}>
                <StatusBadge status="VACANT" label={`${vacantRooms} VACANT (100%)`} />
              </div>
            </Card>

            {/* Projected Potential */}
            <Card style={{ padding: '14px' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-neutral)', fontWeight: 600 }}>
                Monthly Potential
              </div>
              <div
                className="tabular-nums"
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  marginTop: '2px',
                  color: 'var(--color-interactive)',
                }}
              >
                ₹{formatCurrency(totalPotential)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-neutral)', marginTop: '4px' }}>
                ₹{formatCurrency(currentRent)}/mo base
              </div>
            </Card>
          </div>

          {/* Inventory List Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '4px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700 }}>Units Inventory</h2>
              <p style={{ fontSize: '12px', color: 'var(--color-neutral)' }}>
                All units start VACANT. Individual rates can be updated per room.
              </p>
            </div>
            <span
              style={{
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                borderRadius: '9999px',
                padding: '2px 8px',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {totalRooms} Total
            </span>
          </div>

          {/* Room Units List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {currentRooms.map((room) => (
              <Card
                key={room.id}
                style={{
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: '#EFF6FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-interactive)',
                      }}
                    >
                      <DoorClosed size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700 }}>
                        Room {room.roomNumber}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--color-neutral)' }}>
                        Residential Standard
                      </div>
                    </div>
                  </div>

                  <StatusBadge status={room.status} />
                </div>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12.5px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--color-neutral)' }}>Base Rent: </span>
                    <strong className="tabular-nums">
                      ₹{formatCurrency(room.monthlyRent || currentRent)}/mo
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-neutral)' }}>Power: </span>
                    <strong className="tabular-nums">
                      ₹{room.electricityRate || currentRate}/unit
                    </strong>
                  </div>
                </div>

                {/* Quick Unit Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/tenants/new?room=${room.roomNumber}`)}
                    className="btn btn-secondary"
                    style={{ height: '34px', fontSize: '12.5px', padding: '0 10px' }}
                  >
                    <UserPlus size={14} />
                    <span>Assign Tenant</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditRate(room)}
                    className="btn"
                    style={{
                      height: '34px',
                      fontSize: '12.5px',
                      padding: '0 10px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-main)',
                    }}
                  >
                    <Pencil size={13} />
                    <span>Edit Rate</span>
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* Phase 2 Hint Box */}
          <div
            style={{
              backgroundColor: '#EFF6FF',
              borderRadius: '14px',
              padding: '14px',
              border: '1px solid #DBEAFE',
              marginTop: '8px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <ShieldCheck size={20} color="var(--color-interactive)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                Next Phase Ready
              </div>
              <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4', marginTop: '2px' }}>
                Property structure and VACANT room inventory are established. Ready for tenant onboarding, meter readings, and automated WhatsApp UPI billing.
              </p>
            </div>
          </div>
        </div>

        {/* Modal: Assign Tenant Placeholder */}
        {modalType === 'assignTenant' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              zIndex: 100,
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                padding: '24px',
                maxWidth: '380px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
                  Assign Tenant — Room {selectedRoom?.roomNumber}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--color-neutral)', lineHeight: '1.45' }}>
                Business Rule Enforced: Initial onboarding creates purely VACANT rooms. Tenant allocation, WhatsApp KYC, and digital agreement signing activate in the upcoming Tenant module.
              </p>

              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                }}
              >
                <div>Unit: <strong>Room {selectedRoom?.roomNumber}</strong></div>
                <div>Status: <strong style={{ color: 'var(--color-success)' }}>VACANT</strong></div>
                <div>Monthly Base Rent: <strong>₹{selectedRoom?.monthlyRent}</strong></div>
              </div>

              <Button variant="primary" onClick={() => setModalType(null)}>
                Understood
              </Button>
            </div>
          </div>
        )}

        {/* Modal: Edit Room Individual Rate */}
        {modalType === 'editRate' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              zIndex: 100,
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                padding: '24px',
                maxWidth: '380px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>
                  Customize Room {selectedRoom?.roomNumber} Rates
                </h3>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                >
                  ✕
                </button>
              </div>

              <p style={{ fontSize: '12.5px', color: 'var(--color-neutral)' }}>
                Override default rates for this specific unit without altering other rooms.
              </p>

              <div className="form-group">
                <label className="form-label">Monthly Rent (₹)</label>
                <div className="input-container">
                  <input
                    type="number"
                    value={editRoomRent}
                    onChange={(e) => setEditRoomRent(e.target.value)}
                    className="input-field tabular-nums"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Electricity Tariff (₹/unit)</label>
                <div className="input-container">
                  <input
                    type="number"
                    step="0.1"
                    value={editRoomRate}
                    onChange={(e) => setEditRoomRate(e.target.value)}
                    className="input-field tabular-nums"
                  />
                </div>
              </div>

              <Button variant="primary" onClick={handleSaveRoomRate}>
                Save Room Rates
              </Button>
            </div>
          </div>
        )}

        {/* Modal: Add Room */}
        {modalType === 'addRoom' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              zIndex: 100,
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                padding: '24px',
                maxWidth: '380px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Add New Unit</h3>
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                >
                  ✕
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Unit Number / Identifier</label>
                <div className="input-container">
                  <input
                    type="text"
                    placeholder="e.g. 106 or 201"
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    className="input-field"
                    autoFocus
                  />
                </div>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--color-neutral)' }}>
                Will inherit default rent of ₹{formatCurrency(currentRent)} and power tariff ₹{currentRate}/kWh, starting as VACANT.
              </p>

              <Button variant="primary" onClick={handleAddRoom} disabled={!newRoomNumber.trim()}>
                Add Unit →
              </Button>
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  );
}
