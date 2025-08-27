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
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
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
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ message: 'Route not found' });
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' });
  });
}

const PORT = config.server.port;

app.listen(PORT, () => {
  console.log(`🚀 IWIZ HRMS Server running on port ${PORT}`);
  console.log(`📊 Environment: ${config.server.nodeEnv}`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api`);
}); 