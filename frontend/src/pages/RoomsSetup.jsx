import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Boxes,
  Minus,
  Plus,
  Sparkles,
  DoorClosed,
  Pencil,
  ArrowRight,
  Check,
  AlertCircle,
} from 'lucide-react';
import AuthLayout from '../layouts/AuthLayout';
import Stepper from '../components/Stepper';
import Button from '../components/Button';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import { usePropertySetup } from '../context/PropertySetupContext';

export default function RoomsSetup() {
  const navigate = useNavigate();
  const {
    roomCount,
    setRoomCount,
    rooms,
    updateRoomNumber,
  } = usePropertySetup();

  // State for inline room editing
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  // Editable room count input state
  const [inputVal, setInputVal] = useState(String(roomCount));
  const [roomLimitMessage, setRoomLimitMessage] = useState('');

  useEffect(() => {
    setInputVal(String(roomCount));
  }, [roomCount]);

  const handleMinus = () => {
    if (roomCount > 1) {
      setRoomCount(roomCount - 1);
      setRoomLimitMessage('');
    }
  };

  const handlePlus = () => {
    if (roomCount >= 20) {
      setRoomLimitMessage('Maximum 20 rooms can be added.');
      return;
    }
    setRoomLimitMessage('');
    setRoomCount(roomCount + 1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setInputVal('');
      setRoomLimitMessage('');
      return;
    }

    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      return;
    }

    if (parsed > 20) {
      setRoomCount(20);
      setInputVal('20');
      setRoomLimitMessage('Maximum 20 rooms can be added.');
    } else if (parsed <= 0) {
      setRoomCount(1);
      setInputVal('1');
      setRoomLimitMessage('');
    } else {
      setRoomCount(parsed);
      setInputVal(String(parsed));
      setRoomLimitMessage('');
    }
  };

  const handleInputBlur = () => {
    const parsed = parseInt(inputVal, 10);
    if (isNaN(parsed) || parsed < 1) {
      setRoomCount(1);
      setInputVal('1');
      setRoomLimitMessage('');
    } else if (parsed > 20) {
      setRoomCount(20);
      setInputVal('20');
      setRoomLimitMessage('Maximum 20 rooms can be added.');
    } else {
      setRoomCount(parsed);
      setInputVal(String(parsed));
      setRoomLimitMessage('');
    }
  };

  const startEdit = (index, currentNumber) => {
    setEditingIndex(index);
    setEditingValue(currentNumber);
  };

  const saveEdit = (index) => {
    if (editingValue.trim()) {
      updateRoomNumber(index, editingValue.trim());
    }
    setEditingIndex(null);
  };

  return (
    <AuthLayout
      title="Property Setup"
      onBack={() => navigate('/setup/property')}
      onClose={() => navigate('/login')}
    >
      <div className="app-content" style={{ paddingTop: '4px' }}>
        {/* Stepper */}
        <Stepper currentStep={2} />

        {/* Step 2 Tag */}
        <div>
          <StatusBadge
            variant="tag"
            label="INVENTORY SETUP"
            icon={<Boxes size={13} />}
          />
        </div>

        {/* Headings */}
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-main)',
              lineHeight: '1.25',
            }}
          >
            Add Rooms
          </h1>
          <p
            style={{
              fontSize: '13.5px',
              color: 'var(--color-neutral)',
              marginTop: '4px',
              lineHeight: '1.45',
            }}
          >
            For flats or shared rooms, We'll automatically generate your initial inventory.
          </p>
        </div>

        {/* Room Counter Card */}
        <Card
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '20px 16px',
          }}
        >
          {/* Minus, Count Input, Plus Controls */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px 0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
              }}
            >
              <button
                type="button"
                onClick={handleMinus}
                disabled={roomCount <= 1}
                aria-label="Decrease room count"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: roomCount <= 1 ? '#F1F5F9' : '#EFF6FF',
                  border: '1px solid',
                  borderColor: roomCount <= 1 ? '#E2E8F0' : '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: roomCount <= 1 ? 'not-allowed' : 'pointer',
                  color: roomCount <= 1 ? '#94A3B8' : 'var(--color-interactive)',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  boxSizing: 'border-box',
                }}
              >
                <Minus size={20} strokeWidth={2.6} />
              </button>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={inputVal}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                aria-label="Number of rooms"
                style={{
                  width: '84px',
                  height: '48px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--color-border)',
                  backgroundColor: '#F8FAFC',
                  fontSize: '22px',
                  fontWeight: 800,
                  color: 'var(--color-text-main)',
                  textAlign: 'center',
                  outline: 'none',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  boxSizing: 'border-box',
                  display: 'block',
                  margin: 0,
                  padding: 0,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--color-interactive)';
                  e.target.style.backgroundColor = '#FFFFFF';
                  e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                  e.target.select();
                }}
                onBlurCapture={(e) => {
                  e.target.style.borderColor = 'var(--color-border)';
                  e.target.style.backgroundColor = '#F8FAFC';
                  e.target.style.boxShadow = 'none';
                }}
              />

              <button
                type="button"
                onClick={handlePlus}
                aria-label="Increase room count"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-interactive)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#FFFFFF',
                  boxShadow: '0 3px 8px rgba(29, 78, 216, 0.25)',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  boxSizing: 'border-box',
                }}
              >
                <Plus size={20} strokeWidth={2.6} />
              </button>
            </div>

            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: 'var(--color-neutral)',
                marginTop: '6px',
                textTransform: 'uppercase',
              }}
            >
              ROOMS
            </span>
          </div>

          {/* Maximum Rooms Alert */}
          {roomLimitMessage && (
            <div
              role="alert"
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '10px',
                padding: '9px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#DC2626',
              }}
            >
              <AlertCircle size={15} color="#DC2626" style={{ flexShrink: 0 }} />
              <span>{roomLimitMessage}</span>
            </div>
          )}

          {/* Automatic Generation Callout */}
          <div
            style={{
              backgroundColor: '#EFF6FF',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              gap: '10px',
              border: '1px solid #DBEAFE',
              alignItems: 'flex-start',
            }}
          >
            <Sparkles size={18} color="var(--color-interactive)" style={{ marginTop: '2px', flexShrink: 0 }} />
            <p style={{ fontSize: '12.5px', color: 'var(--color-text-main)', lineHeight: '1.4' }}>
              <strong>{roomCount} rooms</strong> will be automatically generated as Room 101 to{' '}
              {100 + roomCount}. All rooms start as{' '}
              <strong style={{ color: 'var(--color-success)' }}>VACANT</strong>.
            </p>
          </div>
        </Card>

        {/* Room Preview List Section Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '4px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--color-text-main)',
            }}
          >
            Preview Rooms ({rooms.length})
          </span>
          <span style={{ fontSize: '11.5px', color: 'var(--color-neutral)' }}>
            Tap edit icon to customize number
          </span>
        </div>

        {/* Room Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {rooms.map((room, index) => {
            const isEditing = editingIndex === index;

            return (
              <div
                key={room.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  minHeight: '56px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-subtle)',
                  boxSizing: 'border-box',
                }}
              >
                {/* Left: Room icon + Room number */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      backgroundColor: '#EFF6FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-interactive)',
                      flexShrink: 0,
                    }}
                  >
                    <DoorClosed size={18} />
                  </div>

                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(index);
                          if (e.key === 'Escape') setEditingIndex(null);
                        }}
                        style={{
                          height: '32px',
                          padding: '0 8px',
                          border: '1.5px solid var(--color-interactive)',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: 600,
                          width: '110px',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => saveEdit(index)}
                        style={{
                          background: 'var(--color-interactive)',
                          border: 'none',
                          color: '#FFFFFF',
                          borderRadius: '6px',
                          padding: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--color-text-main)',
                      }}
                    >
                      Room {room.roomNumber}
                    </span>
                  )}
                </div>

                {/* Right: VACANT status + pencil icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <StatusBadge status="VACANT" />

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => startEdit(index, room.roomNumber)}
                      aria-label={`Edit Room ${room.roomNumber}`}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-neutral)',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        transition: 'color 0.15s ease',
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Button
            variant="primary"
            onClick={() => navigate('/setup/pricing')}
            icon={<ArrowRight size={18} strokeWidth={2.4} />}
          >
            Continue to Pricing
          </Button>

          <button
            type="button"
            onClick={() => navigate('/setup/property')}
            className="link-btn"
            style={{ fontSize: '13.5px' }}
          >
            Back to Step 1
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
