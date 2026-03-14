const express = require('express');
const router = express.Router();
const { createRateLimiter } = require('../middleware/rateLimit');
const { validate } = require('../middleware/validate');

const contactLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: 'Too many contact requests. Please try again later.',
});

// POST /api/contact - Submit contact form
router.post('/', contactLimiter, validate([
  { in: 'body', field: 'fullName', required: true, type: 'string', trim: true, maxLen: 200, minLen: 1 },
  { in: 'body', field: 'email', required: true, type: 'string', trim: true, maxLen: 320, regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  { in: 'body', field: 'phoneNumber', required: false, type: 'string', trim: true, maxLen: 32 },
  { in: 'body', field: 'subject', required: false, type: 'string', trim: true, maxLen: 200 },
  { in: 'body', field: 'message', required: true, type: 'string', trim: true, maxLen: 20000, minLen: 1 },
]), async (req, res) => {
  try {
    const { fullName, email, phoneNumber, subject, message } = req.body;

    // Here we would normally send an email, but for now just log it
    if (process.env.NODE_ENV !== 'production') {
      console.log('Contact form submission:', {
        fullName,
        email,
        phoneNumber,
        subject,
        messagePreview: message.length > 200 ? `${message.slice(0, 200)}...` : message,
        timestamp: new Date().toISOString()
      });
    }

    // In production, you would send an email here using a service like SendGrid, Mailgun, etc.

    res.json({ message: 'Message received. We will get back to you soon!' });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ message: 'Failed to send message. Please try again later.' });
  }
});

module.exports = router;
