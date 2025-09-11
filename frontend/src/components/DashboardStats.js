import React, { useState, useEffect } from 'react';
import { fetchDashboardStats, fetchLowStockItems } from '../services/api';
import '../styles/DashboardStats.css';

const DashboardStats = () => {
  const [stats, setStats] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [statsData, lowStockData] = await Promise.all([
          fetchDashboardStats(),
          fetchLowStockItems()
        ]);
        setStats(statsData);
        setLowStockItems(lowStockData.items || []);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError(error.message || 'Failed to load dashboard data');
        // Set default values if API fails
        setStats({
          totalSales: 0,
          totalRevenue: 0,
          totalStockValue: 0,
          recentActivity: []
        });
        setLowStockItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="dashboard-stats">
      <div className="stats-grid">
        <div className="stat-card sales">
          <div className="stat-icon">💰</div>
          <h3>TOTAL SALES</h3>
          <p className="stat-number">₦{(stats?.totalSales || 0).toLocaleString()}</p>
          <small>Total amount from all sales</small>
        </div>
        
        <div className="stat-card revenue">
          <div className="stat-icon">📈</div>
          <h3>TOTAL REVENUE</h3>
          <p className="stat-number">₦{(stats?.totalRevenue || 0).toLocaleString()}</p>
          <small>Total revenue generated</small>
        </div>
        
        <div className="stat-card stock">
          <div className="stat-icon">📦</div>
          <h3>STOCK VALUE</h3>
          <p className="stat-number">₦{(stats?.totalStockValue || 0).toLocaleString()}</p>
          <small>Current inventory value</small>
        </div>
        
        <div className="stat-card alerts">
          <div className="stat-icon">⚠️</div>
          <h3>LOW STOCK ITEMS</h3>
          <p className="stat-number">{lowStockItems.length}</p>
          <small>Items needing restock</small>
        </div>
      </div>

      {/* Low Stock Alert Section */}
      {lowStockItems.length > 0 && (
        <div className="low-stock-section">
          <h4>🚨 Low Stock Alerts</h4>
          <div className="low-stock-grid">
            {lowStockItems.slice(0, 6).map(item => (
              <div key={item.id} className="low-stock-item">
                <div className="item-details">
                  <strong>{item.productName || item.Product?.name}</strong>
                  <span className="item-specs">
                    {Object.entries(item.customAttributes || item.Product?.customAttributes || {})
                      .map(([key, value]) => `${value}`).join(' - ')}
                  </span>
                  <span className="item-location">{item.location}</span>
                </div>
                <div className="quantity-alert">
                  <span className="quantity">{item.quantitySqm}</span>
                  <span className="unit">units left</span>
                </div>
              </div>
            ))}
          </div>
          {lowStockItems.length > 6 && (
            <p className="more-items">
              +{lowStockItems.length - 6} more items need attention
            </p>
          )}
        </div>
      )}

      {/* Recent Activity Section */}
      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <div className="recent-activity">
          <h3>Recent Activity</h3>
          <ul>
            {stats.recentActivity.slice(0, 10).map(activity => (
              <li key={activity.id}>
                {activity.changeType} - {activity.product?.name || activity.Product?.name} 
                ({activity.changeAmount} {activity.product?.unitOfMeasure || activity.Product?.unitOfMeasure || 'units'})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DashboardStats;
