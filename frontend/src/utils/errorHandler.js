import { toast } from 'react-toastify';

/**
 * Centralized error handling utility for the application
 */

// Error types
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTH_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  SERVER: 'SERVER_ERROR',
  CLIENT: 'CLIENT_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

// Error severity levels
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Parse API error response and extract meaningful error information
 * @param {Object} error - Axios error object
 * @returns {Object} Parsed error information
 */
export const parseApiError = (error) => {
  const defaultError = {
    type: ERROR_TYPES.UNKNOWN,
    message: 'An unexpected error occurred',
    severity: ERROR_SEVERITY.MEDIUM,
    details: null,
    statusCode: null,
    timestamp: new Date().toISOString()
  };

  // Handle network errors
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        ...defaultError,
        type: ERROR_TYPES.NETWORK,
        message: 'Request timeout. Please try again.',
        severity: ERROR_SEVERITY.MEDIUM
      };
    }
    
    if (error.message === 'Network Error') {
      return {
        ...defaultError,
        type: ERROR_TYPES.NETWORK,
        message: 'Network connection failed. Please check your internet connection.',
        severity: ERROR_SEVERITY.HIGH
      };
    }
    
    return {
      ...defaultError,
      type: ERROR_TYPES.NETWORK,
      message: 'Unable to connect to server. Please try again later.',
      severity: ERROR_SEVERITY.HIGH
    };
  }

  const { status, data } = error.response;
  const statusCode = status;

  // Handle different HTTP status codes
  switch (status) {
    case 400:
      return {
        ...defaultError,
        type: ERROR_TYPES.VALIDATION,
        message: data?.message || 'Invalid request. Please check your input.',
        severity: ERROR_SEVERITY.LOW,
        statusCode,
        details: data?.errors || data?.details
      };

    case 401:
      return {
        ...defaultError,
        type: ERROR_TYPES.AUTHENTICATION,
        message: data?.message || 'Authentication failed. Please log in again.',
        severity: ERROR_SEVERITY.HIGH,
        statusCode
      };

    case 403:
      return {
        ...defaultError,
        type: ERROR_TYPES.AUTHORIZATION,
        message: data?.message || 'You do not have permission to perform this action.',
        severity: ERROR_SEVERITY.MEDIUM,
        statusCode
      };

    case 404:
      return {
        ...defaultError,
        type: ERROR_TYPES.CLIENT,
        message: data?.message || 'The requested resource was not found.',
        severity: ERROR_SEVERITY.LOW,
        statusCode
      };

    case 409:
      return {
        ...defaultError,
        type: ERROR_TYPES.VALIDATION,
        message: data?.message || 'A conflict occurred. The resource may already exist.',
        severity: ERROR_SEVERITY.MEDIUM,
        statusCode
      };

    case 422:
      return {
        ...defaultError,
        type: ERROR_TYPES.VALIDATION,
        message: data?.message || 'Validation failed.',
        severity: ERROR_SEVERITY.LOW,
        statusCode,
        details: data?.errors || data?.details
      };

    case 429:
      return {
        ...defaultError,
        type: ERROR_TYPES.CLIENT,
        message: data?.message || 'Too many requests. Please wait and try again.',
        severity: ERROR_SEVERITY.MEDIUM,
        statusCode
      };

    case 500:
    case 502:
    case 503:
    case 504:
      return {
        ...defaultError,
        type: ERROR_TYPES.SERVER,
        message: data?.message || 'Server error. Please try again later.',
        severity: status >= 503 ? ERROR_SEVERITY.CRITICAL : ERROR_SEVERITY.HIGH,
        statusCode
      };

    default:
      return {
        ...defaultError,
        message: data?.message || `Server returned status ${status}`,
        statusCode,
        severity: status >= 500 ? ERROR_SEVERITY.HIGH : ERROR_SEVERITY.MEDIUM
      };
  }
};

/**
 * Handle API errors with appropriate user feedback
 * @param {Object} error - Error object from API call
 * @param {Object} options - Configuration options
 * @returns {Object} Parsed error information
 */
export const handleApiError = (error, options = {}) => {
  const {
    showToast = true,
    customMessage = null,
    onAuthError = null,
    logError = true
  } = options;

  const parsedError = parseApiError(error);

  // Log error for debugging (in development)
  if (logError && process.env.NODE_ENV === 'development') {
    console.group('🚨 API Error');
    console.error('Original Error:', error);
    console.error('Parsed Error:', parsedError);
    if (error.response) {
      console.error('Response Data:', error.response.data);
      console.error('Response Status:', error.response.status);
      console.error('Response Headers:', error.response.headers);
    }
    console.groupEnd();
  }

  // Handle authentication errors
  if (parsedError.type === ERROR_TYPES.AUTHENTICATION) {
    if (onAuthError && typeof onAuthError === 'function') {
      onAuthError(parsedError);
    } else {
      // Default behavior: redirect to login
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }

  // Show toast notification
  if (showToast) {
    const message = customMessage || parsedError.message;
    
    switch (parsedError.severity) {
      case ERROR_SEVERITY.CRITICAL:
      case ERROR_SEVERITY.HIGH:
        toast.error(message, {
          autoClose: 8000,
          hideProgressBar: false
        });
        break;
      case ERROR_SEVERITY.MEDIUM:
        toast.warning(message, {
          autoClose: 5000
        });
        break;
      case ERROR_SEVERITY.LOW:
      default:
        toast.error(message, {
          autoClose: 4000
        });
        break;
    }
  }

  return parsedError;
};

/**
 * Handle form validation errors
 * @param {Object} error - API error object
 * @returns {Object} Field-specific error mapping
 */
export const handleValidationErrors = (error) => {
  const parsedError = parseApiError(error);
  const fieldErrors = {};

  if (parsedError.type === ERROR_TYPES.VALIDATION && parsedError.details) {
    if (Array.isArray(parsedError.details)) {
      // Handle express-validator format
      parsedError.details.forEach(err => {
        if (err.param) {
          fieldErrors[err.param] = err.msg;
        }
      });
    } else if (typeof parsedError.details === 'object') {
      // Handle custom validation format
      Object.keys(parsedError.details).forEach(field => {
        fieldErrors[field] = parsedError.details[field];
      });
    }
  }

  return fieldErrors;
};

/**
 * Create a safe async wrapper that handles errors gracefully
 * @param {Function} asyncFn - Async function to wrap
 * @param {Object} errorOptions - Error handling options
 * @returns {Function} Wrapped function
 */
export const withErrorHandling = (asyncFn, errorOptions = {}) => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      const parsedError = handleApiError(error, errorOptions);
      
      // Re-throw for component-specific handling if needed
      if (errorOptions.rethrow) {
        throw parsedError;
      }
      
      return { error: parsedError };
    }
  };
};

/**
 * Validate required environment variables and API endpoints
 * @returns {Object} Validation results
 */
export const validateEnvironment = () => {
  const issues = [];
  
  // Check API URL
  const apiUrl = process.env.REACT_APP_API_URL;
  if (!apiUrl && !window.location.hostname.includes('localhost')) {
    issues.push('API URL not configured');
  }
  
  // Check for development vs production issues
  if (process.env.NODE_ENV === 'production') {
    if (window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
      issues.push('HTTPS not configured for production');
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};

/**
 * Retry mechanism for failed requests
 * @param {Function} requestFn - Function that makes the request
 * @param {Object} options - Retry options
 * @returns {Promise} Request result
 */
export const withRetry = async (requestFn, options = {}) => {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = 2,
    retryCondition = (error) => {
      const parsedError = parseApiError(error);
      return parsedError.type === ERROR_TYPES.NETWORK || 
             (parsedError.statusCode && parsedError.statusCode >= 500);
    }
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }
      
      // Wait before retrying
      const waitTime = delay * Math.pow(backoff, attempt);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw lastError;
};

/**
 * Create error boundary fallback component props
 * @param {Error} error - React error
 * @param {Function} resetErrorBoundary - Reset function
 * @returns {Object} Props for error fallback component
 */
export const createErrorBoundaryProps = (error, resetErrorBoundary) => {
  return {
    error,
    resetErrorBoundary,
    errorInfo: {
      type: ERROR_TYPES.CLIENT,
      message: error.message || 'Something went wrong',
      severity: ERROR_SEVERITY.HIGH,
      timestamp: new Date().toISOString()
    }
  };
};

// Export default error handler
export default handleApiError;
