import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import SidebarNav from '../components/SidebarNav';
import TopHeader from '../components/TopHeader';
import Receipt from '../components/Receipt';
import '../styles/OrderHistoryPage.css';

const OrderHistoryPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [processingReturn, setProcessingReturn] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [processingReturnSubmit, setProcessingReturnSubmit] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders');
      setOrders(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load order history');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessReturn = (order) => {
    setProcessingReturn(order);
    // Initialize return items with all order items, defaulting to 0 quantity
    const initialReturnItems = order.items?.map(item => ({
      ...item,
      returnQuantity: 0,
      maxQuantity: item.quantity,
      returnAmount: 0
    })) || [];
    setReturnItems(initialReturnItems);
    setReturnReason('');
    setRefundAmount(0);
    console.log('Processing return for order:', order.id);
  };

  const handleReturnQuantityChange = (itemIndex, quantity) => {
    const updatedItems = [...returnItems];
    const item = updatedItems[itemIndex];
    const maxQty = Math.min(quantity, item.maxQuantity);
    
    updatedItems[itemIndex] = {
      ...item,
      returnQuantity: maxQty,
      returnAmount: (item.totalPrice / item.quantity) * maxQty
    };
    
    setReturnItems(updatedItems);
    
    // Calculate total refund amount
    const totalRefund = updatedItems.reduce((sum, item) => sum + item.returnAmount, 0);
    setRefundAmount(totalRefund);
  };

  const processReturn = async () => {
    if (!returnReason.trim()) {
      alert('Please provide a reason for the return');
      return;
    }

    const itemsToReturn = returnItems.filter(item => item.returnQuantity > 0);
    if (itemsToReturn.length === 0) {
      alert('Please select at least one item to return');
      return;
    }

    setProcessingReturnSubmit(true);
    
    try {
      const returnData = {
        saleId: processingReturn.id,
        type: 'refund',
        reason: returnReason,
        refundMethod: 'cash',
        notes: `Return processed via Order History. Items: ${itemsToReturn.map(item => `${item.productName} (${item.returnQuantity})`).join(', ')}`,
        items: itemsToReturn.map(item => {
          // Find the matching sale item
          const saleItem = processingReturn.items?.find(si => si.productId === item.productId);
          return {
            saleItemId: saleItem?.id || item.id,
            quantity: item.returnQuantity,
            returnReason: returnReason,
            condition: 'good'
          };
        })
      };

      console.log('Sending return data:', returnData);
      
      const response = await api.post('/returns', returnData);
      
      alert(`Return processed successfully! Refund amount: ${formatCurrency(refundAmount)}`);
      setProcessingReturn(null);
      setReturnItems([]);
      setReturnReason('');
      setRefundAmount(0);
      
      // Refresh orders to show updated status
      fetchOrders();
      
    } catch (error) {
      console.error('Error processing return:', error);
      alert('Failed to process return: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcessingReturnSubmit(false);
    }
  };

  const handleReprintReceipt = (order) => {
    setSelectedOrder(order);
    setShowReceipt(true);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toString().includes(searchTerm) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customerPhone && order.customerPhone.includes(searchTerm));
    
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOrderItems = (order) => {
    if (!order.items || order.items.length === 0) return 'No items';
    return order.items.map(item => `${item.productName} (${item.quantity})`).join(', ');
  };

  if (loading) {
    return (
      <>
        <SidebarNav />
        <div className="order-history-page" style={{ marginLeft: '0', transition: 'margin-left 0.3s ease' }}>
          <TopHeader title="Order History" />
          <div className="loading">Loading order history...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <SidebarNav />
      <div className="order-history-page" style={{ marginLeft: '0', transition: 'margin-left 0.3s ease' }}>
        <TopHeader title="Order History" />
        
        <div className="order-history-container">
          {/* Compact Stats Header */}
          <div className="header-stats">
            <span>Total Orders: {orders.length}</span>
            <span>Completed: {orders.filter(order => order.status === 'completed').length}</span>
            <span>Pending: {orders.filter(order => order.status === 'pending').length}</span>
            <span>Cancelled: {orders.filter(order => order.status === 'cancelled').length}</span>
            <span>Total Sales: {formatCurrency(orders.reduce((total, order) => total + (order.total || 0), 0))}</span>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

        <div className="order-controls">
          <div className="search-filters">
            <input
              type="text"
              placeholder="Search by Order ID, Customer Name, or Phone..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <button className="refresh-btn" onClick={fetchOrders}>
            🔄 Refresh
          </button>
        </div>

        <div className="orders-stats">
          <span>Showing {filteredOrders.length} of {orders.length} orders</span>
        </div>

        <div className="orders-table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total Amount</th>
                <th>Payment Method</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="no-orders">
                    {searchTerm || filterStatus !== 'all' ? 'No orders found matching your criteria' : 'No orders found'}
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="order-row">
                    <td className="order-id">
                      <strong>#{order.id}</strong>
                    </td>
                    <td className="customer-info">
                      <div className="customer-details">
                        <strong>{order.customerName || 'Walk-in Customer'}</strong>
                        {order.customerPhone && (
                          <small>{order.customerPhone}</small>
                        )}
                      </div>
                    </td>
                    <td className="order-items">
                      <div className="items-summary">
                        {order.items && order.items.length > 0 ? (
                          <>
                            <span className="item-count">{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
                            <small className="items-preview">
                              {getOrderItems(order)}
                            </small>
                          </>
                        ) : (
                          <span>No items</span>
                        )}
                      </div>
                    </td>
                    <td className="order-total">
                      <strong className="amount">{formatCurrency(order.total || 0)}</strong>
                    </td>
                    <td className="payment-method">
                      <span className={`payment-badge payment-${(order.paymentMethod || 'cash').toLowerCase()}`}>
                        {order.paymentMethod || 'Cash'}
                      </span>
                    </td>
                    <td className="order-date">
                      {formatDateTime(order.createdAt || order.saleDate)}
                    </td>
                    <td className="order-status">
                      <span className={`status-badge status-${(order.status || 'completed').toLowerCase()}`}>
                        {order.status === 'partially_returned' ? 'Partially Returned' : (order.status || 'Completed')}
                      </span>
                    </td>
                    <td className="order-actions">
                      <div className="action-buttons">
                        <button
                          className="action-btn reprint-btn"
                          onClick={() => handleReprintReceipt(order)}
                          title="Reprint Receipt"
                        >
                          🖨️ Receipt
                        </button>
                        <button
                          className="action-btn return-btn"
                          onClick={() => handleProcessReturn(order)}
                          title="Process Return"
                        >
                          ↩️ Return
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Receipt Modal */}
        {showReceipt && selectedOrder && (
          <Receipt 
            sale={selectedOrder}
            onClose={() => {
              setShowReceipt(false);
              setSelectedOrder(null);
            }}
          />
        )}

        {/* Return Processing Modal */}
        {processingReturn && (
          <div className="return-modal-overlay">
            <div className="return-modal">
              <div className="modal-header">
                <h3>Process Return - Order #{processingReturn.id}</h3>
                <button 
                  className="close-btn"
                  onClick={() => setProcessingReturn(null)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="order-summary">
                  <h4>Order Details</h4>
                  <p><strong>Customer:</strong> {processingReturn.customerName || 'Walk-in Customer'}</p>
                  <p><strong>Date:</strong> {formatDateTime(processingReturn.createdAt || processingReturn.saleDate)}</p>
                  <p><strong>Original Total:</strong> {formatCurrency(processingReturn.total || 0)}</p>
                </div>

                <div className="return-items-section">
                  <h4>Select Items to Return</h4>
                  <div className="return-items-list">
                    {returnItems.map((item, index) => (
                      <div key={index} className="return-item">
                        <div className="item-info">
                          <strong>{item.productName}</strong>
                          <span className="item-details">
                            Original Qty: {item.quantity} | 
                            Price: {formatCurrency(item.totalPrice / item.quantity)} each |
                            Total: {formatCurrency(item.totalPrice)}
                          </span>
                        </div>
                        <div className="return-controls">
                          <label>Return Quantity:</label>
                          <input
                            type="number"
                            min="0"
                            max={item.maxQuantity}
                            value={item.returnQuantity}
                            onChange={(e) => handleReturnQuantityChange(index, parseInt(e.target.value) || 0)}
                            className="return-quantity-input"
                          />
                          <span className="return-amount">
                            Refund: {formatCurrency(item.returnAmount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="return-reason-section">
                  <label htmlFor="return-reason"><strong>Reason for Return:</strong></label>
                  <textarea
                    id="return-reason"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Please provide a reason for this return..."
                    className="return-reason-input"
                    rows="3"
                  />
                </div>

                <div className="return-summary">
                  <h4>Return Summary</h4>
                  <p><strong>Items to Return:</strong> {returnItems.filter(item => item.returnQuantity > 0).length}</p>
                  <p><strong>Total Refund Amount:</strong> <span className="refund-amount">{formatCurrency(refundAmount)}</span></p>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setProcessingReturn(null)}
                  disabled={processingReturnSubmit}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={processReturn}
                  disabled={processingReturnSubmit || refundAmount === 0}
                >
                  {processingReturnSubmit ? 'Processing...' : `Process Return (${formatCurrency(refundAmount)})`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  </>
  );
};

export default OrderHistoryPage;