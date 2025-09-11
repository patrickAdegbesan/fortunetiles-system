// Simple export utilities without external dependencies
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = (reportData, reportType, dateRange) => {
  // Simple PDF export using browser print functionality
  const printWindow = window.open('', '_blank');
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount || 0);
  };

  const formatNumber = (number, decimals = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(number || 0);
  };

  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Fortune Tiles - ${reportType} Report</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px; 
          color: #333;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px;
          border-bottom: 2px solid #667eea;
          padding-bottom: 20px;
        }
        .header h1 { 
          color: #667eea; 
          margin: 0;
        }
        .period { 
          color: #666; 
          margin: 10px 0;
        }
        .summary-section {
          margin: 30px 0;
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-top: 15px;
        }
        .summary-item {
          text-align: center;
          padding: 15px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }
        .summary-label {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 5px;
        }
        .summary-value {
          font-size: 1.5rem;
          font-weight: bold;
          color: #667eea;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0;
        }
        th, td { 
          border: 1px solid #ddd; 
          padding: 12px; 
          text-align: left;
        }
        th { 
          background-color: #f7fafc; 
          font-weight: bold;
        }
        tr:nth-child(even) { 
          background-color: #f9f9f9; 
        }
        .section-title {
          color: #333;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 10px;
          margin: 30px 0 15px 0;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Fortune Tiles Business Report</h1>
        <h2>${reportType.replace('-', ' ').toUpperCase()}</h2>
        <div class="period">
          Period: ${new Date(dateRange.startDate).toLocaleDateString()} - ${new Date(dateRange.endDate).toLocaleDateString()}
        </div>
        <div class="period">Generated on: ${new Date().toLocaleString()}</div>
      </div>
  `;

  // Add report-specific content
  if (reportType === 'sales-daily' && reportData.summary) {
    htmlContent += `
      <div class="summary-section">
        <h3>Summary</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Total Revenue</div>
            <div class="summary-value">${formatCurrency(reportData.summary.totalRevenue)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Transactions</div>
            <div class="summary-value">${reportData.summary.totalTransactions}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Average Order Value</div>
            <div class="summary-value">${formatCurrency(reportData.summary.averageOrderValue)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Peak Order Value</div>
            <div class="summary-value">${formatCurrency(reportData.summary.maxOrderValue)}</div>
          </div>
        </div>
      </div>

      <h3 class="section-title">Daily Sales Breakdown</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Sales Count</th>
            <th>Revenue</th>
            <th>Average Order Value</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.dailySales.map(day => `
            <tr>
              <td>${new Date(day.date).toLocaleDateString()}</td>
              <td>${day.totalSales}</td>
              <td>${formatCurrency(day.totalRevenue)}</td>
              <td>${formatCurrency(day.averageOrderValue)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  if (reportType === 'inventory-valuation' && reportData.summary) {
    htmlContent += `
      <div class="summary-section">
        <h3>Summary</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Total Inventory Value</div>
            <div class="summary-value">${formatCurrency(reportData.summary.totalValuation)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Quantity</div>
            <div class="summary-value">${formatNumber(reportData.summary.totalQuantity)} sqm</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Active Products</div>
            <div class="summary-value">${reportData.summary.activeProducts}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Average Value per sqm</div>
            <div class="summary-value">${formatCurrency(reportData.summary.averageValuePerSqm)}</div>
          </div>
        </div>
      </div>

      <h3 class="section-title">Category Breakdown</h3>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Products</th>
            <th>Quantity (sqm)</th>
            <th>Total Value</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.categoryBreakdown.map(category => `
            <tr>
              <td>${category.category}</td>
              <td>${category.productCount}</td>
              <td>${formatNumber(category.totalQuantity)}</td>
              <td>${formatCurrency(category.totalValue)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  if (reportType === 'profit-margin' && reportData.summary) {
    htmlContent += `
      <div class="summary-section">
        <h3>Summary</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Total Revenue</div>
            <div class="summary-value">${formatCurrency(reportData.summary.totalRevenue)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Profit</div>
            <div class="summary-value">${formatCurrency(reportData.summary.totalProfit)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Profit Margin</div>
            <div class="summary-value">${formatNumber(reportData.summary.overallProfitMargin)}%</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Avg Profit per Transaction</div>
            <div class="summary-value">${formatCurrency(reportData.summary.averageProfitPerTransaction)}</div>
          </div>
        </div>
      </div>

      <h3 class="section-title">Category Profitability</h3>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Revenue</th>
            <th>Profit</th>
            <th>Margin %</th>
            <th>Items Sold</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.categoryProfitability.map(category => `
            <tr>
              <td>${category.category}</td>
              <td>${formatCurrency(category.totalRevenue)}</td>
              <td>${formatCurrency(category.totalProfit)}</td>
              <td>${formatNumber(category.profitMargin)}%</td>
              <td>${category.itemCount}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  if (reportType === 'top-products' && reportData.topProductsByRevenue) {
    htmlContent += `
      <h3 class="section-title">Top Products by Revenue</h3>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Product Name</th>
            <th>Category</th>
            <th>Revenue</th>
            <th>Quantity Sold</th>
            <th>Transactions</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.topProductsByRevenue.map((product, index) => `
            <tr>
              <td>#${index + 1}</td>
              <td>${product.productName}</td>
              <td>${product.category}</td>
              <td>${formatCurrency(product.totalRevenue)}</td>
              <td>${formatNumber(product.totalQuantitySold)} sqm</td>
              <td>${product.totalTransactions}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h3 class="section-title">Category Performance</h3>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Revenue</th>
            <th>Quantity Sold</th>
            <th>Transactions</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.categoryPerformance.map(category => `
            <tr>
              <td>${category.category}</td>
              <td>${formatCurrency(category.totalRevenue)}</td>
              <td>${formatNumber(category.totalQuantitySold)} sqm</td>
              <td>${category.totalTransactions}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  htmlContent += `
      <div class="no-print" style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">Print Report</button>
        <button onclick="window.close()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Auto-print after a short delay
  setTimeout(() => {
    printWindow.print();
  }, 500);
};

export const exportToExcel = (reportData, reportType, dateRange) => {
  // Simple Excel export using CSV format with .xls extension
  let csvData = [];
  
  if (reportType === 'sales-daily' && reportData.dailySales) {
    csvData = reportData.dailySales.map(day => ({
      Date: new Date(day.date).toLocaleDateString(),
      'Sales Count': day.totalSales,
      Revenue: day.totalRevenue,
      'Average Order Value': day.averageOrderValue
    }));
  } else if (reportType === 'inventory-valuation' && reportData.categoryBreakdown) {
    csvData = reportData.categoryBreakdown.map(category => ({
      Category: category.category,
      'Product Count': category.productCount,
      'Quantity (sqm)': category.totalQuantity,
      'Total Value': category.totalValue
    }));
  } else if (reportType === 'profit-margin' && reportData.categoryProfitability) {
    csvData = reportData.categoryProfitability.map(category => ({
      Category: category.category,
      Revenue: category.totalRevenue,
      Profit: category.totalProfit,
      'Margin %': category.profitMargin,
      'Items Sold': category.itemCount
    }));
  } else if (reportType === 'top-products' && reportData.topProductsByRevenue) {
    csvData = reportData.topProductsByRevenue.map((product, index) => ({
      Rank: index + 1,
      'Product Name': product.productName,
      Category: product.category,
      Revenue: product.totalRevenue,
      'Quantity Sold': product.totalQuantitySold,
      Transactions: product.totalTransactions
    }));
  }

  if (csvData.length > 0) {
    const filename = `fortune-tiles-${reportType}-${dateRange.startDate}-to-${dateRange.endDate}`;
    exportToCSV(csvData, filename);
  } else {
    alert('No data available to export');
  }
};
