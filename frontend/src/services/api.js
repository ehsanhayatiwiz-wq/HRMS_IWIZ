import axios from 'axios';
import { handleApiError } from '../utils/errorHandler';

// Use environment variable for API URL, fallback to localhost for development
const resolvedBaseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Log API configuration only in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 API Configuration:', {
    REACT_APP_API_URL: process.env.REACT_APP_API_URL,
    resolvedBaseURL,
    NODE_ENV: process.env.NODE_ENV
  });
}

// Create axios instance with default config
const api = axios.create({
  baseURL: resolvedBaseURL,
  // Render cold starts can take >10s. Use a generous timeout.
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Simple retry on timeouts and network errors (up to 2 retries with backoff)
    const config = error.config || {};
    const shouldRetry =
      error.code === 'ECONNABORTED' ||
      error.message?.toLowerCase().includes('timeout') ||
      error.message === 'Network Error';

    if (shouldRetry) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < 2) {
        config.__retryCount += 1;
        const delayMs = 1000 * Math.pow(2, config.__retryCount - 1);
        await new Promise((r) => setTimeout(r, delayMs));
        return api(config);
      }
    }

    // Add user-friendly message for backward compatibility
    const parsedError = handleApiError(error, { 
      showToast: false, // Don't show toast here, let components handle it
      logError: true 
    });
    error.userMessage = parsedError.message;
    
    return Promise.reject(error);
  }
);

export default api;
