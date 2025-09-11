import React, { useState, useEffect } from 'react';
import '../styles/UserEditor.css';

const UserEditor = ({ user, roles, locations, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'staff',
    locationId: '',
    isActive: true
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        password: '', // Don't pre-fill password for security
        role: user.role || 'staff',
        locationId: user.locationId || '',
        isActive: user.isActive !== undefined ? user.isActive : true
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation only for new users or when password is provided
    if (!user && !formData.password) {
      newErrors.password = 'Password is required for new users';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const userData = { ...formData };
      
      // Don't send empty password for existing users
      if (user && !userData.password) {
        delete userData.password;
      }

      // Convert locationId to number or null
      userData.locationId = userData.locationId ? parseInt(userData.locationId) : null;

      await onSave(userData);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDescription = (roleValue) => {
    const role = roles.find(r => r.value === roleValue);
    return role ? role.description : '';
  };

  return (
    <div className="user-editor-overlay">
      <div className="user-editor">
        <div className="editor-header">
          <h2>{user ? 'Edit User' : 'Add New User'}</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="editor-form">
          <div className="form-grid">
            {/* Personal Information */}
            <div className="form-section">
              <h3>Personal Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={errors.firstName ? 'error' : ''}
                    placeholder="John"
                  />
                  {errors.firstName && <span className="error-text">{errors.firstName}</span>}
                </div>

                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={errors.lastName ? 'error' : ''}
                    placeholder="Doe"
                  />
                  {errors.lastName && <span className="error-text">{errors.lastName}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="john.doe@fortunetiles.com"
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label>{user ? 'New Password (leave blank to keep current)' : 'Password *'}</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={errors.password ? 'error' : ''}
                    placeholder={user ? 'Leave blank to keep current password' : 'Enter password'}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '🙈'}
                  </button>
                </div>
                {errors.password && <span className="error-text">{errors.password}</span>}
              </div>
            </div>

            {/* Role & Permissions */}
            <div className="form-section">
              <h3>Role & Permissions</h3>
              
              <div className="form-group">
                <label>Role *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className={errors.role ? 'error' : ''}
                >
                  {roles.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                {formData.role && (
                  <small className="role-description">
                    {getRoleDescription(formData.role)}
                  </small>
                )}
                {errors.role && <span className="error-text">{errors.role}</span>}
              </div>

              <div className="form-group">
                <label>Location</label>
                <select
                  name="locationId"
                  value={formData.locationId}
                  onChange={handleInputChange}
                >
                  <option value="">No specific location</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                <small>Assign user to a specific location (optional)</small>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                  />
                  Active User
                </label>
                <small>Inactive users cannot log in to the system</small>
              </div>
            </div>

            {/* Role Permissions Info */}
            <div className="form-section full-width">
              <h3>Role Permissions</h3>
              <div className="permissions-info">
                {roles.map(role => (
                  <div key={role.value} className={`permission-card ${formData.role === role.value ? 'selected' : ''}`}>
                    <h4>{role.label}</h4>
                    <p>{role.description}</p>
                    <div className="permission-details">
                      {role.value === 'owner' && (
                        <ul>
                          <li>✅ Full system access</li>
                          <li>✅ User management</li>
                          <li>✅ System configuration</li>
                          <li>✅ All inventory & sales operations</li>
                        </ul>
                      )}
                      {role.value === 'manager' && (
                        <ul>
                          <li>✅ Inventory management</li>
                          <li>✅ Sales processing</li>
                          <li>✅ Reports & analytics</li>
                          <li>❌ User management</li>
                        </ul>
                      )}
                      {role.value === 'staff' && (
                        <ul>
                          <li>✅ Process sales</li>
                          <li>✅ View inventory</li>
                          <li>❌ Modify inventory</li>
                          <li>❌ User management</li>
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="editor-actions">
            <button type="button" onClick={onCancel} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="save-btn">
              {loading ? 'Saving...' : (user ? 'Update User' : 'Create User')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEditor;
