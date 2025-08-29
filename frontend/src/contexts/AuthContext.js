import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
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

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await api.get('/auth/me');
      if (response.data.success) {
        setUser(response.data.data.user);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, role = 'employee') => {
    try {
      const payload = {
        email: email.trim(),
        password,
        role
      };

      const response = await api.post('/auth/login', payload);
      
      if (response.data.success) {
        const { user, token } = response.data.data;
        
        // Store token
        localStorage.setItem('token', token);
        
        // Update user state
        setUser(user);
        
        toast.success('Login successful!');
        return { success: true };
      } else {
        return { success: false, error: response.data.message || 'Login failed' };
      }
    } catch (error) {
      let message = error.userMessage || 'Login failed';
      
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
        message = error.userMessage || 'Unable to connect. Please check your internet or contact admin.';
      } else {
        // Other error
        message = error.userMessage || error.message || 'An unexpected error occurred';
      }
      
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      const payload = {
        fullName: userData.fullName.trim(),
        email: userData.email.trim(),
        password: userData.password,
        role: userData.role,
        department: userData.department?.trim(),
        position: userData.position?.trim()
      };

      const response = await api.post('/auth/register', payload);
      
      if (response.data.success) {
        toast.success('Registration successful! Please login.');
        return { success: true };
      } else {
        return { success: false, error: response.data.message || 'Registration failed' };
      }
    } catch (error) {
      let message = error.userMessage || 'Registration failed';
      
      if (error.response) {
        const serverMessage = error.response.data?.message;
        if (serverMessage) {
          message = serverMessage;
        } else if (error.response.status === 400) {
          message = 'Please check your input and try again';
        } else if (error.response.status === 409) {
          message = 'User with this email already exists';
        } else if (error.response.status === 500) {
          message = 'Server error. Please try again later';
        }
      } else if (error.request) {
        message = 'Unable to connect. Please check your internet or contact admin.';
      } else {
        message = error.message || 'An unexpected error occurred';
      }
      
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/users/profile', profileData);
      
      if (response.data.success) {
        const updatedUser = response.data.data.user;
        setUser(updatedUser);
        toast.success('Profile updated successfully');
        return { success: true };
      } else {
        return { success: false, error: response.data.message || 'Profile update failed' };
      }
    } catch (error) {
      let message = error.userMessage || 'Profile update failed';
      
      if (error.response) {
        const serverMessage = error.response.data?.message;
        if (serverMessage) {
          message = serverMessage;
        } else if (error.response.status === 400) {
          message = 'Please check your input and try again';
        } else if (error.response.status === 500) {
          message = 'Server error. Please try again later';
        }
      } else if (error.request) {
        message = 'Unable to connect. Please check your internet or contact admin.';
      } else {
        message = error.message || 'An unexpected error occurred';
      }
      
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.success('Logged out successfully');
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 