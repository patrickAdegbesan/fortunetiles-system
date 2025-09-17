import React from 'react';
import '../styles/DashboardStats.css';

const DashboardStats = ({ dashboardData, selectedLocation, selectedCategory }) => {
  if (!dashboardData) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const stats = dashboardData;
  const lowStockItems = dashboardData.lowStockItems || [];

  return (
    <div className="dashboard-stats">
      {/* Removed duplicate filter indicator */}

      <div className="stats-grid">
        <div className="stat-card sales">
          <div className="stat-header">
            <div className="stat-icon sales-icon">💰</div>
            <div className="stat-info">
              <h3>TOTAL SALES</h3>
              <p className="stat-description">Number of completed transactions</p>
            </div>
          </div>
          <div className="stat-value">
            <p className="stat-number">{(Number(stats?.totalSales) || 0).toLocaleString()}</p>
            <span className="stat-unit">transactions</span>
          </div>
        </div>
        
        <div className="stat-card revenue">
          <div className="stat-header">
            <div className="stat-icon revenue-icon">📈</div>
            <div className="stat-info">
              <h3>TOTAL REVENUE</h3>
              <p className="stat-description">Total money earned from sales</p>
            </div>
          </div>
          <div className="stat-value">
            <p className="stat-number">₦{(Number(stats?.totalRevenue) || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
            <span className="stat-unit">revenue generated</span>
          </div>
        </div>
        
        <div className="stat-card stock">
          <div className="stat-header">
            <div className="stat-icon stock-icon">📦</div>
            <div className="stat-info">
              <h3>STOCK VALUE</h3>
              <p className="stat-description">Total value of current inventory</p>
            </div>
          </div>
          <div className="stat-value">
            <p className="stat-number">₦{(Number(stats?.totalStockValue) || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
            <span className="stat-unit">inventory worth</span>
          </div>
        </div>
        
        <div className="stat-card alerts">
          <div className="stat-header">
            <div className="stat-icon alerts-icon">⚠️</div>
            <div className="stat-info">
              <h3>LOW STOCK ITEMS</h3>
              <p className="stat-description">Products needing immediate restock</p>
            </div>
          </div>
          <div className="stat-value">
            <p className="stat-number">{Array.isArray(lowStockItems) ? lowStockItems.length : 0}</p>
            <span className="stat-unit">items need attention</span>
          </div>
        </div>
      </div>

      {/* Low Stock Alert Section */}
      {Array.isArray(lowStockItems) && lowStockItems.length > 0 && (
        <div className="low-stock-section">
          <h4>🚨 Low Stock Alerts</h4>
          <div className="low-stock-grid">
            {lowStockItems.slice(0, 6).filter(item => item && item.id).map(item => (
              <div key={item.id} className="low-stock-item">
                <div className="item-details">
                  <strong>{item.productName || item.Product?.name}</strong>
                  <span className="item-specs">
                    {Object.entries(item.customAttributes || item.Product?.customAttributes || {})
                      .map(([key, value]) => `${value}`).join(' - ')}
                  </span>
                  <span className="item-location">
                    {typeof item.location === 'string' ? item.location : item.location?.name || 'Unknown Location'}
                  </span>
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
    </div>
  );
};

export default DashboardStats;
