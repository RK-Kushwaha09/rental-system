import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Building2, Plus, Trash2, MapPin, DoorOpen, Search, X } from 'lucide-react';

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadBuildings = async () => {
    try {
      setLoading(true);
      const res = await api.getBuildings();
      setBuildings(res || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBuildings();
  }, []);

  const handleAddBuilding = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      setSubmitting(true);
      await api.createBuilding({ name: newName.trim(), address: newAddress.trim() });
      showToast('Building created successfully!');
      setNewName('');
      setNewAddress('');
      setShowAddModal(false);
      loadBuildings();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBuilding = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete building "${name}" and all its rooms?`)) return;

    try {
      await api.deleteBuilding(id);
      showToast('Building deleted successfully');
      loadBuildings();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredBuildings = buildings.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.address && b.address.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Notification */}
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Buildings & Properties</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your rental properties and units</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Add New Building
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by building name or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-sm"
        />
      </div>

      {/* Buildings Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse h-44" />
          ))}
        </div>
      ) : filteredBuildings.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-md mx-auto">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Buildings Found</h3>
          <p className="text-xs text-slate-500 mt-1">Get started by creating your first property.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700"
          >
            Create Building
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBuildings.map((b) => (
            <div
              key={b.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <button
                    onClick={() => handleDeleteBuilding(b.id, b.name)}
                    className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Building"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mt-4 group-hover:text-indigo-600 transition">
                  {b.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span>{b.address || 'No address specified'}</span>
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <DoorOpen className="w-3.5 h-3.5 text-indigo-500" />
                  {b.roomCount || 0} Rooms
                </span>
                <span className="text-slate-400 text-[11px]">ID: #{b.id}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Building Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" /> Add New Building
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBuilding} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Building Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunrise Apartments"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Address / Location
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. 12 MG Road, Ahmedabad, Gujarat"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
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
                  {submitting ? 'Creating...' : 'Create Building'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
