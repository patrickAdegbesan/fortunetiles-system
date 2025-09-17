import React, { useContext, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { FaBars, FaTimes, FaTachometerAlt, FaMoneyBillWave, FaBox, FaUsers, FaChartLine, FaMapMarkerAlt, FaCog, FaSignOutAlt, FaClipboardList } from 'react-icons/fa';
import '../styles/SidebarNav.css';

const SidebarNav = ({ isOpen, onToggle }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  // Support controlled (isOpen + onToggle) and uncontrolled (internal) modes.
  const [internalOpen, setInternalOpen] = useState(typeof isOpen !== 'undefined' ? isOpen : true);

  useEffect(() => {
    if (typeof isOpen !== 'undefined') setInternalOpen(isOpen);
  }, [isOpen]);

  // Tooltip state for collapsed icons
  const [hoverLabel, setHoverLabel] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0 });

  const open = typeof isOpen !== 'undefined' ? isOpen : internalOpen;

  const toggleSidebar = (next) => {
    if (typeof onToggle === 'function') {
      onToggle(typeof next !== 'undefined' ? next : !open);
    } else {
      setInternalOpen((prev) => (typeof next !== 'undefined' ? next : !prev));
    }
  };

  const closeSidebar = () => toggleSidebar(false);

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return '#ff6b6b';
      case 'manager': return '#4ecdc4';
      case 'staff': return '#45b7d1';
      default: return '#95a5a6';
    }
  };

  const navigationItems = [
    { path: '/dashboard', icon: FaTachometerAlt, label: 'Dashboard', roles: ['owner', 'manager', 'staff'] },
    { path: '/sales', icon: FaMoneyBillWave, label: 'Sales', roles: ['owner', 'manager', 'staff'] },
    { path: '/orders', icon: FaClipboardList, label: 'Order History', roles: ['owner', 'manager', 'staff'] },
    { path: '/returns-management', icon: FaClipboardList, label: 'Returns', roles: ['owner', 'manager', 'staff'] },
    { path: '/products', icon: FaBox, label: 'Products', roles: ['owner', 'manager', 'staff'] },
    { path: '/users', icon: FaUsers, label: 'Users', roles: ['owner'] },
    { path: '/reports', icon: FaChartLine, label: 'Reports', roles: ['owner', 'manager'] },
    { path: '/locations', icon: FaMapMarkerAlt, label: 'Locations', roles: ['owner', 'manager'] },
    { path: '/admin', icon: FaCog, label: 'Admin Settings', roles: ['owner', 'admin'] }
  ];

  const filteredNavItems = navigationItems.filter(item => 
    item.roles.includes(user?.role)
  );

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

  // Render mobile topbar and overlay when on small screens
  if (isMobile) {
    return (
      <>
        <div className="sidebar-topbar">
          <div className="brand-left">
            <Link to="/">
              <img className="logo-circle-mobile" src="/assets/logo-circle.png" alt="Fortune Tiles" />
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
              {/* logo removed per request */}
              <div style={{ padding: '0' }}>
                {filteredNavItems.map((item) => {
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

  return (
    <div
      className={`sidebar ${open ? 'sidebar-open' : ''}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        backgroundColor: '#2c3e50',
        zIndex: 1000,
        transition: 'width 0.3s ease',
        boxShadow: open ? '2px 0 10px rgba(0,0,0,0.1)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        width: open ? '300px' : '60px',
        overflow: 'hidden',
        alignItems: 'stretch',
      }}
    >
      {!open && hoverLabel && (
        <div style={{
          position: 'fixed',
          left: '70px',
          top: `${tooltipPosition.top}px`,
          backgroundColor: '#333',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '14px',
          zIndex: 1001,
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          pointerEvents: 'none', // Prevent tooltip from interfering with mouse events
          transform: 'translateY(-50%)',
        }}
        className="sidebar-tooltip"
        >
          {hoverLabel}
        </div>
      )}
      {/* Collapsed Sidebar */}
      {!open && (
        <>
          {/* Logo and Toggle grouped at top */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            backgroundColor: '#34495e',
            borderBottom: '1px solid #34495e',
            paddingBottom: '0',
          }}>
            {/* Logo */}
            <div style={{
              width: '60px',
              height: '50px', // Match the expanded sidebar header height
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Link to="/">
                <img 
                  src="/assets/logo-circle.png" 
                  alt="Fortune Tiles Logo" 
                  style={{
                    width: '36px',
                    height: '36px',
                    objectFit: 'contain',
                  }}
                />
              </Link>
            </div>
            {/* Toggle icon directly in header with logo */}
            <div style={{
              position: 'absolute',
              top: '50px', // Position right below the logo area
              width: '60px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => { toggleSidebar(); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { toggleSidebar(); } }}
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  color: '#ecf0f1',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { 
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; 
                  e.currentTarget.style.color = '#007bff';
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltipPosition({ top: rect.top + rect.height/2 });
                  setHoverLabel('Expand Menu');
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.backgroundColor = 'transparent'; 
                  e.currentTarget.style.color = '#ecf0f1';
                  setHoverLabel(null);
                }}
              >
                <FaBars size={20} />
              </div>
            </div>
          </div>
          {/* Navigation Icons Only */}
          <div style={{
            flex: 1,
            padding: '46px 0 10px 0', // Extra top padding to account for the toggle button
            overflowY: 'auto',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px', // Reduced gap between icons
          }}>
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  aria-label={item.label}
                  onClick={(e) => {
                    // If the sidebar is collapsed, expand it on click before navigation.
                    if (!open) {
                      toggleSidebar(true);
                      // allow navigation to proceed
                    } else {
                      // when open, close on navigation
                      closeSidebar();
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    color: isActive ? '#007bff' : '#ecf0f1',
                    backgroundColor: isActive ? 'rgba(0,123,255,0.1)' : 'transparent',
                    borderRadius: '8px',
                    fontSize: '20px',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.color = '#007bff';
                    }
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltipPosition({ top: rect.top + rect.height/2 });
                    setHoverLabel(item.label);
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#ecf0f1';
                    }
                    setHoverLabel(null);
                  }}
                >
                  <Icon size={22} />
                </Link>
              );
            })}
          </div>
          {/* User Avatar Only at Bottom */}
          <div style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px 0',
            borderTop: '1px solid #34495e',
            backgroundColor: '#34495e',
          }}>
            <div 
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: getRoleColor(user?.role),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '700',
                fontSize: '18px',
              }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltipPosition({ top: rect.top + rect.height/2 });
                setHoverLabel(user?.firstName 
                  ? `${user.firstName} ${user.lastName || ''} (${user?.role})`
                  : `${user?.email} (${user?.role})`);
              }}
              onMouseLeave={() => {
                setHoverLabel(null);
              }}
            >
              {(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
            </div>
          </div>
        </>
      )}
      {/* Expanded Sidebar */}
      {open && (
        <>
          {/* Sidebar Header */}
          <div style={{
            padding: '0',
            paddingRight: '8px',
            borderBottom: '1px solid #34495e',
            backgroundColor: '#34495e',
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '55px' // Increased height for the logo
          }}>
            <div style={{ display: 'flex', padding: '0', height: '100%' }}>
              <Link to="/" style={{ 
                textDecoration: 'none', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%', 
                padding: '0'
              }}>
                <img 
                  src="/assets/logo-full.png" 
                  alt="Fortune Tiles Logo" 
                  style={{
                    width: 'auto',
                    objectFit: 'contain',
                    maxWidth: '200px',
                    marginLeft: '6px',
                    display: 'block'
                  }}
                />
              </Link>
            </div>
            {/* Collapse control in header (top-right) */}
            <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleSidebar(false)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSidebar(false); }}
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  color: '#ecf0f1',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#007bff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#ecf0f1'; }}
              >
                <FaTimes size={16} />
              </div>
            </div>
          </div>
          {/* Navigation Links */}
          <div style={{
            flex: 1,
            padding: '10px 0',
            overflowY: 'auto',
            width: '100%',
          }}>
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={closeSidebar}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '15px 25px',
                    color: isActive ? '#007bff' : '#ecf0f1',
                    textDecoration: 'none',
                    backgroundColor: isActive ? 'rgba(0,123,255,0.1)' : 'transparent',
                    borderRight: isActive ? '3px solid #007bff' : '3px solid transparent',
                    transition: 'all 0.3s ease',
                    fontSize: '16px',
                    fontWeight: isActive ? '600' : '500'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.target.style.backgroundColor = 'rgba(255,255,255,0.1)';
                      e.target.style.paddingLeft = '30px';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.paddingLeft = '25px';
                    }
                  }}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
          {/* User Profile Section */}
          <div style={{
            borderTop: '1px solid #34495e',
            padding: '20px',
            backgroundColor: '#34495e',
            width: '100%',
            boxSizing: 'border-box',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '15px'
            }}>
              <div style={{
                width: '45px',
                height: '45px',
                borderRadius: '50%',
                backgroundColor: getRoleColor(user?.role),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '700',
                fontSize: '18px'
              }}>
                {(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '14px',
                  marginBottom: '2px'
                }}>
                  {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
                </div>
                <div style={{
                  color: getRoleColor(user?.role),
                  fontSize: '12px',
                  fontWeight: '500',
                  textTransform: 'capitalize'
                }}>
                  {user?.role}
                </div>
              </div>
              {/* removed bottom collapse control to keep only header control */}
            </div>
            <button
              onClick={() => {
                closeSidebar();
                logout();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '12px',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'background-color 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#c0392b'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#e74c3c'}
            >
              <FaSignOutAlt size={16} />
              <span>Logout</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default SidebarNav;
