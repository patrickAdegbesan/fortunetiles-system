const express = require('express');
const router = express.Router();

// POST /api/contact - Submit contact form
router.post('/', async (req, res) => {
  try {
    const { fullName, email, phoneNumber, subject, message } = req.body;

    // Basic validation
    if (!fullName || !email || !message) {
      return res.status(400).json({ message: 'Full name, email and message are required' });
    }

    // Here we would normally send an email, but for now just log it
    console.log('Contact form submission:', {
      fullName,
      email,
      phoneNumber,
      subject,
      message,
      timestamp: new Date().toISOString()
    });

    // In production, you would send an email here using a service like SendGrid, Mailgun, etc.

    res.json({ message: 'Message received. We will get back to you soon!' });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ message: 'Failed to send message. Please try again later.' });
  }
});

module.exports = router;
