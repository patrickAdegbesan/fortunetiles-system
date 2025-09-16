import React from 'react';
import '../styles/Receipt.css';

const Receipt = ({ sale, onPrint, onClose, onReturn }) => {
  // Handle both 'sale' and 'order' data formats
  const receiptData = sale || {};
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    const content = document.getElementById('receipt-content').innerHTML;
    
    // Set up the print window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Receipt</title>
          <style>
            ${document.querySelector('style')?.innerHTML || ''}
            ${Array.from(document.styleSheets)
              .map(sheet => {
                try {
                  return Array.from(sheet.cssRules)
                    .map(rule => rule.cssText)
                    .join('\n');
                } catch (e) {
                  return '';
                }
              })
              .join('\n')}
            @media print {
              @page { 
                size: auto;
                margin: 0mm;
              }
              body { 
                margin: 1cm;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${content}
          </div>
        </body>
      </html>
    `);
    
    // Wait for content and styles to load
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
      // Close the window after printing (or if printing is cancelled)
      setTimeout(() => {
        printWindow.close();
        if (onPrint) onPrint();
      }, 500);
    };
  };

  if (!sale) return null;

  // Handle different property names between sale and order data formats
  const saleId = receiptData.id;
  const customerName = receiptData.customerName;
  const customerPhone = receiptData.customerPhone;
  const totalAmount = receiptData.totalAmount || receiptData.total;
  const createdAt = receiptData.createdAt || receiptData.saleDate;
  const paymentMethod = receiptData.paymentMethod;
  const items = receiptData.items || [];
  const cashier = receiptData.user || receiptData.cashier;
  const location = receiptData.location;
  const returns = receiptData.returns || [];

  return (
    <div className="receipt-overlay">
      <div className="receipt-container">
        <div className="receipt-header">
          <button className="close-btn" onClick={onClose}>×</button>
          <button className="print-btn" onClick={handlePrint}>🖨️ Print</button>
          {onReturn && (
            <button className="return-btn" onClick={() => onReturn(sale)}>🔄 Return/Exchange</button>
          )}
        </div>

        <div className="receipt" id="receipt-content">
          {/* Company Header */}
          <div className="company-header">
            <div className="logo">FT</div>
            <h1>FORTUNE TILES</h1>
            <h2>Premium Tile Importers & Distributors</h2>
            <div className="company-details">
              <div className="detail">
                <span className="icon">📍</span>
                <span>123 Lekki Phase 1, Lagos, Nigeria</span>
              </div>
              <div className="detail">
                <span className="icon">📞</span>
                <span>+234-XXX-XXXX-XXX</span>
              </div>
              <div className="detail">
                <span className="icon">📧</span>
                <span>info@fortunetiles.com</span>
              </div>
              <div className="detail">
                <span className="icon">🌐</span>
                <span>www.fortunetiles.com</span>
              </div>
            </div>
          </div>

          <div className="receipt-divider with-text">
            <span>SALES RECEIPT</span>
          </div>

          {/* Sale Information */}
          <div className="sale-info">
            <div className="sale-info-grid">
              <div className="info-column">
                <div className="info-group">
                  <label>Receipt No:</label>
                  <span className="value">FT-{saleId.toString().padStart(6, '0')}</span>
                </div>
                <div className="info-group">
                  <label>Date:</label>
                  <span className="value">{formatDate(createdAt)}</span>
                </div>
                <div className="info-group">
                  <label>Location:</label>
                  <span className="value">{location?.name || location || 'Main Store'}</span>
                </div>
              </div>
              <div className="info-column">
                <div className="info-group">
                  <label>Customer:</label>
                  <span className="value">{customerName}</span>
                </div>
                {customerPhone && (
                  <div className="info-group">
                    <label>Phone:</label>
                    <span className="value">{customerPhone}</span>
                  </div>
                )}
                <div className="info-group">
                  <label>Served by:</label>
                  <span className="value">{cashier?.firstName} {cashier?.lastName} {cashier?.name}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="items-section">
            <div className="items-table">
              <div className="items-header">
                <span className="col-item">ITEM DESCRIPTION</span>
                <span className="col-qty">QUANTITY</span>
                <span className="col-price">UNIT PRICE</span>
                <span className="col-total">AMOUNT</span>
              </div>
              
              <div className="items-body">
                {items?.map((item, index) => (
                  <div key={index} className="item-row">
                    <div className="col-item">
                      <div className="item-name">{item.product?.name || item.productName || 'Unknown Product'}</div>
                      <div className="item-specs">
                        {item.product?.customAttributes ? 
                          Object.entries(item.product.customAttributes)
                            .filter(([_, value]) => value !== null && value !== undefined && value !== '')
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(' | ') 
                          : ''}
                      </div>
                    </div>
                    <div className="col-qty">
                      {item.quantity} {item.unit || 'sqm'}
                    </div>
                    <div className="col-price">
                      ₦{parseFloat(item.unitPrice).toLocaleString()}
                    </div>
                    <div className="col-total">
                      ₦{parseFloat(item.lineTotal || item.totalPrice || (item.quantity * item.unitPrice)).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          <div className="totals-section">
            <div className="total-row subtotal">
              <span>Subtotal:</span>
              <span>₦{parseFloat(totalAmount).toLocaleString()}</span>
            </div>
            <div className="total-row discount">
              <span>Discount:</span>
              <span>₦0.00</span>
            </div>
            <div className="total-row vat">
              <span>VAT (0%):</span>
              <span>₦0.00</span>
            </div>
            <div className="total-row grand-total">
              <span>TOTAL AMOUNT:</span>
              <span>₦{parseFloat(totalAmount).toLocaleString()}</span>
            </div>
          </div>

          {/* Return Information Section */}
          {returns && returns.length > 0 && (
            <div className="returns-section">
              <div className="receipt-divider with-text">
                <span>RETURN INFORMATION</span>
              </div>
              {returns.map((returnInfo, index) => (
                <div key={index} className="return-info">
                  <div className="return-header">
                    <div className="return-id">Return #{returnInfo.id}</div>
                    <div className={`return-status status-${returnInfo.status?.toLowerCase()}`}>
                      {returnInfo.status}
                    </div>
                  </div>
                  <div className="return-details">
                    <div className="return-detail">
                      <label>Return Date:</label>
                      <span>{formatDate(returnInfo.createdAt)}</span>
                    </div>
                    <div className="return-detail">
                      <label>Return Type:</label>
                      <span>{returnInfo.returnType}</span>
                    </div>
                    {returnInfo.totalRefundAmount && (
                      <div className="return-detail">
                        <label>Refund Amount:</label>
                        <span>₦{parseFloat(returnInfo.totalRefundAmount).toLocaleString()}</span>
                      </div>
                    )}
                    {returnInfo.reason && (
                      <div className="return-detail">
                        <label>Reason:</label>
                        <span>{returnInfo.reason}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payment Information */}
          <div className="payment-info">
            <div className="payment-method">
              <h3>Payment Method</h3>
              <div className="payment-details">
                <label className="payment-method-display">
                  {paymentMethod === 'cash' && 'Cash Payment'}
                  {paymentMethod === 'bank_transfer' && 'Bank Transfer'}
                  {paymentMethod === 'pos' && 'POS Payment'}
                  {paymentMethod === 'card' && 'Card Payment'}
                </label>
              </div>
            </div>

            <div className="bank-details">
              <h3>Bank Details</h3>
              <div className="bank-info">
                <p>Bank: First Bank Nigeria</p>
                <p>Account Name: Fortune Tiles Ltd</p>
                <p>Account No: XXXX-XXXX-XXXX</p>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="terms-section">
            <h3>Terms & Conditions</h3>
            <ol>
              <li>All tiles come with manufacturer warranty against defects</li>
              <li>Returns accepted within 7 days with original receipt only</li>
              <li>Ensure to check items before leaving the store</li>
              {returns && returns.length > 0 ? (
                <li>This transaction has been partially or fully returned as shown above</li>
              ) : (
                <li>No refund after payment, exchange only</li>
              )}
            </ol>
          </div>

          {/* Footer */}
          <div className="receipt-footer">
            <div className="signature-section">
              <div className="signature-box">
                <div className="line">_________________</div>
                <div className="label">Customer's Signature</div>
              </div>
              <div className="signature-box">
                <div className="line">_________________</div>
                <div className="label">Authorized Signature</div>
              </div>
            </div>

            <div className="thank-you">
              <h3>Thank You for Your Business!</h3>
              <p>Quality tiles for your dream spaces</p>
            </div>

            <div className="footer-contact">
              <p>For inquiries, call: +234-XXX-XXXX-XXX</p>
              <p>Follow us on social media @FortunetilesNG</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
