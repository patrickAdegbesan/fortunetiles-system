const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const engine = require('../sync');

const router = express.Router();

// GET /api/sync/status - what the sync button at the top shows (any signed-in user)
router.get('/status', authenticateToken, async (req, res) => {
  try {
    res.json(await engine.status());
  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({ message: 'Could not read the sync status' });
  }
});

// POST /api/sync/run - sync now (any signed-in user)
router.post('/run', authenticateToken, async (req, res) => {
  try {
    const result = await engine.run();
    res.json({ ...result, status: await engine.status() });
  } catch (error) {
    res.status(200).json({ failed: true, message: error.message, status: await engine.status() });
  }
});

// POST /api/sync/choose - owner decides what to keep when this device and the cloud both already hold data.
// choice: 'use-cloud' (this device takes the cloud's data) or 'use-device' (the cloud takes this device's data)
router.post('/choose', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    const choice = req.body?.choice === 'use-device' ? 'use-device' : 'use-cloud';
    const result = await engine.choose(choice);
    res.json({ ...result, status: await engine.status() });
  } catch (error) {
    res.status(200).json({ failed: true, message: error.message, status: await engine.status() });
  }
});

// POST /api/sync/resync - owner re-reads everything from the cloud
router.post('/resync', authenticateToken, requireRole(['owner']), async (req, res) => {
  try {
    res.json({ ...(await engine.resync()), status: await engine.status() });
  } catch (error) {
    res.status(200).json({ failed: true, message: error.message, status: await engine.status() });
  }
});

module.exports = router;
