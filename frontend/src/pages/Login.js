import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts';
import { FiUser, FiMail, FiLock, FiChevronDown, FiEye, FiEyeOff } from 'react-icons/fi';
import './Login.css';
import Button from '../components/common/Button';
import { toast } from 'react-toastify';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'employee'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [isThrottled, setIsThrottled] = useState(false);

  const { login, user, testBackendConnection } = useAuth();
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

  // Only roles supported by backend auth are shown
  const roles = [
    { value: 'employee', label: 'Employee', icon: '👤' },
    { value: 'admin', label: 'Admin', icon: '👨‍💼' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
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

  const handleRoleSelect = (role) => {
    setFormData(prev => ({ ...prev, role }));
    setShowRoleDropdown(false);
    if (errors.role) {
      setErrors(prev => ({ ...prev, role: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 1) {
      newErrors.password = 'Password is required';
    }

    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setGeneralError('');
    setIsThrottled(false);
    
    try {
      const result = await login(formData.email.trim(), formData.password, formData.role);
      
      if (result.success) {
        // Navigation will be handled by useEffect when user state updates
        return;
      } else {
        if (result.error && result.error.includes('Too many requests')) {
          setIsThrottled(true);
          setTimeout(() => setIsThrottled(false), 5000); // Clear after 5 seconds
        }
        setGeneralError(result.error || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
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
            <img src={process.env.PUBLIC_URL + '/logo.svg'} alt="IWIZ" onError={(e) => { e.currentTarget.style.display = 'none'; }} style={{ height: 36 }} />
            <h1>IWIZ</h1>
          </div>
          <p className="login-subtitle">Sign in to your account</p>
          
          {/* Test Connection Button */}
          <Button type="button" onClick={handleTestConnection} variant="secondary">Test Connection</Button>
        </div>

        {generalError && (
          <div className="general-error">
            {generalError}
          </div>
        )}

        {isThrottled && (
          <div className="throttling-message">
            ⏳ Please wait a moment before trying again...
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {/* Role Selector */}
          <div className="form-group">
            <label className="form-label">Login as *</label>
            <div className="role-selector">
              <button
                type="button"
                className={`role-selector-btn ${showRoleDropdown ? 'active' : ''} ${errors.role ? 'error' : ''}`}
                onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                onBlur={() => setTimeout(() => setShowRoleDropdown(false), 200)}
              >
                <span className="role-icon">
                  {roles.find(r => r.value === formData.role)?.icon}
                </span>
                <span className="role-text">
                  {roles.find(r => r.value === formData.role)?.label}
                </span>
                <FiChevronDown className={`dropdown-icon ${showRoleDropdown ? 'rotated' : ''}`} />
              </button>
              
              {showRoleDropdown && (
                <div className="role-dropdown">
                  {roles.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      className={`role-option ${formData.role === role.value ? 'selected' : ''}`}
                      onClick={() => handleRoleSelect(role.value)}
                    >
                      <span className="role-icon">{role.icon}</span>
                      <span className="role-text">{role.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.role && <span className="error-message">{errors.role}</span>}
          </div>

          {/* Email Field */}
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

          {/* Password Field */}
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
                placeholder="Enter your password"
                autoComplete="current-password"
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

          {/* Submit Button */}
          <Button type="submit" variant="primary" disabled={loading || isThrottled}>
            {loading ? 'Signing in...' : isThrottled ? 'Please wait...' : 'Sign In'}
          </Button>
        </form>

        {/* Registration disabled: Admin creates accounts */}
      </div>
    </div>
  );
};

export default Login; 