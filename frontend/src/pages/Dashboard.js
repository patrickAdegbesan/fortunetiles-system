import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchDashboardData, fetchInventory, fetchProducts } from '../services/api';
import SidebarNav from '../components/SidebarNav';
import TopHeader from '../components/TopHeader';
import DashboardStats from '../components/DashboardStats';
import InventoryManager from '../components/InventoryManager';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashData, inventoryData, productsData] = await Promise.all([
        fetchDashboardData(user?.locationId),
        fetchInventory(user?.locationId),
        fetchProducts()
      ]);
      
      setDashboardData(dashData);
      setInventory(inventoryData.inventory || []);
      setProducts(productsData.products || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <SidebarNav />
        <div className="dashboard-container" style={{ marginLeft: '0', transition: 'margin-left 0.3s ease' }}>
          <TopHeader title="📊 Dashboard" />
          <div style={{ padding: '20px' }}>
            <div className="loading-spinner">Loading dashboard...</div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <SidebarNav />
        <div className="dashboard-container" style={{ marginLeft: '0', transition: 'margin-left 0.3s ease' }}>
          <TopHeader title="📊 Dashboard" />
          <div style={{ padding: '20px' }}>
            <div className="error-message">{error}</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SidebarNav />
      <div className="dashboard-container" style={{ marginLeft: '0', transition: 'margin-left 0.3s ease' }}>
        <TopHeader title="📊 Dashboard">
          <div style={{ fontSize: '16px', color: '#6c757d' }}>
            Welcome back, {user?.firstName}!
          </div>
        </TopHeader>
        
        <div className="dashboard-content" style={{ padding: '20px' }}>

        {/* Enhanced Dashboard Stats */}
        <DashboardStats />

        {/* Inventory Manager */}
        <div className="dashboard-section full-width">
          <h2>Inventory Management</h2>
          <InventoryManager />
        </div>

        <div className="dashboard-grid">
          {/* Low Stock Alert */}
          {dashboardData?.lowStockItems?.length > 0 && (
            <div className="dashboard-section">
              <h2>⚠️ Low Stock Alert</h2>
              <div className="low-stock-list">
                {dashboardData.lowStockItems.map((item) => (
                  <div key={item.id} className="low-stock-item">
                    <div className="item-info">
                      <strong>{item.product?.name}</strong>
                      <span>{item.product?.size} - {item.product?.color}</span>
                    </div>
                    <div className="stock-quantity">
                      {item.quantitySqm} sqm
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="dashboard-section">
            <h2>Recent Activity</h2>
            <div className="activity-list">
              {dashboardData?.recentActivity?.length > 0 ? (
                dashboardData.recentActivity.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-info">
                      <strong>{activity.product?.name}</strong>
                      <span className={`change-type ${activity.changeType}`}>
                        {activity.changeType.toUpperCase()}
                      </span>
                    </div>
                    <div className="activity-details">
                      <span>{activity.changeAmount > 0 ? '+' : ''}{activity.changeAmount} sqm</span>
                      <small>{new Date(activity.createdAt).toLocaleDateString()}</small>
                    </div>
                  </div>
                ))
              ) : (
                <p>No recent activity</p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="dashboard-section">
            <h2>Quick Stats</h2>
            <div className="quick-stats">
              <div className="stat-item">
                <span>Total Products</span>
                <strong>{products.length}</strong>
              </div>
              <div className="stat-item">
                <span>Items in Stock</span>
                <strong>{inventory.length}</strong>
              </div>
              <div className="stat-item">
                <span>Your Location</span>
                <strong>{user?.location?.name || 'Not assigned'}</strong>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
