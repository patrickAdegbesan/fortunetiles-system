import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
// Using logo from public/assets folder for better loading
const logo = process.env.PUBLIC_URL + '/assets/logo.png';
const logoCircle = process.env.PUBLIC_URL + '/assets/logo.png';
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

  // Mobile state: render bottom navigation bar on small screens
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 640 : false);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  // Update mobile state on window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return (
      <>
        {/* Bottom Navigation Bar */}
        <div className="mobile-bottom-nav">
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
                className={`mobile-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
              </Link>
            );
          })}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setMobileExpanded(true)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setMobileExpanded(true); }}
            className="mobile-nav-item expand-btn"
            title="Expand Menu"
          >
            <FaBars size={20} />
          </div>
        </div>

        {/* Expanded Mobile Menu Overlay */}
        {mobileExpanded && (
          <div className="mobile-overlay" onClick={() => setMobileExpanded(false)}>
            <div className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-drawer-header">
                <div className="mobile-drawer-logo">
                  <Link to="/" onClick={() => setMobileExpanded(false)}>
                    <img src={logo} alt="F&F Logo" className="mobile-drawer-logo-img" />
                  </Link>
                </div>
                <button
                  className="mobile-drawer-close"
                  onClick={() => setMobileExpanded(false)}
                  aria-label="Close menu"
                >
                  <FaTimes size={20} />
                </button>
              </div>
              <div className="mobile-drawer-nav">
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
                      onClick={() => setMobileExpanded(false)}
                      className={`mobile-drawer-item ${isActive ? 'active' : ''}`}
                    >
                      <Icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="mobile-drawer-footer">
                <div className="mobile-user-info">
                  <div className="mobile-user-avatar">
                    {(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <div className="mobile-user-details">
                    <div className="mobile-user-name">
                      {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email}
                    </div>
                    <div className="mobile-user-role">
                      {user?.role}
                    </div>
                  </div>
                </div>
                <button
                  className="mobile-logout-btn"
                  onClick={() => { setMobileExpanded(false); logout(); }}
                >
                  <FaSignOutAlt size={16} />
                  <span>Logout</span>
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
      {/* Collapsed Sidebar - Always rendered, visibility controlled by CSS */}
      <div className="collapsed-header">
        <div className="ollapsed-logo-container">
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
        ].map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              aria-label={item.label}
              className={`collapsed-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={22} />
            </Link>
          );
        })}
      </div>
      <div className="user-profile collapsed-user-profile">
        <div className="user-avatar">
          {(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
        </div>
      </div>

      {/* Expanded Sidebar - Always rendered, visibility controlled by CSS */}
      <div className="expanded-header">
        <div className="expanded-logo-container">
          <Link to="/" className="expanded-logo-link">
            <img src={logo} alt="F&F Logo" className="expanded-logo rand-logo" />
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
        ].map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`expanded-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span className="nav-item-text">{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="user-profile expanded-user-profile">
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
    </div>
  );
});

export default SidebarNav;

