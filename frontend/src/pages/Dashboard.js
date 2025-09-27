import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChartColumn,
  faLocationDot,
  faFolder,
  faRotate,
  faFilter,
  faBoxesStacked,
  faChartLine,
  faClockRotateLeft,
  faBuilding,
  faMoneyBillWave,
  faCartShopping,
  faMoneyBills
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/AuthContext';
import { fetchDashboardData, fetchInventory, fetchProducts, fetchLocations, fetchCategories } from '../services/api';
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
  
  // Filter states
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Reload data when filters change
    if (locations.length > 0 || categories.length > 0) {
      loadDashboardData();
    }
  }, [selectedLocation, selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [locationsData, categoriesData] = await Promise.all([
        fetchLocations().catch(() => ({ locations: [] })),
        fetchCategories().catch(() => ({ categories: [] }))
      ]);
      
      // Ensure data is properly structured
      const safeLocations = Array.isArray(locationsData.locations) ? locationsData.locations : [];
      const safeCategories = Array.isArray(categoriesData.categories) ? categoriesData.categories : [];
      
      setLocations(safeLocations);
      setCategories(safeCategories);
      
      // Load dashboard data after getting filter options
      await loadDashboardData();
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Failed to load initial data');
      // Set safe fallbacks
      setLocations([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const params = {};
      if (selectedLocation !== 'all') params.locationId = selectedLocation;
      if (selectedCategory !== 'all') params.category = selectedCategory;

      const [dashData, inventoryData, productsData] = await Promise.all([
        fetchDashboardData(params.locationId ? parseInt(params.locationId) : null, params.category),
        fetchInventory(params).catch(() => ({ inventory: [] })), // Fallback for inventory
        fetchProducts(params).catch(() => ({ products: [] })) // Fallback for products
      ]);
      
      setDashboardData(dashData);
      setInventory(inventoryData.inventory || []);
      setProducts(productsData.products || []);
      setError(''); // Clear any previous errors
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
      // Set fallback data
      setDashboardData({
        totalSales: 0,
        totalRevenue: 0,
        totalStockValue: 0,
        recentActivity: [],
        lowStockItems: []
      });
      setInventory([]);
      setProducts([]);
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
        <TopHeader title={<><FontAwesomeIcon icon={faChartColumn} /> Dashboard</>}>
          <div style={{ fontSize: '16px', color: '#6c757d' }}>
            Welcome back, {user?.firstName}!
          </div>
        </TopHeader>
        
        <div className="dashboard-content" style={{ padding: '20px' }}>

        {/* Dashboard Filters */}
        <div className="dashboard-filters">
          <div className="filter-group">
            <label htmlFor="location-filter"><FontAwesomeIcon icon={faLocationDot} /> Location:</label>
            <select
              id="location-filter"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Locations</option>
              {Array.isArray(locations) && locations.map(location => (
                <option key={location.id || location.name} value={location.id}>
                  {typeof location === 'object' ? location.name || 'Unknown' : location}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="category-filter"><FontAwesomeIcon icon={faFolder} /> Category:</label>
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              {Array.isArray(categories) && categories.map(category => (
                <option key={category.name || category.id} value={category.name}>
                  {typeof category === 'object' ? category.name || 'Unknown' : category}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-actions">
            <button 
              onClick={() => {
                setSelectedLocation('all');
                setSelectedCategory('all');
              }}
              className="reset-filters-btn"
            >
              <FontAwesomeIcon icon={faRotate} /> Reset Filters
            </button>
          </div>
        </div>

        {/* Active Filter Indicator */}
        {(selectedLocation !== 'all' || selectedCategory !== 'all') && (
          <div className="filter-info">
            <div className="active-filters">
              <span className="filter-label"><FontAwesomeIcon icon={faFilter} /> Showing data for:</span>
              {selectedLocation !== 'all' && (
                <span className="filter-tag">
                  <FontAwesomeIcon icon={faLocationDot} /> {locations.find(l => l.id.toString() === selectedLocation)?.name || 'Unknown Location'}
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="filter-tag">
                  <FontAwesomeIcon icon={faFolder} /> {selectedCategory || 'Unknown Category'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Dashboard Stats */}
        <DashboardStats 
          dashboardData={dashboardData}
          selectedLocation={selectedLocation}
          selectedCategory={selectedCategory}
        />

        {/* Inventory Manager */}
        <div className="dashboard-section full-width">
          <InventoryManager 
            selectedLocation={selectedLocation}
            selectedCategory={selectedCategory}
          />
        </div>

        <div className="dashboard-grid">
          {/* Recent Activity */}
          <div className="dashboard-section">
            <h2><FontAwesomeIcon icon={faClockRotateLeft} /> Recent Activity</h2>
            <div className="activity-list" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
              {(() => {
                // Filter recent activity by location and category
                let filteredActivity = dashboardData?.recentActivity || [];
                
                // Filter by location if selected
                if (selectedLocation) {
                  filteredActivity = filteredActivity.filter(activity => 
                    activity.locationId === parseInt(selectedLocation)
                  );
                }
                
                // Filter by category if selected
                if (selectedCategory) {
                  filteredActivity = filteredActivity.filter(activity => 
                    activity.product?.category === selectedCategory
                  );
                }
                
                return filteredActivity.length > 0 ? (
                  filteredActivity.map((activity) => (
                    <div key={activity.id} className="activity-item">
                      <div className="activity-info">
                        <strong>{activity.product?.name || 'Unknown Product'}</strong>
                        <span className={`change-type ${activity.changeType?.toLowerCase() || activity.type}`}>
                          {activity.type === 'return' ? 'RETURN' : activity.changeType?.toUpperCase()}
                          {activity.status && ` (${activity.status})`}
                        </span>
                      </div>
                      <div className="activity-details">
                        <span>
                          {activity.type === 'return' 
                            ? `${activity.changeAmount} items returned`
                            : `${activity.changeAmount > 0 ? '+' : ''}${activity.changeAmount} sqm`
                          }
                        </span>
                        <small>{new Date(activity.createdAt).toLocaleDateString()}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>
                    No recent activity
                    {(selectedLocation || selectedCategory) && ' for selected filters'}
                  </p>
                );
              })()}
            </div>
          </div>

          {/* Enhanced Quick Stats */}
          <div className="dashboard-section">
            <h2><FontAwesomeIcon icon={faChartLine} /> Quick Stats</h2>
            <div className="quick-stats scrollable">
              {(() => {
                // Filter products by category if selected
                const filteredProducts = selectedCategory 
                  ? products.filter(product => product?.category === selectedCategory)
                  : products;

                // Filter inventory by location and category if selected
                let filteredInventory = inventory;
                if (selectedLocation) {
                  filteredInventory = filteredInventory.filter(item => 
                    item.locationId === parseInt(selectedLocation)
                  );
                }
                if (selectedCategory) {
                  filteredInventory = filteredInventory.filter(item => 
                    item.product?.category === selectedCategory
                  );
                }

                // Filter recent activity by location and category
                let filteredActivity = dashboardData?.recentActivity || [];
                if (selectedLocation) {
                  filteredActivity = filteredActivity.filter(activity => 
                    activity.locationId === parseInt(selectedLocation)
                  );
                }
                if (selectedCategory) {
                  filteredActivity = filteredActivity.filter(activity => 
                    activity.product?.category === selectedCategory
                  );
                }

                // Calculate filtered stock value
                const filteredStockValue = filteredInventory.reduce((total, item) => {
                  const product = item.product || {};
                  const price = parseFloat(product.price) || 0;
                  const quantity = parseFloat(item.quantitySqm) || 0;
                  return total + (price * quantity);
                }, 0);

                return (
                  <>
                    <div className="stat-item featured">
                      <div className="stat-content">
                        <span>
                          <FontAwesomeIcon icon={faBoxesStacked} /> {selectedCategory ? `${selectedCategory} Products` : 'Total Products'}
                        </span>
                        <strong>{filteredProducts.length}</strong>
                      </div>
                    </div>
                    
                    <div className="stat-item featured">
                      <div className="stat-content">
                        <span>
                          <FontAwesomeIcon icon={faBoxesStacked} /> Items in Stock
                          {(selectedLocation && selectedLocation !== 'all') || (selectedCategory && selectedCategory !== 'all') 
                            ? ' (Filtered)' 
                            : ''}
                        </span>
                        <strong>{filteredInventory.length}</strong>
                      </div>
                    </div>
                    
                    <div className="stat-item featured">
                      <div className="stat-content">
                        <span>
                          <FontAwesomeIcon icon={faBuilding} /> {selectedLocation && selectedLocation !== 'all' 
                            ? 'Selected Location' 
                            : 'Your Location'}
                        </span>
                        <strong>
                          {selectedLocation && selectedLocation !== 'all'
                            ? locations.find(loc => loc.id === parseInt(selectedLocation))?.name || 'Unknown'
                            : (typeof user?.location === 'string' 
                                ? user.location 
                                : user?.location?.name || 'Not assigned')
                          }
                        </strong>
                      </div>
                    </div>
                    
                    <div className="stat-item">
                      <div className="stat-content">
                        <span>
                          <FontAwesomeIcon icon={faCartShopping} /> Recent Activities
                          {(selectedLocation && selectedLocation !== 'all') || (selectedCategory && selectedCategory !== 'all') 
                            ? ' (Filtered)' 
                            : ''}
                        </span>
                        <strong>{filteredActivity.length}</strong>
                      </div>
                    </div>
                    
                    <div className="stat-item">
                      <div className="stat-content">
                        <span>
                          <FontAwesomeIcon icon={faMoneyBills} /> Stock Value
                          {(selectedLocation && selectedLocation !== 'all') || (selectedCategory && selectedCategory !== 'all') 
                            ? ' (Filtered)' 
                            : ''}
                        </span>
                        <strong>₦{filteredStockValue.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong>
                      </div>
                    </div>
                    
                    <div className="stat-item">
                      <div className="stat-content">
                                                <span><FontAwesomeIcon icon={faMoneyBillWave} /> Total Revenue</span>
                        <strong>₦{(Number(dashboardData?.totalRevenue) || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</strong>
                      </div>
                    </div>
                    
                    {(selectedLocation !== 'all' || selectedCategory !== 'all') && (
                      <div className="stat-item filter-indicator-stat">
                        <div className="stat-content">
                          <span>Filtered View</span>
                          <strong>Active</strong>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
