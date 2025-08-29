const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Employee = require('../models/Employee');

// Protect routes - require authentication
const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const config = require('../config');
      if (config.server.nodeEnv !== 'production') {
        console.log('[AUTH] Verifying token...');
      }
      const decoded = jwt.verify(token, config.jwt.secret);

      // Try to find user in Admin collection first
      let user = await Admin.findById(decoded.id).select('-password');
      let userRole = 'admin';

      // If not found in Admin, try Employee collection
      if (!user) {
        user = await Employee.findById(decoded.id).select('-password');
        userRole = 'employee';
      }

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: 'Account is deactivated' });
      }

      // Add user and role to request
      req.user = user;
      req.userRole = userRole;

      next();
    } catch (error) {
      console.error('[AUTH] JWT verification failed:', error?.message || error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Authorize roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ 
        message: `User role '${req.userRole}' is not authorized to access this route` 
      });
    }

    next();
  };
};

// Generate JWT token with role
const generateToken = (id, role = 'employee') => {
  const config = require('../config');
  return jwt.sign({ id, role }, config.jwt.secret, {
    expiresIn: config.jwt.expire
  });
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, require('../config').jwt.secret);
      
      // Try to find user in Admin collection first
      let user = await Admin.findById(decoded.id).select('-password');
      let userRole = 'admin';

      // If not found in Admin, try Employee collection
      if (!user) {
        user = await Employee.findById(decoded.id).select('-password');
        userRole = 'employee';
      }

      if (user) {
        req.user = user;
        req.userRole = userRole;
      } else {
        req.user = null;
        req.userRole = null;
      }
    } catch (error) {
      // Don't fail, just continue without user
      req.user = null;
      req.userRole = null;
    }
  }

  next();
};

module.exports = {
  protect,
  authorize,
  generateToken,
  optionalAuth
}; 