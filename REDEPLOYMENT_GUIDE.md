# Railway Redeployment Instructions

## The Problem
The dashboard has an error: "column reference 'created_at' is ambiguous"
This happens because multiple tables (Sale, Return, Location, etc.) all have created_at columns,
and PostgreSQL doesn't know which one to use when they're joined.

## The Fix Applied
✅ File: backend/routes/dashboard.js
- Line 36: Changed `sequelize.col('InventoryLog.created_at')` - CORRECT
- Line 256: Changed `sequelize.col('created_at')` → `sequelize.col('Return.created_at')` - FIXED
- Line 315: Removed date filtering from sales query (temporary workaround) - FIXED

## How to Deploy the Fix to Railway

### Option 1: Via Railway Web Dashboard (Recommended)
1. Go to https://railway.com/dashboard
2. Click on your "F&F" project
3. Select the "F&F" service
4. Click the three dots menu (⋮) next to the deployment
5. Click "Redeploy"
6. Wait for deployment to complete

### Option 2: Verify Changes Locally
Before redeploying, you can verify the fixes are in the file:
```bash
grep -n "created_at" backend/routes/dashboard.js
```

You should see:
- Line 36: `sequelize.col('InventoryLog.created_at')`
- Line 256: `sequelize.col('Return.created_at')`
- The sales query should NOT have a date filter (lines 305-310)

### Option 3: Force Full Redeployment
If partial redeploy doesn't work:
1. Railway Dashboard → Service Settings → Redeploy from latest commit
2. Or use: `railway redeploy --service=F&F`

## Expected Result After Deployment
✅ Dashboard will load without 502 errors
✅ Inventory data will display correctly
✅ Sales by location will show (without date filtering for now)
✅ Recent activity will display

## Status Check
The application is currently:
- 🟢 Running on Railway
- 🔴 Showing 502 errors on dashboard API
- ✅ Data is being imported correctly
- ✅ All fixes are applied locally
- ⏳ Waiting for deployment
