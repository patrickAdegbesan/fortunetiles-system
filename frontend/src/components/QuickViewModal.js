import React from 'react';
import { FaBox, FaTimes } from 'react-icons/fa';

const QuickViewModal = ({ product, isOpen, onRequestClose }) => {
  if (!isOpen || !product) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onRequestClose}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '0',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8f9fa'
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '1.5rem', 
            color: '#2c3e50',
            fontWeight: '600'
          }}>
            Product Details
          </h2>
          <button
            onClick={onRequestClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#6c757d',
              padding: '5px',
              borderRadius: '50%',
              width: '35px',
              height: '35px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#e9ecef'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', maxHeight: 'calc(80vh - 100px)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            
            {/* Product Image */}
            <div style={{ flex: '0 0 250px' }}>
              <div style={{
                width: '250px',
                height: '250px',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#f8f9fa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #e0e0e0'
              }}>
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }} 
                  />
                ) : (
                  <FaBox size={60} color="#999" />
                )}
              </div>
            </div>

            {/* Product Info */}
            <div style={{ flex: '1', minWidth: '250px' }}>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '1.8rem', 
                color: '#2c3e50',
                fontWeight: '600',
                lineHeight: '1.3'
              }}>
                {product.name}
              </h3>

              <div style={{ marginBottom: '20px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  backgroundColor: '#e3f2fd',
                  color: '#1976d2',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {product.category || 'General'}
                </span>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ 
                  fontSize: '2rem', 
                  fontWeight: '700', 
                  color: '#007bff',
                  marginBottom: '4px'
                }}>
                  ₦{product.price?.toLocaleString() || '0'}
                </div>
                {product.unitOfMeasure && (
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>
                    per {product.unitOfMeasure}
                  </div>
                )}
              </div>

              {/* Stock Info */}
              <div style={{ 
                padding: '16px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                <div style={{ 
                  fontSize: '14px', 
                  color: '#6c757d', 
                  marginBottom: '8px',
                  fontWeight: '500'
                }}>
                  Stock Availability
                </div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: product.availableQty > 0 ? '#28a745' : '#dc3545'
                }}>
                  {product.availableQty || 0} {product.unitOfMeasure || 'pc'} available
                </div>
              </div>

              {/* Custom Attributes */}
              {product.customAttributes && Object.keys(product.customAttributes).length > 0 && (
                <div>
                  <h4 style={{ 
                    margin: '0 0 12px 0', 
                    fontSize: '1.1rem', 
                    color: '#495057',
                    fontWeight: '600'
                  }}>
                    Product Attributes
                  </h4>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '12px' 
                  }}>
                    {Object.entries(product.customAttributes).map(([key, value]) => (
                      <div key={key} style={{
                        padding: '12px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px',
                        border: '1px solid #e9ecef'
                      }}>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#6c757d', 
                          marginBottom: '4px',
                          fontWeight: '500',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {key}
                        </div>
                        <div style={{ 
                          fontSize: '14px', 
                          color: '#495057',
                          fontWeight: '500'
                        }}>
                          {String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e0e0e0',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onRequestClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
