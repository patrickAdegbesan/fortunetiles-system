const express = require('express');
const { Product } = require('../models');

// Serves a product photo as a normal image so lists only carry a small link instead of the photo
// itself (photos are stored as data URLs in the database). Public on purpose: <img> tags cannot send
// a login token, and the server only listens on this computer.
const router = express.Router();

router.get('/:id(\\d+)/image', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      attributes: ['id', 'imageUrl', 'version'],
      paranoid: false,
    });
    const url = product && product.imageUrl;
    if (!url) return res.status(404).end();

    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s.exec(url);
    if (!match) return res.redirect(url); // a normal web address

    res.set('Content-Type', match[1]);
    res.set('Cache-Control', 'private, max-age=86400'); // the ?v= in the link changes when the photo does
    res.send(Buffer.from(match[2], 'base64'));
  } catch (error) {
    console.error('Product image error:', error);
    res.status(500).end();
  }
});

module.exports = router;
