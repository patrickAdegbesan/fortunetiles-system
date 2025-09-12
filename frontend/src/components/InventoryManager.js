import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { fetchProducts, fetchLocations, logInventoryChange, fetchInventory } from '../services/api';
import '../styles/InventoryManager.css';

const InventoryManager = () => {
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
    if (selectedLocation) {
      loadInventory();
    }
  }, [selectedLocation]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const inventoryData = await fetchInventory({ locationId: selectedLocation });
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

  const getProductCurrentStock = (productId) => {
    const inventoryItem = inventory.find(item => item.productId === parseInt(productId));
    return inventoryItem ? inventoryItem.quantitySqm : 0;
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
          {selectedLocation ? (
            <div className="inventory-list">
              {inventory.filter(item => item && item.product).map(item => (
                <div key={item.id} className="inventory-item">
                  <div className="item-info">
                    <h4>{item.product?.name || '(Unknown Product)'}</h4>
                    <div className="attributes">
                      {Object.entries((item.product && item.product.customAttributes) ? item.product.customAttributes : {}).map(([key, value]) => (
                        <span key={key} className="attribute">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="item-quantity">
                    <span className="quantity">{item.quantitySqm}</span>
                    <span className="unit">{item.product?.unitOfMeasure || 'units'}</span>
                  </div>
                </div>
              ))}
              {inventory.length === 0 && (
                <p className="no-items">No inventory items found for this location.</p>
              )}
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
