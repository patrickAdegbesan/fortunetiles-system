const express = require('express');
const cache = require('../middleware/enhancedCache');
const { sequelize } = require('../config/database');

const router = express.Router();

// Performance monitoring endpoint
router.get('/performance', async (req, res) => {
  try {
    const stats = {
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      },
      cache: cache.getStats(),
      database: {
        connectionPool: {
          total: sequelize.connectionManager.pool?.size || 0,
          used: sequelize.connectionManager.pool?.used || 0,
          waiting: sequelize.connectionManager.pool?.waiting || 0
        }
      }
    };

    // Add database query timing test
    const dbStartTime = Date.now();
    await sequelize.query('SELECT 1 as test');
    stats.database.queryTime = Date.now() - dbStartTime;

    res.json({
      message: 'Performance stats retrieved',
      stats,
      suggestions: generatePerformanceSuggestions(stats)
    });

  } catch (error) {
    console.error('Performance stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Cache warming endpoint (for production optimization)
router.post('/warm-cache', async (req, res) => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      return res.status(403).json({ message: 'Cache warming only available in production' });
    }

    const { Location, ProductType } = require('../models');
    
    const criticalQueries = [
      {
        key: 'locations:all',
        queryFn: async () => Location.findAll({ attributes: ['id', 'name', 'createdAt'] }),
        ttl: 1200000 // 20 minutes
      },
      {
        key: 'product-types:all',
        queryFn: async () => ProductType.findAll({ attributes: ['id', 'name', 'createdAt'] }),
        ttl: 1200000 // 20 minutes
      }
    ];

    await cache.preWarmCache(criticalQueries);

    res.json({
      message: 'Cache warmed successfully',
      warmed: criticalQueries.map(q => q.key),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cache warming error:', error);
    res.status(500).json({ message: 'Cache warming failed' });
  }
});

function generatePerformanceSuggestions(stats) {
  const suggestions = [];

  // Memory usage suggestions
  if (stats.server.memory.heapUsed / stats.server.memory.heapTotal > 0.9) {
    suggestions.push({
      type: 'memory',
      message: 'High memory usage detected. Consider implementing memory cleanup.',
      priority: 'high'
    });
  }

  // Database suggestions
  if (stats.database.queryTime > 100) {
    suggestions.push({
      type: 'database',
      message: `Database query time is ${stats.database.queryTime}ms. Consider query optimization.`,
      priority: 'medium'
    });
  }

  // Cache suggestions
  if (stats.cache.size === 0) {
    suggestions.push({
      type: 'cache',
      message: 'Cache is empty. Consider warming up frequently accessed data.',
      priority: 'low'
    });
  }

  return suggestions;
}

module.exports = router;