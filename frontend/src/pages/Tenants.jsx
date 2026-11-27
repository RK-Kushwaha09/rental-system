import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  UserPlus,
  Search,
  FileSpreadsheet,
  Phone,
  MessageCircle,
  CreditCard,
  History,
  Clock,
  Zap,
  DoorClosed,
  Home,
  Check,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { usePropertySetup } from '../context/PropertySetupContext';
import { tenantAPI, propertyAPI } from '../services/api';

export default function Tenants() {
  const navigate = useNavigate();
  const { propertyName: setupPropName, owner } = usePropertySetup();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'PAYMENT DUE' | 'ADVANCE'
  const [tenantsList, setTenantsList] = useState([]);
  const [vacantRooms, setVacantRooms] = useState([]);
  const [propertyData, setPropertyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load real data from backend
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tenants, rooms, prop] = await Promise.all([
        tenantAPI.getAll(),
        propertyAPI.getRoomsInventory().catch(() => []),
        propertyAPI.getProperty().catch(() => null),
      ]);
      setTenantsList(tenants || []);
      setVacantRooms((rooms || []).filter((r) => r.status === 'VACANT'));
      if (prop) setPropertyData(prop);
    } catch (err) {
      console.error('Failed to load tenants:', err);
      setError(err?.message || 'Failed to load tenants data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered tenants based on search and active tab
  const filteredTenants = useMemo(() => {
    return tenantsList.filter((tenant) => {
      const query = searchQuery.toLowerCase().trim();
      const name = (tenant.name || tenant.fullName || '').toLowerCase();
      const roomNum = (tenant.roomNumber || tenant.unitNumber || '').toLowerCase();
      const mobile = (tenant.mobile || '').toLowerCase();

      const matchesSearch = !query || name.includes(query) || roomNum.includes(query) || mobile.includes(query);
      if (!matchesSearch) return false;

      const isDue = tenant.status === 'DUE' || (tenant.currentBalance && tenant.currentBalance > 0);
      const isAdvance = tenant.status === 'ADVANCE' || (tenant.currentBalance && tenant.currentBalance < 0);

      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'ACTIVE') return tenant.status !== 'INACTIVE';
      if (activeFilter === 'PAYMENT DUE') return isDue;
      if (activeFilter === 'ADVANCE') return isAdvance;
      return true;
    });
  }, [tenantsList, searchQuery, activeFilter]);

  const dueCount = tenantsList.filter(
    (t) => t.status === 'DUE' || (t.currentBalance && t.currentBalance > 0)
  ).length;
  const advanceCount = tenantsList.filter(
    (t) => t.status === 'ADVANCE' || (t.currentBalance && t.currentBalance < 0)
  ).length;
  const activeCount = tenantsList.filter((t) => t.status !== 'INACTIVE').length;

  const displayPropertyName =
    propertyData?.propertyName || setupPropName || 'My Property';

  // Calculate real ledger summary for occupied tenants
  const ledgerSummary = useMemo(() => {
    if (tenantsList.length === 0) {
      return { totalDue: 0, totalCollected: 0, pending: 0, pct: 0 };
    }
    const totalDue = tenantsList.reduce((acc, t) => acc + (t.monthlyRent || 0), 0);
    const pending = tenantsList.reduce((acc, t) => acc + (t.currentBalance && t.currentBalance > 0 ? t.currentBalance : 0), 0);
    const totalCollected = Math.max(0, totalDue - pending);
    const pct = totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0;
    return { totalDue, totalCollected, pending, pct };
  }, [tenantsList]);

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
                <span>🏢 {displayPropertyName}</span>
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
              {dueCount > 0 && (
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
              )}
            </div>

            <div
              className="user-avatar-circle"
              title={`${owner?.fullName || 'Owner Account'}`}
              onClick={() => navigate('/more')}
              style={{ cursor: 'pointer' }}
            >
              {owner?.fullName ? owner.fullName.charAt(0).toLowerCase() : 'g'}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="app-content" style={{ padding: '16px', gap: '14px', flex: 1, paddingBottom: '24px' }}>
          {/* Title Row with Badge & Add Tenant Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 800 }}>Tenants</h1>
              <span
                style={{
                  backgroundColor: '#EFF6FF',
                  color: 'var(--color-interactive)',
                  borderRadius: '9999px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                {tenantsList.length} Active
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/tenants/new')}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <UserPlus size={15} />
              <span>Add Tenant</span>
            </button>
          </div>

          {/* Search Bar */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              padding: '0 12px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: 'var(--shadow-subtle)',
            }}
          >
            <Search size={18} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search tenant by name, mobile, or room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '13.5px',
                width: '100%',
                background: 'transparent',
                color: 'var(--color-text-main)',
              }}
            />
          </div>

          {/* Filter Tabs */}
          <div className="filter-tabs-row">
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className={`filter-tab ${activeFilter === 'ALL' ? 'active' : ''}`}
            >
              ALL ({tenantsList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('ACTIVE')}
              className={`filter-tab ${activeFilter === 'ACTIVE' ? 'active' : ''}`}
            >
              ACTIVE ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('PAYMENT DUE')}
              className={`filter-tab ${activeFilter === 'PAYMENT DUE' ? 'active' : ''}`}
            >
              PAYMENT DUE ({dueCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('ADVANCE')}
              className={`filter-tab ${activeFilter === 'ADVANCE' ? 'active' : ''}`}
            >
              ADVANCE ({advanceCount})
            </button>
          </div>

          {/* Monthly Rent Ledger Summary Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: 'var(--shadow-subtle)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileSpreadsheet size={16} color="var(--color-interactive)" />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    color: 'var(--color-text-main)',
                  }}
                >
                  MONTHLY RENT LEDGER
                </span>
              </div>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--color-interactive)',
                }}
              >
                {ledgerSummary.pct}% Collected
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <div
                style={{
                  backgroundColor: '#EFF6FF',
                  borderRadius: '10px',
                  padding: '8px 10px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Rent Total</div>
                <div
                  className="tabular-nums"
                  style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--color-text-main)', marginTop: '2px' }}
                >
                  ₹{Number(ledgerSummary.totalDue).toLocaleString('en-IN')}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#DCFCE7',
                  borderRadius: '10px',
                  padding: '8px 10px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: '#166534', fontWeight: 500 }}>Collected</div>
                <div
                  className="tabular-nums"
                  style={{ fontSize: '14.5px', fontWeight: 800, color: '#16A34A', marginTop: '2px' }}
                >
                  ₹{Number(ledgerSummary.totalCollected).toLocaleString('en-IN')}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#FEE2E2',
                  borderRadius: '10px',
                  padding: '8px 10px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', color: '#991B1B', fontWeight: 500 }}>Pending</div>
                <div
                  className="tabular-nums"
                  style={{ fontSize: '14.5px', fontWeight: 800, color: '#DC2626', marginTop: '2px' }}
                >
                  ₹{Number(ledgerSummary.pending).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div style={{ padding: '30px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', border: '3px solid #E2E8F0', borderTopColor: 'var(--color-interactive)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>Loading tenants...</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '12px', padding: '12px 14px', color: '#DC2626', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Tenants List or Empty State */}
          {!loading && (
            <>
              {tenantsList.length === 0 ? (
                /* Clean Empty State */
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    borderRadius: '16px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: 'var(--shadow-subtle)',
                  }}
                >
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      backgroundColor: '#EFF6FF',
                      color: 'var(--color-interactive)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <UserPlus size={26} />
                  </div>
                  <div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                      No tenants yet
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px', maxWidth: '300px', lineHeight: '1.4' }}>
                      Add your first tenant to start managing your property.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (vacantRooms.length > 0) {
                        navigate(`/tenants/new?room=${vacantRooms[0].roomNumber}`);
                      } else {
                        navigate('/tenants/new');
                      }
                    }}
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 20px',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      marginTop: '4px',
                    }}
                  >
                    <UserPlus size={16} />
                    <span>Add Your First Tenant</span>
                  </button>
                </div>
              ) : filteredTenants.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--color-border)',
                    borderRadius: '16px',
                    padding: '28px 20px',
                    textAlign: 'center',
                    color: '#64748B',
                    fontSize: '13.5px',
                  }}
                >
                  No tenants match your search criteria.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredTenants.map((tenant) => {
                    const isDue = tenant.status === 'DUE' || (tenant.currentBalance && tenant.currentBalance > 0);
                    const displayName = tenant.name || tenant.fullName || 'Tenant';
                    const displayRoom = tenant.roomNumber || tenant.unitNumber || '-';
                    const displayFloor = tenant.floor || 'Ground Fl';
                    const initials = tenant.initials || displayName.slice(0, 2).toUpperCase() || 'TN';

                    return (
                      <div key={tenant.id} className="tenant-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div
                              className="tenant-avatar"
                              style={{ backgroundColor: tenant.avatarBg || '#DBEAFE', color: tenant.avatarColor || '#1E40AF' }}
                            >
                              {initials}
                              {isDue && (
                                <div className="tenant-avatar-badge" style={{ backgroundColor: '#DC2626' }}>
                                  <span style={{ fontSize: '9px', color: '#FFFFFF', fontWeight: 800 }}>!</span>
                                </div>
                              )}
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '16px', fontWeight: 800 }}>{displayName}</span>
                                <span
                                  style={{
                                    backgroundColor: isDue ? '#FEE2E2' : '#DCFCE7',
                                    color: isDue ? '#DC2626' : '#166534',
                                    borderRadius: '4px',
                                    padding: '1px 5px',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                  }}
                                >
                                  {isDue ? 'DUE' : (tenant.status || 'ACTIVE')}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '1px' }}>
                                Room {displayRoom} • {displayFloor}
                              </div>
                            </div>
                          </div>

                          <span
                            style={{
                              backgroundColor: isDue ? '#FEE2E2' : '#EFF6FF',
                              color: isDue ? '#DC2626' : 'var(--color-interactive)',
                              borderRadius: '9999px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                          >
                            {tenant.agreementStatus || 'Active Agreement'}
                          </span>
                        </div>

                        <div
                          style={{
                            backgroundColor: '#F8FAFC',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '12px',
                            color: '#64748B',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={12} />
                            <span>{tenant.mobile || '-'}</span>
                          </div>
                          <div>Joined: {tenant.joinedDate || 'Recently'}</div>
                        </div>

                        {tenant.emergencyContact && (
                          <div style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>Emergency Contact:</span>
                            <strong style={{ color: 'var(--color-text-main)' }}>{tenant.emergencyContact}</strong>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px' }}>
                          {tenant.mobile && (
                            <>
                              <a
                                href={`tel:${tenant.mobile.replace(/\s+/g, '')}`}
                                className="tenant-btn-sm tenant-btn-light"
                                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', flex: 1 }}
                              >
                                <Phone size={14} />
                                <span>Call</span>
                              </a>
                              <a
                                href={`https://wa.me/${tenant.mobile.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="tenant-btn-sm tenant-btn-whatsapp"
                                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', flex: 1 }}
                              >
                                <MessageCircle size={14} />
                                <span>WhatsApp</span>
                              </a>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => navigate(`/rooms/${displayRoom}`)}
                            className="tenant-btn-sm tenant-btn-light"
                            style={{ flex: 1 }}
                          >
                            <DoorClosed size={14} />
                            <span>Room</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Vacant Room Section: Dynamically shows first vacant room if one exists */}
          {vacantRooms.length > 0 && (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #DBEAFE',
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
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      backgroundColor: '#EFF6FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-interactive)',
                      flexShrink: 0,
                    }}
                  >
                    <DoorClosed size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'var(--color-text-main)' }}>
                      Room {vacantRooms[0].roomNumber} is currently VACANT
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                      {vacantRooms[0].type || 'Single'} • {vacantRooms[0].floor || 'Ground Floor'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>
                      Expected ₹{Number(vacantRooms[0].monthlyRent || 0).toLocaleString('en-IN')}/mo
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    backgroundColor: '#EFF6FF',
                    color: 'var(--color-interactive)',
                    borderRadius: '9999px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  UNRENTED
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/tenants/new?room=${vacantRooms[0].roomNumber}`)}
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '10px',
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
                  marginTop: '4px',
                }}
              >
                <Home size={16} />
                <span>Onboard Tenant to Room {vacantRooms[0].roomNumber}</span>
              </button>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <BottomNav />
      </div>
    </div>
  );
}
