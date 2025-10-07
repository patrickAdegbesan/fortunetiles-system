import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import SidebarNav from '../components/SidebarNav';
import PageHeader from '../components/PageHeader';
import { MdSettings } from 'react-icons/md';
import '../styles/AdminSettings.css';

const AdminSettings = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Admin settings page is now simplified - no data loading needed
  }, [user]);


  // Check if user has admin access
  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    return (
      <div className="admin-settings">
  {/* <SidebarNav /> removed to prevent duplicate sidebar */}
        <div className="main-content">
          <PageHeader 
            icon={<MdSettings />}
            title="Admin Settings" 
            subtitle="Access Denied"
          />
          <div className="content-area">
            <div className="access-denied">
              <p>You don't have permission to access admin settings.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-settings">
  {/* <SidebarNav /> removed to prevent duplicate sidebar */}
      <div className="main-content">
        <PageHeader 
          icon={<MdSettings />}
          title="Admin Settings"
          subtitle="Manage product types and categories"
          actions={[]}
        />
        <div className="content-area">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="admin-section">
            <h2>System Information</h2>
            <p>The product management system has been simplified to use a universal product handler. Products now have flexible attributes and categories that can be managed directly through the product editor.</p>
            <p>Key changes:</p>
            <ul>
              <li>Removed product types - all products now use a universal attribute system</li>
              <li>Categories are now stored as arrays directly on products</li>
              <li>Each product can have custom attributes defined as needed</li>
              <li>Unit of measure is now a direct field on each product</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
