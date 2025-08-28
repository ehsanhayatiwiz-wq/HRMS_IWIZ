import axios from 'axios';

// Resolve API base URL with env first, then sensible fallbacks
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
    // Redirect to login on unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
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
        const delayMs = 1000 * Math.pow(2, config.__retryCount - 1); // 1s, 2s
        await new Promise((r) => setTimeout(r, delayMs));
        return api(config);
      }
    }

    // Friendly error normalization
    const message = (() => {
      if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
        return 'Server is taking too long to respond.';
      }
      if (error.message === 'Network Error') {
        return 'Unable to connect. Please check your internet or contact admin.';
      }
      if (error.response?.status >= 500) {
        return 'Server error, please try again later.';
      }
      return error.message;
    })();
    error.userMessage = message;
    return Promise.reject(error);
  }
);

export default api;
