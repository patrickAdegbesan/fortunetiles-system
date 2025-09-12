import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import SidebarNav from '../components/SidebarNav';
import TopHeader from '../components/TopHeader';
import '../styles/AdminSettings.css';

const AdminSettings = () => {
  const { user } = useContext(AuthContext);
  const [productTypes, setProductTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Product Type form state (Create)
  const [newProductType, setNewProductType] = useState({
    name: '',
    unitOfMeasure: ''
  });
  const [newAttr, setNewAttr] = useState({ required: [], optional: [], reqInput: '', optInput: '' });
  const [editingProductType, setEditingProductType] = useState(null);
  // Lightweight input drafts for adding new attribute chips per product type
  const [attrInputs, setAttrInputs] = useState({}); // { [id]: { req: '', opt: '' } }

  const ensureAttributes = (attributes) => {
    const attrs = attributes || {};
    return {
      requiredFields: Array.isArray(attrs.requiredFields) ? attrs.requiredFields : [],
      optionalFields: Array.isArray(attrs.optionalFields) ? attrs.optionalFields : []
    };
  };

  // Category form state
  const [newCategory, setNewCategory] = useState('');
  const [renamingCategory, setRenamingCategory] = useState(null);
  const [renameForm, setRenameForm] = useState({ from: '', to: '' });
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [deleteForm, setDeleteForm] = useState({ name: '', reassignTo: 'General' });

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'owner')) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadProductTypes(), loadCategories()]);
    } catch (error) {
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const loadProductTypes = async () => {
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
        setProductTypes(data.productTypes);
      } else {
        throw new Error('Failed to fetch product types');
      }
    } catch (error) {
      console.error('Load product types error:', error);
      setError('Failed to load product types');
    }
  };

  const loadCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      } else {
        throw new Error('Failed to fetch categories');
      }
    } catch (error) {
      console.error('Load categories error:', error);
      setError('Failed to load categories');
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
      
      const response = await fetch('/api/product-types', {
        method: 'POST',
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
        setProductTypes([...productTypes, data.productType]);
        setNewProductType({ name: '', unitOfMeasure: '' });
        setNewAttr({ required: [], optional: [], reqInput: '', optInput: '' });
        setSuccess('Product type created successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create product type');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      setError('Failed to create product type');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUpdateProductType = async (id, updates) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/product-types/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const data = await response.json();
        setProductTypes(productTypes.map(pt => 
          pt.id === id ? data.productType : pt
        ));
        setEditingProductType(null);
        setSuccess('Product type updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update product type');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      setError('Failed to update product type');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteProductType = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product type?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/product-types/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setProductTypes(productTypes.filter(pt => pt.id !== id));
        setSuccess('Product type deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete product type');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      setError('Failed to delete product type');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newCategory.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        setCategories([...categories, data.category]);
        setNewCategory('');
        setSuccess('Category created successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create category');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      setError('Failed to create category');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRenameCategory = async (e) => {
    e.preventDefault();
    if (!renameForm.from || !renameForm.to) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/categories/rename', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(renameForm)
      });

      if (response.ok) {
        await loadCategories(); // Reload to get updated list
        setRenamingCategory(null);
        setRenameForm({ from: '', to: '' });
        setSuccess('Category renamed successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to rename category');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      setError('Failed to rename category');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteCategory = async (e) => {
    e.preventDefault();
    if (!deleteForm.name) return;

    if (!window.confirm(`Are you sure you want to delete the "${deleteForm.name}" category? All products will be reassigned to "${deleteForm.reassignTo}".`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/categories', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(deleteForm)
      });

      if (response.ok) {
        await loadCategories(); // Reload to get updated list
        setDeletingCategory(null);
        setDeleteForm({ name: '', reassignTo: 'General' });
        setSuccess('Category deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete category');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      setError('Failed to delete category');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Check if user has admin access
  if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
    return (
      <div className="admin-settings">
        <SidebarNav />
        <div className="main-content">
          <TopHeader title="Admin Settings" />
          <div className="content-area">
            <div className="access-denied">
              <h2>Access Denied</h2>
              <p>You don't have permission to access admin settings.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-settings">
      <SidebarNav />
      <div className="main-content">
        <TopHeader title="Admin Settings" />
        <div className="content-area">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {/* Product Types Section */}
          <div className="admin-section">
            <h2>Product Types</h2>
            
            {/* Create Product Type Form */}
            <div className="create-form">
              <h3>Add New Product Type</h3>
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
                </div>
                <div className="form-row">
                  <textarea
                    placeholder='Attributes JSON: {"requiredFields":["field1","field2"],"optionalFields":["field3"]}'
                    value={newProductType.attributes}
                    onChange={(e) => setNewProductType({
                      ...newProductType,
                      attributes: e.target.value
                    })}
                    rows="3"
                    style={{width: '100%', marginBottom: '10px'}}
                  />
                  <button type="submit" className="btn-primary">Add</button>
                </div>
              </form>
            </div>

            {/* Product Types List */}
            <div className="items-list">
              {loading ? (
                <div className="loading">Loading product types...</div>
              ) : (
                <div className="items-grid">
                  {productTypes.map(productType => (
                    <div key={productType.id} className="item-card">
                      {editingProductType === productType.id ? (
                        <div className="edit-form">
                          <input
                            type="text"
                            defaultValue={productType.name}
                            onBlur={(e) => {
                              if (e.target.value !== productType.name) {
                                handleUpdateProductType(productType.id, { name: e.target.value });
                              } else {
                                setEditingProductType(null);
                              }
                            }}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.target.blur();
                              }
                            }}
                            autoFocus
                          />
                          <select
                            defaultValue={productType.unitOfMeasure}
                            onChange={(e) => handleUpdateProductType(productType.id, { unitOfMeasure: e.target.value })}
                          >
                            <option value="pcs">Pieces (pcs)</option>
                            <option value="sqm">Square Meters (sqm)</option>
                            <option value="m">Meters (m)</option>
                            <option value="kg">Kilograms (kg)</option>
                            <option value="l">Liters (l)</option>
                          </select>

                          {/* Friendly Attributes Editor */}
                          {(() => {
                            const attrs = ensureAttributes(productType.attributes);
                            const inputs = attrInputs[productType.id] || { req: '', opt: '' };

                            const removeField = (kind, field) => {
                              const next = {
                                requiredFields: attrs.requiredFields.filter(f => f !== field),
                                optionalFields: attrs.optionalFields.filter(f => f !== field)
                              };
                              handleUpdateProductType(productType.id, { attributes: next });
                            };

                            const addField = (kind) => {
                              const value = (kind === 'req' ? inputs.req : inputs.opt).trim();
                              if (!value) return;
                              if (kind === 'req') {
                                if (attrs.requiredFields.includes(value)) return;
                              } else {
                                if (attrs.optionalFields.includes(value)) return;
                              }
                              const next = {
                                requiredFields: kind === 'req' ? [...attrs.requiredFields, value] : attrs.requiredFields,
                                optionalFields: kind === 'opt' ? [...attrs.optionalFields, value] : attrs.optionalFields,
                              };
                              handleUpdateProductType(productType.id, { attributes: next });
                              setAttrInputs(prev => ({
                                ...prev,
                                [productType.id]: { ...inputs, [kind]: '' }
                              }));
                            };

                            return (
                              <div style={{ width: '100%', marginTop: 10 }}>
                                <div style={{ marginBottom: 6, fontWeight: 600 }}>Required fields</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                  {attrs.requiredFields.map(field => (
                                    <span key={`req-${field}`} style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 16, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                      {field}
                                      <button type="button" onClick={() => removeField('req', field)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#4f46e5' }}>×</button>
                                    </span>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                                  <input
                                    type="text"
                                    placeholder="Add required field"
                                    value={inputs.req}
                                    onChange={(e) => setAttrInputs(prev => ({ ...prev, [productType.id]: { ...(prev[productType.id] || { req: '', opt: '' }), req: e.target.value } }))}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addField('req'); } }}
                                    style={{ flex: 1 }}
                                  />
                                  <button type="button" className="btn-secondary" onClick={() => addField('req')}>Add</button>
                                </div>

                                <div style={{ marginBottom: 6, fontWeight: 600 }}>Optional fields</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                  {attrs.optionalFields.map(field => (
                                    <span key={`opt-${field}`} style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 16, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                      {field}
                                      <button type="button" onClick={() => removeField('opt', field)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#0891b2' }}>×</button>
                                    </span>
                                  ))}
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <input
                                    type="text"
                                    placeholder="Add optional field"
                                    value={inputs.opt}
                                    onChange={(e) => setAttrInputs(prev => ({ ...prev, [productType.id]: { ...(prev[productType.id] || { req: '', opt: '' }), opt: e.target.value } }))}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addField('opt'); } }}
                                    style={{ flex: 1 }}
                                  />
                                  <button type="button" className="btn-secondary" onClick={() => addField('opt')}>Add</button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="item-info">
                          <h4>{productType.name}</h4>
                          <p>Unit: {productType.unitOfMeasure}</p>
                          <p>Status: {productType.isActive ? 'Active' : 'Inactive'}</p>
                        </div>
                      )}
                      <div className="item-actions">
                        <button
                          onClick={() => setEditingProductType(productType.id)}
                          className="btn-secondary"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProductType(productType.id)}
                          className="btn-danger"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Categories Section */}
          <div className="admin-section">
            <h2>Categories</h2>
            
            {/* Create Category Form */}
            <div className="create-form">
              <h3>Add New Category</h3>
              <form onSubmit={handleCreateCategory}>
                <div className="form-row">
                  <input
                    type="text"
                    placeholder="Category Name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn-primary">Add</button>
                </div>
              </form>
            </div>

            {/* Categories List */}
            <div className="items-list">
              {loading ? (
                <div className="loading">Loading categories...</div>
              ) : (
                <div className="items-grid">
                  {categories.map(category => (
                    <div key={category.name} className="item-card">
                      <div className="item-info">
                        <h4>{category.name}</h4>
                      </div>
                      <div className="item-actions">
                        <button
                          onClick={() => {
                            setRenamingCategory(category.name);
                            setRenameForm({ from: category.name, to: '' });
                          }}
                          className="btn-secondary"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => {
                            setDeletingCategory(category.name);
                            setDeleteForm({ name: category.name, reassignTo: 'General' });
                          }}
                          className="btn-danger"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rename Category Modal */}
            {renamingCategory && (
              <div className="modal-overlay">
                <div className="modal">
                  <h3>Rename Category</h3>
                  <form onSubmit={handleRenameCategory}>
                    <div className="form-group">
                      <label>From:</label>
                      <input
                        type="text"
                        value={renameForm.from}
                        readOnly
                      />
                    </div>
                    <div className="form-group">
                      <label>To:</label>
                      <input
                        type="text"
                        value={renameForm.to}
                        onChange={(e) => setRenameForm({
                          ...renameForm,
                          to: e.target.value
                        })}
                        required
                        autoFocus
                      />
                    </div>
                    <div className="modal-actions">
                      <button type="submit" className="btn-primary">Rename</button>
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingCategory(null);
                          setRenameForm({ from: '', to: '' });
                        }}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Delete Category Modal */}
            {deletingCategory && (
              <div className="modal-overlay">
                <div className="modal">
                  <h3>Delete Category</h3>
                  <form onSubmit={handleDeleteCategory}>
                    <div className="form-group">
                      <label>Category to delete:</label>
                      <input
                        type="text"
                        value={deleteForm.name}
                        readOnly
                      />
                    </div>
                    <div className="form-group">
                      <label>Reassign products to:</label>
                      <select
                        value={deleteForm.reassignTo}
                        onChange={(e) => setDeleteForm({
                          ...deleteForm,
                          reassignTo: e.target.value
                        })}
                      >
                        <option value="General">General</option>
                        {categories
                          .filter(cat => cat.name !== deleteForm.name)
                          .map(cat => (
                            <option key={cat.name} value={cat.name}>
                              {cat.name}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                    <div className="modal-actions">
                      <button type="submit" className="btn-danger">Delete</button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingCategory(null);
                          setDeleteForm({ name: '', reassignTo: 'General' });
                        }}
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
