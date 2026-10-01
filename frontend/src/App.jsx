import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Buildings from './pages/Buildings';
import Rooms from './pages/Rooms';
import Tenants from './pages/Tenants';
import Payments from './pages/Payments';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTenantForBilling, setSelectedTenantForBilling] = useState(null);

  const navigateToPayments = (tenantId = null) => {
    setSelectedTenantForBilling(tenantId);
    setActiveTab('payments');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <Dashboard onNavigateToPayments={navigateToPayments} />
        )}
        {activeTab === 'buildings' && <Buildings />}
        {activeTab === 'rooms' && <Rooms />}
        {activeTab === 'tenants' && (
          <Tenants onNavigateToPayments={navigateToPayments} />
        )}
        {activeTab === 'payments' && (
          <Payments
            key={selectedTenantForBilling || 'all'}
            initialTenantId={selectedTenantForBilling}
          />
        )}
      </main>

      {/* Modern Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 font-medium text-slate-500">
            <span>🏠</span>
            <span>RentManager Pro — Full-Stack Modern Rental Property Platform</span>
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>React + Vite (Frontend)</span>
            <span>•</span>
            <span>Java 21 / Spring Boot 3 (Backend)</span>
            <span>•</span>
            <span>H2 / MySQL Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
