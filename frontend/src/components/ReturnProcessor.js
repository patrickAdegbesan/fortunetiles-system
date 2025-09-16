import React, { useState, useEffect } from 'react';
import { fetchSaleById, createReturn, fetchLocations } from '../services/api';
import '../styles/ReturnProcessor.css';

const ReturnProcessor = ({ saleId, onClose, onSuccess }) => {
  const [sale, setSale] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [returnItems, setReturnItems] = useState([]);
  const [returnType, setReturnType] = useState('REFUND');
  const [reason, setReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('CASH');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [saleData, locationsData] = await Promise.all([
          fetchSaleById(saleId),
          fetchLocations()
        ]);
        
        setSale(saleData.sale);
        setLocations(locationsData.locations);
        
        // Initialize return items
        const items = saleData.sale.items.map(item => ({
          saleItemId: item.id,
          productId: item.productId,
          locationId: saleData.sale.locationId,
          quantity: 0,
          maxQuantity: item.quantity,
          returnReason: '',
          condition: 'PERFECT',
          exchangeProductId: null,
          originalItem: item
        }));
        setReturnItems(items);
        
        setLoading(false);
      } catch (err) {
        setError('Failed to load sale details');
        setLoading(false);
      }
    };

    loadData();
  }, [saleId]);

  const handleQuantityChange = (index, value) => {
    const newValue = Math.min(Math.max(0, parseFloat(value) || 0), returnItems[index].maxQuantity);
    const updatedItems = [...returnItems];
    updatedItems[index].quantity = newValue;
    setReturnItems(updatedItems);
  };

  const handleReasonChange = (index, value) => {
    const updatedItems = [...returnItems];
    updatedItems[index].returnReason = value;
    setReturnItems(updatedItems);
  };

  const handleConditionChange = (index, value) => {
    const updatedItems = [...returnItems];
    updatedItems[index].condition = value;
    setReturnItems(updatedItems);
  };

  const handleLocationChange = (index, value) => {
    const updatedItems = [...returnItems];
    updatedItems[index].locationId = parseInt(value);
    setReturnItems(updatedItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate at least one item is being returned
    const hasItems = returnItems.some(item => item.quantity > 0);
    if (!hasItems) {
      setError('Please select at least one item to return');
      return;
    }

    try {
      setLoading(true);
      const filteredItems = returnItems.filter(item => item.quantity > 0);
      
      const returnData = {
        saleId,
        returnType,
        reason,
        refundMethod: returnType === 'REFUND' ? refundMethod : null,
        notes,
        items: filteredItems.map(item => ({
          saleItemId: item.saleItemId,
          productId: item.productId,
          locationId: item.locationId,
          quantity: item.quantity,
          returnReason: item.returnReason,
          condition: item.condition,
          exchangeProductId: item.exchangeProductId
        }))
      };

      const result = await createReturn(returnData);
      onSuccess(result.return);
      onClose();
    } catch (err) {
      setError('Failed to process return');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="return-processor loading">Loading...</div>;
  }

  if (error) {
    return (
      <div className="return-processor error">
        <p>{error}</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="return-processor error">
        <p>Sale not found</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }

  return (
    <div className="return-processor">
      <h2>Process Return/Exchange</h2>
      <div className="sale-info">
        <p>Sale ID: {sale.id}</p>
        <p>Customer: {sale.customerName}</p>
        <p>Sale Date: {new Date(sale.createdAt).toLocaleDateString()}</p>
        <p>Original Total: ₦{sale.totalAmount.toLocaleString()}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="return-type-selector">
          <label>Return Type:</label>
          <select 
            value={returnType} 
            onChange={(e) => setReturnType(e.target.value)}
          >
            <option value="REFUND">Refund</option>
            <option value="EXCHANGE">Exchange</option>
          </select>
        </div>

        {returnType === 'REFUND' && (
          <div className="refund-method-selector">
            <label>Refund Method:</label>
            <select 
              value={refundMethod} 
              onChange={(e) => setRefundMethod(e.target.value)}
            >
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="STORE_CREDIT">Store Credit</option>
            </select>
          </div>
        )}

        <div className="return-reason">
          <label>General Return Reason:</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter the general reason for return"
          />
        </div>

        <div className="return-items">
          <h3>Select Items to Return</h3>
          {returnItems.map((item, index) => (
            <div key={item.saleItemId} className="return-item">
              <div className="item-details">
                <h4>{item.originalItem.product.name}</h4>
                <p>Original Quantity: {item.maxQuantity} {item.originalItem.product.unitOfMeasure}</p>
                <p>Unit Price: ₦{item.originalItem.unitPrice.toLocaleString()}</p>
              </div>

              <div className="return-controls">
                <div className="quantity-control">
                  <label>Return Quantity:</label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                    min="0"
                    max={item.maxQuantity}
                    step="0.1"
                  />
                  <span>{item.originalItem.product.unitOfMeasure}</span>
                </div>

                {item.quantity > 0 && (
                  <>
                    <div className="location-selector">
                      <label>Return to Location:</label>
                      <select
                        value={item.locationId}
                        onChange={(e) => handleLocationChange(index, e.target.value)}
                      >
                        {locations.map(location => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="condition-selector">
                      <label>Item Condition:</label>
                      <select
                        value={item.condition}
                        onChange={(e) => handleConditionChange(index, e.target.value)}
                      >
                        <option value="PERFECT">Perfect</option>
                        <option value="GOOD">Good</option>
                        <option value="DAMAGED">Damaged</option>
                      </select>
                    </div>

                    <div className="reason-input">
                      <label>Specific Reason:</label>
                      <input
                        type="text"
                        value={item.returnReason}
                        onChange={(e) => handleReasonChange(index, e.target.value)}
                        placeholder="Reason for returning this item"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="notes-section">
          <label>Additional Notes:</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter any additional notes about this return"
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Processing...' : 'Process Return'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReturnProcessor;
