const express = require('express');
const { User } = require('../models');
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const router = express.Router();

// Configure nodemailer with better error handling
let transporter;
let emailServiceAvailable = false;

async function initializeEmailService() {
  try {
    // Check if email credentials are available
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️ Email credentials not configured in environment variables');
      return false;
    }

    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // Verify the transporter configuration
    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          console.error('❌ Email transporter verification failed:', error.message);
          reject(error);
        } else {
          console.log('✅ Email transporter is ready to send messages');
          resolve(success);
        }
      });
    });
    
    emailServiceAvailable = true;
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize email service:', error.message);
    emailServiceAvailable = false;
    return false;
  }
}

// Initialize email service on startup
initializeEmailService();

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if email service is available
    if (!emailServiceAvailable) {
      console.error('Email service not available');
      return res.status(500).json({ 
        message: 'Email service is temporarily unavailable. Please contact admin or try again later.' 
      });
    }

    // Find user by email
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        message: 'No account found with this email address. Please verify your email or contact admin for assistance.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    console.log('🔑 Generated reset token for user:', user.email);

    // Save reset token and expiry to user
    await user.update({
      resetToken,
      resetTokenExpiry
    });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    // Send email with better formatting
    const mailOptions = {
      from: `"Fortune Tiles System" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Request - Fortune Tiles',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 30px; padding: 20px; background-color: white; border-radius: 8px;">
            <img src="${process.env.FRONTEND_URL || 'http://localhost:3000'}/assets/logo.png" alt="Fortune Tiles" style="max-width: 150px; height: auto; margin-bottom: 10px;" />
            <h2 style="color: #2c5aa0; margin: 0;">Password Reset Request</h2>
          </div>
          <div style="background-color: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <p style="font-size: 16px; color: #333;">Hello ${user.firstName || 'User'},</p>
            <p style="font-size: 16px; color: #333;">You requested a password reset for your Fortune Tiles account.</p>
            <p style="font-size: 16px; color: #333;">Click the button below to reset your password. This link will expire in 1 hour.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #2c5aa0; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px; font-weight: bold;">Reset Password</a>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2c5aa0; background-color: #f1f3f4; padding: 10px; border-radius: 4px; font-size: 12px;">${resetUrl}</p>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
          </div>
          <div style="text-align: center; margin-top: 20px;">
            <p style="color: #999; font-size: 12px; margin: 0;">This is an automated message from Fortune Tiles System. Please do not reply to this email.</p>
          </div>
        </div>
      `
    };

    console.log('📧 Sending password reset email to:', user.email);
    
    try {
      await transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent successfully');
      
      res.json({
        message: 'Password reset link has been sent to your email address. Please check your inbox and spam folder.'
      });
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError.message);
      
      // Provide specific error messages
      if (emailError.code === 'EAUTH') {
        res.status(500).json({ message: 'Email authentication failed. Please contact admin to update email settings.' });
      } else if (emailError.code === 'ECONNREFUSED') {
        res.status(500).json({ message: 'Email service unavailable. Please try again later.' });
      } else {
        res.status(500).json({ message: 'Failed to send password reset email. Please contact admin for assistance.' });
      }
    }

  } catch (error) {
    console.error('❌ Password reset error:', error);
    res.status(500).json({ message: 'An error occurred while processing your request. Please try again.' });
  }
});

// GET /api/auth/verify-reset-token/:token
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    res.json({ message: 'Token is valid' });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Error verifying reset token' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          [Op.gt]: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password and clear reset token
    await user.update({
      password: newPassword,
      resetToken: null,
      resetTokenExpiry: null
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

module.exports = router;