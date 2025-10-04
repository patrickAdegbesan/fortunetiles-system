import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaTrash, FaTimes } from 'react-icons/fa';
import '../styles/DeleteConfirmationModal.css';

const AdminDeleteModal = ({
  isOpen,
  onConfirm,
  onCancel,
  itemToDelete,
  itemType,
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

  if (!isOpen || !itemToDelete) return null;

  // Get the name based on item type
  const itemName = typeof itemToDelete === 'string' 
    ? itemToDelete 
    : itemToDelete.name;

  const handleConfirm = () => {
    if (confirmationText.trim().toLowerCase() !== itemName.toLowerCase()) {
      setError(`${itemType} name does not match. Please type the exact name to confirm.`);
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
          <h2 className="delete-modal-title">Delete {itemType}</h2>
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
              You are about to <strong>delete</strong> the {itemType.toLowerCase()} <strong>"{itemName}"</strong>.
            </p>
            <p className="delete-warning-subtext">
              {itemType === 'Product Type' 
                ? 'This action may affect products using this type. Products will need to be reassigned to another type.'
                : 'This action may affect products using this category. Products will be reassigned to General category.'}
            </p>
          </div>

          <div className="delete-product-info">
            <div className="delete-product-detail">
              <span className="delete-label">{itemType}:</span>
              <span className="delete-value">{itemName}</span>
            </div>
            {itemToDelete.unitOfMeasure && (
              <div className="delete-product-detail">
                <span className="delete-label">Unit:</span>
                <span className="delete-value">{itemToDelete.unitOfMeasure}</span>
              </div>
            )}
          </div>

          <div className="delete-confirmation-input">
            <label htmlFor="delete-confirmation" className="delete-input-label">
              Type <strong>"{itemName}"</strong> to confirm:
            </label>
            <input
              id="delete-confirmation"
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Type "${itemName}" here`}
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
            disabled={isDeleting || confirmationText.trim().toLowerCase() !== itemName.toLowerCase()}
          >
            {isDeleting ? (
              <>
                <div className="btn-spinner" />
                Deleting...
              </>
            ) : (
              <>
                <FaTrash />
                Delete {itemType}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDeleteModal;