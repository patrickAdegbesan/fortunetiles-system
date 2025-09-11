import React from 'react';
import '../styles/Receipt.css';

const Receipt = ({ sale, onPrint, onClose }) => {
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
    window.print();
    if (onPrint) onPrint();
  };

  if (!sale) return null;

  return (
    <div className="receipt-overlay">
      <div className="receipt-container">
        <div className="receipt-header">
          <button className="close-btn" onClick={onClose}>×</button>
          <button className="print-btn" onClick={handlePrint}>
            <span className="icon">🖨️</span>
            <span className="text">Print Receipt</span>
          </button>
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
                  <span className="value">FT-{sale.id.toString().padStart(6, '0')}</span>
                </div>
                <div className="info-group">
                  <label>Date:</label>
                  <span className="value">{formatDate(sale.createdAt)}</span>
                </div>
                <div className="info-group">
                  <label>Location:</label>
                  <span className="value">{sale.location?.name || 'Main Warehouse'}</span>
                </div>
              </div>
              <div className="info-column">
                <div className="info-group">
                  <label>Customer:</label>
                  <span className="value">{sale.customerName}</span>
                </div>
                {sale.customerPhone && (
                  <div className="info-group">
                    <label>Phone:</label>
                    <span className="value">{sale.customerPhone}</span>
                  </div>
                )}
                <div className="info-group">
                  <label>Served by:</label>
                  <span className="value">{sale.user?.firstName} {sale.user?.lastName}</span>
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
                {sale.items?.map((item, index) => (
                  <div key={index} className="item-row">
                    <div className="col-item">
                      <div className="item-name">{item.product?.name}</div>
                      <div className="item-specs">
                        {Object.entries(item.product?.customAttributes || {}).map(([key, value], i, arr) => (
                          <React.Fragment key={key}>
                            <span>{key}: {value}</span>
                            {i < arr.length - 1 && <span> | </span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    <div className="col-qty">
                      {item.quantity} {item.unit}
                    </div>
                    <div className="col-price">
                      ₦{parseFloat(item.unitPrice).toLocaleString()}
                    </div>
                    <div className="col-total">
                      ₦{parseFloat(item.lineTotal).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>

              <div className="totals-section">
                <div className="total-row subtotal">
                  <span>Subtotal:</span>
                  <span>₦{parseFloat(sale.totalAmount).toLocaleString()}</span>
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
                  <span>₦{parseFloat(sale.totalAmount).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="payment-info">
              <div className="payment-method">
                <h3>Payment Method</h3>
                <div className="payment-details">
                  <label>
                    <input type="checkbox" checked readOnly /> Cash
                  </label>
                  <label>
                    <input type="checkbox" readOnly /> Bank Transfer
                  </label>
                  <label>
                    <input type="checkbox" readOnly /> POS
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
                <li>No refund after payment, exchange only</li>
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
    </div>
  );
};

export default Receipt;
