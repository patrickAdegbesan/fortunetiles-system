import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { 
  fetchSalesDailyReport, 
  fetchInventoryValuationReport, 
  fetchProfitMarginReport, 
  fetchTopProductsReport,
  fetchLocations 
} from '../services/api';
import SidebarNav from '../components/SidebarNav';
import PageHeader from '../components/PageHeader';
import ReportChart from '../components/ReportChart';
import DateRangeSelector from '../components/DateRangeSelector';
import { exportToPDF, exportToExcel } from '../utils/reportExport';
import '../styles/ReportsPage.css';

const ReportsPage = () => {
  const { user } = useContext(AuthContext);
  const [activeReport, setActiveReport] = useState('sales-daily');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Report data states
  const [salesDailyData, setSalesDailyData] = useState(null);
  const [inventoryValuationData, setInventoryValuationData] = useState(null);
  const [profitMarginData, setProfitMarginData] = useState(null);
  const [topProductsData, setTopProductsData] = useState(null);

  // Check if user has access to reports
  const hasReportAccess = user?.role === 'owner' || user?.role === 'manager';

  useEffect(() => {
    if (hasReportAccess) {
      loadLocations();
      loadActiveReport();
    }
  }, [hasReportAccess, activeReport, dateRange, selectedLocation]);

  const loadLocations = async () => {
    try {
      const response = await fetchLocations();
      setLocations(response.locations || []);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const loadActiveReport = async () => {
    setLoading(true);
    setError('');

    try {
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(selectedLocation && { locationId: selectedLocation })
      };

      switch (activeReport) {
        case 'sales-daily':
          const salesData = await fetchSalesDailyReport(params);
          setSalesDailyData(salesData.data);
          break;
        case 'inventory-valuation':
          const inventoryData = await fetchInventoryValuationReport(params);
          setInventoryValuationData(inventoryData.data);
          break;
        case 'profit-margin':
          const profitData = await fetchProfitMarginReport(params);
          setProfitMarginData(profitData.data);
          break;
        case 'top-products':
          const topProductsParams = { ...params, limit: 10 };
          const topProductsResponse = await fetchTopProductsReport(topProductsParams);
          setTopProductsData(topProductsResponse.data);
          break;
        default:
          break;
      }
    } catch (error) {
      setError(error.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  const handleExportReport = (format) => {
    const getCurrentReportData = () => {
      switch (activeReport) {
        case 'sales-daily':
          return salesDailyData;
        case 'inventory-valuation':
          return inventoryValuationData;
        case 'profit-margin':
          return profitMarginData;
        case 'top-products':
          return topProductsData;
        default:
          return null;
      }
    };

    const reportData = getCurrentReportData();
    if (!reportData) {
      alert('No report data available to export');
      return;
    }

    const reportTitle = activeReport.replace('-', ' ').toUpperCase();
    
    if (format === 'pdf') {
      exportToPDF(reportData, activeReport, dateRange);
    } else if (format === 'excel') {
      exportToExcel(reportData, activeReport, dateRange);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount || 0);
  };

  const formatNumber = (number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(number || 0);
  };

  if (!hasReportAccess) {
    return (
      <>
  {/* <SidebarNav /> removed to prevent duplicate sidebar */}
        <div className="reports-page" style={{ marginLeft: '0', transition: 'margin-left 0.3s ease' }}>
          <PageHeader
            icon="📊"
            title="Business Reports"
            subtitle="Access Denied"
          />
          <div style={{ padding: '20px' }}>
            <div className="access-denied">
              <h2>Access Denied</h2>
              <p>You don't have permission to view reports.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
  {/* <SidebarNav /> removed to prevent duplicate sidebar */}
      <div className="reports-page" style={{ marginLeft: '0', transition: 'margin-left 0.3s ease' }}>
        <PageHeader
          icon="📊"
          title="Business Reports"
          subtitle="View and analyze business performance"
          actions={
            <div className="header-actions">
              <button 
                className="export-btn primary-button"
                onClick={() => handleExportReport('pdf')}
                disabled={loading}
              >
                📄 Export PDF
              </button>
              <button 
                className="export-btn secondary-button"
                onClick={() => handleExportReport('excel')}
                disabled={loading}
              >
                📊 Export Excel
              </button>
            </div>
          }
        />
        
        <div className="reports-container" style={{ padding: '20px' }}>

        {error && <div className="error-message">{error}</div>}

        <div className="reports-controls">
          <div className="report-tabs">
            <button 
              className={`tab-btn ${activeReport === 'sales-daily' ? 'active' : ''}`}
              onClick={() => setActiveReport('sales-daily')}
            >
              📈 Daily Sales
            </button>
            <button 
              className={`tab-btn ${activeReport === 'inventory-valuation' ? 'active' : ''}`}
              onClick={() => setActiveReport('inventory-valuation')}
            >
              📦 Inventory Value
            </button>
            <button 
              className={`tab-btn ${activeReport === 'profit-margin' ? 'active' : ''}`}
              onClick={() => setActiveReport('profit-margin')}
            >
              💰 Profit Analysis
            </button>
            <button 
              className={`tab-btn ${activeReport === 'top-products' ? 'active' : ''}`}
              onClick={() => setActiveReport('top-products')}
            >
              🏆 Top Products
            </button>
          </div>

          <div className="report-filters">
            <DateRangeSelector
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
              onChange={handleDateRangeChange}
            />
            
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="location-filter"
            >
              <option value="">All Locations</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <div className="loading">Loading report data...</div>}

        {!loading && (
          <div className="report-content">
            {/* Sales Daily Report */}
            {activeReport === 'sales-daily' && salesDailyData && (
              <div className="report-section">
                <h2>Daily Sales Report</h2>
                
                <div className="summary-cards">
                  <div className="summary-card">
                    <h3>Total Revenue</h3>
                    <p className="metric-value">{formatCurrency(salesDailyData.summary.totalRevenue)}</p>
                  </div>
                  <div className="summary-card">
                    <h3>Total Transactions</h3>
                    <p className="metric-value">{salesDailyData.summary.totalTransactions}</p>
                  </div>
                  <div className="summary-card">
                    <h3>Average Order Value</h3>
                    <p className="metric-value">{formatCurrency(salesDailyData.summary.averageOrderValue)}</p>
                  </div>
                  <div className="summary-card">
                    <h3>Peak Order Value</h3>
                    <p className="metric-value">{formatCurrency(salesDailyData.summary.maxOrderValue)}</p>
                  </div>
                </div>

                <ReportChart
                  type="line"
                  data={salesDailyData.dailySales}
                  xKey="date"
                  yKey="totalRevenue"
                  title="Daily Revenue Trend"
                />

                <div className="data-table">
                  <h3>Daily Breakdown</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Sales Count</th>
                        <th>Revenue</th>
                        <th>Avg Order Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesDailyData.dailySales.map((day, index) => (
                        <tr key={index}>
                          <td>{new Date(day.date).toLocaleDateString()}</td>
                          <td>{day.totalSales}</td>
                          <td>{formatCurrency(day.totalRevenue)}</td>
                          <td>{formatCurrency(day.averageOrderValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Inventory Valuation Report */}
            {activeReport === 'inventory-valuation' && inventoryValuationData && (
              <div className="report-section">
                <h2>Inventory Valuation Report</h2>
                
                <div className="summary-cards">
                  <div className="summary-card">
                    <h3>Total Inventory Value</h3>
                    <p className="metric-value">{formatCurrency(inventoryValuationData.summary.totalValuation)}</p>
                  </div>
                  <div className="summary-card">
                    <h3>Total Quantity</h3>
                    <p className="metric-value">{formatNumber(inventoryValuationData.summary.totalQuantity)} sqm</p>
                  </div>
                  <div className="summary-card">
                    <h3>Active Products</h3>
                    <p className="metric-value">{inventoryValuationData.summary.activeProducts}</p>
                  </div>
                  <div className="summary-card">
                    <h3>Avg Value/sqm</h3>
                    <p className="metric-value">{formatCurrency(inventoryValuationData.summary.averageValuePerSqm)}</p>
                  </div>
                </div>

                <ReportChart
                  type="pie"
                  data={inventoryValuationData.categoryBreakdown}
                  valueKey="totalValue"
                  labelKey="category"
                  title="Inventory Value by Category"
                />

                <div className="data-table">
                  <h3>Category Breakdown</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Products</th>
                        <th>Quantity (sqm)</th>
                        <th>Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryValuationData.categoryBreakdown.map((category, index) => (
                        <tr key={index}>
                          <td>{category.category}</td>
                          <td>{category.productCount}</td>
                          <td>{formatNumber(category.totalQuantity)}</td>
                          <td>{formatCurrency(category.totalValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Profit Margin Report */}
            {activeReport === 'profit-margin' && profitMarginData && (
              <div className="report-section">
                <h2>Profit Margin Analysis</h2>
                
                <div className="summary-cards">
                  <div className="summary-card">
                    <h3>Total Revenue</h3>
                    <p className="metric-value">{formatCurrency(profitMarginData.summary.totalRevenue)}</p>
                  </div>
                  <div className="summary-card">
                    <h3>Total Profit</h3>
                    <p className="metric-value">{formatCurrency(profitMarginData.summary.totalProfit)}</p>
                  </div>
                  <div className="summary-card">
                    <h3>Profit Margin</h3>
                    <p className="metric-value">{formatNumber(profitMarginData.summary.overallProfitMargin)}%</p>
                  </div>
                  <div className="summary-card">
                    <h3>Avg Profit/Transaction</h3>
                    <p className="metric-value">{formatCurrency(profitMarginData.summary.averageProfitPerTransaction)}</p>
                  </div>
                </div>

                <ReportChart
                  type="bar"
                  data={profitMarginData.categoryProfitability}
                  xKey="category"
                  yKey="profitMargin"
                  title="Profit Margin by Category"
                />

                <div className="data-table">
                  <h3>Category Profitability</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Revenue</th>
                        <th>Profit</th>
                        <th>Margin %</th>
                        <th>Items Sold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitMarginData.categoryProfitability.map((category, index) => (
                        <tr key={index}>
                          <td>{category.category}</td>
                          <td>{formatCurrency(category.totalRevenue)}</td>
                          <td>{formatCurrency(category.totalProfit)}</td>
                          <td>{formatNumber(category.profitMargin)}%</td>
                          <td>{category.itemCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top Products Report */}
            {activeReport === 'top-products' && topProductsData && (
              <div className="report-section">
                <h2>Top Products Report</h2>
                
                <div className="top-products-grid">
                  <div className="top-products-section">
                    <h3>🏆 Top Products by Quantity Sold</h3>
                    <div className="products-list">
                      {topProductsData.topProductsByQuantity.map((product, index) => (
                        <div key={index} className="product-card">
                          <div className="product-rank">#{index + 1}</div>
                          <div className="product-info">
                            <h4>{product.productName}</h4>
                            <p className="product-category">{product.category}</p>
                            <div className="product-metrics">
                              <span>Sold: {formatNumber(product.totalQuantitySold)} sqm</span>
                              <span>Revenue: {formatCurrency(product.totalRevenue)}</span>
                              <span>Transactions: {product.totalTransactions}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="top-products-section">
                    <h3>💰 Top Products by Revenue</h3>
                    <div className="products-list">
                      {topProductsData.topProductsByRevenue.map((product, index) => (
                        <div key={index} className="product-card">
                          <div className="product-rank">#{index + 1}</div>
                          <div className="product-info">
                            <h4>{product.productName}</h4>
                            <p className="product-category">{product.category}</p>
                            <div className="product-metrics">
                              <span>Revenue: {formatCurrency(product.totalRevenue)}</span>
                              <span>Sold: {formatNumber(product.totalQuantitySold)} sqm</span>
                              <span>Avg Price: {formatCurrency(product.averagePrice)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <ReportChart
                  type="bar"
                  data={topProductsData.categoryPerformance}
                  xKey="category"
                  yKey="totalRevenue"
                  title="Category Performance by Revenue"
                />
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default ReportsPage;
