import React, { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { FaBars, FaTimes, FaTachometerAlt, FaMoneyBillWave, FaBox, FaUsers, FaChartLine, FaMapMarkerAlt, FaCog, FaSignOutAlt, FaClipboardList } from 'react-icons/fa';
import '../styles/SidebarNav.css';

const SidebarNav = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    setIsOpen(false);
  };

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

  return (
    <>
      {/* Hamburger Menu Button */}
      <button 
        className="sidebar-toggle"
        onClick={toggleSidebar}
        style={{
          position: 'fixed',
          top: '15px',
          left: '15px',
          zIndex: 1001,
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '12px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,123,255,0.3)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05)';
          e.target.style.boxShadow = '0 4px 12px rgba(0,123,255,0.4)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 2px 8px rgba(0,123,255,0.3)';
        }}
      >
        {isOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
      </button>

      {/* Backdrop Overlay */}
      {isOpen && (
        <div 
          className="sidebar-backdrop"
          onClick={closeSidebar}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: isOpen ? 0 : '-300px',
          width: '300px',
          height: '100vh',
          backgroundColor: '#2c3e50',
          zIndex: 1000,
          transition: 'left 0.3s ease',
          boxShadow: isOpen ? '2px 0 10px rgba(0,0,0,0.1)' : 'none',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Sidebar Header */}
        <div style={{
          padding: '25px 20px',
          borderBottom: '1px solid #34495e',
          backgroundColor: '#34495e'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#007bff',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              🏢
            </div>
            <div>
              <h3 style={{
                margin: 0,
                color: 'white',
                fontSize: '18px',
                fontWeight: '700'
              }}>
                Fortune Tiles
              </h3>
              <p style={{
                margin: 0,
                color: '#bdc3c7',
                fontSize: '12px'
              }}>
                Inventory Management
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div style={{
          flex: 1,
          padding: '20px 0',
          overflowY: 'auto'
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
          backgroundColor: '#34495e'
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
      </div>
    </>
  );
};

export default SidebarNav;
