import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import SidebarNav from '../components/SidebarNav';
import PageHeader from '../components/PageHeader';
import * as api from '../services/api';
import '../styles/ReturnsManagementPage.css';

const ReturnsManagementPage = () => {
  const { user } = useAuth();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingIds, setProcessingIds] = useState(new Set());

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await api.fetchReturns();
      console.log('Returns API response:', response);
      // Ensure the response is an array
      setReturns(Array.isArray(response) ? response : []);
      setError('');
    } catch (err) {
      console.error('Error fetching returns:', err);
      setError('Failed to load returns');
      setReturns([]); // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleStatusUpdate = async (returnId, newStatus) => {
    if (processingIds.has(returnId)) return;

    setProcessingIds(prev => new Set([...prev, returnId]));
    
    try {
      await api.updateReturnStatus(returnId, newStatus);
      
      // Update the local state
      setReturns(prev => prev.map(ret => 
        ret.id === returnId 
          ? { ...ret, status: newStatus }
          : ret
      ));

      // Show success message
      alert(`Return #${returnId} has been ${newStatus.toLowerCase()}`);
      
    } catch (error) {
      console.error('Error updating return status:', error);
      alert('Failed to update return status: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(returnId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'completed': return 'status-completed';
      case 'rejected': return 'status-rejected';
      default: return 'status-pending';
    }
  };

  const pendingReturns = Array.isArray(returns) ? returns.filter(ret => ret.status === 'PENDING') : [];
  const processedReturns = Array.isArray(returns) ? returns.filter(ret => ret.status !== 'PENDING') : [];

  if (loading) {
    return (
      <>
  {/* <SidebarNav /> removed to prevent duplicate sidebar */}
        <div className="returns-management-page">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading returns...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
  {/* <SidebarNav /> removed to prevent duplicate sidebar */}
      <div className="returns-management-page">
        <PageHeader
          icon="↩️"
          title="Returns Management"
          subtitle="Process and track return requests"
          stats={[
            { label: 'Pending Returns', value: pendingReturns.length },
            { label: 'Processed Returns', value: processedReturns.length },
            { label: 'Total Returns', value: returns.length }
          ]}
        />

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {/* Pending Returns Section */}
      <div className="returns-section">
        <div className="section-header">
          <h2>Pending Returns ({pendingReturns.length})</h2>
          <p>Returns awaiting your approval</p>
        </div>

        {pendingReturns.length === 0 ? (
          <div className="no-returns">
            <div className="no-returns-icon">📋</div>
            <h3>No Pending Returns</h3>
            <p>All returns have been processed</p>
          </div>
        ) : (
          <div className="returns-grid">
            {pendingReturns.map((returnItem) => (
              <div key={returnItem.id} className="return-card pending">
                <div className="return-card-header">
                  <div className="return-info">
                    <h3>Return #{returnItem.id}</h3>
                    <div className="return-meta">
                      <span>Sale #{returnItem.saleId}</span>
                      <span>{formatDate(returnItem.createdAt)}</span>
                    </div>
                  </div>
                  <div className={`status-badge ${getStatusBadgeClass(returnItem.status)}`}>
                    {returnItem.status}
                  </div>
                </div>

                <div className="return-details">
                  <div className="detail-row">
                    <label>Return Type:</label>
                    <span>{returnItem.returnType}</span>
                  </div>
                  <div className="detail-row">
                    <label>Refund Method:</label>
                    <span>{returnItem.refundMethod}</span>
                  </div>
                  {returnItem.totalRefundAmount && (
                    <div className="detail-row">
                      <label>Refund Amount:</label>
                      <span className="amount">{formatCurrency(returnItem.totalRefundAmount)}</span>
                    </div>
                  )}
                  {returnItem.reason && (
                    <div className="detail-row">
                      <label>Reason:</label>
                      <span>{returnItem.reason}</span>
                    </div>
                  )}
                  {returnItem.notes && (
                    <div className="detail-row">
                      <label>Notes:</label>
                      <span>{returnItem.notes}</span>
                    </div>
                  )}
                </div>

                <div className="return-actions">
                  <button 
                    className="action-btn approve-btn"
                    onClick={() => handleStatusUpdate(returnItem.id, 'APPROVED')}
                    disabled={processingIds.has(returnItem.id)}
                  >
                    {processingIds.has(returnItem.id) ? '⏳ Processing...' : '✅ Approve'}
                  </button>
                  <button 
                    className="action-btn complete-btn"
                    onClick={() => handleStatusUpdate(returnItem.id, 'COMPLETED')}
                    disabled={processingIds.has(returnItem.id)}
                  >
                    {processingIds.has(returnItem.id) ? '⏳ Processing...' : '🎯 Complete'}
                  </button>
                  <button 
                    className="action-btn reject-btn"
                    onClick={() => handleStatusUpdate(returnItem.id, 'REJECTED')}
                    disabled={processingIds.has(returnItem.id)}
                  >
                    {processingIds.has(returnItem.id) ? '⏳ Processing...' : '❌ Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processed Returns Section */}
      {processedReturns.length > 0 && (
        <div className="returns-section">
          <div className="section-header">
            <h2>Processed Returns ({processedReturns.length})</h2>
            <p>Previously processed returns</p>
          </div>

          <div className="returns-list">
            {processedReturns.map((returnItem) => (
              <div key={returnItem.id} className="return-row">
                <div className="return-basic-info">
                  <span className="return-id">#{returnItem.id}</span>
                  <span className="sale-id">Sale #{returnItem.saleId}</span>
                  <span className="return-date">{formatDate(returnItem.createdAt)}</span>
                </div>
                <div className="return-amount">
                  {returnItem.totalRefundAmount && formatCurrency(returnItem.totalRefundAmount)}
                </div>
                <div className={`status-badge ${getStatusBadgeClass(returnItem.status)}`}>
                  {returnItem.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default ReturnsManagementPage;