import React from 'react';
import { X, Printer, CheckCircle, AlertCircle, Building2, Calendar, User, Zap } from 'lucide-react';

export default function ReceiptModal({ payment, onClose }) {
  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const isDue = payment.status === 'due';
  const isAdvance = payment.status === 'advance';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 flex items-center justify-center animate-fade-in">
      {/* Modal Container */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[88vh] flex flex-col border border-slate-200 overflow-hidden my-auto">
        {/* Header (Fixed at Top) */}
        <div className="shrink-0 bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-4 text-white flex justify-between items-center border-b border-indigo-900/50">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl">🏠</span>
              <h2 className="text-lg font-bold tracking-tight">RentManager Pro</h2>
            </div>
            <p className="text-[11px] text-indigo-200 uppercase tracking-wider font-medium">Official Rent & Utility Receipt</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Body (Scrollable) */}
        <div id="printable-receipt" className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Receipt No.</p>
              <p className="text-base font-bold text-slate-800">#REC-{payment.id?.toString().padStart(5, '0')}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Billing Month</p>
              <p className="text-base font-bold text-indigo-600 flex items-center justify-end gap-1">
                <Calendar className="w-4 h-4" /> {payment.paymentMonth}
              </p>
            </div>
          </div>

          {/* Tenant & Room Info */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-sm">
            <div>
              <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Tenant Name
              </p>
              <p className="font-semibold text-slate-800 mt-0.5">{payment.tenant?.name || 'N/A'}</p>
              <p className="text-xs text-slate-500">{payment.tenant?.phone}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> Room & Building
              </p>
              <p className="font-semibold text-slate-800 mt-0.5">
                Room {payment.room?.roomNumber}
              </p>
              <p className="text-xs text-slate-500">{payment.room?.building?.name || 'Property'}</p>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="space-y-2 text-sm">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Charges Breakdown</h4>
            <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-600">Base Monthly Rent</span>
                <span className="font-semibold text-slate-800">₹{Number(payment.monthlyRent).toLocaleString()}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <div>
                  <span className="text-slate-600 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Electricity ({payment.unitsUsed} units @ ₹{payment.electricityRate}/unit)
                  </span>
                  <span className="text-xs text-slate-400">
                    Meter: {payment.prevMeter} → {payment.currMeter}
                  </span>
                </div>
                <span className="font-semibold text-slate-800">₹{Number(payment.electricityBill).toLocaleString()}</span>
              </div>
              {Number(payment.carryForward) !== 0 && (
                <div className="py-2.5 flex justify-between items-center">
                  <span className="text-slate-600">
                    {Number(payment.carryForward) > 0 ? 'Previous Due Carry Forward' : 'Previous Advance Credit'}
                  </span>
                  <span className={`font-semibold ${Number(payment.carryForward) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {Number(payment.carryForward) > 0 ? `+ ₹${Number(payment.carryForward).toLocaleString()}` : `- ₹${Math.abs(Number(payment.carryForward)).toLocaleString()}`}
                  </span>
                </div>
              )}
              <div className="py-3 flex justify-between items-center bg-slate-50/70 px-2 rounded-lg font-bold text-slate-900">
                <span>Total Amount Due</span>
                <span>₹{Number(payment.totalDue).toLocaleString()}</span>
              </div>
              <div className="py-2.5 flex justify-between items-center text-emerald-700">
                <span className="font-medium">Amount Received</span>
                <span className="font-bold">₹{Number(payment.paidAmount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Status & Balance Banner */}
          <div className={`p-3.5 rounded-xl flex items-center justify-between border ${
            isDue 
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : isAdvance
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <div className="flex items-center gap-2">
              {isDue ? <AlertCircle className="w-5 h-5 text-rose-600" /> : <CheckCircle className="w-5 h-5 text-emerald-600" />}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">
                  Status: {payment.status?.toUpperCase()}
                </p>
                <p className="text-xs sm:text-sm font-semibold">
                  {isDue && `Remaining Due: ₹${Math.abs(Number(payment.balance)).toLocaleString()}`}
                  {isAdvance && `Extra Advance Paid: ₹${Number(payment.balance).toLocaleString()}`}
                  {!isDue && !isAdvance && 'Payment Cleared in Full'}
                </p>
              </div>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
              isDue ? 'bg-rose-200 text-rose-800' : isAdvance ? 'bg-blue-200 text-blue-800' : 'bg-emerald-200 text-emerald-800'
            }`}>
              {payment.status}
            </span>
          </div>

          {payment.notes && (
            <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              Note: {payment.notes}
            </p>
          )}
        </div>

        {/* Footer actions (Fixed at Bottom) */}
        <div className="shrink-0 p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition shadow-sm"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition flex items-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
