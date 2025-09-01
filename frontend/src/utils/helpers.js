// Format date for display
export const formatDate = (date, format = 'MMM DD, YYYY') => {
  if (!date) return '-';
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '-';
  
  // Simple format mapping for common cases
  if (format === 'MMM DD, YYYY') {
    return dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit', 
      year: 'numeric' 
    });
  }
  return dateObj.toLocaleDateString();
};

// Format time for display
export const formatTime = (time, format = 'HH:mm') => {
  if (!time) return '-';
  const timeObj = new Date(time);
  if (isNaN(timeObj.getTime())) return '-';
  
  return timeObj.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
};

// Calculate hours between two times
export const calculateHours = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  
  const diffMs = end.getTime() - start.getTime();
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
};

// Validate email format
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Format currency
export const formatCurrency = (amount, currency = 'USD') => {
  if (typeof amount !== 'number') return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Capitalize first letter of each word
export const capitalizeWords = (str) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

// Get status color class
export const getStatusColor = (status) => {
  const colorMap = {
    'active': 'success',
    'inactive': 'warning',
    'pending': 'warning',
    'approved': 'success',
    'rejected': 'danger',
    'present': 'success',
    'absent': 'danger',
    'late': 'warning',
    'on_leave': 'info',
    'terminated': 'danger'
  };
  return colorMap[status] || 'secondary';
};