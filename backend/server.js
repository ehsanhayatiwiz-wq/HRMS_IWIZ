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

// Body parsing middleware is now handled by security middleware

// Import database configuration
const connectDB = require('./config/database');

// Database connection
connectDB().catch(err => {
  console.error('❌ Failed to connect to database:', err.message);
  console.log('⚠️ Server will continue without database connection');
});

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

// Dev landing route for development
if (config.server.nodeEnv !== 'production') {
  app.get('/', (req, res) => {
    res.json({
      message: 'IWIZ HRMS API (development)',
      tryHealth: '/api/health',
      docs: 'API is running successfully'
    });
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  const overallStatus = dbStatus === 'Connected' ? 'OK' : 'WARNING';
  
  res.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    database: dbStatus,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: config.server.nodeEnv === 'development' ? err.message : 'Internal server error'
  });
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

console.log('🔧 Starting IWIZ HRMS Server...');
console.log(`📊 Environment: ${config.server.nodeEnv}`);
console.log(`🔗 Port: ${PORT}`);
console.log(`🗄️ Database URI: ${config.mongodb.uri.substring(0, 20)}...`);

app.listen(PORT, () => {
  console.log(`🚀 IWIZ HRMS Server running on port ${PORT}`);
  console.log(`📊 Environment: ${config.server.nodeEnv}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
}); 