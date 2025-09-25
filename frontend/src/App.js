import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SidebarNav from './components/SidebarNav';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SalePage from './pages/SalePage';
import ProductsPage from './pages/ProductsPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import LocationsPage from './pages/LocationsPage';
import AdminSettings from './pages/AdminSettings';
import OrderHistoryPage from './pages/OrderHistoryPage';
import ReturnsManagementPage from './pages/ReturnsManagementPage';
import './App.css';
import './styles/Layout.css';

function MainLayout({ children }) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isLoginPage = location.pathname === '/login';

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (isLoginPage) {
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
  return (
    <AuthProvider>
      <Router basename="/inventory">
        <MainLayout>
          <Routes>
            <Route path="/login" element={<Login />} />
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
              path="/users" 
              element={
                <ProtectedRoute>
                  <UsersPage />
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
              path="/locations" 
              element={
                <ProtectedRoute>
                  <LocationsPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <AdminSettings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/orders" 
              element={
                <ProtectedRoute>
                  <OrderHistoryPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/returns-management" 
              element={
                <ProtectedRoute allowedRoles={['manager', 'owner']}>
                  <ReturnsManagementPage />
                </ProtectedRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </MainLayout>
      </Router>
    </AuthProvider>
  );
}

export default App;
