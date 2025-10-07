# Fortune Tiles Historical Data Seeder

## Overview

This comprehensive data seeding script generates **3+ years of realistic business data** (January 2022 - August 2025) for the Fortune Tiles Inventory Management System. It creates a complete business scenario with customers, sales, inventory movements, returns, and financial patterns that mirror real-world operations.

## 🎯 What Gets Created

### Business Entities
- **3 Locations**: Main Warehouse, Lagos Showroom, Ikeja Branch
- **8 Users**: 1 Owner, 2 Managers, 5 Staff members
- **7 Product Types**: Floor Tiles, Wall Tiles, Basins, Baths, Showers, Mixers, Cisterns
- **16 Products**: Realistic inventory across all categories

### Realistic Data Patterns
- **2,000+ Sales**: Distributed over 42+ months
- **Business Growth**: 2% monthly growth (first year), then 1% monthly
- **Seasonal Variations**: Higher sales in dry season (Nov-May)
- **Customer Types**: Retail, Contractor, Wholesale with different buying patterns
- **Returns**: 3% of sales have partial/full returns
- **Discounts**: 15% of sales have 5-20% discounts
- **Inventory Movements**: Stock receipts, breakages, transfers

### Financial Patterns
- **Revenue Range**: ₦50,000 - ₦800,000 per sale
- **Payment Methods**: Cash, Bank Transfer, POS, Card
- **Total Revenue**: Approximately ₦300-500 million over 3+ years
- **Realistic Growth**: Shows clear business expansion trends

## 🚀 Quick Start

### Option 1: Windows Batch File (Easiest)
```bash
# Double-click or run:
seed-historical-data.bat
```

### Option 2: Node.js Script
```bash
# From project root:
node runHistoricalSeeder.js
```

### Option 3: Direct Execution
```bash
# From backend directory:
cd backend
node seedHistoricalData.js
```

## ⚠️ Important Notes

### Before Running
1. **Backup your data**: This script will clean ALL existing data
2. **Database setup**: Ensure PostgreSQL is running and configured
3. **Environment variables**: Set up your `.env` file with database credentials
4. **Dependencies**: Run `npm install` in both backend and frontend directories

### Database Requirements
```env
# Required environment variables:
DB_NAME=your_database_name
DB_USER=your_username
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432

# OR single DATABASE_URL:
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

## 📊 Expected Results

### Dashboard Analytics
After seeding, your dashboard will show:
- **Revenue trends** with realistic growth patterns
- **Monthly sales** data spanning 42+ months
- **Top products** based on actual sales volume
- **Location performance** with different sales patterns
- **Low stock alerts** for products below threshold
- **Recent activity** with historical transactions

### Sales Reports
- **Date range filtering** works with 3+ years of data
- **Growth analysis** shows clear business expansion
- **Product performance** based on realistic sales patterns
- **Customer analysis** across different segments
- **Return tracking** with proper audit trails

### Inventory Management
- **Current stock levels** reflect sales activity
- **Inventory logs** show complete audit trails
- **Movement tracking** for receipts, sales, damages
- **Location-based** inventory distribution
- **Reorder alerts** for low-stock items

## 🔧 Customization Options

### Modify Data Volume
Edit `CONFIG` in `seedHistoricalData.js`:
```javascript
const CONFIG = {
  START_DATE: new Date('2022-01-01'),
  END_DATE: new Date('2025-08-31'),
  TOTAL_SALES_TARGET: 2000,    // Adjust number of sales
  RETURN_RATE: 0.03,           // 3% return rate
  DISCOUNT_RATE: 0.15,         // 15% discount rate
  BREAKAGE_RATE: 0.025         // 2.5% monthly breakage
};
```

### Add More Products
Extend `PRODUCTS_DATA` array with additional items:
```javascript
{ 
  name: 'New Product Name', 
  productType: 'Floor Tiles', 
  price: 12000, 
  categories: ['Tiles', 'Premium'], 
  supplierCode: 'NPT-001' 
}
```

### Adjust Business Patterns
Modify the weight functions:
- `getBusinessDayWeight()`: Weekend vs weekday sales
- `getSeasonalWeight()`: Seasonal variations
- `getGrowthMultiplier()`: Business growth patterns

## 📈 Performance Metrics

### Execution Time
- **Small dataset** (500 sales): ~30 seconds
- **Standard dataset** (2,000 sales): ~2-5 minutes
- **Large dataset** (5,000+ sales): ~10+ minutes

### System Requirements
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Database**: PostgreSQL 10+ with sufficient storage
- **Node.js**: Version 14+ recommended

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Error
```
Error: Unable to connect to the database
```
**Solution**: Check your environment variables and ensure PostgreSQL is running.

#### Out of Memory Error
```
JavaScript heap out of memory
```
**Solution**: Reduce `TOTAL_SALES_TARGET` or run with more memory:
```bash
node --max-old-space-size=4096 seedHistoricalData.js
```

#### Foreign Key Constraint Error
```
Error: insert or update on table violates foreign key constraint
```
**Solution**: Ensure the database is clean or run the cleaning function first.

### Debug Mode
Enable detailed logging by setting:
```bash
NODE_ENV=development
```

## 📁 File Structure

```
fortunetiles-system/
├── seed-historical-data.bat          # Windows batch runner
├── runHistoricalSeeder.js           # Interactive seeder runner
└── backend/
    ├── seedHistoricalData.js        # Main seeding script
    └── models/                      # Sequelize models
```

## 🎯 Business Scenarios Created

### Retail Customers
- **Profile**: Individual buyers, small quantities
- **Purchase pattern**: 1-3 items per sale
- **Average value**: ₦50,000 - ₦200,000
- **Discount rate**: 10%

### Contractors
- **Profile**: Construction companies, medium quantities
- **Purchase pattern**: 2-5 items per sale
- **Average value**: ₦100,000 - ₦400,000
- **Discount rate**: 20%

### Wholesale Customers
- **Profile**: Resellers, large quantities
- **Purchase pattern**: 3-8 items per sale
- **Average value**: ₦200,000 - ₦800,000
- **Discount rate**: 40%

## 🔄 Data Maintenance

### Regular Updates
To add more recent data, modify the `END_DATE` and run again:
```javascript
END_DATE: new Date('2025-12-31')  // Extend to end of 2025
```

### Incremental Seeding
The script supports partial cleaning by commenting out specific cleanup operations in `cleanExistingData()`.

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your environment setup
3. Review the console output for specific error messages
4. Ensure sufficient system resources

## 🎉 Success Indicators

You'll know the seeding was successful when you see:
- ✅ All creation messages in console
- 📊 Summary report with statistics
- 💰 Total revenue calculation
- 📅 Monthly trends display
- 🎯 "Seeding completed successfully!" message

After successful seeding, start your application and enjoy testing with realistic business data!