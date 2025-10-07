import React, { useState, useEffect, useContext, useCallback, useMemo, memo } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { fetchProducts, fetchInventory, fetchLocations, createSale, fetchSaleById } from '../services/api';
import Receipt from '../components/Receipt';
import { 
  FaBox, 
  FaPlus, 
  FaMinus, 
  FaTrash, 
  FaEye, 
  FaSearch,
  FaMapMarkerAlt,
  FaTh,
  FaList,
  FaShoppingCart,
  FaCreditCard,
  FaUser,
  FaPhone,
  FaDollarSign,
  FaCheck,
  FaExclamationTriangle,
  FaStore,
  FaTags,
  FaCube
} from 'react-icons/fa';
import '../styles/SalePage.css';
import QuickViewModal from '../components/QuickViewModal';
import MoneyValue from '../components/MoneyValue';

// Memoized ProductCard component for better performance
const ProductCard = memo(({ 
  product, 
  availableQty, 
  inCart, 
  onAddToCart, 
  onQuickView 
}) => (
  <div className="sale-product-card">
    {availableQty <= 0 && (
      <div className="out-of-stock-badge">
        <FaExclamationTriangle size={12} />
        Out of Stock
      </div>
    )}
    {inCart && inCart.quantity > 0 && (
      <div className="in-cart-badge">
        <FaShoppingCart size={10} />
        {inCart.quantity}
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
          <FaDollarSign size={12} />
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
        className={`add-btn ${availableQty <= 0 ? 'disabled' : ''}`}
        onClick={() => onAddToCart(product)}
        disabled={availableQty <= 0 || (inCart && inCart.quantity >= availableQty)}
      >
        {availableQty <= 0 ? (
          <>
            <FaExclamationTriangle size={12} />
            Out of Stock
          </>
        ) : (
          <>
            <FaPlus size={12} />
            Add to Cart
          </>
        )}
      </button>
      <button
        className="view-btn"
        onClick={() => onQuickView(product)}
      >
        <FaEye size={12} />
      </button>
    </div>
  </div>
));

// Memoized CartItem component
const CartItem = memo(({ 
  item, 
  onUpdateQuantity, 
  onRemove 
}) => (
  <div className="cart-item-enhanced">
    <div className="item-details">
      <div className="item-name">{item.productName}</div>
      <div className="item-price">
        <FaDollarSign size={10} />
        <MoneyValue amount={item.price} sensitive={false} />
        {item.unitOfMeasure && <span className="unit">per {item.unitOfMeasure}</span>}
      </div>
      <div className="item-subtotal">
        Subtotal: <MoneyValue amount={item.price * item.quantity} sensitive={false} />
      </div>
    </div>
    
    <div className="quantity-controls-enhanced">
      <button
        className="qty-btn decrease"
        onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
        disabled={item.quantity <= 1}
      >
        <FaMinus size={10} />
      </button>
      <span className="quantity-display">{item.quantity}</span>
      <button
        className="qty-btn increase"
        onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
      >
        <FaPlus size={10} />
      </button>
      <button
        className="remove-btn"
        onClick={() => onRemove(item.productId)}
        title="Remove item"
      >
        <FaTrash size={10} />
      </button>
    </div>
  </div>
));

const SalePage = () => {
  // eslint-disable-next-line no-unused-vars
  const { user } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid or table
  const [discountType, setDiscountType] = useState(''); // 'amount' or 'percentage'
  const [discountValue, setDiscountValue] = useState('');

  const loadInventory = useCallback(async () => {
    try {
      const inventoryData = await fetchInventory({ locationId: selectedLocation });
      setInventory(inventoryData.inventory || []);
    } catch (error) {
      setError('Failed to load inventory');
      console.error('Load inventory error:', error);
    }
  }, [selectedLocation]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      loadInventory();
    }
  }, [selectedLocation, loadInventory]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [productsData, locationsData] = await Promise.all([
        fetchProducts(),
        fetchLocations()
      ]);
      setProducts(productsData.products || []);
      setLocations(locationsData.locations || []);
    } catch (error) {
      setError('Failed to load initial data');
      console.error('Load initial data error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Memoized inventory lookup for better performance
  const inventoryMap = useMemo(() => {
    const map = new Map();
    inventory.forEach(item => {
      // Handle different quantity field names consistently
      const qty = item.quantitySqm ?? item.quantity ?? item.quantity_sqm ?? 0;
      const numericQty = Number(qty) || 0;
      
      // Only set if we have a positive quantity or if this is the first entry for this product
      if (!map.has(item.productId) || numericQty > 0) {
        map.set(item.productId, numericQty);
      }
    });
    return map;
  }, [inventory]);

  const getAvailableQuantity = useCallback((productId) => {
    const quantity = inventoryMap.get(productId) || 0;
    return Math.max(0, quantity); // Ensure non-negative quantities
  }, [inventoryMap]);

  // Memoized filtered products for better performance
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    
    const searchLower = searchTerm.toLowerCase();
    return products.filter(product => {
      return product.name.toLowerCase().includes(searchLower) ||
             Object.values(product.customAttributes || {}).some(value => 
               value.toString().toLowerCase().includes(searchLower)
             );
    });
  }, [products, searchTerm]);

  const addToCart = useCallback((product) => {
    const availableQty = getAvailableQuantity(product.id);
    if (availableQty <= 0) return;

    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.productId === product.id);
      
      if (existingItemIndex !== -1) {
        const existingItem = prevCart[existingItemIndex];
        if (existingItem.quantity >= availableQty) return prevCart;
        
        const newCart = [...prevCart];
        newCart[existingItemIndex] = {
          ...existingItem,
          quantity: existingItem.quantity + 1
        };
        return newCart;
      } else {
        return [...prevCart, {
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: 1,
          unitOfMeasure: product.unitOfMeasure
        }];
      }
    });
  }, [getAvailableQuantity]);

  const updateCartQuantity = useCallback((productId, newQuantity) => {
    const availableQty = getAvailableQuantity(productId);
    
    setCart(prevCart => {
      if (newQuantity <= 0) {
        return prevCart.filter(item => item.productId !== productId);
      } else if (newQuantity <= availableQty) {
        return prevCart.map(item =>
          item.productId === productId
            ? { ...item, quantity: newQuantity }
            : item
        );
      }
      return prevCart;
    });
  }, [getAvailableQuantity]);

  const removeFromCart = useCallback((productId) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  }, []);

  // Memoized subtotal and total calculation
  const subtotalAmount = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (!discountType || !discountValue || discountValue <= 0) return 0;

    const value = parseFloat(discountValue);
    if (isNaN(value)) return 0;

    if (discountType === 'percentage') {
      return (subtotalAmount * value) / 100;
    } else if (discountType === 'amount') {
      return Math.min(value, subtotalAmount); // Don't allow discount > subtotal
    }
    return 0;
  }, [subtotalAmount, discountType, discountValue]);

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotalAmount - discountAmount);
  }, [subtotalAmount, discountAmount]);

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    if (!selectedLocation) {
      setError('Please select a location');
      return;
    }

    if (!selectedPaymentMethod) {
      setError('Please select a payment method');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const saleData = {
        locationId: selectedLocation,
        customerName: customerName || 'Walk-in Customer',
        customerPhone: customerPhone || '',
        paymentMethod: selectedPaymentMethod,
        discountType: discountType || null,
        discountValue: discountValue ? parseFloat(discountValue) : 0,
        subtotalAmount: subtotalAmount,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        }))
      };

      const result = await createSale(saleData);
      
      // Fetch the complete sale details for receipt
      const saleDetails = await fetchSaleById(result.sale.id);
      setCompletedSale(saleDetails.sale);
      setShowReceipt(true);
      
      // Reset form
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setSelectedPaymentMethod('');
      setDiscountType('');
      setDiscountValue('');
      setSuccess('Sale completed successfully!');
      
      // Reload inventory
      loadInventory();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.message || 'Failed to complete sale');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickView = (product) => {
    // Add the calculated available quantity to the product before showing in modal
    const productWithQuantity = {
      ...product,
      availableQty: getAvailableQuantity(product.id)
    };
    setQuickViewProduct(productWithQuantity);
  };

  const closeQuickView = () => {
    setQuickViewProduct(null);
  };

  return (
    <>
  {/* <SidebarNav /> removed to prevent duplicate sidebar */}
      <div className="sale-page sale-page-clean">
        <div className="enhanced-header">
          {/* Top Row: Title and Location */}
          <div className="header-top">
            <div className="header-title">
              <FaShoppingCart className="header-icon" />
              <div className="title-content">
                <h1>Point of Sale</h1>
                <p>Create new sales transactions</p>
              </div>
            </div>
            
            <div className="header-location">
              <FaMapMarkerAlt className="location-icon" />
              <select 
                value={selectedLocation} 
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="enhanced-location-select"
              >
                <option value="">Choose Location</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>{location.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Bottom Row: Search and View Controls */}
          <div className="header-bottom">
            <div className="search-container">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search products by name or attributes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="enhanced-search-input"
              />
            </div>
            
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
                List
              </button>
            </div>
          </div>
        </div>
        
        <div className="sale-container sale-container-clean">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {/* Compact Statistics Bar */}
          <div className="compact-stats">
            <span className="compact-stat">
              <FaCube className="compact-icon" /> {filteredProducts.length} Products
            </span>
            <span className="compact-stat">
              <FaShoppingCart className="compact-icon" /> {cart.length} Items
            </span>
            {totalAmount > 0 && (
              <span className="compact-stat total">
                <FaDollarSign className="compact-icon" /> 
                <MoneyValue amount={totalAmount} sensitive={false} />
              </span>
            )}
          </div>

          <div className="sale-content">
            {/* Product Search & Selection */}
            <div className="product-section">
              {!selectedLocation ? (
                <div className="no-location-message no-location-message-clean">
                  <h3>Please Select a Location</h3>
                  <p>Choose a location to see available products</p>
                </div>
              ) : (
                <>
                  {viewMode === 'grid' ? (
                    <div className="products-grid products-grid-clean">
                      {filteredProducts.map(product => {
                        const availableQty = getAvailableQuantity(product.id);
                        const inCart = cart.find(item => item.productId === product.id);
                        
                        return (
                          <ProductCard
                            key={product.id}
                            product={product}
                            availableQty={availableQty}
                            inCart={inCart}
                            onAddToCart={addToCart}
                            onQuickView={handleQuickView}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="table-view-container">
                      <table className="products-table">
                        <thead>
                          <tr className="table-header">
                            <th className="table-header-cell">Product</th>
                            <th className="table-header-cell">Attributes</th>
                            <th className="table-header-cell center">Price</th>
                            <th className="table-header-cell center">Stock</th>
                            <th className="table-header-cell center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProducts.map(product => {
                            const availableQty = getAvailableQuantity(product.id);
                            const inCart = cart.find(item => item.productId === product.id);
                            
                            return (
                              <tr key={product.id} className="table-row">
                                <td className="table-cell">
                                  <div className="product-info-container">
                                    <div className="product-image-container">
                                      {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} className="product-table-image" />
                                      ) : (
                                        <FaBox size={20} color="#999" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="product-name-info">
                                        {product.name}
                                      </div>
                                      <div className="product-category-info">
                                        {product.category || 'General'}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="table-cell">
                                  <div className="product-attributes-table">
                                    {Object.entries(product.customAttributes || {}).slice(0, 3).map(([key, value]) => (
                                      <div key={key} className="attribute-item">
                                        <span className="attribute-key">{key}:</span> {String(value).substring(0, 20)}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td className="table-cell center">
                                  <div className="product-price-container">
                                    <MoneyValue amount={product.price || 0} sensitive={false} />
                                  </div>
                                  {product.unitOfMeasure && (
                                    <div className="price-per-unit-table">
                                      per {product.unitOfMeasure}
                                    </div>
                                  )}
                                </td>
                                <td className="table-cell center">
                                  <div className={`stock-info ${availableQty > 0 ? 'stock-high' : 'stock-low'}`}>
                                    {availableQty} {product.unitOfMeasure || 'pc'}
                                  </div>
                                  {inCart && (
                                    <div className="stock-available-text">
                                      {inCart.quantity} in cart
                                    </div>
                                  )}
                                </td>
                                <td className="table-cell center">
                                  <div className="action-buttons">
                                    <button
                                      className="action-button"
                                      onClick={() => addToCart(product)}
                                      disabled={availableQty <= 0 || (inCart && inCart.quantity >= availableQty)}
                                    >
                                      {availableQty <= 0 ? 'Out of Stock' : '+ Add'}
                                    </button>
                                    <button
                                      className="action-button view-button"
                                      onClick={() => handleQuickView(product)}
                                    >
                                      View
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {filteredProducts.length === 0 && searchTerm && (
                    <div className="no-products-message">
                      <p>No products found matching your search at this location</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Enhanced Shopping Cart */}
            <div className="enhanced-cart-section">
              <div className="cart-header">
                <div className="cart-title">
                  <FaShoppingCart className="cart-icon" />
                  <h3>Shopping Cart</h3>
                  <span className="cart-count">{cart.length}</span>
                </div>
              </div>
              
              {cart.length === 0 ? (
                <div className="empty-cart-message">
                  <FaShoppingCart size={48} className="empty-icon" />
                  <h4>Your cart is empty</h4>
                  <p>Add products to get started</p>
                </div>
              ) : (
                <>
                  <div className="cart-items-enhanced">
                    {cart.map(item => (
                      <CartItem
                        key={item.productId}
                        item={item}
                        onUpdateQuantity={updateCartQuantity}
                        onRemove={removeFromCart}
                      />
                    ))}
                  </div>
                  
                  <div className="cart-summary">
                    <div className="total-section">
                      <div className="total-row subtotal">
                        <span>Subtotal:</span>
                        <span><MoneyValue amount={subtotalAmount} sensitive={false} /></span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="total-row discount">
                          <span>Discount{discountType === 'percentage' ? ` (${discountValue}%)` : ''}:</span>
                          <span>-<MoneyValue amount={discountAmount} sensitive={false} /></span>
                        </div>
                      )}
                      <div className="total-row final">
                        <span>Total:</span>
                        <span><MoneyValue amount={totalAmount} sensitive={false} /></span>
                      </div>
                    </div>
                    
                    <div className="customer-form-enhanced">
                      <div className="form-group-enhanced">
                        <label className="form-label-enhanced">
                          <FaUser className="form-icon" />
                          Customer Name (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Enter customer name..."
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="enhanced-input"
                        />
                      </div>
                      
                      <div className="form-group-enhanced">
                        <label className="form-label-enhanced">
                          <FaPhone className="form-icon" />
                          Phone Number (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Enter phone number..."
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="enhanced-input"
                        />
                      </div>
                      
                      <div className="form-group-enhanced">
                        <label className="form-label-enhanced">
                          <FaCreditCard className="form-icon" />
                          Payment Method *
                        </label>
                        <select
                          value={selectedPaymentMethod}
                          onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                          className="enhanced-select"
                        >
                          <option value="">Choose payment method...</option>
                          <option value="cash">💵 Cash</option>
                          <option value="card">💳 Card</option>
                          <option value="bank_transfer">🏦 Bank Transfer</option>
                          <option value="pos">📱 POS Terminal</option>
                        </select>
                      </div>

                      <div className="form-group-enhanced">
                        <label className="form-label-enhanced">
                          <FaTags className="form-icon" />
                          Discount (Optional)
                        </label>
                        <div className="discount-input-group">
                          <select
                            value={discountType}
                            onChange={(e) => {
                              setDiscountType(e.target.value);
                              if (!e.target.value) setDiscountValue('');
                            }}
                            className="discount-type-select"
                          >
                            <option value="">No Discount</option>
                            <option value="amount">Fixed Amount (₦)</option>
                            <option value="percentage">Percentage (%)</option>
                          </select>
                          <input
                            type="number"
                            placeholder={discountType === 'amount' ? 'Enter amount...' : discountType === 'percentage' ? 'Enter percentage...' : 'Select discount type'}
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value)}
                            disabled={!discountType}
                            className="discount-value-input"
                            min="0"
                            step={discountType === 'percentage' ? '0.01' : '0.01'}
                          />
                        </div>
                        {discountAmount > 0 && (
                          <div className="discount-preview">
                            Discount: <MoneyValue amount={discountAmount} sensitive={false} />
                            {discountType === 'percentage' && ` (${discountValue}%)`}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      className="complete-sale-btn"
                      onClick={handleCompleteSale}
                      disabled={loading || cart.length === 0}
                    >
                      {loading ? (
                        <>
                          <div className="spinner"></div>
                          Processing Sale...
                        </>
                      ) : (
                        <>
                          <FaCheck />
                          Complete Sale
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReceipt && completedSale && (
        <Receipt
          sale={completedSale}
          onClose={() => {
            setShowReceipt(false);
            setCompletedSale(null);
          }}
          onReturn={(sale) => {
            setShowReceipt(false);
            // Navigate to returns page with sale info
            window.location.href = `/returns?saleId=${sale.id}`;
          }}
        />
      )}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          isOpen={!!quickViewProduct}
          onRequestClose={closeQuickView}
        />
      )}
    </>
  );
};

export default SalePage;
