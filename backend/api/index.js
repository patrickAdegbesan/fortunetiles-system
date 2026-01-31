// Vercel serverless function - minimal handler
const path = require('path');
const fs = require('fs');

module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = req.url || '/';
  
  // API endpoint - placeholder
  if (url.startsWith('/api/')) {
    return res.status(200).json({ 
      message: 'API endpoint',
      note: 'Configure database environment variables in Vercel dashboard',
      path: url 
    });
  }
  
  // Serve inventory app
  if (url.startsWith('/inventory')) {
    const indexPath = path.join(__dirname, '../public/index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Content-Type', 'text/html');
      return res.send(fs.readFileSync(indexPath, 'utf8'));
    }
    return res.status(404).send('Inventory system not available');
  }
  
  // Serve company website (root)
  const websitePath = path.join(__dirname, '../website-build/index.html');
  if (fs.existsSync(websitePath)) {
    res.setHeader('Content-Type', 'text/html');
    return res.send(fs.readFileSync(websitePath, 'utf8'));
  }
  
  return res.status(200).json({ 
    message: 'Fortune Tiles System',
    website: '/',
    inventory: '/inventory',
    api: '/api'
  });
};
