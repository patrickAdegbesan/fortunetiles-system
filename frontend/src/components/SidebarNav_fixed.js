import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/logo.jpeg';
import { AuthContext } from '../contexts/AuthContext';
import { FaBars, FaTimes, FaTachometerAlt, FaMoneyBillWave, FaBox, FaUsers, FaChartLine, FaMapMarkerAlt, FaCog, FaSignOutAlt, FaClipboardList } from 'react-icons/fa';
import '../styles/SidebarNav.css';

const SidebarNav = React.memo(({ isOpen, onToggle }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  // Single source of truth for sidebar state
  const [isExpanded, setIsExpanded] = useState(isOpen ?? true);

  // Tooltip state for collapsed icons
  const [hoverLabel, setHoverLabel] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0 });

  // Sync with external control if provided
  useEffect(() => {
    if (typeof isOpen === 'boolean') {
      setIsExpanded(isOpen);
    }
  }, [isOpen]);

  // ...existing code...
  // ...existing code for mobile and desktop rendering...
  // Mobile state: render a topbar + overlay drawer on small screens
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const openMobileMenu = () => setMobileOpen(true);
  const closeMobileMenu = () => setMobileOpen(false);

  if (isMobile) {
    return (
      <>
        <div className="sidebar-topbar">
          <div className="brand-left">
            <Link to="/">
              <img className="logo-circle-mobile brand-logo" src={logo} alt="F&F" />
            </Link>
          </div>
          <input className="search-input" placeholder="Search..." aria-label="Search" />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="avatar-btn">{(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}</div>
            <button className="menu-btn" onClick={openMobileMenu} aria-label="Open menu">
              <FaBars />
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="mobile-overlay" onClick={closeMobileMenu}>
            <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: '0' }}>
                {[
                  { path: '/dashboard', icon: FaTachometerAlt, label: 'Dashboard' },
                  { path: '/sales', icon: FaMoneyBillWave, label: 'Sales' },
                  { path: '/transactions', icon: FaClipboardList, label: 'Transactions' },
                  { path: '/products', icon: FaBox, label: 'Products' },
                  { path: '/reports', icon: FaChartLine, label: 'Reports' },
                  { path: '/settings', icon: FaCog, label: 'Settings' }
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={closeMobileMenu}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        color: isActive ? '#007bff' : '#ecf0f1',
                        textDecoration: 'none'
                      }}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid #34495e' }}>
                <button
                  onClick={() => { closeMobileMenu(); logout(); }}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#e74c3c',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop sidebar rendering
  return (
    <div className={`sidebar-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Collapsed Sidebar */}
      {!isExpanded && (
        <>
          <div className="collapsed-header">
            <div className="collapsed-logo-container">
              <Link to="/">
                <img src={logo} alt="F&F Logo" className="collapsed-logo brand-logo" />
              </Link>
            </div>
            <div className="collapsed-expand-button">
              <div
                role="button"
                tabIndex={0}
                onClick={() => { setIsExpanded(true); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setIsExpanded(true); } }}
                className="icon-button"
              >
                <FaBars size={20} />
              </div>
            </div>
          </div>
          <div className="collapsed-nav">
            {[
              { path: '/dashboard', icon: FaTachometerAlt, label: 'Dashboard' },
              { path: '/sales', icon: FaMoneyBillWave, label: 'Sales' },
              { path: '/transactions', icon: FaClipboardList, label: 'Transactions' },
              { path: '/products', icon: FaBox, label: 'Products' },
              { path: '/reports', icon: FaChartLine, label: 'Reports' },
              { path: '/settings', icon: FaCog, label: 'Settings' }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  aria-label={item.label}
                  onClick={(e) => {
                    if (!isExpanded) {
                      e.preventDefault();
                      setIsExpanded(true);
                    }
                  }}
                  className={`collapsed-nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={22} />
                </Link>
              );
            })}
          </div>
          <div className="user-profile">
            <div className="user-avatar">
              {(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
            </div>
          </div>
        </>
      )}
      {/* Expanded Sidebar */}
      {isExpanded && (
        <>
          <div className="expanded-header">
            <div className="expanded-logo-container">
              <Link to="/" className="expanded-logo-link">
                <img src={logo} alt="F&F Logo" className="expanded-logo brand-logo" />
              </Link>
            </div>
            <div className="icon-button" 
                 role="button"
                 tabIndex={0}
                 onClick={() => setIsExpanded(false)}
                 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsExpanded(false); }}>
              <FaTimes size={16} />
            </div>
          </div>
          <div className="expanded-nav">
            {[
              { path: '/dashboard', icon: FaTachometerAlt, label: 'Dashboard' },
              { path: '/sales', icon: FaMoneyBillWave, label: 'Sales' },
              { path: '/transactions', icon: FaClipboardList, label: 'Transactions' },
              { path: '/products', icon: FaBox, label: 'Products' },
              { path: '/reports', icon: FaChartLine, label: 'Reports' },
              { path: '/settings', icon: FaCog, label: 'Settings' }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`expanded-nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="user-profile">
            <div className="user-info">
              <div className="user-avatar">
                {(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </div>
              <div className="user-details">
                <div className="user-name">
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
                </div>
                <div className="user-role">
                  {user?.role}
                </div>
              </div>
            </div>
            <button
              className="logout-button"
              onClick={() => {
                setIsExpanded(false);
                logout();
              }}
            >
              <FaSignOutAlt size={16} />
              <span>Logout</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
});

export default SidebarNav;

