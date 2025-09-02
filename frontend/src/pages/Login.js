import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiMail, FiLock, FiChevronDown, FiEye, FiEyeOff } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

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
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <img 
                src={process.env.PUBLIC_URL + '/logo.svg'} 
                alt="IWIZ" 
                onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                className="h-9 w-9"
              />
              <CardTitle className="text-2xl font-bold text-gray-900">IWIZ</CardTitle>
            </div>
            <CardDescription className="text-gray-600">
              Sign in to your account
            </CardDescription>
            
            {/* Test Connection Button */}
            <Button 
              type="button" 
              onClick={handleTestConnection} 
              variant="outline" 
              size="sm"
              className="w-full"
            >
              Test Connection
            </Button>
          </CardHeader>

          {generalError && (
            <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {generalError}
            </div>
          )}

          {isThrottled && (
            <div className="mx-6 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-700 text-sm">
              ⏳ Please wait a moment before trying again...
            </div>
          )}

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Role Selector */}
              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                  Login as *
                </Label>
                <div className="relative">
                  <button
                    type="button"
                    id="role"
                    className={`w-full flex items-center justify-between px-3 py-2 border rounded-md bg-white text-left text-sm transition-colors ${
                      errors.role 
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                    onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                    onBlur={() => setTimeout(() => setShowRoleDropdown(false), 200)}
                  >
                    <span className="flex items-center space-x-2">
                      <span className="text-lg">
                        {roles.find(r => r.value === formData.role)?.icon}
                      </span>
                      <span className="text-gray-900">
                        {roles.find(r => r.value === formData.role)?.label}
                      </span>
                    </span>
                    <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${
                      showRoleDropdown ? 'rotate-180' : ''
                    }`} />
                  </button>
                  
                  {showRoleDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                      {roles.map((role) => (
                        <button
                          key={role.value}
                          type="button"
                          className={`w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                            formData.role === role.value ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                          }`}
                          onClick={() => handleRoleSelect(role.value)}
                        >
                          <span className="text-lg">{role.icon}</span>
                          <span>{role.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.role && (
                  <span className="text-sm text-red-600">{errors.role}</span>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address *
                </Label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    className={`pl-10 ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="Enter your email address"
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <span className="text-sm text-red-600">{errors.email}</span>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password *
                </Label>
                <div className="relative">
                  <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onKeyPress={handleKeyPress}
                    className={`pl-10 pr-10 ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <span className="text-sm text-red-600">{errors.password}</span>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || isThrottled}
              >
                {loading ? 'Signing in...' : isThrottled ? 'Please wait...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              Registration disabled: Admin creates accounts
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login; 