import React, { useState, useEffect, useContext, useCallback, useMemo, memo } from 'react';
import { hasPack, packName, unitLabel, fmtSqm, fmtCount, cartonPrice, toBase, fromBase, quantityText, roundQty, roundMoney } from '../utils/units';
import { AuthContext } from '../contexts/AuthContext';
import { fetchProducts, fetchInventory, fetchLocations, createSale, verifyMarkupPin } from '../services/api';
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
  FaCheck,
  FaExclamationTriangle,
  FaStore,
  FaTags,
  FaCube,
  FaLock,
  FaTimes
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
        {fmtCount(fromBase(inCart, inCart.quantity, inCart.entryUnit))}
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
        {Object.entries(product.attributes || product.customAttributes || {}).filter(([k]) => /^(size|finish)$/i.test(k)).slice(0, 2).map(([key, value]) => (
          <span key={key} className="attribute-tag">
            {String(value).substring(0, 18)}
          </span>
        ))}
      </div>
      
      <div className="price-stock-info">
        <div className="product-price">
          <MoneyValue amount={product.price || 0} sensitive={false} />
          <small className="price-unit"> /{unitLabel(product)}</small>
          {hasPack(product) && (
            <div className="carton-price"><MoneyValue amount={cartonPrice(product)} sensitive={false} /> /{packName(product)}</div>
          )}
        </div>
        <div className="product-stock">
          <FaStore size={10} />
          {quantityText(product, availableQty)}
        </div>
      </div>
    </div>
    
    <div className="product-actions">
      <button
        className={`add-btn ${availableQty <= 0 ? 'disabled' : ''}`}
        onClick={() => onAddToCart(product)}
        disabled={availableQty <= 0 || (inCart && inCart.quantity + (hasPack(product) ? Number(product.packSize) : 1) > availableQty + 1e-9)}
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

// PIN Dialog Component
const MarkupPinDialog = ({ isOpen, onClose, onVerify, loading }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    try {
      await onVerify(pin);
      setPin('');
    } catch (err) {
      setError(err.message || 'Invalid PIN');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="pin-dialog-overlay">
      <div className="pin-dialog">
        <div className="pin-dialog-header">
          <FaLock className="pin-icon" />
          <h2>Unlock Markup Feature</h2>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="pin-dialog-body">
          <p className="pin-description">
            Enter the admin PIN to unlock markup editing
          </p>

          <form onSubmit={handleSubmit}>
            <input
              type="password"
              inputMode="numeric"
              maxLength="4"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="pin-input"
              autoFocus
            />

            {error && <div className="pin-error">{error}</div>}

            <div className="pin-dialog-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-verify"
                disabled={loading || pin.length !== 4}
              >
                {loading ? 'Verifying...' : 'Unlock'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// A quantity box that accepts decimals such as 2.50 while it is being typed.
const QtyInput = ({ value, onCommit }) => {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);
  const commit = () => {
    const v = parseFloat(text);
    if (Number.isFinite(v) && v > 0) onCommit(v); else setText(String(value));
  };
  return (
    <input
      className="qty-input"
      inputMode="decimal"
      aria-label="Quantity"
      value={text}
      onChange={(e) => setText(e.target.value.replace(/[^0-9.]/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
      onFocus={(e) => e.target.select()}
    />
  );
};

// Memoized CartItem component
const CartItem = memo(({ 
  item, 
  onUpdateQuantity, 
  onChangeUnit,
  onRemove,
  onUpdateMarkup,
  userRole,
  canEditMarkup,
  onRequestMarkupAccess
}) => {
  const packSize = Number(item.packSize) || 0;
  const packed = packSize > 0;
  const entryUnit = packed ? (item.entryUnit || 'pack') : 'base';
  const entryQty = fromBase(item, item.quantity, entryUnit);
  const basePrice = parseFloat(item.basePrice || item.price) || 0;
  const markupPrice = parseFloat(item.markupPrice) || 0;
  const finalPrice = basePrice + markupPrice;
  // Show markup section for all users, but only allow editing if authorized
  const canShowMarkup = true;

  return (
    <div className="cart-item-enhanced">
      {/* Left: Product Info */}
      <div className="item-info-section">
        <div className="item-name">{item.productName}</div>
        <div className="item-unit">{[item.size, item.finish].filter(Boolean).join(' · ') || item.unitOfMeasure}</div>
        {packed && (
          <div className="unit-toggle sell-by" role="group" aria-label="Sell by">
            <button type="button" className={entryUnit === 'base' ? 'on' : ''} onClick={() => onChangeUnit(item.productId, 'base')}>{item.unit || 'sqm'}</button>
            <button type="button" className={entryUnit === 'pack' ? 'on' : ''} onClick={() => onChangeUnit(item.productId, 'pack')}>{item.packUnit || 'carton'}</button>
          </div>
        )}
      </div>

      {/* Middle: Pricing */}
      <div className="item-pricing-section">
        <div className="price-display">
          <div className="price-label">Unit Price</div>
          <div className="price-value">
            <MoneyValue amount={finalPrice} sensitive={false} /> <small>/{item.unit || 'sqm'}</small>
          </div>
          {packed && (
            <div className="carton-price"><MoneyValue amount={roundMoney(finalPrice * packSize)} sensitive={false} /> /{item.packUnit || 'carton'}</div>
          )}
        </div>
        {markupPrice > 0 && (
          <div className="markup-info">
            <span className="markup-breakdown">
              <MoneyValue amount={basePrice} sensitive={false} /> + <MoneyValue amount={markupPrice} sensitive={false} />
            </span>
          </div>
        )}
        {canShowMarkup && (
          <div className="markup-editor">
            <label className="markup-label">Markup:</label>
            {canEditMarkup ? (
              <input
                type="number"
                min="0"
                max="999999.99"
                step="0.01"
                value={isNaN(markupPrice) ? '' : markupPrice}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  onUpdateMarkup(item.productId, val);
                }}
                placeholder="0"
                className="markup-input"
              />
            ) : (
              <button
                className="markup-unlock-btn"
                onClick={onRequestMarkupAccess}
                title="Click to unlock markup editing"
              >
                <FaLock className="ui-icon" />Unlock
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right: Quantity & Subtotal */}
      <div className="item-quantity-section">
        <div className="qty-controls">
          <button
            className="qty-btn decrease"
            onClick={() => onUpdateQuantity(item.productId, toBase(item, Math.max(0, entryQty - 1), entryUnit))}
            disabled={entryQty <= 1}
            title="Decrease quantity"
          >
            <FaMinus size={12} />
          </button>
          <QtyInput value={entryQty} onCommit={(v) => onUpdateQuantity(item.productId, toBase(item, v, entryUnit))} />
          <button
            className="qty-btn increase"
            onClick={() => onUpdateQuantity(item.productId, toBase(item, entryQty + 1, entryUnit))}
            title="Increase quantity"
          >
            <FaPlus size={12} />
          </button>
        </div>
        {packed && (
          <div className="qty-equiv">
            {entryUnit === 'pack'
              ? `= ${fmtSqm(item.quantity)} ${item.unit || 'sqm'}`
              : `= ${fmtCount(fromBase(item, item.quantity, 'pack'))} ${item.packUnit || 'carton'}${fromBase(item, item.quantity, 'pack') === 1 ? '' : 's'}`}
          </div>
        )}
        <div className="item-total">
          <MoneyValue amount={roundMoney(finalPrice * parseFloat(item.quantity))} sensitive={false} />
        </div>
      </div>

      {/* Far Right: Remove */}
      <button
        className="remove-btn"
        onClick={() => onRemove(item.productId)}
        title="Remove item"
      >
        <FaTrash size={14} />
      </button>
    </div>
  );
});

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
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [markupPrivilegeGranted, setMarkupPrivilegeGranted] = useState(false);
  const [pinVerifyLoading, setPinVerifyLoading] = useState(false);

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
    // Check if markup privilege is already granted
    const grantedUntil = localStorage.getItem('markupPrivilegeGrantedUntil');
    if (grantedUntil && new Date(grantedUntil) > new Date()) {
      setMarkupPrivilegeGranted(true);
    }
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
      const locs = locationsData.locations || [];
      setLocations(locs);
      // Start on the location used last time (or the first one), so a sale never begins with an empty screen.
      let remembered = '';
      try { remembered = localStorage.getItem('sale_location') || ''; } catch (_) { /* ignore */ }
      const pick = locs.find((l) => String(l.id) === remembered) || locs[0] || null;
      if (pick) setSelectedLocation(String(pick.id));
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
      
      const entryUnit = hasPack(product) ? 'pack' : 'base';
      const step = toBase(product, 1, entryUnit);
      if (existingItemIndex !== -1) {
        const existingItem = prevCart[existingItemIndex];
        const nextQty = roundQty(existingItem.quantity + toBase(existingItem, 1, existingItem.entryUnit || entryUnit));
        if (nextQty > availableQty + 1e-9) return prevCart;
        
        const newCart = [...prevCart];
        newCart[existingItemIndex] = { ...existingItem, quantity: nextQty };
        return newCart;
      } else {
        if (step > availableQty + 1e-9) return prevCart;
        const attrs = product.attributes || product.customAttributes || {};
        return [...prevCart, {
          productId: product.id,
          productName: product.name,
          price: product.price,
          basePrice: product.price,
          markupPrice: 0,
          quantity: step,
          entryUnit,
          unit: product.unitOfMeasure,
          packSize: hasPack(product) ? Number(product.packSize) : null,
          packUnit: hasPack(product) ? packName(product) : null,
          size: attrs.Size || attrs.size || '',
          finish: attrs.Finish || attrs.finish || '',
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
      } else if (roundQty(newQuantity) <= availableQty + 1e-9) {
        return prevCart.map(item =>
          item.productId === productId
            ? { ...item, quantity: roundQty(newQuantity) }
            : item
        );
      }
      return prevCart;
    });
  }, [getAvailableQuantity]);

  // Switch a cart line between selling by the square metre and by the carton; the amount stays the same.
  const changeCartUnit = useCallback((productId, entryUnit) => {
    setCart(prevCart => prevCart.map(item => (item.productId === productId ? { ...item, entryUnit } : item)));
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId));
  }, []);

  const updateMarkup = useCallback((productId, markupPrice) => {
    const numericMarkup = parseFloat(markupPrice) || 0;
    setCart(prevCart =>
      prevCart.map(item =>
        item.productId === productId
          ? { ...item, markupPrice: Math.max(0, numericMarkup) }
          : item
      )
    );
  }, []);

  // Handle PIN verification
  const handleVerifyPin = async (pin) => {
    setPinVerifyLoading(true);
    try {
      const response = await verifyMarkupPin(pin);
      setMarkupPrivilegeGranted(true);
      localStorage.setItem('markupPrivilegeGrantedUntil', response.grantedUntil);
      setShowPinDialog(false);
    } catch (error) {
      throw new Error(error.message || 'PIN verification failed');
    } finally {
      setPinVerifyLoading(false);
    }
  };

  // Determine if user can edit markup
  const canEditMarkup = user?.role === 'owner' || user?.role === 'manager' || markupPrivilegeGranted;

  // Memoized subtotal and total calculation (including markup)
  const subtotalAmount = useMemo(() => {
    return cart.reduce((total, item) => {
      const basePrice = parseFloat(item.basePrice || item.price) || 0;
      const markupPrice = parseFloat(item.markupPrice) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const finalPrice = basePrice + markupPrice;
      return roundMoney(total + roundMoney(finalPrice * quantity));
    }, 0);
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
          soldQuantity: fromBase(item, item.quantity, item.entryUnit),
          soldUnit: item.packSize > 0 && item.entryUnit === 'pack' ? (item.packUnit || 'carton') : (item.unit || item.unitOfMeasure),
          unitPrice: item.basePrice || item.price,
          markupPrice: item.markupPrice || 0
        }))
      };

      const result = await createSale(saleData);

      // Use the complete sale details returned from createSale
      setCompletedSale(result.sale);
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
      console.error('Sale completion error:', error);
      console.error('Error response data:', error.response?.data);
      // Show detailed error message
      const errorMessage = error.response?.data?.message ||
                          error.response?.data?.errors?.map(err => err.message).join(', ') ||
                          error.message ||
                          'Failed to complete sale';
      setError(errorMessage);
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
                onChange={(e) => { setSelectedLocation(e.target.value); try { localStorage.setItem('sale_location', e.target.value); } catch (_) { /* ignore */ } }}
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
                                    {Object.entries(product.attributes || product.customAttributes || {}).slice(0, 3).map(([key, value]) => (
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
                                      per {unitLabel(product)}
                                    </div>
                                  )}
                                  {hasPack(product) && (
                                    <div className="price-per-unit-table"><MoneyValue amount={cartonPrice(product)} sensitive={false} /> per {packName(product)}</div>
                                  )}
                                </td>
                                <td className="table-cell center">
                                  <div className={`stock-info ${availableQty > 0 ? 'stock-high' : 'stock-low'}`}>
                                    {quantityText(product, availableQty)}
                                  </div>
                                  {inCart && (
                                    <div className="stock-available-text">
                                      {quantityText(product, inCart.quantity)} in cart
                                    </div>
                                  )}
                                </td>
                                <td className="table-cell center">
                                  <div className="action-buttons">
                                    <button
                                      className="action-button"
                                      onClick={() => addToCart(product)}
                                      disabled={availableQty <= 0 || (inCart && inCart.quantity + (hasPack(product) ? Number(product.packSize) : 1) > availableQty + 1e-9)}
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
                        onChangeUnit={changeCartUnit}
                        onRemove={removeFromCart}
                        onUpdateMarkup={canEditMarkup ? updateMarkup : null}
                        userRole={user?.role}
                        canEditMarkup={canEditMarkup}
                        onRequestMarkupAccess={() => setShowPinDialog(true)}
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
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="pos">POS Terminal</option>
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
      <MarkupPinDialog
        isOpen={showPinDialog}
        onClose={() => setShowPinDialog(false)}
        onVerify={handleVerifyPin}
        loading={pinVerifyLoading}
      />
    </>
  );
};

export default SalePage;
