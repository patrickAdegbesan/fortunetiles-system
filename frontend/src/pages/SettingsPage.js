import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import AdminDeleteModal from '../components/AdminDeleteModal';
import {
  fetchLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  fetchInventory,
  fetchUsers,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  fetchUserRoles,
  fetchCategories,
  createCategory,
  deleteCategory
} from '../services/api';
import PageHeader from '../components/PageHeader';
import UserEditor from '../components/UserEditor';
import {
  MdLocationOn,
  MdPeople,
  MdSettings,
  MdDashboard,
  MdAdd,
  MdEdit,
  MdDelete,
  MdVisibility,
  MdVisibilityOff,
  MdCheck,
  MdClose,
  MdInventory,
  MdCategory,
  MdPersonAdd,
  MdStore,
  MdAdminPanelSettings
} from 'react-icons/md';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import '../styles/SettingsPage.css';

const SettingsPage = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Locations state
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState({ name: '', address: '' });
  const [editingLocation, setEditingLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [inventoryData, setInventoryData] = useState({});
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);

  // Users state
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Admin Settings state
  const [productTypes, setProductTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newProductType, setNewProductType] = useState({
    name: '',
    unitOfMeasure: ''
  });
  const [newAttr, setNewAttr] = useState({ required: [], optional: [], reqInput: '', optInput: '', reqBulk: '', optBulk: '' });
  const [editingProductType, setEditingProductType] = useState(null);
  const [attrInputs, setAttrInputs] = useState({});
  const [newCategory, setNewCategory] = useState('');
  const [renamingCategory, setRenamingCategory] = useState(null);
  const [renameForm, setRenameForm] = useState({ from: '', to: '' });
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [deleteForm, setDeleteForm] = useState({ name: '', reassignTo: 'General' });

  // Modal states
  const [showProductTypeDeleteModal, setShowProductTypeDeleteModal] = useState(false);
  const [showCategoryDeleteModal, setShowCategoryDeleteModal] = useState(false);
  const [productTypeToDelete, setProductTypeToDelete] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // Check permissions
  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';

  useEffect(() => {
    loadInitialData();
  }, [activeTab]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'locations':
          await loadLocations();
          break;
        case 'users':
          if (isOwner) {
            await loadUsers();
          }
          break;
        case 'admin':
          if (isAdmin) {
            await loadAdminData();
          }
          break;
        case 'overview':
          // Load summary data for overview
          await Promise.all([
            loadLocations(),
            isOwner && loadUsers(),
            isAdmin && loadAdminData()
          ].filter(Boolean));
          break;
        default:
          break;
      }
    } catch (error) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Locations Methods
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
      const response = await fetchLocations();
      setLocations(response.locations);
      
      // Fetch inventory for all locations
      for (const location of response.locations) {
        loadInventoryForLocation(location.id);
      }
    } catch (error) {
      console.error('Load locations error:', error);
    }
  }, [loadInventoryForLocation]);

  const handleLocationSubmit = async (e) => {
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
      
      setNewLocation({ name: '', address: '' });
      setEditingLocation(null);
      setShowAddLocationModal(false);
      await loadLocations();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save location');
    } finally {
      setLoading(false);
    }
  };

  const handleEditLocation = (location) => {
    setEditingLocation(location);
    setNewLocation({
      name: location.name,
      address: location.address || ''
    });
    setShowAddLocationModal(true);
  };

  const handleDeleteLocation = async (id) => {
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

  // Users Methods
  const loadUsers = useCallback(async (page = 1) => {
    try {
      const params = {
        page,
        limit: pagination.limit,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedRole && { role: selectedRole }),
        ...(selectedStatus && { isActive: selectedStatus })
      };

      const [usersData, rolesData, locationsData] = await Promise.all([
        fetchUsers(params),
        fetchUserRoles(),
        fetchLocations()
      ]);

      setUsers(usersData.users || []);
      setPagination(usersData.pagination || {});
      setRoles(rolesData.roles || []);
      setLocations(locationsData.locations || []);
    } catch (error) {
      console.error('Load users error:', error);
    }
  }, [searchTerm, selectedRole, selectedStatus, pagination.limit]);

  const handleSaveUser = async (userData) => {
    try {
      setLoading(true);
      setError('');

      if (editingUser) {
        await updateUser(editingUser.id, userData);
        setSuccess('User updated successfully');
      } else {
        await createUser(userData);
        setSuccess('User created successfully');
      }

      setShowEditor(false);
      setEditingUser(null);
      loadUsers(pagination.page);

      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus, userName) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} "${userName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      if (currentStatus) {
        await deactivateUser(userId);
        setSuccess('User deactivated successfully');
      } else {
        await activateUser(userId);
        setSuccess('User activated successfully');
      }
      
      loadUsers(pagination.page);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message || 'Failed to update user status');
    } finally {
      setLoading(false);
    }
  };

  // Admin Settings Methods
  const loadAdminData = async () => {
    try {
      await Promise.all([loadProductTypesData(), loadCategoriesData()]);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    }
  };

  const loadProductTypesData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/product-types', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProductTypes(data.productTypes || []);
      }
    } catch (error) {
      console.error('Load product types error:', error);
    }
  };

  const loadCategoriesData = async () => {
    try {
      const data = await fetchCategories();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Load categories error:', error);
    }
  };

  const handleEditProductType = (productType) => {
    setEditingProductType(productType);
    setNewProductType({
      name: productType.name,
      unitOfMeasure: productType.unitOfMeasure
    });
    // Scroll to the form
    document.querySelector('.create-form').scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteProductType = async (productType) => {
    setProductTypeToDelete(productType);
    setShowProductTypeDeleteModal(true);
  };

  const confirmDeleteProductType = async () => {
    if (!productTypeToDelete) return;

    try {
      setIsDeletingItem(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/product-types/${productTypeToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setProductTypes(productTypes.filter(pt => pt.id !== productTypeToDelete.id));
        setSuccess('Product type deleted successfully');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete product type');
      }
    } catch (error) {
      setError('Failed to delete product type');
      console.error('Delete product type error:', error);
    } finally {
      setIsDeletingItem(false);
      setShowProductTypeDeleteModal(false);
      setProductTypeToDelete(null);
    }
  };

  const handleCreateProductType = async (e) => {
    e.preventDefault();
    if (!newProductType.name || !newProductType.unitOfMeasure) return;

    try {
      const token = localStorage.getItem('token');
      const attributes = {
        requiredFields: newAttr.required,
        optionalFields: newAttr.optional
      };
      
      let url = '/api/product-types';
      let method = 'POST';
      
      if (editingProductType) {
        // Check if we're updating an existing product type
        url = `/api/product-types/${editingProductType.id}`;
        method = 'PUT';
      }
        
      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newProductType,
          attributes
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (editingProductType) {
          // Update existing product type in the list
          setProductTypes(productTypes.map(pt => 
            pt.id === editingProductType.id ? {...pt, ...data.productType} : pt
          ));
          setSuccess('Product type updated successfully');
        } else {
          // Add new product type to the list
          setProductTypes([...productTypes, data.productType]);
          setSuccess('Product type created successfully');
        }
        
        // Reset form
        setNewProductType({ name: '', unitOfMeasure: '' });
        setNewAttr({ required: [], optional: [], reqInput: '', optInput: '', reqBulk: '', optBulk: '' });
        setEditingProductType(null);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || `Failed to ${editingProductType ? 'update' : 'create'} product type`);
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      setError('Failed to create product type');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleEditCategory = (category) => {
    setRenamingCategory(category);
    setRenameForm({
      from: category.name,
      to: category.name
    });
    setNewCategory(category.name); // Set in the input field
    // Scroll to the form
    document.querySelector('.create-form').scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteCategory = async (category) => {
    setCategoryToDelete(category);
    setShowCategoryDeleteModal(true);
  };
  
  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    
    try {
      setIsDeletingItem(true);
      const categoryName = typeof categoryToDelete === 'string' ? categoryToDelete : categoryToDelete.name;
      
      // Use the deleteCategory function from api.js
      const response = await fetch('/api/categories', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: categoryName, reassignTo: 'General' })
      });

      if (response.ok) {
        setCategories(categories.filter(cat => 
          typeof cat === 'string' ? cat !== categoryName : cat.name !== categoryName
        ));
        setSuccess('Category deleted successfully');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete category');
      }
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message || 'Failed to delete category');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsDeletingItem(false);
      setShowCategoryDeleteModal(false);
      setCategoryToDelete(null);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    try {
      if (renamingCategory) {
        // If we're editing, this is a rename operation
        const data = await fetch('/api/categories/rename', {
          method: 'PUT', // Backend expects PUT for rename
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: renamingCategory.name,
            to: newCategory.trim()
          })
        });
        
        if (data.ok) {
          // Update the local state by replacing the category name
          setCategories(categories.map(cat => 
            typeof cat === 'string' ? 
              (cat === renamingCategory.name ? newCategory.trim() : cat) : 
              (cat.name === renamingCategory.name ? {...cat, name: newCategory.trim()} : cat)
          ));
          setSuccess('Category renamed successfully');
        } else {
          setError('Failed to rename category');
        }
        setRenamingCategory(null);
      } else {
        // Regular create operation
        const data = await createCategory({ name: newCategory.trim() });
        setCategories([...categories, data.category]);
        setSuccess('Category created successfully');
      }
      setNewCategory('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message || 'Failed to save category');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Helper functions
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'owner': return 'role-owner';
      case 'manager': return 'role-manager';
      case 'staff': return 'role-staff';
      default: return 'role-default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !selectedRole || user.role === selectedRole;
    const matchesStatus = !selectedStatus || user.isActive.toString() === selectedStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Tab configuration
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <MdDashboard />, available: true },
    { id: 'locations', label: 'Locations', icon: <MdLocationOn />, available: true },
    { id: 'users', label: 'Users', icon: <MdPeople />, available: isOwner },
    { id: 'admin', label: 'Admin Settings', icon: <MdSettings />, available: isAdmin }
  ].filter(tab => tab.available);

  return (
    <div className="settings-page">
      <PageHeader
        icon={<MdSettings />}
        title="Settings & Configuration"
        subtitle="Manage your system settings in one place"
      />
      
      <div className="settings-container">
        {/* Tab Navigation */}
        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Messages */}
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Tab Content */}
        <div className="tab-content">
          {loading && <div className="loading-spinner">Loading...</div>}

          {/* Overview Tab */}
          {activeTab === 'overview' && !loading && (
            <div className="overview-tab">
              <div className="overview-grid">
                {/* Locations Summary */}
                <div className="overview-card">
                  <div className="card-header">
                    <MdLocationOn className="card-icon" />
                    <h3>Locations</h3>
                  </div>
                  <div className="card-stats">
                    <div className="stat">
                      <span className="stat-value">{locations.length}</span>
                      <span className="stat-label">Total Locations</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">
                        {locations.filter(loc => inventoryData[loc.id]?.some(item => parseFloat(item.quantitySqm || 0) > 0)).length}
                      </span>
                      <span className="stat-label">With Stock</span>
                    </div>
                  </div>
                  <button 
                    className="card-action"
                    onClick={() => setActiveTab('locations')}
                  >
                    Manage Locations →
                  </button>
                </div>

                {/* Users Summary */}
                {isOwner && (
                  <div className="overview-card">
                    <div className="card-header">
                      <MdPeople className="card-icon" />
                      <h3>Users</h3>
                    </div>
                    <div className="card-stats">
                      <div className="stat">
                        <span className="stat-value">{users.length}</span>
                        <span className="stat-label">Total Users</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">
                          {users.filter(u => u.isActive).length}
                        </span>
                        <span className="stat-label">Active Users</span>
                      </div>
                    </div>
                    <button 
                      className="card-action"
                      onClick={() => setActiveTab('users')}
                    >
                      Manage Users →
                    </button>
                  </div>
                )}

                {/* Admin Settings Summary */}
                {isAdmin && (
                  <div className="overview-card">
                    <div className="card-header">
                      <MdSettings className="card-icon" />
                      <h3>System Configuration</h3>
                    </div>
                    <div className="card-stats">
                      <div className="stat">
                        <span className="stat-value">{productTypes.length}</span>
                        <span className="stat-label">Product Types</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{categories.length}</span>
                        <span className="stat-label">Categories</span>
                      </div>
                    </div>
                    <button 
                      className="card-action"
                      onClick={() => setActiveTab('admin')}
                    >
                      Configure System →
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <h3>Quick Actions</h3>
                <div className="actions-grid">
                  <button 
                    className="quick-action-btn"
                    onClick={() => {
                      setActiveTab('locations');
                      setShowAddLocationModal(true);
                    }}
                  >
                    <MdLocationOn />
                    <span>Add Location</span>
                  </button>
                  
                  {isOwner && (
                    <button 
                      className="quick-action-btn"
                      onClick={() => {
                        setActiveTab('users');
                        setShowEditor(true);
                        setEditingUser(null);
                      }}
                    >
                      <MdPeople />
                      <span>Add User</span>
                    </button>
                  )}
                  
                  {isAdmin && (
                    <>
                      <button 
                        className="quick-action-btn"
                        onClick={() => setActiveTab('admin')}
                      >
                        <MdSettings />
                        <span>Add Product Type</span>
                      </button>
                      <button 
                        className="quick-action-btn"
                        onClick={() => setActiveTab('admin')}
                      >
                        <MdSettings />
                        <span>Add Category</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Locations Tab */}
          {activeTab === 'locations' && !loading && (
            <div className="locations-tab">
              <div className="tab-header">
                <h2>Manage Locations</h2>
                <button
                  className="primary-button"
                  onClick={() => setShowAddLocationModal(true)}
                >
                  + Add Location
                </button>
              </div>

              <div className="locations-grid">
                {locations.map(location => (
                  <div key={location.id} className="location-card">
                    <div className="location-header">
                      <h3>{location.name}</h3>
                      {location.address && <p className="location-address">{location.address}</p>}
                    </div>
                    
                    <div className="location-stats">
                      <div className="stat-item">
                        <span className="stat-label">Products In Stock</span>
                        <span className="stat-value">
                          {inventoryData[location.id]?.filter(item => parseFloat(item.quantitySqm || 0) > 0).length || 0}
                        </span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">Total Value</span>
                        <span className="stat-value">
                          ₦{inventoryData[location.id]
                            ?.reduce((total, item) => total + (parseFloat(item.quantitySqm || 0) * parseFloat(item.product?.price || 0)), 0)
                            .toLocaleString() || '0'}
                        </span>
                      </div>
                    </div>

                    <div className="location-actions">
                      <button 
                        className="action-btn view"
                        onClick={() => setSelectedLocation(selectedLocation === location.id ? null : location.id)}
                      >
                        {selectedLocation === location.id ? 'Hide' : 'View'} Inventory
                      </button>
                      <button 
                        className="action-btn edit"
                        onClick={() => handleEditLocation(location)}
                      >
                        Edit
                      </button>
                      <button 
                        className="action-btn delete"
                        onClick={() => handleDeleteLocation(location.id)}
                        disabled={inventoryData[location.id]?.some(item => parseFloat(item.quantitySqm || 0) > 0)}
                      >
                        Delete
                      </button>
                    </div>

                    {/* Inventory Details */}
                    {selectedLocation === location.id && (
                      <div className="inventory-details">
                        {inventoryData[location.id]?.filter(item => parseFloat(item.quantitySqm || 0) > 0).length > 0 ? (
                          <div className="inventory-list">
                            {inventoryData[location.id]
                              .filter(item => parseFloat(item.quantitySqm || 0) > 0)
                              .map(item => (
                                <div key={item.id} className="inventory-item">
                                  <div className="item-info">
                                    <span className="item-name">{item.product?.name}</span>
                                    <span className="item-category">{item.product?.category}</span>
                                  </div>
                                  <div className="item-quantity">
                                    {parseFloat(item.quantitySqm || 0).toLocaleString()} {item.product?.productType?.unitOfMeasure || 'pcs'}
                                  </div>
                                </div>
                            ))}
                          </div>
                        ) : (
                          <p className="no-inventory">No products in stock</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add/Edit Location Modal */}
              {showAddLocationModal && (
                <div className="modal-overlay" onClick={() => setShowAddLocationModal(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h3>{editingLocation ? 'Edit Location' : 'Add New Location'}</h3>
                    <form onSubmit={handleLocationSubmit}>
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
                      <div className="modal-actions">
                        <button type="submit" className="primary-button">
                          {editingLocation ? 'Update' : 'Add'} Location
                        </button>
                        <button 
                          type="button" 
                          className="secondary-button"
                          onClick={() => {
                            setShowAddLocationModal(false);
                            setEditingLocation(null);
                            setNewLocation({ name: '', address: '' });
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && isOwner && !loading && (
            <div className="users-tab">
              <div className="tab-header">
                <h2>Manage Users</h2>
                <button
                  className="primary-button"
                  onClick={() => {
                    setEditingUser(null);
                    setShowEditor(true);
                  }}
                >
                  + Add User
                </button>
              </div>

              <div className="users-filters">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Roles</option>
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id}>
                        <td>
                          <div className="user-info">
                            <strong>{user.firstName} {user.lastName}</strong>
                            <small>{user.email}</small>
                          </div>
                        </td>
                        <td>
                          <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>{user.location?.name || 'No Location'}</td>
                        <td>
                          <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>{formatDate(user.createdAt)}</td>
                        <td>
                          <div className="table-actions">
                            <button 
                              className="action-btn edit"
                              onClick={() => {
                                setEditingUser(user);
                                setShowEditor(true);
                              }}
                            >
                              Edit
                            </button>
                            <button 
                              className={`action-btn ${user.isActive ? 'deactivate' : 'activate'}`}
                              onClick={() => handleToggleUserStatus(user.id, user.isActive, `${user.firstName} ${user.lastName}`)}
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredUsers.length === 0 && (
                  <div className="no-data">
                    <p>No users found matching your criteria.</p>
                  </div>
                )}
              </div>

              {/* User Editor Modal */}
              {showEditor && (
                <UserEditor
                  user={editingUser}
                  roles={roles}
                  locations={locations}
                  onSave={handleSaveUser}
                  onCancel={() => {
                    setShowEditor(false);
                    setEditingUser(null);
                  }}
                />
              )}
            </div>
          )}

          {/* Admin Settings Tab */}
          {activeTab === 'admin' && isAdmin && !loading && (
            <div className="admin-tab">
              <div className="admin-sections">
                {/* Product Types Section */}
                <div className="admin-section">
                  <h2>Product Types</h2>
                  
                  <div className="create-form">
                    <form onSubmit={handleCreateProductType}>
                      <div className="form-row">
                        <input
                          type="text"
                          placeholder="Product Type Name"
                          value={newProductType.name}
                          onChange={(e) => setNewProductType({
                            ...newProductType,
                            name: e.target.value
                          })}
                          required
                        />
                        <select
                          value={newProductType.unitOfMeasure}
                          onChange={(e) => setNewProductType({
                            ...newProductType,
                            unitOfMeasure: e.target.value
                          })}
                          required
                        >
                          <option value="">Select Unit</option>
                          <option value="pcs">Pieces (pcs)</option>
                          <option value="sqm">Square Meters (sqm)</option>
                          <option value="m">Meters (m)</option>
                          <option value="kg">Kilograms (kg)</option>
                          <option value="l">Liters (l)</option>
                        </select>
                        <button type="submit" className="primary-button">
                          {editingProductType ? 'Update Type' : 'Add Type'}
                        </button>
                        {editingProductType && (
                          <button 
                            type="button" 
                            className="secondary-button"
                            onClick={() => {
                              setEditingProductType(null);
                              setNewProductType({ name: '', unitOfMeasure: '' });
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  <div className="items-grid">
                    {productTypes.map(productType => (
                      <div key={productType.id} className="admin-item-card">
                        <h4>{productType.name}</h4>
                        <p>Unit: {productType.unitOfMeasure}</p>
                        <p>Status: {productType.isActive ? 'Active' : 'Inactive'}</p>
                        <div className="admin-item-actions">
                          <button 
                            className="action-btn edit"
                            onClick={() => handleEditProductType(productType)}
                          >
                            <MdEdit size={14} /> Edit
                          </button>
                          <button 
                            className="action-btn delete"
                            onClick={() => handleDeleteProductType(productType)}
                          >
                            <MdDelete size={14} /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Categories Section */}
                <div className="admin-section">
                  <h2>Categories</h2>
                  
                  <div className="create-form">
                    <form onSubmit={handleCreateCategory}>
                      <div className="form-row">
                        <input
                          type="text"
                          placeholder="Category Name"
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          required
                        />
                        <button type="submit" className="primary-button">
                          {renamingCategory ? 'Update Category' : 'Add Category'}
                        </button>
                        {renamingCategory && (
                          <button 
                            type="button" 
                            className="secondary-button"
                            onClick={() => {
                              setRenamingCategory(null);
                              setNewCategory('');
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  <div className="items-grid">
                    {categories.map(category => {
                      const categoryName = typeof category === 'string' ? category : category.name;
                      return (
                        <div key={categoryName} className="admin-item-card">
                          <h4>{categoryName}</h4>
                          <div className="admin-item-actions">
                            <button 
                              className="action-btn edit"
                              onClick={() => handleEditCategory({ name: categoryName })}
                            >
                              <MdEdit size={14} /> Edit
                            </button>
                            <button 
                              className="action-btn delete"
                              onClick={() => handleDeleteCategory({ name: categoryName })}
                            >
                              <MdDelete size={14} /> Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Modals */}
      {showProductTypeDeleteModal && (
        <AdminDeleteModal
          isOpen={showProductTypeDeleteModal}
          onConfirm={confirmDeleteProductType}
          onCancel={() => setShowProductTypeDeleteModal(false)}
          itemToDelete={productTypeToDelete}
          itemType="Product Type"
          isDeleting={isDeletingItem}
        />
      )}
      
      {showCategoryDeleteModal && (
        <AdminDeleteModal
          isOpen={showCategoryDeleteModal}
          onConfirm={confirmDeleteCategory}
          onCancel={() => setShowCategoryDeleteModal(false)}
          itemToDelete={categoryToDelete}
          itemType="Category"
          isDeleting={isDeletingItem}
        />
      )}
    </div>
  );
};

export default SettingsPage;