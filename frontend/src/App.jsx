import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PropertySetupProvider } from './context/PropertySetupContext';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import PropertySetup from './pages/PropertySetup';
import RoomsSetup from './pages/RoomsSetup';
import PricingSetup from './pages/PricingSetup';
import PropertyReview from './pages/PropertyReview';
import HomeDashboard from './pages/HomeDashboard';
import Rooms from './pages/Rooms';
import RoomDetail from './pages/RoomDetail';
import Tenants from './pages/Tenants';
import AddTenant from './pages/AddTenant';
import BillsDashboard from './pages/BillsDashboard';
import BillCreator from './pages/BillCreator';
import BillReceipt from './pages/BillReceipt';
import RecordPayment from './pages/RecordPayment';
import PaymentSuccess from './pages/PaymentSuccess';
import PropertySettings from './pages/PropertySettings';
import { AlertTriangle } from 'lucide-react';

/**
 * Global Error Boundary to prevent white screen crashes
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-viewport">
          <div
            className="app-shell"
            style={{
              maxWidth: '520px',
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              textAlign: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                backgroundColor: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#DC2626',
              }}
            >
              <AlertTriangle size={28} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-main)' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '320px', lineHeight: '1.4' }}>
              {this.state.error?.message || 'An unexpected rendering error occurred. Please reload to try again.'}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                backgroundColor: 'var(--color-interactive)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 24px',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Route guard that requires a valid JWT token in localStorage.
 * Redirects unauthenticated users to /login.
 */
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('rm_auth_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <PropertySetupProvider>
      <ErrorBoundary>
        <BrowserRouter>
        <Routes>
          {/* Default redirect to Login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public Authentication & Onboarding Flow */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/setup/property" element={<PropertySetup />} />
          <Route path="/setup/rooms" element={<RoomsSetup />} />
          <Route path="/setup/pricing" element={<PricingSetup />} />
          <Route path="/setup/review" element={<PropertyReview />} />

          {/* Protected Home Dashboard */}
          <Route path="/home" element={<ProtectedRoute><HomeDashboard /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><HomeDashboard /></ProtectedRoute>} />

          {/* Protected Rooms Inventory & Detail */}
          <Route path="/rooms" element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
          <Route path="/rooms/:roomId" element={<ProtectedRoute><RoomDetail /></ProtectedRoute>} />
          <Route path="/rooms/detail" element={<ProtectedRoute><RoomDetail /></ProtectedRoute>} />

          {/* Protected Tenant Flow */}
          <Route path="/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
          <Route path="/tenants/new" element={<ProtectedRoute><AddTenant /></ProtectedRoute>} />
          <Route path="/tenants/add" element={<ProtectedRoute><AddTenant /></ProtectedRoute>} />
          <Route path="/tenants/edit/:tenantId" element={<ProtectedRoute><AddTenant /></ProtectedRoute>} />
          <Route path="/tenants/edit" element={<ProtectedRoute><AddTenant /></ProtectedRoute>} />

          {/* Protected Billing & Receipts Flow */}
          <Route path="/bills" element={<ProtectedRoute><BillsDashboard /></ProtectedRoute>} />
          <Route path="/bills/dashboard" element={<ProtectedRoute><BillsDashboard /></ProtectedRoute>} />
          <Route path="/bills/create" element={<ProtectedRoute><BillCreator /></ProtectedRoute>} />
          <Route path="/bills/creator" element={<ProtectedRoute><BillCreator /></ProtectedRoute>} />
          <Route path="/bills/receipt" element={<ProtectedRoute><BillReceipt /></ProtectedRoute>} />

          {/* Protected Payments Flow */}
          <Route path="/payments/record" element={<ProtectedRoute><RecordPayment /></ProtectedRoute>} />
          <Route path="/payments/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />

          {/* Protected Property Settings & Management Controls (More Tab) */}
          <Route path="/more" element={<ProtectedRoute><PropertySettings /></ProtectedRoute>} />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </PropertySetupProvider>
);
}
