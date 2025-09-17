import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchSaleById, createReturn } from '../services/api';
import SidebarNav from '../components/SidebarNav';
import TopHeader from '../components/TopHeader';

const ReturnsPage = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const saleId = params.get('saleId');

  const [sale, setSale] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [returnType, setReturnType] = useState('refund'); // 'refund' or 'exchange'
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (saleId) {
      loadSale();
    }
  }, [saleId]);

  const loadSale = async () => {
    try {
      setLoading(true);
      const response = await fetchSaleById(saleId);
      setSale(response.sale);
    } catch (error) {
      setError('Failed to load sale details');
      console.error('Load sale error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (item) => {
    if (selectedItems.some(selected => selected.id === item.id)) {
      setSelectedItems(selectedItems.filter(selected => selected.id !== item.id));
    } else {
      setSelectedItems([...selectedItems, { 
        id: item.id,
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }]);
    }
  };

  const handleSubmitReturn = async () => {
    if (selectedItems.length === 0) {
      setError('Please select items to return');
      return;
    }

    if (!reason) {
      setError('Please provide a reason for return');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const returnData = {
        saleId,
        type: returnType,
        reason,
        items: selectedItems.map(item => ({
          saleItemId: item.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      };

      await createReturn(returnData);
      setSuccess('Return processed successfully!');
      
      // Clear form
      setSelectedItems([]);
      setReason('');
      
      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = '/sales';
      }, 2000);

    } catch (error) {
      setError(error.message || 'Failed to process return');
    } finally {
      setLoading(false);
    }
  };

  if (!sale) {
    return (
      <>
  {/* <SidebarNav /> removed to prevent duplicate sidebar */}
        <div className="returns-page">
          <TopHeader title="🔄 Process Return">
            {loading ? 'Loading...' : 'Sale not found'}
          </TopHeader>
        </div>
      </>
    );
  }

  return (
    <>
  {/* <SidebarNav /> removed to prevent duplicate sidebar */}
      <div className="returns-page" style={{ marginLeft: '0', transition: 'margin-left 0.3s ease' }}>
        <TopHeader title="🔄 Process Return">
          <div style={{ fontSize: '14px', color: '#666' }}>
            Sale #{saleId} • {new Date(sale.createdAt).toLocaleDateString()}
          </div>
        </TopHeader>

        <div style={{ padding: '20px' }}>
          {error && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#f8d7da', 
              color: '#721c24', 
              borderRadius: '4px', 
              marginBottom: '20px' 
            }}>
              {error}
            </div>
          )}
          
          {success && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#d4edda', 
              color: '#155724', 
              borderRadius: '4px', 
              marginBottom: '20px' 
            }}>
              {success}
            </div>
          )}

          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 20px 0' }}>Select Items to Return</h3>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ marginRight: '20px' }}>
                  <input
                    type="radio"
                    value="refund"
                    checked={returnType === 'refund'}
                    onChange={(e) => setReturnType(e.target.value)}
                  /> Refund
                </label>
                <label>
                  <input
                    type="radio"
                    value="exchange"
                    checked={returnType === 'exchange'}
                    onChange={(e) => setReturnType(e.target.value)}
                  /> Exchange
                </label>
              </div>

              <textarea
                placeholder="Reason for return"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  minHeight: '100px',
                  marginBottom: '20px'
                }}
              />
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Select</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Product</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Quantity</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Unit Price</th>
                  <th style={{ padding: '12px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items?.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>
                      <input
                        type="checkbox"
                        checked={selectedItems.some(selected => selected.id === item.id)}
                        onChange={() => toggleItemSelection(item)}
                      />
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '500' }}>{item.product?.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          {Object.entries(item.product?.customAttributes || {})
                            .filter(([_, value]) => value !== null && value !== undefined && value !== '')
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(' | ')}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      ₦{parseFloat(item.unitPrice).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      ₦{parseFloat(item.lineTotal).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                onClick={() => window.history.back()}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  marginRight: '10px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReturn}
                disabled={loading || selectedItems.length === 0 || !reason}
                style={{
                  padding: '8px 16px',
                  backgroundColor: loading || selectedItems.length === 0 || !reason ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading || selectedItems.length === 0 || !reason ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Processing...' : 'Process Return'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReturnsPage;
