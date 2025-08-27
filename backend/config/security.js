const helmet = require('helmet');
const express = require('express');

// Security configuration
const securityConfig = {
  // Helmet configuration for security headers
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "http://localhost:3000", "http://localhost:5000"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks and static files
      return req.path === '/api/health' || req.path.startsWith('/static/');
    }
  },

  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  },

  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRE || '7d',
    algorithm: 'HS256'
  },

  // Password policy - temporarily relaxed for testing
  passwordPolicy: {
    minLength: 6,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false
  },

  // Session configuration
  session: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },

  // Input validation
  validation: {
    maxStringLength: 1000,
    maxArrayLength: 100,
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    maxFileSize: 5 * 1024 * 1024 // 5MB
  },

  // Database security
  database: {
    maxConnections: 10,
    connectionTimeout: 30000,
    queryTimeout: 10000
  },

  // Logging security
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    excludeSensitiveFields: ['password', 'token', 'secret'],
    maskFields: ['email', 'phone']
  }
};

// Apply security middleware
const applySecurityMiddleware = (app) => {
  // Helmet for security headers
  app.use(helmet(securityConfig.helmet));

  // Additional security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });

  // Request size limits
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Remove sensitive headers
  app.use((req, res, next) => {
    res.removeHeader('X-Powered-By');
    next();
  });
};

// Password validation
const validatePassword = (password) => {
  const policy = securityConfig.passwordPolicy;
  
  if (password.length < policy.minLength) {
    return { valid: false, message: `Password must be at least ${policy.minLength} characters long` };
  }
  
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (policy.requireNumbers && !/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  
  if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }
  
  return { valid: true };
};

// Sanitize user input
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// Mask sensitive data in logs
const maskSensitiveData = (data) => {
  const masked = { ...data };
  const maskFields = securityConfig.logging.maskFields;
  
  maskFields.forEach(field => {
    if (masked[field]) {
      const value = String(masked[field]);
      if (value.length > 4) {
        masked[field] = value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
      } else {
        masked[field] = '*'.repeat(value.length);
      }
    }
  });
  
  return masked;
};

module.exports = {
  securityConfig,
  applySecurityMiddleware,
  validatePassword,
  sanitizeInput,
  maskSensitiveData
};
