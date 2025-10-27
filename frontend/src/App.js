import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SidebarNav from './components/SidebarNav_fixed';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import SalePage from './pages/SalePage';
import ProductsPage from './pages/ProductsPage';
import ReportsPage from './pages/ReportsPage';
import TransactionsPage from './pages/TransactionsPage';
import SettingsPage from './pages/SettingsPage';
import './App.css';
import './styles/Layout.css';

function MainLayout({ children }) {
  const location = useLocation();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isAuthPage = location.pathname === '/login' || location.pathname.startsWith('/reset-password/');

  // Remove automatic PWA prompt - let PWAInstallPrompt component handle it
  // This prevents the "prompt() method must be called with a user gesture" error

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (isAuthPage) {
    return children;
  }

  return (
    <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <SidebarNav isOpen={isSidebarOpen} onToggle={toggleSidebar} />
      <div className="app-layout">
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  const basename = process.env.NODE_ENV === 'production' ? '/inventory/' : '/';
  return (
    <AuthProvider>
      <Router basename={basename}>
        <MainLayout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <ProtectedRoute>
                  <SalePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <ProductsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <TransactionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <ProductsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </MainLayout>
        <PWAInstallPrompt />
      </Router>
    </AuthProvider>
  );
}

export default App;
