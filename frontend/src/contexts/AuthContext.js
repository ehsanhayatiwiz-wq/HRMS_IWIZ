import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [lastRequestTime, setLastRequestTime] = useState(0);

  // Request throttling to prevent rate limiting
  const throttleRequest = async (requestFn) => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    const minDelay = 1000; // Minimum 1 second between requests
    
    if (timeSinceLastRequest < minDelay) {
      const delay = minDelay - timeSinceLastRequest;
      console.log(`Throttling request, waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    setLastRequestTime(Date.now());
    return await requestFn();
  };

  // Set up axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Test backend connectivity
  const testBackendConnection = async () => {
    try {
      console.log('Testing backend connection...');
      const response = await axios.get('/api/auth/test', { 
        timeout: 5000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      console.log('Backend connection test successful:', response.data);
      return true;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      
      if (error.response?.status === 429) {
        console.log('Rate limited during connection test, this is normal');
        return true; // Rate limiting means server is running
      }
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        console.error('Backend server is not running or not accessible');
        return false;
      }
      
      return false;
    }
  };

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.get('/api/auth/me');
          setUser(response.data.data.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  // Retry mechanism with exponential backoff
  const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (error.response?.status === 429 && attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Rate limited, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
  };

  const login = async (email, password, role = 'employee') => {
    try {
      console.log('Login attempt:', { email, role });
      
      // Only send role if it is supported by backend
      const payload = role && (role === 'admin' || role === 'employee')
        ? { email, password, role }
        : { email, password };
      
      console.log('Sending payload:', { ...payload, password: '[HIDDEN]' });
      
      const response = await throttleRequest(async () => {
        return await retryWithBackoff(async () => {
          return await axios.post('/api/auth/login', payload);
        });
      });
      
      console.log('Login response:', response.data);
      
      const { user: userData, token: authToken } = response.data.data;
      
      if (!userData || !authToken) {
        console.error('Invalid response structure:', response.data);
        throw new Error('Invalid response from server');
      }
      
      setUser(userData);
      setToken(authToken);
      localStorage.setItem('token', authToken);
      
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      
      let message = 'Login failed';
      
      if (error.response) {
        // Server responded with error status
        const serverMessage = error.response.data?.message;
        if (serverMessage) {
          message = serverMessage;
        } else if (error.response.status === 401) {
          message = 'Invalid email or password';
        } else if (error.response.status === 400) {
          message = 'Please check your input and try again';
        } else if (error.response.status === 429) {
          message = 'Too many requests. Please wait a moment and try again.';
        } else if (error.response.status === 500) {
          message = 'Server error. Please try again later';
        }
      } else if (error.request) {
        // Network error
        message = 'Network error. Please check your connection and ensure the backend server is running';
      } else {
        // Other error
        message = error.message || 'An unexpected error occurred';
      }
      
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      console.log('Registration attempt:', { ...userData, password: '[HIDDEN]' });
      
      // Ensure role is valid
      const payload = {
        ...userData,
        role: userData.role === 'admin' ? 'admin' : 'employee'
      };
      
      console.log('Sending registration payload:', { ...payload, password: '[HIDDEN]' });
      
      const response = await throttleRequest(async () => {
        return await retryWithBackoff(async () => {
          return await axios.post('/api/auth/register', payload);
        });
      });
      
      console.log('Registration response:', response.data);
      
      const { user: newUser, token: authToken } = response.data.data;
      
      if (!newUser || !authToken) {
        console.error('Invalid registration response structure:', response.data);
        throw new Error('Invalid response from server');
      }
      
      setUser(newUser);
      setToken(authToken);
      localStorage.setItem('token', authToken);
      
      toast.success('Registration successful!');
      return { success: true };
    } catch (error) {
      console.error('Registration error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      
      let message = 'Registration failed';
      
      if (error.response) {
        // Server responded with error status
        const serverMessage = error.response.data?.message;
        if (serverMessage) {
          message = serverMessage;
        } else if (error.response.status === 400) {
          const validationErrors = error.response.data?.errors;
          if (validationErrors && Array.isArray(validationErrors)) {
            message = validationErrors.map(err => err.msg || err.message).join(', ');
          } else {
            message = 'Please check your input and try again';
          }
        } else if (error.response.status === 409) {
          message = 'User with this email already exists';
        } else if (error.response.status === 429) {
          message = 'Too many requests. Please wait a moment and try again.';
        } else if (error.response.status === 500) {
          message = 'Server error. Please try again later';
        }
      } else if (error.request) {
        // Network error
        message = 'Network error. Please check your connection and ensure the backend server is running';
      } else {
        // Other error
        message = error.message || 'An unexpected error occurred';
      }
      
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    toast.info('Logged out successfully');
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/api/auth/profile', profileData);
      setUser(response.data.data.user);
      toast.success('Profile updated successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.post('/api/auth/change-password', {
        currentPassword,
        newPassword
      });
      toast.success('Password changed successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Password change failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const isAdmin = () => {
    return user && (user.role === 'admin' || user.role === 'hr');
  };

  const isEmployee = () => {
    return user && user.role === 'employee';
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    isAdmin,
    isEmployee,
    testBackendConnection
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 