import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { FaCashRegister, FaBoxes, FaReceipt, FaChartBar, FaEllipsisH } from 'react-icons/fa';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ToastProvider, CatalogProvider, CartProvider } from './store';
import Login from './screens/Login';
import Sell from './screens/Sell';
import Cart from './screens/Cart';
import { ItemsList, ItemDetail, ItemForm, AdjustStock } from './screens/Items';
import { OrdersList, OrderDetail, ReturnForm } from './screens/Orders';
import Reports from './screens/Reports';
import { MoreMenu, LocationsScreen, CategoriesScreen, UsersScreen, PrinterScreen, PinScreen, SyncScreen, BankAccountsScreen } from './screens/More';
import './pos.css';

const TABS = [
  { to: '/sell', label: 'Sell', icon: <FaCashRegister aria-hidden="true" /> },
  { to: '/items', label: 'Items', icon: <FaBoxes aria-hidden="true" /> },
  { to: '/orders', label: 'Orders', icon: <FaReceipt aria-hidden="true" /> },
  { to: '/reports', label: 'Reports', icon: <FaChartBar aria-hidden="true" /> },
  { to: '/more', label: 'More', icon: <FaEllipsisH aria-hidden="true" /> },
];

function Shell() {
  const location = useLocation();
  // The tab bar shows on the five main screens only; detail and form screens use the full height.
  const showTabs = TABS.some((t) => t.to === location.pathname);
  return (
    <>
      <div className="pos-main">
        <Routes>
          <Route path="/sell" element={<Sell />} />
          <Route path="/sell/cart" element={<Cart />} />
          <Route path="/items" element={<ItemsList />} />
          <Route path="/items/new" element={<ItemForm />} />
          <Route path="/items/:id" element={<ItemDetail />} />
          <Route path="/items/:id/edit" element={<ItemForm />} />
          <Route path="/items/:id/stock" element={<AdjustStock />} />
          <Route path="/orders" element={<OrdersList />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/orders/:id/return" element={<ReturnForm />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/more" element={<MoreMenu />} />
          <Route path="/more/locations" element={<LocationsScreen />} />
          <Route path="/more/categories" element={<CategoriesScreen />} />
          <Route path="/more/users" element={<UsersScreen />} />
          <Route path="/more/printer" element={<PrinterScreen />} />
          <Route path="/more/pin" element={<PinScreen />} />
          <Route path="/more/sync" element={<SyncScreen />} />
          <Route path="/more/banks" element={<BankAccountsScreen />} />
          <Route path="*" element={<Navigate to="/sell" replace />} />
        </Routes>
      </div>
      {showTabs && (
        <nav className="pos-tabs" aria-label="Main">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => `pos-tab${isActive ? ' active' : ''}`}>
              {t.icon}<span>{t.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </>
  );
}

function Gate() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="pos-boot"><img src={`${process.env.PUBLIC_URL}/assets/logo-mark.png`} alt="" width="96" height="96" /></div>;
  if (!isAuthenticated) return <Login />;
  return (
    <CatalogProvider>
      <CartProvider>
        <Shell />
      </CartProvider>
    </CatalogProvider>
  );
}

export default function PosApp() {
  const basename = process.env.REACT_APP_BASENAME || (process.env.NODE_ENV === 'production' ? '/inventory/' : '/');
  return (
    <div className="pos-root">
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter basename={basename}>
            <Gate />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </div>
  );
}
