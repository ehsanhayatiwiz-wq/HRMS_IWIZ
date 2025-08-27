import axios from 'axios';

// Resolve API base with safe runtime fallback for Vercel
const resolvedBaseURL =
  process.env.REACT_APP_API_URL ||
  (typeof window !== 'undefined'
    ? (window.location.hostname.endsWith('vercel.app')
        ? 'https://hrms-iwiz.onrender.com/api'
        : '/api')
    : '/api');

// Create axios instance with default config
const api = axios.create({
  baseURL: resolvedBaseURL,
  timeout: 10000,
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
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
