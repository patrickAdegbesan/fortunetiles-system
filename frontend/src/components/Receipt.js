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
    const receiptElement = document.getElementById('receipt-content');
    
    // Sanitize content to prevent XSS - use textContent for text-only, or clone and sanitize for HTML
    if (!receiptElement) {
      console.error('Receipt element not found');
      return;
    }
    
    // Clone the element to avoid modifying the original
    const clonedElement = receiptElement.cloneNode(true);
    
    // Remove any script tags and event handlers
    const scripts = clonedElement.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    
    // Remove event handlers from all elements
    const allElements = clonedElement.querySelectorAll('*');
    allElements.forEach(el => {
      Array.from(el.attributes).forEach(attr => {
        if (attr.name.startsWith('on')) {
          el.removeAttribute(attr.name);
        }
      });
    });
    
    let content = clonedElement.innerHTML;
    
    // Remove extra whitespace that might cause blank pages
    content = content.trim();
    
    // Set up the print window with minimal styles to avoid blank pages
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fortune Tiles Receipt</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
              background: white !important;
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              min-height: auto !important;
            }
            
            body {
              width: 100%;
              overflow: visible;
              display: flex;
              flex-direction: column;
            }
            
            .receipt {
              width: 100%;
              margin: 0;
              padding: 0;
              background: white;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              page-break-before: avoid !important;
              flex-shrink: 0;
            }
            
            .receipt-watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              width: 80%;
              height: auto;
              opacity: 0.08;
              transform: translate(-50%, -50%);
              pointer-events: none;
              z-index: 0;
            }
            
            .company-header {
              text-align: center;
              margin-bottom: 20px;
              padding: 15px 0;
              position: relative;
              z-index: 1;
            }
            
            .company-header h2 {
              margin: 8px 0;
              font-size: 18px;
              font-weight: bold;
              color: #1a3a52;
            }
            
            .receipt-logo-full {
              width: 120px;
              height: auto;
              margin-bottom: 8px;
            }
            
            .company-details {
              display: block;
              font-size: 11px;
              margin: 8px 0;
              color: #333;
            }
            
            .detail {
              margin: 3px 0;
              line-height: 1.4;
            }
            
            .receipt-divider {
              border-top: 2px solid #333;
              margin: 12px 0;
              position: relative;
            }
            
            .receipt-divider.with-text {
              text-align: center;
              border-top: none;
              height: 20px;
              line-height: 20px;
              margin: 12px 0;
            }
            
            .receipt-divider.with-text span {
              background: white;
              padding: 0 8px;
              font-weight: bold;
              font-size: 12px;
              color: #1a3a52;
              letter-spacing: 0.5px;
            }
            
            .sale-info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin: 15px 0;
              font-size: 11px;
            }
            
            .info-group {
              display: flex;
              gap: 8px;
              margin-bottom: 5px;
            }
            
            .info-group label {
              font-weight: bold;
              min-width: 80px;
              color: #1a3a52;
            }
            
            .info-group .value {
              color: #333;
            }
            
            .items-section {
              margin: 15px 0;
            }
            
            .items-header {
              display: grid;
              grid-template-columns: 2fr 1fr 1fr 1fr;
              padding: 8px;
              font-weight: bold;
              font-size: 11px;
              background: #f5f5f5;
              border: 1px solid #ddd;
              border-radius: 3px;
              margin-bottom: 8px;
              color: #1a3a52;
            }
            
            .item-row {
              display: grid;
              grid-template-columns: 2fr 1fr 1fr 1fr;
              padding: 6px 8px;
              font-size: 11px;
              border-bottom: 1px solid #eee;
              align-items: center;
            }
            
            .item-row:last-child {
              border-bottom: 1px solid #333;
            }
            
            .item-specs {
              font-size: 10px;
              color: #666;
              margin-top: 2px;
              font-style: italic;
            }
            
            .totals-section {
              margin-top: 15px;
              border-top: 2px solid #333;
              padding-top: 10px;
            }
            
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 6px 0;
              font-size: 11px;
            }
            
            .grand-total {
              font-weight: bold;
              font-size: 13px;
              border-top: 2px solid #1a3a52;
              padding-top: 8px;
              margin-top: 8px;
              color: #1a3a52;
            }
            
            .payment-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin: 15px 0;
              font-size: 10px;
            }
            
            .payment-method h3, .bank-details h3 {
              margin: 0 0 6px 0;
              font-size: 11px;
              font-weight: bold;
              color: #1a3a52;
            }
            
            .payment-method-display {
              font-weight: bold;
              padding: 3px 8px;
              border: 1px solid #333;
              border-radius: 3px;
              display: inline-block;
              font-size: 11px;
            }
            
            .terms-section {
              margin: 15px 0;
              font-size: 10px;
            }
            
            .terms-section h3 {
              margin: 0 0 8px 0;
              font-size: 11px;
              font-weight: bold;
              color: #1a3a52;
            }
            
            .terms-section ol {
              padding-left: 18px;
              margin: 5px 0;
              line-height: 1.5;
            }
            
            .thank-you {
              text-align: center;
              margin: 15px 0;
              font-size: 12px;
              page-break-inside: avoid;
            }
            
            .thank-you h3 {
              margin: 0 0 5px 0;
              font-size: 13px;
              color: #1a3a52;
            }
            
            .thank-you p {
              margin: 3px 0;
              color: #666;
            }
            
            .footer-contact {
              text-align: center;
              font-size: 10px;
              margin: 10px 0;
              page-break-inside: avoid;
              color: #666;
            }
            
            .footer-contact p {
              margin: 3px 0;
            }
            
            @media print {
              @page {
                size: A4;
                margin: 5mm;
              }
              
              body, html {
                margin: 0 !important;
                padding: 0 !important;
                height: auto !important;
              }
              
              .receipt {
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
              }
            }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
            
            window.onafterprint = function() {
              setTimeout(function() {
                window.close();
              }, 100);
            };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    setTimeout(() => {
      if (onPrint) onPrint();
    }, 2000);
  };

  if (!sale) return null;

  // Handle different property names between sale and order data formats
  const saleId = receiptData.id;
  const customerName = receiptData.customerName;
  const customerPhone = receiptData.customerPhone;
  const totalAmount = receiptData.totalAmount || receiptData.total;
  const subtotalAmount = receiptData.subtotalAmount;
  const discountType = receiptData.discountType;
  const discountValue = receiptData.discountValue;
  const createdAt = receiptData.createdAt || receiptData.saleDate;
  const paymentMethod = receiptData.paymentMethod;
  const items = receiptData.items || [];
  const cashier = receiptData.user || receiptData.cashier;
  const location = receiptData.location;
  const returns = receiptData.returns || [];

  // Calculate discount amount for display
  const discountAmount = (() => {
    if (!discountType || !discountValue || !subtotalAmount) return 0;
    if (discountType === 'percentage') {
      return (subtotalAmount * discountValue) / 100;
    } else if (discountType === 'amount') {
      return Math.min(discountValue, subtotalAmount);
    }
    return 0;
  })();

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
          {/* Watermark behind receipt content */}
          <img
            src="/inventory/assets/logo.png"
            alt=""
            className="receipt-watermark"
          />

          {/* Company Header */}
          <div className="company-header">
            {/* Full logo for receipt header */}
            <img
              src="/inventory/assets/logo.png"
              alt="Fortune Tiles"
              className="receipt-logo-full"
            />
            <h2>Fortune et Feveur</h2>
            <div className="company-details">
              <div className="detail">
                <span className="icon">📍</span>
                <span>Lekki-Epe Expressway, Opp Sapphire Garden Beside Danco Petrol Station, Awoyaya Lagos State</span>
              </div>
              <div className="detail">
                <span className="icon">📞</span>
                <span>+234 806 219 5610</span>
              </div>
              <div className="detail">
                <span className="icon">📧</span>
                <span>Fortuneetfeveur@gmail.com</span>
              </div>
              <div className="detail">
                <span className="icon">🌐</span>
                <span>www.fortuneetfeveur.com</span>
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
              <span>₦{parseFloat(subtotalAmount || totalAmount).toLocaleString()}</span>
            </div>
            {discountAmount > 0 && (
              <div className="total-row discount">
                <span>Discount{discountType === 'percentage' ? ` (${discountValue}%)` : ''}:</span>
                <span>-₦{parseFloat(discountAmount).toLocaleString()}</span>
              </div>
            )}
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
              <p>For inquiries, call: +234 806 219 5610</p>
              <p>Follow us on social media @FortunetilesNG</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Receipt;
