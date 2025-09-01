const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
// Backup system removed for simplicity
const config = require('./config');
const { applySecurityMiddleware, securityConfig } = require('./config/security');

const app = express();

// Trust proxy to fix express-rate-limit error
app.set('trust proxy', 1);

// Add request ID middleware for better debugging
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.header('X-Request-ID', req.headers['x-request-id']);
  next();
});

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const attendanceRoutes = require('./routes/attendance');
const leaveRoutes = require('./routes/leaves');
const dashboardRoutes = require('./routes/dashboard');
const employeeRoutes = require('./routes/employees');
const adminRoutes = require('./routes/admin');
const payrollRoutes = require('./routes/payroll');

// Apply security middleware
applySecurityMiddleware(app);

// Rate limiting
const isProduction = (config.server.nodeEnv === 'production');
const limiter = rateLimit({
  windowMs: securityConfig.rateLimit.windowMs,
  max: isProduction ? securityConfig.rateLimit.max : 100000,
  message: securityConfig.rateLimit.message,
  standardHeaders: securityConfig.rateLimit.standardHeaders,
  legacyHeaders: securityConfig.rateLimit.legacyHeaders,
  skip: securityConfig.rateLimit.skip
});

// Apply limiter only to API routes
app.use('/api', limiter);

// CORS configuration
app.use(cors(securityConfig.cors));

// Additional CORS headers for preflight requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// Body parsing middleware is now handled by security middleware

// Import database configuration
const connectDB = require('./config/database');

// Database connection
connectDB();

// Backup system removed for simplicity
let backupSystem = null;

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/reports', require('./routes/reports'));

// Failsafe admin initializer (runs after routes are mounted)
const { ensureFailsafeAdmin } = require('./utils/failsafeAdmin');
(async () => {
  try {
    const result = await ensureFailsafeAdmin();
    if (result.executed) {
      console.log('[FailsafeAdmin]', result.created ? 'created' : 'ensured', result.email || result.reason || '');
      if (result.error) console.warn('[FailsafeAdmin] error:', result.error);
    }
  } catch (e) {
    console.warn('[FailsafeAdmin] init error:', e?.message || e);
  }
})();

// Development-specific logging
if (config.server.nodeEnv !== 'production') {
  console.log('🔧 Development mode enabled');
  console.log('📝 API documentation available at /api/health');
}

// Health check endpoint (required by Render)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    render: process.env.RENDER === 'true' ? 'Deployed on Render' : 'Local development'
  });
});

// Root endpoint for Render health checks
app.get('/', (req, res) => {
  res.json({
    message: 'IWIZ HRMS API Server',
    status: 'Running',
    environment: config.server.nodeEnv,
    timestamp: new Date().toISOString(),
    health: '/api/health',
    docs: 'API is operational'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Error occurred:', err.message);
  console.error('📍 Path:', req.path);
  console.error('🔧 Method:', req.method);
  console.error('📅 Timestamp:', new Date().toISOString());
  
  if (config.server.nodeEnv === 'development') {
    console.error('📚 Stack trace:', err.stack);
  }
  
  // Don't expose internal errors in production
  const errorResponse = {
    message: 'Something went wrong!',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    requestId: req.headers['x-request-id'] || 'unknown'
  };
  
  if (config.server.nodeEnv === 'development') {
    errorResponse.error = err.message;
    errorResponse.stack = err.stack;
  }
  
  res.status(500).json(errorResponse);
});

// 404 handler
// In production, serve frontend build for non-API routes
if (config.server.nodeEnv === 'production') {
  const clientBuildPath = path.join(__dirname, '../frontend/build');
  const fs = require('fs');
  if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'Route not found' });
      }
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  } else {
    // No frontend build present (expected when frontend is deployed separately)
    app.use('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'Route not found' });
      }
      return res.status(404).json({ message: 'Frontend not served from this host' });
    });
  }
} else {
  app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });
}

const PORT = config.server.port;

const server = app.listen(PORT, () => {
  console.log(`🚀 IWIZ HRMS Server running on port ${PORT}`);
  console.log(`📊 Environment: ${config.server.nodeEnv}`);
  
  // Show proper URL based on environment
  if (config.server.nodeEnv === 'production') {
    if (process.env.RENDER_EXTERNAL_URL) {
      console.log(`🔗 API URL: ${process.env.RENDER_EXTERNAL_URL}/api`);
      console.log(`🌐 Render Service: ${process.env.RENDER_EXTERNAL_URL}`);
    } else {
      console.log(`🔗 API URL: https://your-app-name.onrender.com/api (set RENDER_EXTERNAL_URL)`);
    }
  } else {
    console.log(`🔗 API URL: http://localhost:${PORT}/api`);
  }
  
  console.log(`✅ Server ready to accept requests`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
}); 