import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaTrash, FaTimes } from 'react-icons/fa';
import '../styles/DeleteConfirmationModal.css';

const DeleteConfirmationModal = ({
  isOpen,
  onConfirm,
  onCancel,
  product,
  isDeleting = false
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmationText('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const handleConfirm = () => {
    if (confirmationText.trim().toLowerCase() !== product.name.toLowerCase()) {
      setError('Product name does not match. Please type the exact product name to confirm.');
      return;
    }
    onConfirm();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isDeleting) {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="delete-modal-overlay" onClick={onCancel}>
      <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-header">
          <div className="delete-modal-icon">
            <FaExclamationTriangle />
          </div>
          <h2 className="delete-modal-title">Archive Product</h2>
          <button
            className="delete-modal-close"
            onClick={onCancel}
            disabled={isDeleting}
            aria-label="Close confirmation dialog"
          >
            <FaTimes />
          </button>
        </div>

        <div className="delete-modal-body">
          <div className="delete-warning">
            <p className="delete-warning-text">
              You are about to <strong>archive</strong> the product <strong>"{product.name}"</strong>.
            </p>
            <p className="delete-warning-subtext">
              This action will remove the product from active inventory and sales.
              The product data will be preserved for historical records.
            </p>
          </div>

          <div className="delete-product-info">
            <div className="delete-product-detail">
              <span className="delete-label">Product:</span>
              <span className="delete-value">{product.name}</span>
            </div>
            <div className="delete-product-detail">
              <span className="delete-label">Category:</span>
              <span className="delete-value">{product.category || 'Uncategorized'}</span>
            </div>
            <div className="delete-product-detail">
              <span className="delete-label">Price:</span>
              <span className="delete-value">₦{product.price?.toLocaleString()}</span>
            </div>
          </div>

          <div className="delete-confirmation-input">
            <label htmlFor="delete-confirmation" className="delete-input-label">
              Type <strong>"{product.name}"</strong> to confirm:
            </label>
            <input
              id="delete-confirmation"
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Type "${product.name}" here`}
              className={`delete-input ${error ? 'error' : ''}`}
              disabled={isDeleting}
              autoFocus
            />
            {error && <span className="delete-input-error">{error}</span>}
          </div>
        </div>

        <div className="delete-modal-footer">
          <button
            className="delete-cancel-btn"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            className={`delete-confirm-btn ${isDeleting ? 'loading' : ''}`}
            onClick={handleConfirm}
            disabled={isDeleting || confirmationText.trim().toLowerCase() !== product.name.toLowerCase()}
          >
            {isDeleting ? (
              <>
                <div className="btn-spinner" />
                Archiving...
              </>
            ) : (
              <>
                <FaTrash />
                Archive Product
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;