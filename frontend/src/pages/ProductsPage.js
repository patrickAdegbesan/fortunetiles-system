import React, { useState, useEffect, useCallback } from 'react';
import { fetchProducts, createProduct, updateProduct, deleteProduct, fetchCategories, fetchInventory, fetchLocations } from '../services/api';
import SidebarNav from '../components/SidebarNav';
import PageHeader from '../components/PageHeader';
import ProductEditor from '../components/ProductEditor';
import { FaBox } from 'react-icons/fa';
import '../styles/ProductsPage.css';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid or table
  // Inventory context
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [inventory, setInventory] = useState([]);
  const [inStockOnly, setInStockOnly] = useState(false);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        fetchProducts(),
        fetchCategories()
      ]);
      setProducts(productsData.products || []);
      // Handle both string array and object array formats
      const categoryList = categoriesData.categories || [];
      const processedCategories = categoryList.map(cat => 
        typeof cat === 'string' ? cat : cat.name
      );
      setCategories(processedCategories);
    } catch (error) {
      setError('Failed to load products');
      console.error('Load products error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Load locations on mount
  useEffect(() => {
    const loadLocs = async () => {
      try {
        const data = await fetchLocations();
        setLocations(data.locations || []);
      } catch (e) {
        console.error('Load locations error:', e);
      }
    };
    loadLocs();
  }, []);

  // Load inventory whenever selectedLocation changes
  useEffect(() => {
    const loadInv = async () => {
      if (!selectedLocation) { setInventory([]); return; }
      try {
        const data = await fetchInventory({ locationId: selectedLocation });
        setInventory(data.inventory || []);
      } catch (e) {
        console.error('Load inventory error:', e);
      }
    };
    loadInv();
  }, [selectedLocation]);

  const getAvailableQuantity = (productId) => {
    const inv = inventory.find(i => i.productId === productId);
    if (!inv) return 0;
    const qty = inv.quantity ?? inv.quantitySqm ?? inv.quantity_sqm;
    return Number(qty) || 0;
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         Object.values(product.customAttributes || {}).some(value => 
                           value.toString().toLowerCase().includes(searchTerm.toLowerCase())
                         ) ||
                         product.supplierCode?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const matchesStock = !inStockOnly || !selectedLocation || getAvailableQuantity(product.id) > 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setShowEditor(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowEditor(true);
  };

  const handleSaveProduct = async (productData) => {
    try {
      setLoading(true);
      setError('');

      if (editingProduct) {
        await updateProduct(editingProduct.id, productData);
        setSuccess('Product updated successfully');
      } else {
        await createProduct(productData);
        setSuccess('Product created successfully');
      }

      setShowEditor(false);
      setEditingProduct(null);
      loadProducts();

      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Are you sure you want to archive "${productName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteProduct(productId);
      setSuccess('Product archived successfully');
      loadProducts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Delete product error:', error);
      setError(error.response?.data?.message || 'Failed to archive product');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkExport = () => {
    // Get all unique attribute keys from all products
    const attributeKeys = [...new Set(
      filteredProducts.flatMap(product => 
        Object.keys(product.customAttributes || {})
      )
    )].sort();

    const csvContent = [
      ['Name', 'Category', 'Price', 'Unit of Measure', 'Supplier Code', ...attributeKeys],
      ...filteredProducts.map(product => [
        product.name,
        product.category || 'General',
        product.price,
        product.unitOfMeasure || '',
        product.supplierCode || '',
        ...attributeKeys.map(key => (product.customAttributes || {})[key] || '')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fortune-tiles-products-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const ProductCard = ({ product }) => (
    <div style={{ 
      width: '280px', 
      margin: '15px',
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      border: '1px solid #e0e0e0',
      transition: 'transform 0.2s, box-shadow 0.2s'
    }}
    onMouseEnter={(e) => {
      e.target.style.transform = 'translateY(-2px)';
      e.target.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
    }}
    onMouseLeave={(e) => {
      e.target.style.transform = 'translateY(0)';
      e.target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    }}>
      <div className="product-content">
        <div className="product-image" style={{ textAlign: 'center', marginBottom: '15px' }}>
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} style={{ 
              width: '200px', 
              height: '150px', 
              objectFit: 'cover',
              borderRadius: '8px',
              border: '1px solid #ddd'
            }} />
          ) : (
            <div style={{ 
              width: '200px', 
              height: '150px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              backgroundColor: '#f8f9fa', 
              border: '2px dashed #dee2e6',
              borderRadius: '8px',
              margin: '0 auto'
            }}>
              <FaBox size={40} color="#6c757d" />
            </div>
          )}
        </div>
        <div className="product-info">
          <h4 style={{ 
            margin: '0 0 10px 0', 
            fontSize: '16px', 
            fontWeight: '600',
            color: '#2c3e50',
            lineHeight: '1.3'
          }}>{product.name}</h4>
          
          <div className="product-attributes" style={{ marginBottom: '12px' }}>
            {Object.entries(product.customAttributes || {}).slice(0, 3).map(([key, value]) => (
              <div key={key} style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '13px',
                marginBottom: '4px',
                color: '#6c757d'
              }}>
                <span style={{ fontWeight: '500' }}>{key}:</span>
                <span>{String(value).substring(0, 15)}{String(value).length > 15 ? '...' : ''}</span>
              </div>
            ))}
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ 
              backgroundColor: '#e9ecef',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#495057',
              fontWeight: '500'
            }}>
              {product.category || 'General'}
            </span>
          </div>
          
          <p style={{ 
            fontSize: '18px', 
            fontWeight: '700',
            color: '#007bff',
            margin: '8px 0'
          }}>
            ₦{parseFloat(product.price).toLocaleString()}
            {product.unitOfMeasure && <span style={{ fontSize: '14px', fontWeight: '400' }}>/{product.unitOfMeasure}</span>}
          </p>
          {selectedLocation && (
            (() => {
              const qty = getAvailableQuantity(product.id);
              if (qty > 0) {
                return (
                  <p style={{ 
                    fontSize: '12px', 
                    color: '#155724', 
                    backgroundColor: '#d4edda', 
                    display: 'inline-block', 
                    padding: '2px 8px', 
                    borderRadius: '12px',
                    marginTop: '4px'
                  }}>
                    Stock: {qty} {product.unitOfMeasure || 'pc'}
                  </p>
                );
              }
              return (
                <p style={{ 
                  fontSize: '12px', 
                  color: '#721c24', 
                  backgroundColor: '#f8d7da', 
                  display: 'inline-block', 
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  marginTop: '4px'
                }}>
                  No stock at this location
                </p>
              );
            })()
          )}
          
          {product.supplierCode && (
            <p style={{ 
              fontSize: '12px',
              color: '#6c757d',
              margin: '5px 0 0 0',
              fontFamily: 'monospace'
            }}>
              Code: {product.supplierCode}
            </p>
          )}
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginTop: '15px',
        paddingTop: '15px',
        borderTop: '1px solid #e9ecef'
      }}>
        <button 
          style={{
            flex: 1,
            padding: '10px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#007bff'}
          onClick={() => handleEditProduct(product)}
        >
          ✏️ Edit
        </button>
        <button 
          style={{
            flex: 1,
            padding: '10px 15px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
          onClick={() => handleDeleteProduct(product.id, product.name)}
        >
          🗑️ Archive
        </button>
      </div>
    </div>
  );

  const ProductRow = ({ product }) => (
    <tr>
      <td>
        <div className="table-product-info">
          <strong>{product.name}</strong>
          <small>{product.supplierCode}</small>
        </div>
      </td>
      <td>
        <div className="table-attributes">
          {Object.entries(product.customAttributes || {}).map(([key, value]) => (
            <div key={key} className="table-attribute">
              <span className="attribute-label">{key}:</span>
              <span className="attribute-value">{value}</span>
            </div>
          ))}
        </div>
      </td>
      <td>{product.category || 'General'}</td>
      <td>₦{parseFloat(product.price).toLocaleString()}{product.unitOfMeasure ? `/${product.unitOfMeasure}` : ''}</td>
      <td>
        {selectedLocation ? (
          (() => {
            const qty = getAvailableQuantity(product.id);
            if (qty > 0) {
              return (
                <span className="stock-pill" style={{ background: '#e9f7ef', color: '#155724', padding: '2px 8px', borderRadius: '12px' }}>
                  {qty} {product.unitOfMeasure || 'pc'}
                </span>
              );
            }
            return (
              <span className="stock-pill" style={{ background: '#f8d7da', color: '#721c24', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                No stock at this location
              </span>
            );
          })()
        ) : (
          <span style={{ color: '#6c757d', fontSize: '12px' }}>Select a location</span>
        )}
      </td>
      <td>
        <div className="table-actions">
          <button 
            className="edit-btn-small"
            onClick={() => handleEditProduct(product)}
            title="Edit Product"
          >
            <span>✏️</span>
          </button>
          <button 
            className="delete-btn-small"
            onClick={() => handleDeleteProduct(product.id, product.name)}
            title="Archive Product"
          >
            <span>🗑️</span>
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <>
  {/* <SidebarNav /> removed to prevent duplicate sidebar */}
      <div className="products-page" style={{ marginLeft: '0', transition: 'margin-left 0.3s ease' }}>
        <PageHeader
          icon="📦"
          title="Product Management"
          subtitle="Manage your product catalog and inventory"
          stats={[
            { label: 'Total Products', value: products.length },
            { label: 'Categories', value: categories.length }
          ]}
          actions={
            <>
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="category-select"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>

              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="location-select"
              >
                <option value="">Select Location</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>

              <label className="stock-filter">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                />
                In stock only
              </label>

              <button 
                className="action-btn secondary-button"
                onClick={handleBulkExport}
              >
                📊 Export CSV
              </button>
              <button 
                className="action-btn primary-button"
                onClick={handleCreateProduct}
              >
                ➕ Add Product
              </button>
            </>
          }
        />
        
        <div style={{ padding: '20px' }}>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="products-stats" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            marginBottom: '15px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ display: 'flex', gap: '20px' }}>
              <span style={{ fontSize: '14px', color: '#495057', fontWeight: '500' }}>
                Total Products: {filteredProducts.length}
              </span>
              <span style={{ fontSize: '14px', color: '#495057', fontWeight: '500' }}>
                Categories: {categories.length}
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px'
            }}>
              <button 
                style={{
                  padding: '6px 10px',
                  backgroundColor: viewMode === 'grid' ? '#007bff' : '#f8f9fa',
                  color: viewMode === 'grid' ? 'white' : '#495057',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onClick={() => setViewMode('grid')}
              >
                🔲 Grid
              </button>
              <button 
                style={{
                  padding: '6px 10px',
                  backgroundColor: viewMode === 'table' ? '#007bff' : '#f8f9fa',
                  color: viewMode === 'table' ? 'white' : '#495057',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onClick={() => setViewMode('table')}
              >
                📋 Table
              </button>
            </div>
          </div>

          {loading && <div className="loading">Loading products...</div>}

          {!loading && (
            <>
              {viewMode === 'grid' ? (
                <div className="products-grid">
                  {filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="products-table-container">
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Attributes</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(product => (
                        <ProductRow key={product.id} product={product} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {filteredProducts.length === 0 && !loading && (
                <div className="no-products">
                  <p>No products found matching your criteria.</p>
                  <button onClick={handleCreateProduct} className="add-first-product-btn">
                    Add Your First Product
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {showEditor && (
          <ProductEditor
            product={editingProduct}
            onSave={handleSaveProduct}
            onCancel={() => {
              setShowEditor(false);
              setEditingProduct(null);
            }}
          />
        )}
      </div>
    </>
  );
};

export default ProductsPage;
