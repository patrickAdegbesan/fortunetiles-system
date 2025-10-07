import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRotate, faReceipt, faArrowRotateLeft, faSearch, faFilter } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import Receipt from '../components/Receipt';
import MoneyValue from '../components/MoneyValue';
import '../styles/TransactionsPage.css';

const TransactionsPage = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [processingReturn, setProcessingReturn] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [refundAmount, setRefundAmount] = useState(0);
  const [processingReturnSubmit, setProcessingReturnSubmit] = useState(false);
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'returns'
  const [returns, setReturns] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'returns' && returns.length === 0) {
      fetchTransactions();
    } else if (activeTab === 'orders') {
      fetchTransactions();
    }
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch both orders and returns count for header stats
      const [ordersResponse, returnsResponse] = await Promise.all([
        api.get('/orders'),
        api.get('/returns')
      ]);
      
      setTransactions(ordersResponse.data);
      setReturns(returnsResponse.data.returns || returnsResponse.data);
      setError('');
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      if (activeTab === 'orders') {
        const response = await api.get('/orders');
        setTransactions(response.data);
      } else {
        const response = await api.get('/returns');
        setReturns(response.data.returns || response.data);
      }
      setError('');
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(`Failed to load ${activeTab}`);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessReturn = (transaction) => {
    setProcessingReturn(transaction);
    const initialReturnItems = transaction.items?.map(item => ({
      ...item,
      returnQuantity: 0,
      maxQuantity: item.quantity,
      returnAmount: 0
    })) || [];
    setReturnItems(initialReturnItems);
    setReturnReason('');
    setRefundAmount(0);
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
        notes: `Return processed. Items: ${itemsToReturn.map(item => `${item.productName} (${item.returnQuantity})`).join(', ')}`,
        items: itemsToReturn.map(item => ({
          saleItemId: item.id,
          quantity: item.returnQuantity,
          returnReason: returnReason,
          condition: 'good'
        }))
      };
      
      const response = await api.post('/returns', returnData);
      alert(`Return processed successfully! Refund amount: ${formatCurrency(refundAmount)}`);
      setProcessingReturn(null);
      setReturnItems([]);
      setReturnReason('');
      setRefundAmount(0);
      fetchTransactions();
      
    } catch (error) {
      console.error('Error processing return:', error);
      alert('Failed to process return: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcessingReturnSubmit(false);
    }
  };

  const handleReprintReceipt = (transaction) => {
    setSelectedTransaction(transaction);
    setShowReceipt(true);
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.id.toString().includes(searchTerm) ||
      (transaction.customerName && transaction.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (transaction.customerPhone && transaction.customerPhone.includes(searchTerm));
    
    const matchesFilter = filterStatus === 'all' || transaction.status === filterStatus;
    
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

  const getTransactionItems = (transaction) => {
    if (!transaction.items || transaction.items.length === 0) return 'No items';
    return transaction.items.map(item => `${item.productName} (${item.quantity})`).join(', ');
  };

  if (loading) {
    return (
      <div className="transactions-page">
        <PageHeader
          icon={<FontAwesomeIcon icon={faReceipt} />}
          title="Transactions"
          subtitle="Loading..."
        />
        <div className="loading">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="transactions-page">
      <PageHeader
        icon={<FontAwesomeIcon icon={faReceipt} />}
        title="Transactions"
        subtitle="View and manage orders & returns"
        stats={[
          { label: 'Total Orders', value: transactions.length },
          { label: 'Completed', value: transactions.filter(t => t.status === 'completed').length },
          { label: 'Returns', value: returns.length },
          { label: 'Total Sales', value: <MoneyValue amount={transactions.reduce((total, t) => total + (t.total || 0), 0)} sensitive={true} /> }
        ]}
      />
      
      <div className="transactions-container">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Orders
          </button>
          <button 
            className={`tab ${activeTab === 'returns' ? 'active' : ''}`}
            onClick={() => setActiveTab('returns')}
          >
            Returns
          </button>
        </div>

        <div className="transaction-controls">
          <div className="search-filters">
            <div className="search-box">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input
                type="text"
                placeholder="Search by ID, Customer Name, or Phone..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-box">
              <FontAwesomeIcon icon={faFilter} className="filter-icon" />
              <select
                className="filter-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
                {activeTab === 'returns' && <option value="refunded">Refunded</option>}
              </select>
            </div>
          </div>
          <button className="refresh-btn" onClick={fetchTransactions}>
            <FontAwesomeIcon icon={faRotate} /> Refresh
          </button>
        </div>

        <div className="transactions-table-container">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Discount</th>
                <th>Total Amount</th>
                <th>Payment</th>
                <th>Date & Time</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="10" className="no-transactions">
                    {searchTerm || filterStatus !== 'all' ? 'No transactions found matching your criteria' : 'No transactions found'}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="transaction-row">
                    <td className="transaction-id">
                      <strong>#{transaction.id}</strong>
                    </td>
                    <td className="customer-info">
                      <div className="customer-details">
                        <strong>{transaction.customerName || 'Walk-in Customer'}</strong>
                        {transaction.customerPhone && (
                          <small>{transaction.customerPhone}</small>
                        )}
                      </div>
                    </td>
                    <td className="transaction-items">
                      <div className="items-summary">
                        {transaction.items && transaction.items.length > 0 ? (
                          <>
                            <span className="item-count">{transaction.items.length} item{transaction.items.length > 1 ? 's' : ''}</span>
                            <small className="items-preview">
                              {getTransactionItems(transaction)}
                            </small>
                          </>
                        ) : (
                          <span>No items</span>
                        )}
                      </div>
                    </td>
                    <td className="transaction-subtotal">
                      <MoneyValue amount={transaction.subtotalAmount || transaction.total || 0} sensitive={false} />
                    </td>
                    <td className="transaction-discount">
                      <span className="discount-amount">
                        {formatCurrency((transaction.subtotalAmount || transaction.total || 0) - (transaction.total || 0))}
                      </span>
                    </td>
                    <td className="transaction-total">
                      <strong className="amount">
                        <MoneyValue amount={transaction.total || 0} sensitive={false} />
                      </strong>
                    </td>
                    <td className="payment-method">
                      <span className={`payment-badge payment-${(transaction.paymentMethod || 'cash').toLowerCase()}`}>
                        {transaction.paymentMethod || 'Cash'}
                      </span>
                    </td>
                    <td className="transaction-date">
                      {formatDateTime(transaction.createdAt || transaction.saleDate)}
                    </td>
                    <td className="transaction-status">
                      <span className={`status-badge status-${(transaction.status || 'completed').toLowerCase()}`}>
                        {transaction.status === 'partially_returned' ? 'Partially Returned' : (transaction.status || 'Completed')}
                      </span>
                    </td>
                    <td className="transaction-actions">
                      <div className="action-buttons">
                        <button
                          className="action-btn reprint-btn"
                          onClick={() => handleReprintReceipt(transaction)}
                          title="Reprint Receipt"
                        >
                          <FontAwesomeIcon icon={faReceipt} />
                        </button>
                        {activeTab === 'orders' && (
                          <button
                            className="action-btn return-btn"
                            onClick={() => handleProcessReturn(transaction)}
                            title="Process Return"
                          >
                            <FontAwesomeIcon icon={faArrowRotateLeft} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Receipt Modal */}
        {showReceipt && selectedTransaction && (
          <Receipt 
            sale={selectedTransaction}
            onClose={() => {
              setShowReceipt(false);
              setSelectedTransaction(null);
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
                  <p><strong>Original Total:</strong> <MoneyValue amount={processingReturn.total || 0} sensitive={false} /></p>
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
                            Price: <MoneyValue amount={item.totalPrice / item.quantity} sensitive={false} /> each |
                            Total: <MoneyValue amount={item.totalPrice} sensitive={false} />
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
                  <p><strong>Total Refund Amount:</strong> <span className="refund-amount"><MoneyValue amount={refundAmount} sensitive={false} /></span></p>
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
                  {processingReturnSubmit ? 'Processing...' : `Process Return (`}<MoneyValue amount={refundAmount} sensitive={false} />{processingReturnSubmit ? '' : ')'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;