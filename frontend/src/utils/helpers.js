import moment from 'moment';

// Format date for display
export const formatDate = (date, format = 'MMM DD, YYYY') => {
  if (!date) return '-';
  return moment(date).format(format);
};

// Format time for display
export const formatTime = (time, format = 'HH:mm') => {
  if (!time) return '-';
  return moment(time).format(format);
};

// Calculate time difference in hours
export const calculateHours = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  const start = moment(startTime);
  const end = moment(endTime);
  return end.diff(start, 'hours', true);
};

// Get status badge class
export const getStatusClass = (status) => {
  const statusMap = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    active: 'success',
    inactive: 'warning',
    present: 'success',
    absent: 'danger',
    late: 'warning',
  };
  return statusMap[status] || 'default';
};

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone format
export const isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Generate unique ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Check if user has permission
export const hasPermission = (userRole, requiredRoles) => {
  if (!userRole || !requiredRoles) return false;
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(userRole);
  }
  return userRole === requiredRoles;
};
