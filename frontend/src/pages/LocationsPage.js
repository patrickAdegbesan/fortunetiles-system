import React, { useState, useEffect, useCallback } from 'react';
import { 
  fetchLocations, 
  createLocation, 
  updateLocation, 
  deleteLocation,
  fetchInventory 
} from '../services/api';
import SidebarNav from '../components/SidebarNav';
import PageHeader from '../components/PageHeader';
import '../styles/LocationsPage.css';

const LocationsPage = () => {
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState({ name: '', address: '' });
  const [editingLocation, setEditingLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [inventoryData, setInventoryData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadInventoryForLocation = useCallback(async (locationId) => {
    try {
      const response = await fetchInventory({ locationId });
      setInventoryData(prev => ({
        ...prev,
        [locationId]: response.inventory
      }));
    } catch (error) {
      console.error('Load inventory error:', error);
    }
  }, []);

  const loadLocations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchLocations();
      setLocations(response.locations);
      
      // Fetch inventory for all locations
      for (const location of response.locations) {
        loadInventoryForLocation(location.id);
      }
    } catch (error) {
      setError('Failed to load locations');
      console.error('Load locations error:', error);
    } finally {
      setLoading(false);
    }
  }, [loadInventoryForLocation]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      
      if (editingLocation) {
        await updateLocation(editingLocation.id, newLocation);
        setSuccess('Location updated successfully');
      } else {
        await createLocation(newLocation);
        setSuccess('Location created successfully');
      }
      
      // Reset form and refresh locations
      setNewLocation({ name: '', address: '' });
      setEditingLocation(null);
      await loadLocations();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save location');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setNewLocation({
      name: location.name,
      address: location.address || ''
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this location? This cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await deleteLocation(id);
      setSuccess('Location deleted successfully');
      await loadLocations();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete location');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingLocation(null);
    setNewLocation({ name: '', address: '' });
  };

  return (
    <>
  {/* <SidebarNav /> removed to prevent duplicate sidebar */}
      <div className="locations-page" style={{ marginLeft: '0', transition: 'margin-left 0.3s ease' }}>
        <PageHeader
          icon="📍"
          title="Manage Locations"
          subtitle="Add and manage store locations"
          actions={
            <button
              className="primary-button"
              onClick={() => setShowAddLocationModal(true)}
            >
              + Add Location
            </button>
          }
        />
        
        <div className="locations-container" style={{ padding: '20px' }}>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Location Form */}
        <div className="location-form-section">
          <h2>{editingLocation ? 'Edit Location' : 'Add New Location'}</h2>
          <form onSubmit={handleSubmit} className="location-form">
            <div className="form-group">
              <label>Location Name *</label>
              <input
                type="text"
                value={newLocation.name}
                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                placeholder="Enter location name"
                required
              />
            </div>

            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                value={newLocation.address}
                onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                placeholder="Enter address (optional)"
              />
            </div>

            <div className="form-buttons">
              <button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingLocation ? 'Update Location' : 'Add Location'}
              </button>
              {editingLocation && (
                <button type="button" onClick={handleCancel} className="cancel-btn">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Locations List */}
        <div className="locations-list-section">
          <h2>Existing Locations</h2>
          {loading && <div className="loading">Loading...</div>}
          <div className="locations-grid">
            {locations.map(location => (
              <div key={location.id} className="location-card">
                <div className="location-info">
                  <h3>{location.name}</h3>
                  {location.address && <p className="location-address">{location.address}</p>}
                  
                  {/* Inventory summary button */}
                  <button 
                    className="view-inventory-btn"
                    onClick={() => {
                      setSelectedLocation(selectedLocation === location.id ? null : location.id);
                      if (!inventoryData[location.id]) {
                        loadInventoryForLocation(location.id);
                      }
                    }}
                  >
                    📦 View Inventory
                  </button>

                  {/* Inventory details */}
                  {selectedLocation === location.id && (
                    <div className="inventory-details">
                      {inventoryData[location.id] ? (
                        inventoryData[location.id].length > 0 ? (
                          <>
                            <h4>Products in Stock</h4>
                            <div className="inventory-list">
                              {inventoryData[location.id].map(item => {
                                console.log('Inventory item:', item); // Debug log
                                const isLowStock = parseFloat(item.quantitySqm || 0) <= 10;
                                const price = parseFloat(item.product?.price) || 0;
                                const quantity = parseFloat(item.quantitySqm || 0);
                                const itemValue = quantity * price;
                                
                                return (
                                  <div key={item.id} className={`inventory-item ${isLowStock ? 'low-stock' : ''}`}>
                                    <div className="inventory-item-details">
                                      <span className="product-name">
                                        {item.product?.name}
                                        {isLowStock && <span className="low-stock-badge">Low Stock</span>}
                                      </span>
                                      <span className="product-details">
                                        {item.product?.category} • {item.product?.supplierCode || 'No Code'}
                                      </span>
                                    </div>
                                    <div className="inventory-item-counts">
                                      <div className="price">
                                        Unit Price: ₦{price.toLocaleString()}
                                      </div>
                                      <span className="quantity">
                                        Quantity: {quantity.toLocaleString()} {item.product?.productType?.unitOfMeasure || 'pcs'}
                                      </span>
                                      <span className="item-value">
                                        Total: ₦{itemValue.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="inventory-summary">
                              <div className="summary-item">
                                <span className="summary-label">Total Products:</span>
                                <span className="summary-value">{inventoryData[location.id].length} types</span>
                              </div>
                              <div className="summary-item">
                                <span className="summary-label">Low Stock Items:</span>
                                <span className="summary-value">
                                  {inventoryData[location.id].filter(item => item.quantitySqm <= 10).length}
                                </span>
                              </div>
                              <div className="summary-item total-value">
                                <span className="summary-label">Total Value:</span>
                                <span className="summary-value">
                                  ₦{inventoryData[location.id]
                                    .reduce((total, item) => total + (parseFloat(item.quantitySqm || 0) * parseFloat(item.product?.price || 0)), 0)
                                    .toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="no-inventory">No products in stock</p>
                        )
                      ) : (
                        <p className="loading-inventory">Loading inventory...</p>
                      )}
                    </div>
                  )}
                </div>
                <div className="location-actions">
                  <button onClick={() => handleEdit(location)} className="edit-btn">
                    <span>✏️</span> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(location.id)} 
                    className="delete-btn"
                    disabled={inventoryData[location.id]?.length > 0}
                    title={inventoryData[location.id]?.length > 0 ? 'Cannot delete location with products' : 'Delete location'}
                  >
                    <span>🗑️</span> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default LocationsPage;
