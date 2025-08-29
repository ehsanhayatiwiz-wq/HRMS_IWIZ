import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts';
import { FiUser, FiMail, FiLock, FiMapPin, FiPhone, FiCalendar, FiBriefcase, FiHome, FiShield, FiEye, FiEyeOff } from 'react-icons/fi';
import './Login.css';
import { toast } from 'react-toastify';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    department: '',
    position: '',
    phone: '',
    dateOfBirth: '',
    address: {
      street: '',
      city: '',
      zipCode: '',
      country: ''
    }
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generalError, setGeneralError] = useState('');

  const { register, user, testBackendConnection } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const intendedPath = location.state?.from || (user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
      navigate(intendedPath, { replace: true });
    }
  }, [user, navigate, location]);

  // Test backend connection
  const handleTestConnection = async () => {
    const isConnected = await testBackendConnection();
    if (isConnected) {
      toast.success('Backend connection successful!');
    } else {
      toast.error('Backend connection failed! Check if server is running.');
    }
  };

  const departments = [
    'IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations', 'Design', 'Management'
  ];

  // Only roles supported by backend auth are shown
  const roles = [
    { value: 'employee', label: 'Employee' },
    { value: 'admin', label: 'Administrator' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    } else if (formData.fullName.trim().length > 50) {
      newErrors.fullName = 'Full name must be less than 50 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    if (!formData.department) {
      newErrors.department = 'Department is required';
    }

    if (!formData.position.trim()) {
      newErrors.position = 'Position is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const today = new Date();
      const birthDate = new Date(formData.dateOfBirth);
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18 || age > 100) {
        newErrors.dateOfBirth = 'Age must be between 18 and 100 years';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setGeneralError('');
    
    try {
      // Add cache-busting to ensure fresh data
      const timestamp = new Date().getTime();
      const result = await register({ ...formData, _t: timestamp });
      
      if (result.success) {
        toast.success('Registration successful! Welcome to IWIZ HRMS.');
        // Navigation will be handled by useEffect when user state updates
        return;
      } else {
        setGeneralError(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setGeneralError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="brand-logo">
            <FiUser className="logo-icon" />
            <h1>IWIZ</h1>
          </div>
          <p className="login-subtitle">Create your account</p>
          
          {/* Test Connection Button */}
          <button
            type="button"
            onClick={handleTestConnection}
            className="test-connection-btn"
            title="Test backend connection"
          >
            Test Connection
          </button>
        </div>

        {generalError && (
          <div className="general-error">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {/* Personal Information */}
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <div className="input-wrapper">
              <FiUser className="input-icon" />
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                className={`form-input ${errors.fullName ? 'error' : ''}`}
                placeholder="Enter your full name"
                autoComplete="name"
                disabled={loading}
              />
            </div>
            {errors.fullName && <span className="error-message">{errors.fullName}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <div className="input-wrapper">
              <FiMail className="input-icon" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="Enter your email address"
                autoComplete="email"
                disabled={loading}
              />
            </div>
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password *</label>
              <div className="input-wrapper">
                <FiLock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Create a password (min 6 chars)"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <div className="input-wrapper">
                <FiLock className="input-icon" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
            </div>
          </div>

          {/* Role Selection */}
          <div className="form-group">
            <label className="form-label">Role *</label>
            <div className="input-wrapper">
              <FiShield className="input-icon" />
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className={`form-input ${errors.role ? 'error' : ''}`}
                disabled={loading}
              >
                <option value="">Select Role</option>
                {roles.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            {errors.role && <span className="error-message">{errors.role}</span>}
          </div>

          {/* Professional Information */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Department *</label>
              <div className="input-wrapper">
                <FiBriefcase className="input-icon" />
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={`form-input ${errors.department ? 'error' : ''}`}
                  disabled={loading}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              {errors.department && <span className="error-message">{errors.department}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Position *</label>
              <div className="input-wrapper">
                <FiUser className="input-icon" />
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  className={`form-input ${errors.position ? 'error' : ''}`}
                  placeholder="Enter your position"
                  autoComplete="organization-title"
                  disabled={loading}
                />
              </div>
              {errors.position && <span className="error-message">{errors.position}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <div className="input-wrapper">
                <FiPhone className="input-icon" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  className={`form-input ${errors.phone ? 'error' : ''}`}
                  placeholder="Enter your phone number"
                  autoComplete="tel"
                  disabled={loading}
                />
              </div>
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Date of Birth *</label>
              <div className="input-wrapper">
                <FiCalendar className="input-icon" />
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className={`form-input ${errors.dateOfBirth ? 'error' : ''}`}
                  disabled={loading}
                />
              </div>
              {errors.dateOfBirth && <span className="error-message">{errors.dateOfBirth}</span>}
            </div>
          </div>

          {/* Address Information */}
          <div className="form-group">
            <label className="form-label">Street Address</label>
            <div className="input-wrapper">
              <FiHome className="input-icon" />
              <input
                type="text"
                name="address.street"
                value={formData.address.street}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                className="form-input"
                placeholder="Enter your street address"
                autoComplete="street-address"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">City</label>
              <div className="input-wrapper">
                <FiMapPin className="input-icon" />
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  className="form-input"
                  placeholder="Enter your city"
                  autoComplete="address-level2"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">ZIP Code</label>
              <div className="input-wrapper">
                <FiMapPin className="input-icon" />
                <input
                  type="text"
                  name="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={handleChange}
                  onKeyPress={handleKeyPress}
                  className="form-input"
                  placeholder="Enter ZIP code"
                  autoComplete="postal-code"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Country</label>
            <div className="input-wrapper">
              <FiMapPin className="input-icon" />
              <input
                type="text"
                name="address.country"
                value={formData.address.country}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                className="form-input"
                placeholder="Enter your country"
                autoComplete="country-name"
                disabled={loading}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                <span>Creating Account...</span>
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Already have an account? <Link to="/login" className="register-link">Sign in here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register; 