import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import '../styles/Login.css';
import '../styles/ResetPassword.css';

const ResetPassword = () => {
  const [passwords, setPasswords] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    password: false,
    confirmPassword: false
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  
  const { token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Verify token validity when component mounts
    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/auth/verify-reset-token/${token}`);
        const data = await response.json();
        
        if (response.ok) {
          setIsValidToken(true);
        } else {
          setError('This password reset link is invalid or has expired. Please request a new one.');
        }
      } catch (err) {
        setError('An error occurred while verifying the reset token.');
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token]);

  const handleChange = (e) => {
    setPasswords(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError('');
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validatePasswords = () => {
    if (passwords.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (passwords.password !== passwords.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validatePasswords()) return;

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: passwords.password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Password has been reset successfully!');
        setTimeout(() => {
          navigate('/');
        }, 3000);
      } else {
        throw new Error(data.message || 'Failed to reset password');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while resetting the password');
    } finally {
      setLoading(false);
    }
  };

  if (!isValidToken && error) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <img
              src={`${process.env.PUBLIC_URL}/assets/logo.png`}
              alt="Fortune Tiles"
              className="login-logo"
            />
            <p>Inventory Management System</p>
          </div>
          
          <div className="error-message">
            {error}
          </div>
          
          <button 
            onClick={() => navigate('/')}
            className="login-button"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img
            src={`${process.env.PUBLIC_URL}/assets/logo.png`}
            alt="Fortune Tiles"
            className="login-logo"
          />
          <h2>Reset Password</h2>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          {success && (
            <div className="success-message">
              {success}
            </div>
          )}

          <div className="form-group">
            <div className="input-container password-container">
              <input
                type={showPassword.password ? 'text' : 'password'}
                id="password"
                name="password"
                value={passwords.password}
                onChange={handleChange}
                required
                disabled={loading}
                className={passwords.password ? 'has-content' : ''}
              />
              <label htmlFor="password" className="floating-label">New Password</label>
              <button
                type="button"
                className="password-toggle"
                onClick={() => togglePasswordVisibility('password')}
                disabled={loading}
                aria-label={showPassword.password ? 'Hide password' : 'Show password'}
              >
                <FontAwesomeIcon icon={showPassword.password ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <div className="input-container password-container">
              <input
                type={showPassword.confirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={passwords.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
                className={passwords.confirmPassword ? 'has-content' : ''}
              />
              <label htmlFor="confirmPassword" className="floating-label">Confirm Password</label>
              <button
                type="button"
                className="password-toggle"
                onClick={() => togglePasswordVisibility('confirmPassword')}
                disabled={loading}
                aria-label={showPassword.confirmPassword ? 'Hide password' : 'Show password'}
              >
                <FontAwesomeIcon icon={showPassword.confirmPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;