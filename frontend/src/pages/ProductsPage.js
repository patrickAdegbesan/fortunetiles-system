import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { fetchProducts, createProduct, updateProduct, deleteProduct, fetchCategories, fetchInventory, fetchLocations } from '../services/api';
import SidebarNav from '../components/SidebarNav';
import PageHeader from '../components/PageHeader';
import ProductEditor from '../components/ProductEditor';
import MoneyValue from '../components/MoneyValue';
import QuickViewModal from '../components/QuickViewModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import '../styles/ProductsPage.css';
import {
  FaBox,
  FaCubes,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaImage,
  FaTags,
  FaFilter,
  FaSearch,
  FaTh,
  FaList,
  FaDollarSign,
  FaStore,
  FaWarehouse,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaUpload,
  FaDownload,
  FaBarcode,
  FaCube,
  FaLayerGroup,
  FaSortAmountDown,
  FaSortAmountUp
} from 'react-icons/fa';

import { spanishTileProducts, bulkImportTiles } from '../utils/bulkProductImport';

// Constants for sort options to improve maintainability
const SORT_OPTIONS = [
  { value: 'name', label: 'Sort by Name' },
  { value: 'price', label: 'Sort by Price' },
  { value: 'category', label: 'Sort by Category' },
  { value: 'stock', label: 'Sort by Stock', requiresLocation: true }
];

// Memoized SortControls component for better performance and reusability
const SortControls = memo(({
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  selectedLocation
}) => {
  // Error handling: validate sortBy against available options
  const validSortBy = SORT_OPTIONS.some(opt => opt.value === sortBy) ? sortBy : 'name';

  const handleSortByChange = (e) => {
    const value = e.target.value;
    // Additional validation before setting
    if (SORT_OPTIONS.some(opt => opt.value === value)) {
      setSortBy(value);
    }
  };

  return (
    <div className="sort-controls" role="group" aria-label="Product sorting controls">
      <label htmlFor="sort-select" className="sr-only">Sort products by</label>
      <select
        id="sort-select"
        value={validSortBy}
        onChange={handleSortByChange}
        className="sort-select"
        aria-describedby="sort-order-btn"
      >
        {SORT_OPTIONS.map(option =>
          !option.requiresLocation || selectedLocation ? (
            <option key={option.value} value={option.value}>{option.label}</option>
          ) : null
        )}
      </select>
      <button
        id="sort-order-btn"
        className="sort-order-btn"
        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        aria-label={`Toggle sort order to ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
        title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
      >
        {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />}
      </button>
    </div>
  );
});

// Prop validation comments (since PropTypes not available)
// SortControls.propTypes = {
//   sortBy: PropTypes.oneOf(['name', 'price', 'category', 'stock']).isRequired,
//   setSortBy: PropTypes.func.isRequired,
//   sortOrder: PropTypes.oneOf(['asc', 'desc']).isRequired,
//   setSortOrder: PropTypes.func.isRequired,
//   selectedLocation: PropTypes.string
// };

// Memoized ProductCard component for better performance
const ProductCard = memo(({
  product,
  availableQty,
  onEdit,
  onDelete,
  onView,
  isDeleting = false,
  isEditing = false,
  isViewing = false
}) => (
  <div className="sale-product-card">
    {availableQty <= 0 && (
      <div className="out-of-stock-badge">
        <FaExclamationTriangle size={12} />
        Out of Stock
      </div>
    )}
    {availableQty > 0 && availableQty <= 10 && (
      <div className="low-stock-badge">
        <FaExclamationTriangle size={12} />
        Low Stock
      </div>
    )}
    {availableQty > 10 && (
      <div className="in-stock-badge">
        <FaCheckCircle size={12} />
        In Stock
      </div>
    )}

    <div className="product-image">
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
        />
      ) : (
        <div className="image-placeholder">
          <FaCube size={32} />
        </div>
      )}
    </div>

    <div className="product-info">
      <h4 className="product-name" title={product.name}>
        {product.name}
      </h4>

      {product.category && (
        <div className="product-category">
          <FaTags size={10} />
          {product.category}
        </div>
      )}

      <div className="product-attributes">
        {Object.entries(product.customAttributes || {}).slice(0, 2).map(([key, value], i) => (
          <span key={key} className="attribute-tag">
            {String(value).substring(0, 15)}
          </span>
        ))}
      </div>

      <div className="price-stock-info">
        <div className="product-price">
          <MoneyValue amount={product.price || 0} sensitive={false} />
        </div>
        <div className="product-stock">
          <FaStore size={10} />
          {availableQty} {product.unitOfMeasure || 'pc'}
        </div>
      </div>
    </div>

    <div className="product-actions">
      <button
        className="edit-btn"
        onClick={() => onEdit(product)}
        title="Edit Product"
      >
        <FaEdit size={12} />
        Edit
      </button>
      <button
        className="view-btn"
        onClick={() => onView(product)}
        title="View Details"
      >
        <FaEye size={12} />
        View
      </button>
      <button
        className={`delete-btn ${isDeleting ? 'loading' : ''}`}
        onClick={() => !isDeleting && onDelete(product.id)}
        disabled={isDeleting}
        title={isDeleting ? "Deleting..." : "Delete Product"}
        aria-label={isDeleting ? "Deleting product..." : `Delete ${product.name}`}
      >
        {isDeleting ? <div className="btn-spinner" /> : <FaTrash size={12} />}
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  </div>
));

// Memoized TableRow component for table view
const ProductTableRow = memo(({
  product,
  availableQty,
  onEdit,
  onDelete,
  onView,
  isDeleting = false,
  isEditing = false,
  isViewing = false
}) => (
  <tr>
    <td>
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.name} className="product-image" />
      ) : (
        <div className="image-placeholder">
          <FaCube size={16} />
        </div>
      )}
    </td>
    <td>
      <div className="table-product-info">
        <strong>{product.name}</strong>
        <small><FaTags size={8} /> {product.category || 'Uncategorized'}</small>
      </div>
    </td>
    <td>
      <div className="table-attributes">
        {Object.entries(product.customAttributes || {}).slice(0, 3).map(([key, value]) => (
          <div key={key} className="table-attribute">
            <span className="attribute-label">{key}:</span>
            <span className="attribute-value">{String(value).substring(0, 10)}</span>
          </div>
        ))}
      </div>
    </td>
    <td>
      <MoneyValue amount={product.price || 0} sensitive={false} />
    </td>
    <td>
      <div className={`inventory-status ${availableQty <= 0 ? 'out' : availableQty <= 10 ? 'low' : 'high'}`}>
        <FaWarehouse size={10} />
        {availableQty} {product.unitOfMeasure || 'pcs'}
      </div>
    </td>
    <td>
      <div className="table-actions">
        <button className="edit-btn-small" onClick={() => onEdit(product)}>
          <FaEdit size={10} />
        </button>
        <button className="edit-btn-small" onClick={() => onView(product)}>
          <FaEye size={10} />
        </button>
        <button
          className={`delete-btn-small ${isDeleting ? 'loading' : ''}`}
          onClick={() => !isDeleting && onDelete(product.id)}
          disabled={isDeleting}
          title={isDeleting ? "Deleting..." : "Delete Product"}
          aria-label={isDeleting ? "Deleting product..." : `Delete ${product.name}`}
        >
          {isDeleting ? <div className="btn-spinner-small" /> : <FaTrash size={10} />}
        </button>
      </div>
    </td>
  </tr>
));

const ProductsPage = () => {
  // State management
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Inventory context
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [inventory, setInventory] = useState([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [showQuickView, setShowQuickView] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [recentlyDeleted, setRecentlyDeleted] = useState([]);

  // Operation tracking for better UX
  const [operationInProgress, setOperationInProgress] = useState({
    delete: new Set(),
    edit: false,
    create: false,
    view: false
  });

  // Toast notifications state
  const [toasts, setToasts] = useState([]);
  const [toastId, setToastId] = useState(0);

  // Toast notification helper
  const showToast = (message, type = 'info', duration = 4000) => {
    const id = toastId;
    setToastId(prev => prev + 1);

    const toast = {
      id,
      message,
      type, // 'success', 'error', 'warning', 'info'
      duration
    };

    setToasts(prev => [...prev, toast]);

    // Auto-remove toast after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);

    return id;
  };

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

  // Optimized inventory map for better performance
  const inventoryMap = useMemo(() => {
    const map = new Map();
    inventory.forEach(inv => {
      const qty = inv.quantity ?? inv.quantitySqm ?? inv.quantity_sqm;
      map.set(inv.productId, Number(qty) || 0);
    });
    return map;
  }, [inventory]);

  const getAvailableQuantity = useCallback((productId) => {
    return inventoryMap.get(productId) || 0;
  }, [inventoryMap]);

  // Memoized filtered and sorted products for better performance
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           Object.values(product.customAttributes || {}).some(value => 
                             value.toString().toLowerCase().includes(searchTerm.toLowerCase())
                           ) ||
                           product.supplierCode?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      const matchesStock = !inStockOnly || !selectedLocation || getAvailableQuantity(product.id) > 0;

      return matchesSearch && matchesCategory && matchesStock;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'price':
          aValue = parseFloat(a.price) || 0;
          bValue = parseFloat(b.price) || 0;
          break;
        case 'category':
          aValue = a.category || '';
          bValue = b.category || '';
          break;
        case 'stock':
          aValue = getAvailableQuantity(a.id);
          bValue = getAvailableQuantity(b.id);
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, searchTerm, selectedCategory, inStockOnly, selectedLocation, getAvailableQuantity, sortBy, sortOrder]);

  // Statistics for the header
  const productStats = useMemo(() => ({
    total: products.length,
    filtered: filteredAndSortedProducts.length,
    categories: new Set(products.map(p => p.category).filter(Boolean)).size,
    inStock: selectedLocation ? products.filter(p => getAvailableQuantity(p.id) > 0).length : 0,
    lowStock: selectedLocation ? products.filter(p => {
      const qty = getAvailableQuantity(p.id);
      return qty > 0 && qty <= 10;
    }).length : 0,
    outOfStock: selectedLocation ? products.filter(p => getAvailableQuantity(p.id) === 0).length : 0
  }), [products, filteredAndSortedProducts.length, selectedLocation, getAvailableQuantity]);

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

  const handleDeleteProduct = (productId) => {
    const product = products.find(p => p.id === productId);
    if (!product) {
      showToast('Product not found', 'error');
      return;
    }

    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    const productId = productToDelete.id;
    const productName = productToDelete.name;

    // Add to operation tracking
    setOperationInProgress(prev => ({
      ...prev,
      delete: new Set([...prev.delete, productId])
    }));

    try {
      await deleteProduct(productId);

      // Store for undo functionality
      const deletedProduct = { ...productToDelete, deletedAt: Date.now() };
      setRecentlyDeleted(prev => [deletedProduct, ...prev.slice(0, 4)]); // Keep last 5

      showToast(
        <div className="toast-with-undo">
          <span>"{productName}" has been archived successfully</span>
          <button
            className="undo-btn"
            onClick={() => undoDelete(deletedProduct)}
          >
            Undo
          </button>
        </div>,
        'success',
        8000
      );

      loadProducts();
      setShowDeleteModal(false);
      setProductToDelete(null);
    } catch (error) {
      console.error('Delete product error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to archive product';
      showToast(`Failed to archive "${productName}": ${errorMessage}`, 'error', 6000);
    } finally {
      // Remove from operation tracking
      setOperationInProgress(prev => ({
        ...prev,
        delete: new Set([...prev.delete].filter(id => id !== productId))
      }));
    }
  };

  const undoDelete = async (deletedProduct) => {
    try {
      // Note: This assumes there's an API endpoint to restore products
      // For now, we'll show a message that undo is not implemented
      showToast('Undo functionality requires backend support. Product remains archived.', 'warning', 5000);

      // Remove from recently deleted
      setRecentlyDeleted(prev => prev.filter(p => p.id !== deletedProduct.id));
    } catch (error) {
      showToast('Failed to restore product', 'error');
    }
  };

  const handleViewProduct = (product) => {
    setViewingProduct({ ...product, availableQty: getAvailableQuantity(product.id) });
    setShowQuickView(true);
  };

  const handleBulkExport = () => {
    // Get all unique attribute keys from all products
    const attributeKeys = [...new Set(
      filteredAndSortedProducts.flatMap(product =>
        Object.keys(product.customAttributes || {})
      )
    )].sort();

    const csvContent = [
      ['Name', 'Category', 'Price', 'Unit of Measure', 'Supplier Code', ...attributeKeys],
      ...filteredAndSortedProducts.map(product => [
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
  
  const handleBulkImport = async () => {
    if (!window.confirm('You are about to bulk import 195 Spanish tile products. This operation cannot be undone. Continue?')) {
      return;
    }
    
    try {
      setImportLoading(true);
      setError('');
      setSuccess('');
      
      // Set initial progress message
      setSuccess('Starting Spanish tiles import... (this may take several minutes)');
      
      // Create a small wrapper for the API functions needed by the bulkImportTiles function
      const apiWrapper = {
        post: async (url, data) => {
          try {
            // Log the product data we're sending
            console.log('Sending product data:', JSON.stringify(data, null, 2));
            const response = await createProduct(data);
            console.log('API response:', JSON.stringify(response, null, 2));
            return { data: response };
          } catch (error) {
            // Enhanced error logging
            console.error('Error creating product:', {
              message: error.message,
              status: error.response?.status,
              statusText: error.response?.statusText,
              responseData: error.response?.data,
              productName: data.name,
              stack: error.stack
            });
            
            // If backend returned a message, use it
            if (error.response?.data?.message) {
              console.error('Backend error message:', error.response.data.message);
            }
            
            throw error;
          }
        }
      };
      
      // Show a progress counter
      let completed = 0;
      const total = spanishTileProducts.length;
      const updateProgress = () => {
        completed++;
        setSuccess(`Processing Spanish tiles import... (${completed}/${total})`);
      };
      
      // Modify to import in smaller batches to avoid overwhelming the server
      const batchSize = 10;
      const results = [];
      
      for (let i = 0; i < spanishTileProducts.length; i += batchSize) {
        const batch = spanishTileProducts.slice(i, i + batchSize);
        setSuccess(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(spanishTileProducts.length/batchSize)}...`);
        
        // Import this batch
        const batchResults = await bulkImportTiles(batch, apiWrapper);
        results.push(...batchResults);
        
        // Update progress
        setSuccess(`Completed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(spanishTileProducts.length/batchSize)}`);
        
        // Add a delay between batches
        if (i + batchSize < spanishTileProducts.length) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between batches
        }
      }
      
      // Calculate success and failures
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      // Show failures if any
      if (failed > 0) {
        console.error('Failed imports:', results.filter(r => !r.success));
      }
      
      setSuccess(`Successfully imported ${successful} Spanish tile products${failed > 0 ? ` (${failed} failed)` : ''}`);
      loadProducts();
      
    } catch (error) {
      console.error('Bulk import error:', error);
      setError(`Failed to import Spanish tiles: ${error.message || 'Unknown error'}`);
    } finally {
      setImportLoading(false);
    }
  };

  // Removed duplicate inline ProductCard component. Use memoized ProductCard defined above.

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
                <span className="stock-pill" >
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
          <span>Select a location</span>
        )}
      </td>
      <td>
        <div className="table-actions">
          <button
            className="edit-btn-small"
            onClick={() => handleEditProduct(product)}
            title="Edit Product"
          >
            <FaEdit size={10} />
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
      <div className="products-page" style={{ marginLeft: '0', transition: 'margin-left 0.3s ease' }}>
        {/* Enhanced Header */}
        <div className="enhanced-header">
          {/* Header Top Row */}
          <div className="header-top">
            <div className="header-title">
              <FaCubes className="header-icon" />
              <div className="title-content">
                <h1>Product Management</h1>
                <p>Manage your product catalog and inventory levels</p>
              </div>
            </div>
            
            <div className="header-stats">
              <div className="stat-content">
                <FaCube className="stat-ico" />
                <span className="stat-value">{productStats.total}</span>
                <span className="stat-label">Total Products</span>
              </div>
              <div className="stat-content">
                 <FaTags className="stat-ico" />
                  <span className="stat-value">{productStats.categories}</span>
                  <span className="stat-label">Categories</span>
              </div>
              {selectedLocation && (
                <>
                  <div className="stat-card">
                    <FaCheckCircle className="stat-icon in-stock" />
                    <div className="stat-content">
                      <span className="stat-value">{productStats.inStock}</span>
                      <span className="stat-label">In Stock</span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <FaExclamationTriangle className="stat-icon low-stock" />
                    <div className="stat-content">
                      <span className="stat-value">{productStats.lowStock}</span>
                      <span className="stat-label">Low Stock</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Header Bottom Row */}
          <div className="header-bottom">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search products by name, category, or attributes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="enhanced-search-input"
              />
            </div>
            
            <div className="filter-controls">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="enhanced-select"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="enhanced-location-select"
              >
                <option value="">Select Location</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              
              <label className="stock-filter-enhanced">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                />
                <FaFilter size={10} />
                 In stock only
              </label>
            </div>
            
            <div className="filter-control">
              <div className="view-controls">
                <button 
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  <FaTh className="view-icon" />
                  Grid
                </button>
                <button 
                  className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setViewMode('table')}
                >
                  <FaList className="view-icon" />
                  Table
                </button>
              </div>
              
              <div className="sort-controls">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="sort-select"
                >
                  <option value="name">Sort by Name</option>
                  <option value="price">Sort by Price</option>
                  <option value="category">Sort by Category</option>
                  {selectedLocation && <option value="stock">Sort by Stock</option>}
                </select>
                <button
                  className="sort-order-btn"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <FaSortAmountUp /> : <FaSortAmountDown />}
                </button>
              </div>
              
              <div className="primary-actions">
                <button 
                  className="action-btn secondary-action"
                  onClick={handleBulkExport}
                >
                  <FaDownload size={12} />
                  Export
                </button>
                {/* <button 
                  className={`action-btn ${importLoading ? 'loading' : 'secondary-action'}`}
                  onClick={handleBulkImport}
                  disabled={importLoading}
                >
                  {importLoading ? (
                    <>
                      <div className="spinner"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <FaUpload size={12} />
                      Import Tiles
                    </>
                  )}
                </button> */}
                <button 
                  className="action-btn primary-action"
                  onClick={handleCreateProduct}
                >
                  <FaPlus size={12} />
                  Add Product
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Container */}
        <div className="products-container products-container-clean">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {/* Compact Statistics Bar */}
          <div className="compact-stats">
            <span className="compact-stat">
              <FaCube className="compact-icon" /> {productStats.filtered} of {productStats.total} Products
            </span>
            {selectedLocation && (
              <>
                <span className="compact-stat in-stock">
                  <FaCheckCircle className="compact-icon" /> {productStats.inStock} In Stock
                </span>
                <span className="compact-stat low-stock">
                  <FaExclamationTriangle className="compact-icon" /> {productStats.lowStock} Low Stock
                </span>
                <span className="compact-stat out-of-stock">
                  <FaTimesCircle className="compact-icon" /> {productStats.outOfStock} Out of Stock
                </span>
              </>
            )}
          </div>

          {/* Products Display Area */}
          <div className="products-conten">
            {loading ? (
              <div className="loading-state">
                <div className="spinner large"></div>
                <p>Loading products...</p>
              </div>
            ) : filteredAndSortedProducts.length === 0 ? (
              <div className="empty-state">
                <FaCube size={48} className="empty-icon" />
                <h3>No products found</h3>
                <p>
                  {products.length === 0 
                    ? "Start by adding your first product to the catalog."
                    : "Try adjusting your search or filter criteria."
                  }
                </p>
                {products.length === 0 && (
                  <button className="empty-action-btn" onClick={handleCreateProduct}>
                    <FaPlus size={12} />
                    Add Your First Product
                  </button>
                )}
              </div>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="products-grid products-grid-clean">
                    {filteredAndSortedProducts.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        availableQty={getAvailableQuantity(product.id)}
                        onEdit={handleEditProduct}
                        onDelete={handleDeleteProduct}
                        onView={handleViewProduct}
                        isDeleting={operationInProgress.delete.has(product.id)}
                        isEditing={operationInProgress.edit}
                        isViewing={operationInProgress.view}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="table-view-container">
                    <table className="products-table products-table-enhanced">
                      <thead>
                        <tr>
                          <th>Image</th>
                          <th>Product Info</th>
                          <th>Attributes</th>
                          <th className="center">Price</th>
                          {selectedLocation && <th className="center">Stock</th>}
                          <th className="center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedProducts.map(product => (
                          <ProductTableRow
                            key={product.id}
                            product={product}
                            availableQty={getAvailableQuantity(product.id)}
                            onEdit={handleEditProduct}
                            onDelete={handleDeleteProduct}
                            onView={handleViewProduct}
                            isDeleting={operationInProgress.delete.has(product.id)}
                            isEditing={operationInProgress.edit}
                            isViewing={operationInProgress.view}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Product Editor Modal */}
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

        {/* Quick View Modal */}
        {showQuickView && (
          <QuickViewModal
            product={viewingProduct}
            isOpen={showQuickView}
            onRequestClose={() => {
              setShowQuickView(false);
              setViewingProduct(null);
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <DeleteConfirmationModal
            product={productToDelete}
            isOpen={showDeleteModal}
            onConfirm={confirmDeleteProduct}
            onCancel={() => {
              setShowDeleteModal(false);
              setProductToDelete(null);
            }}
            isDeleting={productToDelete ? operationInProgress.delete.has(productToDelete.id) : false}
          />
        )}
      </div>
    </>
  );
};

export default ProductsPage;
