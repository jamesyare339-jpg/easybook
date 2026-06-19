import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LangProvider } from './context/LangContext';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import StaffPage from './pages/StaffPage';
import ReportsPage from './pages/ReportsPage';
import { ExpensesPage, CreditPage, CashPage, StoresPage, PurchasesPage } from './pages/OtherPages';
import CustomersPage from './pages/CustomersPage';
import SuppliersPage from './pages/SuppliersPage';
import UsersPage from './pages/UsersPage';
import StockMovementPage from './pages/StockMovementPage';
import ProfitLossPage from './pages/ProfitLossPage';
import BackupPage from './pages/BackupPage';

// Protected route wrapper
function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '12px' }}>
      <div className="spinner"></div>
      <span style={{ color: '#6b7280', fontSize: '14px' }}>Loading EasyBook...</span>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute roles={['admin','manager','storekeeper']}><InventoryPage /></ProtectedRoute>} />
      <Route path="/sales" element={<ProtectedRoute roles={['admin','manager','cashier']}><SalesPage /></ProtectedRoute>} />
      <Route path="/purchases" element={<ProtectedRoute roles={['admin','manager']}><PurchasesPage /></ProtectedRoute>} />
      <Route path="/credit" element={<ProtectedRoute roles={['admin','manager']}><CreditPage /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute roles={['admin','manager','cashier']}><CustomersPage /></ProtectedRoute>} />
      <Route path="/suppliers" element={<ProtectedRoute roles={['admin','manager']}><SuppliersPage /></ProtectedRoute>} />
      <Route path="/staff" element={<ProtectedRoute roles={['admin','manager']}><StaffPage /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute roles={['admin','manager']}><ReportsPage /></ProtectedRoute>} />
      <Route path="/profit-loss" element={<ProtectedRoute roles={['admin','manager']}><ProfitLossPage /></ProtectedRoute>} />
      <Route path="/stock-movements" element={<ProtectedRoute roles={['admin','manager','storekeeper']}><StockMovementPage /></ProtectedRoute>} />
      <Route path="/stores" element={<ProtectedRoute><StoresPage /></ProtectedRoute>} />
      <Route path="/cash" element={<ProtectedRoute roles={['admin','manager']}><CashPage /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
      <Route path="/backup" element={<ProtectedRoute roles={['admin']}><BackupPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LangProvider>
          <AppRoutes />
        </LangProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
