import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DoorOpen, Plus, Trash2, Edit3, User, Zap, IndianRupee, Search, X, Building2 } from 'lucide-react';

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [formData, setFormData] = useState({
    buildingId: '',
    roomNumber: '',
    monthlyRent: '',
    electricityPerUnit: '',
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
      const [roomsRes, buildingsRes] = await Promise.all([
        api.getRooms(selectedBuilding || null),
        api.getBuildings(),
      ]);
      setRooms(roomsRes || []);
      setBuildings(buildingsRes || []);
      if (!formData.buildingId && buildingsRes && buildingsRes.length > 0) {
        setFormData((prev) => ({ ...prev, buildingId: buildingsRes[0].id }));
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBuilding]);

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!formData.buildingId || !formData.roomNumber) return;

    try {
      setSubmitting(true);
      await api.createRoom({
        buildingId: Number(formData.buildingId),
        roomNumber: formData.roomNumber.trim(),
        monthlyRent: Number(formData.monthlyRent) || 0,
        electricityPerUnit: Number(formData.electricityPerUnit) || 0,
      });
      showToast('Room added successfully!');
      setShowAddModal(false);
      setFormData({
        buildingId: buildings[0]?.id || '',
        roomNumber: '',
        monthlyRent: '',
        electricityPerUnit: '',
      });
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePricing = async (e) => {
    e.preventDefault();
    if (!editRoom) return;

    try {
      setSubmitting(true);
      await api.updateRoomPricing(
        editRoom.id,
        Number(editRoom.monthlyRent),
        Number(editRoom.electricityPerUnit)
      );
      showToast('Pricing updated successfully!');
      setEditRoom(null);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async (id, roomNumber) => {
    if (!window.confirm(`Are you sure you want to delete Room ${roomNumber}?`)) return;

    try {
      await api.deleteRoom(id);
      showToast('Room deleted successfully');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.building?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (r.tenantName && r.tenantName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true : r.status === statusFilter;

    return matchesSearch && matchesStatus;
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Rooms & Units</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage room inventory, pricing, and occupancy</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Add New Room
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search room #, building, or tenant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-sm"
          />
        </div>

        {/* Building Filter */}
        <select
          value={selectedBuilding}
          onChange={(e) => setSelectedBuilding(e.target.value)}
          className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-sm"
        >
          <option value="">All Buildings</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold">
          {['all', 'vacant', 'occupied'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`flex-1 py-1.5 rounded-lg capitalize transition ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse h-48" />
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-md mx-auto">
          <DoorOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Rooms Found</h3>
          <p className="text-xs text-slate-500 mt-1">Try changing filters or add a new room.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700"
          >
            Add Room
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRooms.map((r) => {
            const isOccupied = r.status === 'occupied';
            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {r.building?.name}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        isOccupied
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/70'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-semibold uppercase">Room Number</p>
                      <h3 className="text-2xl font-black text-slate-900">{r.roomNumber}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-semibold uppercase">Monthly Rent</p>
                      <p className="text-lg font-bold text-slate-900">₹{Number(r.monthlyRent).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Pricing & Tenant info */}
                  <div className="mt-4 space-y-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-500" /> Electricity Rate:
                      </span>
                      <span className="font-semibold text-slate-800">₹{r.electricityPerUnit} / unit</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200/50">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-indigo-500" /> Tenant:
                      </span>
                      <span className={`font-semibold ${isOccupied ? 'text-indigo-700' : 'text-slate-400 italic'}`}>
                        {r.tenantName || 'None (Vacant)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setEditRoom({ ...r })}
                    className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-medium transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit Pricing
                  </button>
                  <button
                    onClick={() => handleDeleteRoom(r.id, r.roomNumber)}
                    className="flex items-center gap-1 text-slate-400 hover:text-rose-600 transition"
                    title="Delete Room"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Room Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <DoorOpen className="w-5 h-5 text-indigo-600" /> Add New Room
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRoom} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Building *
                </label>
                <select
                  required
                  value={formData.buildingId}
                  onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="">Select Building</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Room Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 101, A-202"
                  value={formData.roomNumber}
                  onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Monthly Rent (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="8000"
                    value={formData.monthlyRent}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Electricity Rate (₹/unit) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="8.50"
                    value={formData.electricityPerUnit}
                    onChange={(e) => setFormData({ ...formData, electricityPerUnit: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
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
                  {submitting ? 'Adding...' : 'Add Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Pricing Modal */}
      {editRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" /> Edit Pricing — Room {editRoom.roomNumber}
              </h3>
              <button
                onClick={() => setEditRoom(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePricing} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Monthly Rent (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editRoom.monthlyRent}
                  onChange={(e) => setEditRoom({ ...editRoom, monthlyRent: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Electricity Rate (₹/unit)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editRoom.electricityPerUnit}
                  onChange={(e) => setEditRoom({ ...editRoom, electricityPerUnit: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditRoom(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Pricing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
