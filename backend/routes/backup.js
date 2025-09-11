const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { auth, requireRole } = require('../middleware/auth');
const { 
  User, 
  Location, 
  Product, 
  Inventory, 
  InventoryLog, 
  Sale, 
  SaleItem 
} = require('../models');

const router = express.Router();

// GET /api/backup/export - Export all data as JSON
router.get('/export', auth, requireRole(['owner', 'manager']), async (req, res) => {
  try {
    console.log('Starting data export...');

    // Export all core data
    const [users, locations, products, inventory, inventoryLogs, sales, saleItems] = await Promise.all([
      User.findAll({ 
        attributes: { exclude: ['password'] }, // Don't export passwords
        order: [['id', 'ASC']] 
      }),
      Location.findAll({ order: [['id', 'ASC']] }),
      Product.findAll({ order: [['id', 'ASC']] }),
      Inventory.findAll({ order: [['id', 'ASC']] }),
      InventoryLog.findAll({ order: [['id', 'ASC']] }),
      Sale.findAll({ order: [['id', 'ASC']] }),
      SaleItem.findAll({ order: [['id', 'ASC']] })
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      tables: {
        users: users.map(u => u.toJSON()),
        locations: locations.map(l => l.toJSON()),
        products: products.map(p => p.toJSON()),
        inventory: inventory.map(i => i.toJSON()),
        inventoryLogs: inventoryLogs.map(il => il.toJSON()),
        sales: sales.map(s => s.toJSON()),
        saleItems: saleItems.map(si => si.toJSON())
      },
      summary: {
        totalUsers: users.length,
        totalLocations: locations.length,
        totalProducts: products.length,
        totalInventoryRecords: inventory.length,
        totalSales: sales.length,
        totalSaleItems: saleItems.length
      }
    };

    // Set headers for file download
    const filename = `fortune-tiles-backup-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.json(exportData);
    console.log(`✅ Data export completed: ${filename}`);

  } catch (error) {
    console.error('❌ Backup export failed:', error);
    res.status(500).json({ 
      message: 'Failed to export backup data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/backup/sql - Export database as SQL dump (if pg_dump is available)
router.get('/sql', auth, requireRole(['owner']), async (req, res) => {
  try {
    const { spawn } = require('child_process');
    
    // Only works if DATABASE_URL is available (production)
    if (!process.env.DATABASE_URL) {
      return res.status(400).json({ 
        message: 'SQL export only available in production with DATABASE_URL' 
      });
    }

    const filename = `fortune-tiles-sql-backup-${new Date().toISOString().split('T')[0]}.sql`;
    
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Use pg_dump to create SQL backup
    const pgDump = spawn('pg_dump', [process.env.DATABASE_URL]);
    
    pgDump.stdout.pipe(res);
    
    pgDump.stderr.on('data', (data) => {
      console.error('pg_dump error:', data.toString());
    });

    pgDump.on('close', (code) => {
      if (code !== 0) {
        console.error(`pg_dump exited with code ${code}`);
      } else {
        console.log(`✅ SQL backup completed: ${filename}`);
      }
    });

  } catch (error) {
    console.error('❌ SQL backup failed:', error);
    res.status(500).json({ 
      message: 'Failed to create SQL backup',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
