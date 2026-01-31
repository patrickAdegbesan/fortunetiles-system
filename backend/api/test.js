// Minimal Vercel serverless handler for testing
module.exports = (req, res) => {
  res.status(200).json({
    message: 'Fortune Tiles API - Vercel Serverless',
    status: 'ok',
    timestamp: new Date().toISOString(),
    path: req.url
  });
};
