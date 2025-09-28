import React, { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
              <div style={{ padding: '0' }}>
                {/* ...render mobile nav items... */}
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
    <>
      {/* ...render desktop sidebar... */}
    </>
  );
}
export default SidebarNav;
