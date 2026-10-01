import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Users, Plus, Trash2, Edit3, Phone, Mail, Calendar, DoorOpen, Search, X, CheckCircle2 } from 'lucide-react';

export default function TenantsPage({ onNavigateToPayments }) {
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    roomId: '',
    joinedDate: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [tenantsRes, roomsRes] = await Promise.all([
        api.getTenants(),
        api.getRooms(),
      ]);
      setTenants(tenantsRes || []);
      setRooms(roomsRes || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddTenant = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setSubmitting(true);
      await api.createTenant({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        roomId: formData.roomId ? Number(formData.roomId) : null,
        joinedDate: formData.joinedDate,
      });
      showToast('Tenant registered successfully!');
      setShowAddModal(false);
      setFormData({
        name: '',
        phone: '',
        email: '',
        roomId: '',
        joinedDate: new Date().toISOString().split('T')[0],
      });
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTenant = async (e) => {
    e.preventDefault();
    if (!editingTenant || !editingTenant.name.trim()) return;

    try {
      setSubmitting(true);
      await api.updateTenant(editingTenant.id, {
        name: editingTenant.name.trim(),
        phone: editingTenant.phone?.trim() || '',
        email: editingTenant.email?.trim() || '',
        roomId: editingTenant.room?.id || editingTenant.roomId || null,
        joinedDate: editingTenant.joinedDate,
      });
      showToast('Tenant updated successfully!');
      setEditingTenant(null);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTenant = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove tenant "${name}"? Their assigned room will become vacant.`)) return;

    try {
      await api.deleteTenant(id);
      showToast('Tenant removed successfully');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const vacantRooms = rooms.filter((r) => r.status === 'vacant');

  const filteredTenants = tenants.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.phone && t.phone.toLowerCase().includes(q)) ||
      (t.email && t.email.toLowerCase().includes(q)) ||
      (t.room && t.room.roomNumber.toLowerCase().includes(q)) ||
      (t.room?.building?.name && t.room.building.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition ${
          notification.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Tenants Directory</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage tenants, room allocations, and resident details</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Register Tenant
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, phone, email, or room..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-sm"
        />
      </div>

      {/* Tenants Table / Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 animate-pulse h-64" />
      ) : filteredTenants.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-md mx-auto">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Tenants Found</h3>
          <p className="text-xs text-slate-500 mt-1">Add your first tenant to assign them to a room.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700"
          >
            Register Tenant
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6">Tenant Name</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4">Assigned Room</th>
                  <th className="py-3.5 px-4">Monthly Rent</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {t.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition">{t.name}</p>
                          <p className="text-[11px] text-slate-400">ID: #{t.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-0.5 text-xs">
                        <p className="flex items-center gap-1.5 text-slate-700">
                          <Phone className="w-3 h-3 text-slate-400" /> {t.phone || 'No phone'}
                        </p>
                        {t.email && (
                          <p className="flex items-center gap-1.5 text-slate-400">
                            <Mail className="w-3 h-3 text-slate-300" /> {t.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {t.room ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
                          <DoorOpen className="w-3.5 h-3.5" />
                          <span>Room {t.room.roomNumber} ({t.room.building?.name})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-800">
                      {t.room ? `₹${Number(t.room.monthlyRent).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> {t.joinedDate}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {t.room && (
                          <button
                            onClick={() => onNavigateToPayments && onNavigateToPayments(t.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                            title="Collect rent"
                          >
                            Bill
                          </button>
                        )}
                        <button
                          onClick={() => setEditingTenant({ ...t, roomId: t.room?.id || '' })}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                          title="Edit Tenant"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTenant(t.id, t.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Tenant"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register Tenant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" /> Register New Tenant
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTenant} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Joined Date</label>
                  <input
                    type="date"
                    value={formData.joinedDate}
                    onChange={(e) => setFormData({ ...formData, joinedDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="rahul@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Assign Room (Vacant Rooms)
                </label>
                <select
                  value={formData.roomId}
                  onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">-- No Room (Assign Later) --</option>
                  {vacantRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.roomNumber} ({r.building?.name}) — ₹{Number(r.monthlyRent).toLocaleString()}/mo
                    </option>
                  ))}
                </select>
                {vacantRooms.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1">No vacant rooms available right now.</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tenant Modal */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" /> Edit Tenant Profile
              </h3>
              <button onClick={() => setEditingTenant(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTenant} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingTenant.name}
                  onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Phone</label>
                  <input
                    type="tel"
                    value={editingTenant.phone || ''}
                    onChange={(e) => setEditingTenant({ ...editingTenant, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Joined Date</label>
                  <input
                    type="date"
                    value={editingTenant.joinedDate || ''}
                    onChange={(e) => setEditingTenant({ ...editingTenant, joinedDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={editingTenant.email || ''}
                  onChange={(e) => setEditingTenant({ ...editingTenant, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Re-assign Room
                </label>
                <select
                  value={editingTenant.roomId || ''}
                  onChange={(e) => setEditingTenant({ ...editingTenant, roomId: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">-- No Room --</option>
                  {/* If they currently have a room, keep it in the dropdown */}
                  {editingTenant.room && (
                    <option value={editingTenant.room.id}>
                      Current: Room {editingTenant.room.roomNumber} ({editingTenant.room.building?.name})
                    </option>
                  )}
                  {vacantRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.roomNumber} ({r.building?.name}) — ₹{Number(r.monthlyRent).toLocaleString()}/mo
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
