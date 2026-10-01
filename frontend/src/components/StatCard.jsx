import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, color = 'indigo' }) {
  const colorMap = {
    indigo: 'from-indigo-500 to-indigo-600 text-indigo-600 bg-indigo-50 border-indigo-100',
    emerald: 'from-emerald-500 to-emerald-600 text-emerald-600 bg-emerald-50 border-emerald-100',
    amber: 'from-amber-500 to-amber-600 text-amber-600 bg-amber-50 border-amber-100',
    rose: 'from-rose-500 to-rose-600 text-rose-600 bg-rose-50 border-rose-100',
    violet: 'from-violet-500 to-violet-600 text-violet-600 bg-violet-50 border-violet-100',
  };

  const scheme = colorMap[color] || colorMap.indigo;
  const parts = scheme.split(' ');
  const badgeClasses = `${parts[2]} ${parts[3]} ${parts[4]}`;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mt-1">{value}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-2xl border ${badgeClasses}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
