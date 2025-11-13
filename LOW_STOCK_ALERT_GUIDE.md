# Low Stock Alert System - Complete Guide
**Fortune Tiles Inventory Management**

---

## 📊 Overview

The low stock alert system automatically detects and displays products that are running low on inventory. It categorizes items into three severity levels and displays them prominently on the dashboard.

---

## 🎯 How It Works

### 1. **Backend Logic** (`backend/routes/dashboard.js`)

The dashboard endpoint calculates low stock items with the following logic:

#### Step 1: Fetch All Products
```javascript
const allProducts = await Product.findAll({
  attributes: ['id', 'name', 'price', 'attributes']
});
```
Gets all products in the system.

#### Step 2: Get Inventory Data
```javascript
const rawLowStock = await Inventory.findAll({
  attributes: [
    'id',
    'productId',
    [sequelize.fn('SUM', sequelize.col('quantitySqm')), 'totalQuantity']
  ],
  group: ['Inventory.productId', 'Inventory.id', 'product.id']
});
```
Aggregates inventory quantities by product (sums across all locations).

#### Step 3: Create Inventory Map
```javascript
const inventoryMap = rawLowStock.reduce((acc, item) => {
  const key = item.productId;
  if (!acc[key]) {
    acc[key] = {
      productId: item.productId,
      totalQuantity: 0,
      product: item.product
    };
  }
  acc[key].totalQuantity += parseFloat(item.dataValues.totalQuantity || 0);
  return acc;
}, {});
```
Maps products to their total quantities.

#### Step 4: Filter for Low Stock (≤ 10)
```javascript
const aggregatedLowStock = completeProductList
  .filter(item => item.totalQuantity <= 10)
  .sort((a, b) => a.totalQuantity - b.totalQuantity);
```
**Threshold: 10 sqm or units**

Only products with 10 or fewer units are flagged.

#### Step 5: Categorize by Severity
```javascript
const stockStatus = totalQuantity <= 0 ? 'OUT_OF_STOCK' : 
                   totalQuantity <= 3 ? 'CRITICAL' : 'LOW';
```

**Three Categories:**
- 🔴 **OUT_OF_STOCK** - Quantity = 0 (Priority: 3)
- 🟠 **CRITICAL** - Quantity 1-3 (Priority: 2)
- 🟡 **LOW** - Quantity 4-10 (Priority: 1)

#### Step 6: Sort by Priority
```javascript
.sort((a, b) => {
  if (b.priority !== a.priority) {
    return b.priority - a.priority;  // Out of stock first
  }
  return b.totalSalesVolume - a.totalSalesVolume;  // Then by sales volume
});
```

**Sort Order:**
1. Out of stock items (highest priority)
2. Critical items
3. Low stock items
4. Within each category, by sales volume

---

## 📱 Frontend Display (`frontend/src/components/DashboardStats.js`)

### Alert Card
```javascript
<div className="stat-card alerts">
  <h3>LOW STOCK ITEMS</h3>
  <p className="stat-number">{lowStockItems.length}</p>
  <span className="stat-unit">items need attention</span>
</div>
```

Shows total count of low stock items.

### Alert Summary
```javascript
<span className="alert-summary">
  ({outOfStockCount} out of stock, {criticalStockCount} critical)
</span>
```

Breaks down by severity:
- Out of stock count
- Critical count

### Low Stock Grid
```javascript
{lowStockItems.slice(0, 12).filter(item => item && item.id).map(item => {
  const stockStatus = item.stockStatus;
  const quantity = parseFloat(item.quantitySqm || 0);
  
  return (
    <div className={`low-stock-item-compact ${stockStatus.toLowerCase()}`}>
      <div className="product-name">{item.productName}</div>
      <div className="stock-info">
        <span className={`quantity-compact ${stockStatus}`}>
          {quantity.toFixed(quantity % 1 === 0 ? 0 : 1)}
        </span>
        <span className="stock-status">
          {stockStatus === 'OUT_OF_STOCK' ? '🔴 Out' : 
           stockStatus === 'CRITICAL' ? '⚠️ Critical' : '📉 Low'}
        </span>
      </div>
    </div>
  );
})}
```

**Features:**
- Displays up to 12 items
- Shows product name
- Shows current quantity
- Shows status with emoji indicator
- Color-coded by severity

### More Items Indicator
```javascript
{lowStockItems.length > 12 && (
  <p className="more-items">
    +{lowStockItems.length - 12} more items need attention
  </p>
)}
```

If more than 12 items, shows count of remaining items.

---

## 🔄 Data Flow

```
Dashboard Page
    ↓
fetchDashboardData() API call
    ↓
Backend: GET /api/dashboard
    ↓
1. Fetch all products
2. Get inventory data (aggregated by product)
3. Filter: quantity ≤ 10
4. Categorize: OUT_OF_STOCK | CRITICAL | LOW
5. Sort by priority
    ↓
Return: lowStockItems array
    ↓
Frontend: DashboardStats component
    ↓
Display alerts with color coding
```

---

## 📊 Data Structure

### Low Stock Item Object
```javascript
{
  id: 1,                          // Product ID
  productId: 1,
  quantitySqm: 5,                 // Current quantity
  productName: "Tiled Marble Tile",
  customAttributes: {
    color: "White",
    size: "600x600"
  },
  location: { name: "All Locations" },
  totalSalesVolume: 0,            // For future prioritization
  stockStatus: "CRITICAL",        // OUT_OF_STOCK | CRITICAL | LOW
  priority: 2                     // 3 = OUT_OF_STOCK, 2 = CRITICAL, 1 = LOW
}
```

### Dashboard Summary
```javascript
summary: {
  totalSales: 150,
  totalRevenue: 500000,
  totalDiscount: 50000,
  totalStockValue: 2000000,
  lowStockCount: 15,              // Total items ≤ 10
  outOfStockCount: 3,             // Items = 0
  criticalStockCount: 7,          // Items 1-3
  productsInStock: 250,           // Items > 0
  totalProductsWithInventoryRecords: 280
}
```

---

## 🎨 Visual Indicators

| Status | Color | Emoji | Quantity Range |
|--------|-------|-------|-----------------|
| **OUT_OF_STOCK** | 🔴 Red | 🔴 | 0 |
| **CRITICAL** | 🟠 Orange | ⚠️ | 1-3 |
| **LOW** | 🟡 Yellow | 📉 | 4-10 |

---

## ⚙️ Configuration

### Threshold (Hard-coded)
```javascript
// Line 203 in dashboard.js
.filter(item => item.totalQuantity <= 10)
```

**Current threshold: 10 units**

To change, modify this line to a different value.

### Alternative Endpoint
There's also a dedicated low-stock endpoint:
```javascript
GET /api/inventory/low-stock?threshold=100
```

This allows custom thresholds per request.

---

## 🔍 Filtering & Filtering

### Location Filter
```javascript
if (locationId && locationId !== 'all') {
  inventoryWhereClause.locationId = parseInt(locationId);
}
```

- **'all'** = Aggregate across all locations
- **Specific ID** = Only that location's inventory

### Category Filter
```javascript
if (category && category !== 'all') {
  productWhereClause.categories = { [Op.contains]: [category] };
}
```

- Filters products by category
- Low stock items only from selected category

### Date Range Filter
```javascript
if (startDate && endDate) {
  logWhereClause[Op.and] = [
    sequelize.where(sequelize.col('InventoryLog.created_at'), 
      { [Op.between]: [startDateTime, endDateTime] })
  ];
}
```

- Filters activity logs by date
- Does NOT affect low stock calculation (always current)

---

## 📈 Example Scenarios

### Scenario 1: Out of Stock
```
Product: "Granite Tile 800x800"
Quantity: 0
Status: OUT_OF_STOCK
Display: 🔴 Out
Priority: Highest (shown first)
```

### Scenario 2: Critical Stock
```
Product: "Marble Tile 600x600"
Quantity: 2.5 sqm
Status: CRITICAL
Display: ⚠️ Critical
Priority: High (shown second)
```

### Scenario 3: Low Stock
```
Product: "Ceramic Tile 300x300"
Quantity: 8 sqm
Status: LOW
Display: 📉 Low
Priority: Medium (shown third)
```

---

## 🐛 Troubleshooting

### Issue: Low stock items not showing
**Possible causes:**
1. All products have > 10 units
2. No inventory records exist
3. Inventory data not synced

**Solution:**
- Check inventory records in database
- Verify products have inventory entries
- Check if threshold is too high

### Issue: Incorrect quantities
**Possible causes:**
1. Inventory not aggregated across locations
2. Recent inventory changes not reflected
3. Database sync issue

**Solution:**
- Refresh dashboard
- Check inventory logs
- Verify database connection

### Issue: Wrong priority order
**Possible causes:**
1. Sales volume calculation not implemented (TODO)
2. Priority sorting logic issue

**Solution:**
- Currently sorts by status only
- Sales volume sorting is planned (TODO)

---

## 🚀 Future Enhancements

### Planned Features
1. **Sales Volume Calculation** (TODO: Line 209)
   ```javascript
   const totalSalesVolume = 0; // TODO: Calculate sales volume separately
   ```
   - Prioritize fast-moving items
   - Show which low-stock items sell most

2. **Configurable Thresholds**
   - Different thresholds per product
   - Different thresholds per category
   - User-defined thresholds

3. **Automated Alerts**
   - Email notifications
   - SMS alerts
   - In-app notifications

4. **Reorder Suggestions**
   - Recommended reorder quantity
   - Supplier information
   - Estimated delivery time

5. **Historical Trends**
   - Stock level history
   - Consumption rate
   - Seasonal patterns

---

## 📝 API Endpoints

### Dashboard Endpoint
```
GET /api/dashboard
Query Parameters:
  - locationId: (optional) Location ID or 'all'
  - category: (optional) Product category or 'all'
  - startDate: (optional) YYYY-MM-DD
  - endDate: (optional) YYYY-MM-DD

Response:
{
  lowStockItems: [...],
  summary: {
    lowStockCount: number,
    outOfStockCount: number,
    criticalStockCount: number,
    ...
  },
  ...
}
```

### Low Stock Endpoint
```
GET /api/inventory/low-stock
Query Parameters:
  - locationId: (optional) Location ID
  - threshold: (optional, default: 100) Quantity threshold

Response:
{
  items: [
    {
      id: number,
      productName: string,
      quantitySqm: number,
      location: string,
      ...
    }
  ]
}
```

---

## 💡 Key Takeaways

✅ **What it does:**
- Monitors all product inventory in real-time
- Categorizes items by severity (Out of Stock, Critical, Low)
- Displays alerts on dashboard
- Supports filtering by location and category

✅ **How it works:**
- Aggregates inventory across locations
- Compares against 10-unit threshold
- Sorts by priority (out of stock first)
- Updates on every dashboard load

✅ **What to watch:**
- Threshold is hard-coded (currently 10)
- Sales volume sorting not yet implemented
- No automated alerts (planned)
- Filters don't affect low stock calculation (always current)

---

**Questions?** Check the backend code at `backend/routes/dashboard.js` (lines 150-232) or frontend at `frontend/src/components/DashboardStats.js` (lines 92-134).
