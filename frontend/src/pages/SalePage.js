import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { fetchProducts, fetchInventory, fetchLocations, createSale, fetchSaleById } from '../services/api';
import SidebarNav from '../components/SidebarNav';
import TopHeader from '../components/TopHeader';
import Receipt from '../components/Receipt';
import { FaBox } from 'react-icons/fa';
import '../styles/SalePage.css';
import QuickViewModal from '../components/QuickViewModal';

const SalePage = () => {
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

  const getAvailableQuantity = (productId) => {
    const inventoryItem = inventory.find(item => item.productId === productId);
    return inventoryItem ? inventoryItem.quantity : 0;
  };

  const filteredProducts = products.filter(product => {
    return product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           Object.values(product.customAttributes || {}).some(value => 
             value.toString().toLowerCase().includes(searchTerm.toLowerCase())
           );
  });

  const addToCart = (product) => {
    const availableQty = getAvailableQuantity(product.id);
    if (availableQty <= 0) return;

    const existingItem = cart.find(item => item.productId === product.id);
    if (existingItem) {
      if (existingItem.quantity >= availableQty) return;
      setCart(cart.map(item =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: 1,
        unitOfMeasure: product.unitOfMeasure
      }]);
    }
  };

  const updateCartQuantity = (productId, newQuantity) => {
    const availableQty = getAvailableQuantity(productId);
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else if (newQuantity <= availableQty) {
      setCart(cart.map(item =>
        item.productId === productId
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

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
    setQuickViewProduct(product);
  };

  const closeQuickView = () => {
    setQuickViewProduct(null);
  };

  return (
    <>
      <SidebarNav />
      <div className="sale-page" style={{ marginLeft: '0', transition: 'margin-left 0.3s ease' }}>
        <TopHeader title="💰 Process Sale">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              width: '200px'
            }}
          />
          
          <select 
            value={selectedLocation} 
            onChange={(e) => setSelectedLocation(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '150px'
            }}
          >
            <option value="">Select Location</option>
            {locations.map(location => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
          
          <button 
            style={{
              padding: '8px 12px',
              backgroundColor: viewMode === 'grid' ? '#007bff' : '#f8f9fa',
              color: viewMode === 'grid' ? 'white' : '#495057',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onClick={() => setViewMode('grid')}
          >
            🔲 Grid
          </button>
          <button 
            style={{
              padding: '8px 12px',
              backgroundColor: viewMode === 'table' ? '#007bff' : '#f8f9fa',
              color: viewMode === 'table' ? 'white' : '#495057',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onClick={() => setViewMode('table')}
          >
            📋 Table
          </button>
        </TopHeader>
        
        <div className="sale-container" style={{ padding: '20px' }}>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="sale-content">
            {/* Product Search & Selection */}
            <div className="product-section">
              {!selectedLocation ? (
                <div className="no-location-message" style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#666',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  margin: '20px'
                }}>
                  <h3>Please Select a Location</h3>
                  <p>Choose a location to see available products</p>
                </div>
              ) : (
                <>
                  {viewMode === 'grid' ? (
                    <div className="products-grid" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                      {filteredProducts.map(product => {
                        const availableQty = getAvailableQuantity(product.id);
                        const inCart = cart.find(item => item.productId === product.id);
                        
                        return (
                          <div key={product.id} className="sale-product-card" style={{ 
                            width: '200px', 
                            margin: '10px',
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            padding: '15px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            border: '1px solid #e0e0e0',
                            transition: 'transform 0.2s'
                          }}>
                            {availableQty <= 0 && <div className="sale-badge">Out of Stock</div>}
                            <div className="product-content">
                              <div className="product-image">
                                {product.imageUrl ? (
                                  <img src={product.imageUrl} alt={product.name} style={{ width: '150px', height: '150px', objectFit: 'cover' }} />
                                ) : (
                                  <div style={{ width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', border: '1px solid #ddd' }}>
                                    <FaBox size={50} color="#999" />
                                  </div>
                                )}
                              </div>
                              <div className="product-info">
                                <h4 title={product.name}>{product.name}</h4>
                                <div className="product-attributes" title={Object.entries(product.customAttributes || {}).map(([k, v]) => `${k}: ${v}`).join('\n')}>
                                  {Object.entries(product.customAttributes || {}).slice(0, 2).map(([key, value], i) => (
                                    <span key={key} className="product-attribute">
                                      {i > 0 && ' • '}
                                      {String(value).substring(0, 12)}
                                    </span>
                                  ))}
                                </div>
                                <p className="product-price">₦{product.price?.toLocaleString() || '0'}</p>
                                <p className="product-stock">Stock: {availableQty} {product.unitOfMeasure || 'pc'}</p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                              <button
                                style={{
                                  flex: 1,
                                  padding: '8px 12px',
                                  backgroundColor: availableQty <= 0 ? '#ccc' : '#007bff',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: availableQty <= 0 ? 'not-allowed' : 'pointer'
                                }}
                                onClick={() => addToCart(product)}
                                disabled={availableQty <= 0 || (inCart && inCart.quantity >= availableQty)}
                              >
                                {availableQty <= 0 ? 'Out of Stock' : '+ Add'}
                              </button>
                              <button
                                style={{
                                  padding: '8px 12px',
                                  backgroundColor: '#6c757d',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => handleQuickView(product)}
                              >
                                View
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ 
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                      <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        fontSize: '14px'
                      }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                            <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Product</th>
                            <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Attributes</th>
                            <th style={{ padding: '12px 15px', textAlign: 'center', fontWeight: '600', color: '#495057' }}>Price</th>
                            <th style={{ padding: '12px 15px', textAlign: 'center', fontWeight: '600', color: '#495057' }}>Stock</th>
                            <th style={{ padding: '12px 15px', textAlign: 'center', fontWeight: '600', color: '#495057' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredProducts.map(product => {
                            const availableQty = getAvailableQuantity(product.id);
                            const inCart = cart.find(item => item.productId === product.id);
                            
                            return (
                              <tr key={product.id} style={{ 
                                borderBottom: '1px solid #dee2e6',
                                transition: 'background-color 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.parentElement.style.backgroundColor = '#f8f9fa'}
                              onMouseLeave={(e) => e.target.parentElement.style.backgroundColor = 'transparent'}>
                                <td style={{ padding: '12px 15px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ 
                                      width: '50px', 
                                      height: '50px', 
                                      borderRadius: '6px',
                                      overflow: 'hidden',
                                      backgroundColor: '#f0f0f0',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} style={{ 
                                          width: '100%', 
                                          height: '100%', 
                                          objectFit: 'cover' 
                                        }} />
                                      ) : (
                                        <FaBox size={20} color="#999" />
                                      )}
                                    </div>
                                    <div>
                                      <div style={{ fontWeight: '600', color: '#2c3e50', marginBottom: '2px' }}>
                                        {product.name}
                                      </div>
                                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                        {product.category || 'General'}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: '12px 15px' }}>
                                  <div style={{ fontSize: '13px', color: '#6c757d' }}>
                                    {Object.entries(product.customAttributes || {}).slice(0, 3).map(([key, value]) => (
                                      <div key={key} style={{ marginBottom: '2px' }}>
                                        <span style={{ fontWeight: '500' }}>{key}:</span> {String(value).substring(0, 20)}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                                  <div style={{ fontWeight: '600', color: '#007bff', fontSize: '15px' }}>
                                    ₦{product.price?.toLocaleString() || '0'}
                                  </div>
                                  {product.unitOfMeasure && (
                                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                      per {product.unitOfMeasure}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                                  <div style={{ 
                                    display: 'inline-block',
                                    padding: '4px 8px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    backgroundColor: availableQty > 0 ? '#d4edda' : '#f8d7da',
                                    color: availableQty > 0 ? '#155724' : '#721c24'
                                  }}>
                                    {availableQty} {product.unitOfMeasure || 'pc'}
                                  </div>
                                  {inCart && (
                                    <div style={{ fontSize: '11px', color: '#28a745', marginTop: '2px' }}>
                                      {inCart.quantity} in cart
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                    <button
                                      style={{
                                        padding: '6px 12px',
                                        backgroundColor: availableQty <= 0 ? '#ccc' : '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: availableQty <= 0 ? 'not-allowed' : 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '500'
                                      }}
                                      onClick={() => addToCart(product)}
                                      disabled={availableQty <= 0 || (inCart && inCart.quantity >= availableQty)}
                                    >
                                      {availableQty <= 0 ? 'Out of Stock' : '+ Add'}
                                    </button>
                                    <button
                                      style={{
                                        padding: '6px 10px',
                                        backgroundColor: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '500'
                                      }}
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
                    <div className="no-products-message" style={{
                      textAlign: 'center',
                      padding: '20px',
                      color: '#666',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      margin: '20px'
                    }}>
                      <p>No products found matching your search at this location</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Shopping Cart */}
            <div className="cart-section" style={{ 
              width: '350px', 
              backgroundColor: 'white', 
              borderRadius: '8px', 
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              height: 'fit-content'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Shopping Cart ({cart.length})</h3>
              
              {cart.length === 0 ? (
                <p style={{ color: '#666', textAlign: 'center', padding: '20px 0' }}>Cart is empty</p>
              ) : (
                <>
                  <div className="cart-items" style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '15px' }}>
                    {cart.map(item => (
                      <div key={item.productId} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '10px 0',
                        borderBottom: '1px solid #e0e0e0'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '500', fontSize: '14px' }}>{item.productName}</div>
                          <div style={{ fontSize: '12px', color: '#666' }}>₦{item.price.toLocaleString()}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            style={{
                              width: '24px',
                              height: '24px',
                              border: '1px solid #ddd',
                              backgroundColor: 'white',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                            onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                          >
                            -
                          </button>
                          <span style={{ minWidth: '20px', textAlign: 'center', fontSize: '14px' }}>{item.quantity}</span>
                          <button
                            style={{
                              width: '24px',
                              height: '24px',
                              border: '1px solid #ddd',
                              backgroundColor: 'white',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                            onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          >
                            +
                          </button>
                          <button
                            style={{
                              marginLeft: '8px',
                              padding: '4px 8px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                            onClick={() => removeFromCart(item.productId)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div style={{ borderTop: '2px solid #e0e0e0', paddingTop: '15px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      fontSize: '18px', 
                      fontWeight: '700',
                      marginBottom: '15px'
                    }}>
                      <span>Total:</span>
                      <span>₦{getTotalAmount().toLocaleString()}</span>
                    </div>
                    
                    <div style={{ marginBottom: '15px' }}>
                      <input
                        type="text"
                        placeholder="Customer Name (Optional)"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          marginBottom: '10px'
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Customer Phone (Optional)"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          marginBottom: '10px'
                        }}
                      />
                      <select
                        value={selectedPaymentMethod}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      >
                        <option value="">Select Payment Method</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="transfer">Bank Transfer</option>
                      </select>
                    </div>
                    
                    <button
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '600'
                      }}
                      onClick={handleCompleteSale}
                      disabled={loading || cart.length === 0}
                    >
                      {loading ? 'Processing...' : 'Complete Sale'}
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
