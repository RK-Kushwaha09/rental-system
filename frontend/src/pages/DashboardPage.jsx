import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import StatCard from '../components/StatCard';
import ReceiptModal from '../components/ReceiptModal';
import { Building2, DoorOpen, Users, IndianRupee, AlertCircle, CheckCircle2, Clock, Eye, RefreshCw, ArrowUpRight } from 'lucide-react';

export default function DashboardPage({ onNavigateToPayments }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboard();
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Connecting to Java Spring Boot backend...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center max-w-lg mx-auto my-12">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-rose-900">Backend Connection Error</h3>
        <p className="text-sm text-rose-700 mt-1">{error}</p>
        <div className="mt-4 p-3 bg-white rounded-xl text-xs text-slate-600 border border-rose-100 text-left">
          <p className="font-semibold mb-1">Make sure backend is running:</p>
          <code>cd backend &amp;&amp; ./mvnw spring-boot:run</code>
        </div>
        <button
          onClick={loadDashboard}
          className="mt-4 px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 transition"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { buildings, totalRooms, occupiedRooms, vacantRooms, tenants, currentMonth, paymentStats, recentPayments, pendingDues } = data || {};
  const occupancyPercent = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Property Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time statistics & billing summary for <span className="font-semibold text-indigo-600">{currentMonth}</span></p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboard}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={() => onNavigateToPayments && onNavigateToPayments()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition shadow-sm"
          >
            <IndianRupee className="w-3.5 h-3.5" /> Record Payment
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Buildings"
          value={buildings || 0}
          subtitle="Managed properties"
          icon={Building2}
          color="indigo"
        />
        <StatCard
          title="Occupancy"
          value={`${occupiedRooms || 0} / ${totalRooms || 0}`}
          subtitle={`${occupancyPercent}% Occupied (${vacantRooms || 0} vacant)`}
          icon={DoorOpen}
          color="emerald"
        />
        <StatCard
          title="Active Tenants"
          value={tenants || 0}
          subtitle="Registered residents"
          icon={Users}
          color="violet"
        />
        <StatCard
          title={`Collections (${currentMonth})`}
          value={`₹${(paymentStats?.totalCollected || 0).toLocaleString()}`}
          subtitle={`₹${(paymentStats?.totalBilled || 0).toLocaleString()} billed`}
          icon={IndianRupee}
          color="amber"
        />
      </div>

      {/* Billing Status Summary Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
          Current Month Payment Status ({currentMonth})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-700">Cleared / Settled</p>
              <p className="text-2xl font-extrabold text-emerald-900 mt-1">{paymentStats?.clearCount || 0}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-500 opacity-80" />
          </div>
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-rose-700">Pending Dues</p>
              <p className="text-2xl font-extrabold text-rose-900 mt-1">{paymentStats?.dueCount || 0}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-rose-500 opacity-80" />
          </div>
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-blue-700">Advance Paid</p>
              <p className="text-2xl font-extrabold text-blue-900 mt-1">{paymentStats?.advanceCount || 0}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500 opacity-80" />
          </div>
        </div>
      </div>

      {/* Two Column Section: Pending Dues & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Dues */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Pending Dues</h3>
              <p className="text-xs text-slate-400">Tenants with unpaid balances</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
              {pendingDues?.length || 0} Outstanding
            </span>
          </div>

          {!pendingDues || pendingDues.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-400 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-70" />
              Awesome! No pending dues found.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingDues.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-800 text-sm">{item.tenant?.name}</h4>
                    <p className="text-xs text-slate-500">
                      Room {item.room?.roomNumber} • {item.paymentMonth}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-rose-600">
                      ₹{Math.abs(Number(item.balance)).toLocaleString()} Due
                    </span>
                    <button
                      onClick={() => onNavigateToPayments && onNavigateToPayments(item.tenant?.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      title="Collect Payment"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments Feed */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Recent Transactions</h3>
              <p className="text-xs text-slate-400">Latest recorded payments</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              Latest Activity
            </span>
          </div>

          {!recentPayments || recentPayments.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl text-slate-400 text-sm">
              No payments recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentPayments.map((p) => {
                const isDue = p.status === 'due';
                const isAdvance = p.status === 'advance';
                return (
                  <div key={p.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-800 text-sm">{p.tenant?.name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          isDue ? 'bg-rose-100 text-rose-700' : isAdvance ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Room {p.room?.roomNumber} • {p.paymentMonth}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">₹{Number(p.paidAmount).toLocaleString()}</p>
                        <p className="text-[11px] text-slate-400">Total: ₹{Number(p.totalDue).toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => setSelectedReceipt(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        title="View & Print Receipt"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal payment={selectedReceipt} onClose={() => setSelectedReceipt(null)} />
      )}
    </div>
  );
}
