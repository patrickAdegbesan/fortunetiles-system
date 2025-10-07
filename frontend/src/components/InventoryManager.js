import React, { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { fetchProducts, fetchLocations, logInventoryChange, fetchInventory } from '../services/api';
import '../styles/InventoryManager.css';

const InventoryManager = ({ selectedLocation: dashboardSelectedLocation, selectedCategory: dashboardSelectedCategory }) => {
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [quantity, setQuantity] = useState('');
  const [changeType, setChangeType] = useState('received'); // 'received' or 'adjusted'
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Use dashboard location filter if provided, otherwise use local selection
    const locationToLoad = dashboardSelectedLocation || selectedLocation;
    if (locationToLoad) {
      loadInventory();
    }
  }, [selectedLocation, dashboardSelectedLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [productsData, locationsData] = await Promise.all([
        fetchProducts(),
        fetchLocations()
      ]);
      
      setProducts((productsData.products || []).filter(p => p != null));
      setLocations(locationsData.locations || []);
      
      // Set default location if available
      if (locationsData.locations?.length > 0) {
        setSelectedLocation(locationsData.locations[0].id.toString());
      }
    } catch (error) {
      setError('Failed to load initial data');
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInventory = async () => {
    try {
      // Use dashboard location filter if provided, otherwise use local selection
      const locationToLoad = dashboardSelectedLocation || selectedLocation;
      const inventoryData = await fetchInventory({ locationId: locationToLoad });
      setInventory(inventoryData.inventory || []);
    } catch (error) {
      setError('Failed to load inventory data');
      console.error('Load inventory error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedProduct || !selectedLocation || !quantity) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const changeAmount = changeType === 'received' ? 
        Math.abs(parseFloat(quantity)) : 
        -Math.abs(parseFloat(quantity));

      await logInventoryChange({
        productId: parseInt(selectedProduct),
        locationId: parseInt(selectedLocation),
        changeType,
        changeAmount,
        notes: notes.trim(),
        userId: user.id
      });

      const actionMap = {
        received: 'received new stock',
        adjusted: 'adjusted stock',
        broken: 'recorded broken/damaged stock'
      };
      setSuccess(`Successfully ${actionMap[changeType] || 'updated'} inventory`);
      setQuantity('');
      setNotes('');
      
      // Reload inventory to show updated quantities
      await loadInventory();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      setError(error.message || 'Failed to update inventory');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    if (!product) return false;
    const nameMatch = (product.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const attrMatch = Object.values(product.customAttributes || {}).some(value =>
      (value ?? '').toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
    return nameMatch || attrMatch;
  });

  const aggregatedInventoryMap = useMemo(() => {
    const map = new Map();
    inventory.filter(Boolean).forEach(item => {
      const productId = item.productId;
      const quantityRaw = item.quantitySqm ?? item.quantity ?? item.quantity_sqm ?? 0;
      const quantity = Number(quantityRaw) || 0;

      if (!map.has(productId)) {
        map.set(productId, {
          productId,
          product: item.product || null,
          totalQuantity: 0,
          unitOfMeasure: item.product?.unitOfMeasure || 'units',
          breakdown: []
        });
      }

      const entry = map.get(productId);
      entry.totalQuantity += quantity;
      entry.unitOfMeasure = item.product?.unitOfMeasure || entry.unitOfMeasure;
      entry.breakdown.push({
        locationId: item.locationId,
        locationName: item.location?.name || `Location ${item.locationId}`,
        quantity
      });
    });
    return map;
  }, [inventory]);

  const aggregatedInventory = useMemo(() => {
    // Create a complete list including all products, even those with no inventory records
    const productMap = new Map();
    
    // First, add all products with zero inventory
    products.forEach(product => {
      if (product && product.id) {
        productMap.set(product.id, {
          productId: product.id,
          product: product,
          totalQuantity: 0,
          unitOfMeasure: product.unitOfMeasure || 'units',
          breakdown: []
        });
      }
    });
    
    // Then, update with actual inventory data
    aggregatedInventoryMap.forEach((inventoryItem, productId) => {
      productMap.set(productId, inventoryItem);
    });
    
    return Array.from(productMap.values());
  }, [aggregatedInventoryMap, products]);

  const formatQuantity = (value) => {
    const number = Number(value) || 0;
    return number.toLocaleString(undefined, {
      minimumFractionDigits: number % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    });
  };

  const getProductCurrentStock = (productId) => {
    const entry = aggregatedInventoryMap.get(parseInt(productId));
    return entry ? entry.totalQuantity : 0;
  };

  const getSelectedProductUnit = () => {
    const product = products.find(p => p.id === parseInt(selectedProduct));
    return product?.unitOfMeasure || 'units';
  };

  return (
    <div className="inventory-manager">
      <h2>Inventory Management</h2>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="inventory-grid">
        {/* Inventory Update Form */}
        <div className="inventory-form-section">
          <h3>Update Inventory</h3>
          <form onSubmit={handleSubmit} className="inventory-form">
            <div className="form-group">
              <label>Location *</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                required
              >
                <option value="">Select Location</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Search Products</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or attributes..."
                className="search-input"
              />
            </div>

            <div className="form-group">
              <label>Product *</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                required
              >
                <option value="">Select Product</option>
                {filteredProducts.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} - Current Stock: {getProductCurrentStock(product.id)} {product.unitOfMeasure || 'units'}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Change Type *</label>
                <select
                  value={changeType}
                  onChange={(e) => setChangeType(e.target.value)}
                  required
                >
                  <option value="received">Stock Received</option>
                  <option value="adjusted">Stock Adjustment</option>
                  <option value="broken">Broken/Damaged</option>
                </select>
              </div>

              <div className="form-group">
                <label>Quantity ({getSelectedProductUnit()}) *</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={`Enter quantity in ${getSelectedProductUnit()}`}
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional: Add notes about this inventory change"
                rows="3"
              />
            </div>

            <button 
              type="submit" 
              className="submit-btn" 
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Update Inventory'}
            </button>
          </form>
        </div>

        {/* Current Inventory Display */}
        <div className="current-inventory-section">
          <h3>Current Inventory Levels</h3>
          {(dashboardSelectedLocation || selectedLocation) ? (
            <div className="inventory-list">
              {(() => {
                // Filter inventory by category if dashboard category filter is applied
                const filteredInventory = dashboardSelectedCategory 
                  ? aggregatedInventory.filter(item => item.product?.category === dashboardSelectedCategory)
                  : aggregatedInventory;

                return filteredInventory.length > 0 ? (
                  filteredInventory.map(item => {
                    const product = item.product || {};
                    const productName = product.name || `Product ID: ${item.productId}`;
                    const customAttributes = product.customAttributes || {};
                    const unitOfMeasure = item.unitOfMeasure || product.unitOfMeasure || 'units';

                    return (
                      <div key={`inv-product-${item.productId}`} className="inventory-item">
                        <div className="item-info">
                          <h4>{productName}</h4>
                          <div className="attributes">
                            {product.category && (
                              <span className="attribute category">
                                Category: {product.category}
                              </span>
                            )}
                            {Object.entries(customAttributes).map(([key, value]) => (
                              <span key={key} className="attribute">
                                {key}: {value}
                              </span>
                            ))}
                            {!item.product && (
                              <span className="attribute missing-product">
                                ⚠️ Product data missing
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="item-quantity">
                          <span className="quantity">{formatQuantity(item.totalQuantity)}</span>
                          <span className="unit">{unitOfMeasure}</span>
                        </div>
                        {item.breakdown.length > 1 && (
                          <div className="inventory-breakdown">
                            {item.breakdown.map((entry) => (
                              <span key={`${item.productId}-${entry.locationId}`} className="breakdown-pill">
                                {entry.locationName}: {formatQuantity(entry.quantity)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="no-items">
                    No inventory items found for this location
                    {dashboardSelectedCategory && ` in category "${dashboardSelectedCategory}"`}.
                  </p>
                );
              })()}
            </div>
          ) : (
            <p className="select-location">Please select a location to view inventory levels.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryManager;
