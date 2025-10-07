import React from 'react';
import '../styles/DashboardStats.css';
import MoneyValue from './MoneyValue';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMoneyBillTrendUp,
  faChartLine,
  faBoxesStacked,
  faTriangleExclamation,
  faBell,
  faLocationDot
} from '@fortawesome/free-solid-svg-icons';

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
            <div className="stat-icon sales-icon">
              <FontAwesomeIcon icon={faMoneyBillTrendUp} />
            </div>
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
            <div className="stat-icon revenue-icon">
              <FontAwesomeIcon icon={faChartLine} />
            </div>
            <div className="stat-info">
              <h3>TOTAL REVENUE</h3>
              <p className="stat-description">Total money earned from sales</p>
            </div>
          </div>
          <div className="stat-value">
            <p className="stat-number"><MoneyValue amount={Number(stats?.totalRevenue) || 0} sensitive={true} /></p>
            <span className="stat-unit">revenue generated</span>
          </div>
        </div>
        
        <div className="stat-card stock">
          <div className="stat-header">
            <div className="stat-icon stock-icon">
              <FontAwesomeIcon icon={faBoxesStacked} />
            </div>
            <div className="stat-info">
              <h3>STOCK VALUE</h3>
              <p className="stat-description">Total value of current inventory</p>
            </div>
          </div>
          <div className="stat-value">
            <p className="stat-number"><MoneyValue amount={Number(stats?.totalStockValue) || 0} sensitive={true} /></p>
            <span className="stat-unit">inventory worth</span>
          </div>
        </div>
        
        <div className="stat-card alerts">
          <div className="stat-header">
            <div className="stat-icon alerts-icon">
              <FontAwesomeIcon icon={faTriangleExclamation} />
            </div>
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

      {/* Enhanced Low Stock Alert Section */}
      {Array.isArray(lowStockItems) && lowStockItems.length > 0 && (
        <div className="low-stock-section">
          <h4>
            <FontAwesomeIcon icon={faBell} /> 
            Low Stock Alerts 
            <span className="alert-summary">
              ({dashboardData.summary?.outOfStockCount || 0} out of stock, {dashboardData.summary?.criticalStockCount || 0} critical)
            </span>
          </h4>
          <div className="low-stock-grid">
            {lowStockItems.slice(0, 12).filter(item => item && item.id).map(item => {
              const stockStatus = item.stockStatus || (item.quantitySqm <= 0 ? 'OUT_OF_STOCK' : 
                                 item.quantitySqm <= 3 ? 'CRITICAL' : 'LOW');
              const quantity = parseFloat(item.quantitySqm || 0);
              
              return (
                <div key={item.id} className={`low-stock-item-compact ${stockStatus.toLowerCase().replace('_', '-')}`}>
                  <div className="item-info">
                    <div className="product-name">
                      {item.productName || item.product?.name || item.Product?.name || `Product ${item.productId}` || 'Unknown Product'}
                    </div>
                    <div className="stock-info">
                      <span className={`quantity-compact ${stockStatus.toLowerCase().replace('_', '-')}`}>
                        {quantity.toFixed(quantity % 1 === 0 ? 0 : 1)}
                      </span>
                      <span className="stock-status">
                        {stockStatus === 'OUT_OF_STOCK' ? '� Out' : 
                         stockStatus === 'CRITICAL' ? '⚠️ Critical' : '📉 Low'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {lowStockItems.length > 12 && (
            <p className="more-items">
              +{lowStockItems.length - 12} more items need attention
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardStats;
