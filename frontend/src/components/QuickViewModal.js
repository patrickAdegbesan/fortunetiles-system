import React from 'react';
import { FaBox, FaTimes } from 'react-icons/fa';
import '../styles/QuickViewModal.css';

const QuickViewModal = ({ product, isOpen, onRequestClose }) => {
  if (!isOpen || !product) return null;

  return (
    <div className="quickview-overlay" onClick={onRequestClose}>
      <div className="quickview-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="quickview-header">
          <h2 className="quickview-title">
            Product Details
          </h2>
          <button
            onClick={onRequestClose}
            className="quickview-close-btn"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="quickview-content">
          <div className="quickview-body">
            
            {/* Product Image */}
            <div className="quickview-image-container">
              <div className="quickview-image-wrapper">
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name} 
                    className="quickview-image"
                  />
                ) : (
                  <FaBox size={60} className="quickview-placeholder-icon" />
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="quickview-info">
              <h3 className="quickview-product-name">
                {product.name}
              </h3>

              <div>
                <span className="quickview-category">
                  {product.category || 'General'}
                </span>
              </div>

              <div className="quickview-price-section">
                <div className="quickview-price">
                  ₦{product.price?.toLocaleString() || '0'}
                </div>
                {product.unitOfMeasure && (
                  <div className="quickview-unit">
                    per {product.unitOfMeasure}
                  </div>
                )}
              </div>

              {/* Stock Info */}
              <div className="quickview-stock-info">
                <div className="quickview-stock-label">
                  Stock Availability
                </div>
                <div className={`quickview-stock-value ${
                  product.availableQty > 0 ? 'quickview-stock-available' : 'quickview-stock-unavailable'
                }`}>
                  {product.availableQty || 0} {product.unitOfMeasure || 'pc'} available
                </div>
              </div>

              {/* Custom Attributes */}
              {product.customAttributes && Object.keys(product.customAttributes).length > 0 && (
                <div className="quickview-attributes-section">
                  <h4>
                    Product Attributes
                  </h4>
                  <div className="quickview-attributes-grid">
                    {Object.entries(product.customAttributes).map(([key, value]) => (
                      <div key={key} className="quickview-attribute-item">
                        <div className="quickview-attribute-key">
                          {key}
                        </div>
                        <div className="quickview-attribute-value">
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
        <div className="quickview-footer">
          <button
            onClick={onRequestClose}
            className="quickview-close-footer-btn"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
