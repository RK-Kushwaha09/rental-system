import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import ReceiptModal from '../components/ReceiptModal';
import {
  ReceiptIndianRupee, Plus, Trash2, Eye, Calendar, User, Zap,
  AlertCircle, CheckCircle2, Search, X, Calculator, ArrowRight, Printer
} from 'lucide-react';

export default function PaymentsPage({ initialTenantId }) {
  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
  const [filterMonth, setFilterMonth] = useState('');
  const [filterTenant, setFilterTenant] = useState(initialTenantId || '');
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [notification, setNotification] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    tenantId: initialTenantId || '',
    paymentMonth: currentMonthStr,
    prevMeter: 0,
    currMeter: 0,
    paidAmount: '',
    notes: '',
  });

  const [selectedTenantInfo, setSelectedTenantInfo] = useState(null);
  const [carryForward, setCarryForward] = useState(0);
  const [helperLoading, setHelperLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, tenantsRes] = await Promise.all([
        api.getPayments(filterTenant || null, filterMonth || null),
        api.getTenants(),
      ]);
      setPayments(paymentsRes || []);
      setTenants(tenantsRes || []);

      if (initialTenantId && !formData.tenantId) {
        setFormData((prev) => ({ ...prev, tenantId: initialTenantId }));
        setShowAddModal(true);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterTenant, filterMonth]);

  // When tenant or month changes in Add Payment Modal, fetch helper info (last meter & carry forward)
  useEffect(() => {
    if (!formData.tenantId || !formData.paymentMonth) return;

    const tenant = tenants.find((t) => t.id === Number(formData.tenantId));
    setSelectedTenantInfo(tenant || null);

    const fetchHelper = async () => {
      try {
        setHelperLoading(true);
        const info = await api.getPaymentHelperInfo(formData.tenantId, formData.paymentMonth);
        const lastMeter = info?.last_meter || 0;
        const cf = info?.carry_forward || 0;
        setCarryForward(Number(cf));
        setFormData((prev) => ({
          ...prev,
          prevMeter: Number(lastMeter),
          currMeter: Math.max(Number(prev.currMeter || 0), Number(lastMeter)),
        }));
      } catch (err) {
        console.error('Error fetching helper info:', err);
      } finally {
        setHelperLoading(false);
      }
    };

    fetchHelper();
  }, [formData.tenantId, formData.paymentMonth, tenants]);

  // Real-time calculation values
  const monthlyRent = selectedTenantInfo?.room ? Number(selectedTenantInfo.room.monthlyRent) : 0;
  const electricityRate = selectedTenantInfo?.room ? Number(selectedTenantInfo.room.electricityPerUnit) : 0;
  const prevM = Number(formData.prevMeter) || 0;
  const currM = Number(formData.currMeter) || 0;
  const unitsUsed = Math.max(0, currM - prevM);
  const electricityBill = unitsUsed * electricityRate;
  const totalDue = monthlyRent + electricityBill + carryForward;
  const paid = Number(formData.paidAmount) || 0;
  const liveBalance = paid - totalDue;

  let liveStatus = 'clear';
  if (liveBalance < 0) liveStatus = 'due';
  else if (liveBalance > 0) liveStatus = 'advance';

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!formData.tenantId || !formData.paymentMonth) return;

    if (currM < prevM) {
      showToast('Current meter cannot be less than previous meter', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const newPayment = await api.recordPayment({
        tenantId: Number(formData.tenantId),
        paymentMonth: formData.paymentMonth,
        prevMeter: prevM,
        currMeter: currM,
        paidAmount: paid,
        notes: formData.notes,
      });

      showToast('Payment recorded successfully!');
      setShowAddModal(false);
      setFormData({
        tenantId: '',
        paymentMonth: currentMonthStr,
        prevMeter: 0,
        currMeter: 0,
        paidAmount: '',
        notes: '',
      });
      loadData();

      // Show receipt right away for convenient printing
      if (newPayment) {
        setSelectedReceipt(newPayment);
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;

    try {
      await api.deletePayment(id);
      showToast('Payment record deleted');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredPayments = payments.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.tenant?.name?.toLowerCase().includes(q) ||
      p.paymentMonth?.toLowerCase().includes(q) ||
      p.room?.roomNumber?.toLowerCase().includes(q) ||
      p.status?.toLowerCase().includes(q)
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Payments & Billing</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track rent collections, meter readings, dues, and advance payments</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" /> Record New Payment
        </button>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search tenant, month, room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-sm"
          />
        </div>

        {/* Month Selector */}
        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
          <Calendar className="w-4 h-4 text-slate-400 mr-2" />
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none text-slate-700 font-medium"
          />
          {filterMonth && (
            <button onClick={() => setFilterMonth('')} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tenant Filter */}
        <select
          value={filterTenant}
          onChange={(e) => setFilterTenant(e.target.value)}
          className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-sm"
        >
          <option value="">All Tenants</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} {t.room ? `(Rm ${t.room.roomNumber})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 animate-pulse h-64" />
      ) : filteredPayments.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-md mx-auto">
          <ReceiptIndianRupee className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Payments Found</h3>
          <p className="text-xs text-slate-500 mt-1">No payment transactions match your current search.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700"
          >
            Record Payment
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6">Month</th>
                  <th className="py-3.5 px-4">Tenant & Room</th>
                  <th className="py-3.5 px-4">Meter Readings</th>
                  <th className="py-3.5 px-4">Total Due</th>
                  <th className="py-3.5 px-4">Paid</th>
                  <th className="py-3.5 px-4">Balance / Status</th>
                  <th className="py-3.5 px-6 text-right">Receipt / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => {
                  const isDue = p.status === 'due';
                  const isAdvance = p.status === 'advance';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition group">
                      <td className="py-4 px-6 font-bold text-slate-900">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          {p.paymentMonth}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition">{p.tenant?.name}</p>
                        <p className="text-xs text-slate-400">
                          Room {p.room?.roomNumber} • {p.room?.building?.name}
                        </p>
                      </td>
                      <td className="py-4 px-4 text-xs">
                        <span className="text-slate-700 font-medium">
                          {p.prevMeter} → {p.currMeter}
                        </span>
                        <p className="text-slate-400 text-[11px]">
                          ({p.unitsUsed} units @ ₹{p.electricityRate})
                        </p>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-900">
                        ₹{Number(p.totalDue).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 font-bold text-emerald-600">
                        ₹{Number(p.paidAmount).toLocaleString()}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            isDue ? 'bg-rose-100 text-rose-700' : isAdvance ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {p.status}
                          </span>
                          <span className={`text-xs font-semibold ${isDue ? 'text-rose-600' : isAdvance ? 'text-blue-600' : 'text-slate-400'}`}>
                            {isDue && `-₹${Math.abs(Number(p.balance)).toLocaleString()}`}
                            {isAdvance && `+₹${Number(p.balance).toLocaleString()}`}
                            {!isDue && !isAdvance && '₹0'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedReceipt(p)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> Receipt
                          </button>
                          <button
                            onClick={() => handleDeletePayment(p.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Interactive Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 my-8">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-indigo-600" /> Record Rent & Utility Payment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Live electricity & carry-forward bill calculation</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-5 mt-4">
              {/* Tenant & Month Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Tenant *</label>
                  <select
                    required
                    value={formData.tenantId}
                    onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">-- Choose Tenant --</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.room ? `— Room ${t.room.roomNumber}` : '(No room)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Billing Month (YYYY-MM) *</label>
                  <input
                    type="month"
                    required
                    value={formData.paymentMonth}
                    onChange={(e) => setFormData({ ...formData, paymentMonth: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Tenant Info Banner */}
              {selectedTenantInfo && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-slate-400">Assigned Unit:</span>
                    <p className="font-bold text-slate-800">
                      Room {selectedTenantInfo.room?.roomNumber || 'None'} ({selectedTenantInfo.room?.building?.name})
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400">Base Rent:</span>
                    <p className="font-bold text-slate-800">₹{monthlyRent.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Electricity Rate:</span>
                    <p className="font-bold text-slate-800">₹{electricityRate} / unit</p>
                  </div>
                </div>
              )}

              {/* Meter Readings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Previous Meter Reading
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.prevMeter}
                    onChange={(e) => setFormData({ ...formData, prevMeter: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Auto-populated from last month's reading</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Current Meter Reading *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 1280"
                    value={formData.currMeter}
                    onChange={(e) => setFormData({ ...formData, currMeter: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-indigo-600 mt-1 font-medium">
                    Units used: {unitsUsed} units
                  </p>
                </div>
              </div>

              {/* Live Calculation Card */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Room Monthly Rent:</span>
                  <span className="font-bold text-slate-800">₹{monthlyRent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Electricity ({unitsUsed} units × ₹{electricityRate}):</span>
                  <span className="font-bold text-slate-800">₹{electricityBill.toLocaleString()}</span>
                </div>
                {carryForward !== 0 && (
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Previous Month Carry-Forward:</span>
                    <span className={`font-bold ${carryForward > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {carryForward > 0 ? `+ ₹${carryForward.toLocaleString()} (Due)` : `- ₹${Math.abs(carryForward).toLocaleString()} (Advance)`}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-indigo-200/60 flex justify-between items-center font-bold text-sm text-slate-900">
                  <span>Total Calculated Due:</span>
                  <span className="text-base text-indigo-700">₹{totalDue.toLocaleString()}</span>
                </div>
              </div>

              {/* Paid Amount & Live Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Amount Paid Received (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder={totalDue > 0 ? totalDue.toString() : '0'}
                    value={formData.paidAmount}
                    onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Status Indicator */}
                <div className={`p-3 rounded-xl border flex items-center justify-between ${
                  liveStatus === 'due' ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : liveStatus === 'advance' ? 'bg-blue-50 border-blue-200 text-blue-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider block">Calculated Status</span>
                    <span className="text-xs font-bold uppercase">{liveStatus}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold">
                      {liveStatus === 'due' && `Remaining: ₹${Math.abs(liveBalance).toLocaleString()}`}
                      {liveStatus === 'advance' && `Advance: ₹${liveBalance.toLocaleString()}`}
                      {liveStatus === 'clear' && 'Fully Cleared'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Paid via UPI / GPay transaction #12345"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  disabled={submitting || !formData.tenantId}
                  className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? 'Recording...' : 'Record Payment & Generate Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal payment={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
    </div>
  );
}
