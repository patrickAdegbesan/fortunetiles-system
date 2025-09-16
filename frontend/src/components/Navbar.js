import React, { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  console.log('Navbar rendering - user:', user);
  console.log('Current location:', location.pathname);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return '#ff6b6b';
      case 'manager': return '#4ecdc4';
      case 'staff': return '#45b7d1';
      default: return '#95a5a6';
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <div className="brand-logo">
          <div className="logo-icon">🏢</div>
          <div className="brand-text">
            <h2>Fortune Tiles</h2>
            <span className="brand-subtitle">Inventory Management</span>
          </div>
        </div>
      </div>
      
      <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <Link 
          to="/orders" 
          className={`nav-link ${location.pathname === '/orders' ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <span className="nav-icon">�</span>
          <span className="nav-text">Order History</span>
        </Link>
        <Link 
          to="/returns-management" 
          className={`nav-link ${location.pathname === '/returns-management' ? 'active' : ''}`}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <span className="nav-icon">�</span>
          <span className="nav-text">Returns</span>
        </Link>
        {user?.role === 'owner' && (
          <Link 
            to="/users" 
            className={`nav-link ${location.pathname === '/users' ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="nav-icon">👥</span>
            <span className="nav-text">Users</span>
          </Link>
        )}
        {(user?.role === 'owner' || user?.role === 'manager') && (
          <>
            <Link 
              to="/reports" 
              className={`nav-link ${location.pathname === '/reports' ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-icon">📈</span>
              <span className="nav-text">Reports</span>
            </Link>
            <Link 
              to="/locations" 
              className={`nav-link ${location.pathname === '/locations' ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-icon">📍</span>
              <span className="nav-text">Locations</span>
            </Link>
          </>
        )}
      </div>
      
      <div className="nav-user">
        <div className="user-profile">
          <div className="user-avatar">
            {(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
          </div>
          <div className="user-details">
            <span className="user-name">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
            </span>
            <span 
              className="user-role"
              style={{ color: getRoleColor(user?.role) }}
            >
              {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
            </span>
          </div>
        </div>
        <button onClick={logout} className="logout-btn">
          <span className="logout-icon">🚪</span>
          <span className="logout-text">Logout</span>
        </button>
      </div>

      <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
        <span className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </span>
      </button>
    </nav>
  );
};

export default Navbar;
