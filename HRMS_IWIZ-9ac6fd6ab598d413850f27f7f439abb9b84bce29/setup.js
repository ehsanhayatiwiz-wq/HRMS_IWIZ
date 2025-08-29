#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setupEnvironment() {
  console.log('🚀 IWIZ HRMS Setup Wizard\n');

  try {
    // Check if .env files already exist
    const backendEnvPath = path.join(__dirname, 'backend', '.env');
    const frontendEnvPath = path.join(__dirname, 'frontend', '.env');

    if (fs.existsSync(backendEnvPath) && fs.existsSync(frontendEnvPath)) {
      console.log('✅ Environment files already exist!');
      console.log('If you want to reconfigure, delete the .env files and run this script again.\n');
      return;
    }

    console.log('📝 Setting up environment configuration...\n');

    // Backend configuration
    console.log('🔧 Backend Configuration:');
    const mongodbUri = await question('MongoDB URI (default: mongodb://localhost:27017/hrms_iwiz): ') || 'mongodb://localhost:27017/hrms_iwiz';
    const jwtSecret = await question('JWT Secret (default: your-super-secret-jwt-key-change-this-in-production): ') || 'your-super-secret-jwt-key-change-this-in-production';
    const port = await question('Backend Port (default: 5000): ') || '5000';
    const corsOrigin = await question('CORS Origin (default: http://localhost:3000): ') || 'http://localhost:3000';

    // Frontend configuration
    console.log('\n🎨 Frontend Configuration:');
    const apiUrl = await question('API URL (default: http://localhost:5000/api): ') || 'http://localhost:5000/api';

    // Create backend .env
    const backendEnvContent = `# Database Configuration
MONGODB_URI=${mongodbUri}

# JWT Configuration
JWT_SECRET=${jwtSecret}
JWT_EXPIRE=7d

# Server Configuration
PORT=${port}
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=${corsOrigin}

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=300

# Email Configuration (for future use)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_RETENTION_DAYS=30
`;

    // Create frontend .env
    const frontendEnvContent = `# API Configuration
REACT_APP_API_URL=${apiUrl}

# Environment
REACT_APP_NODE_ENV=development

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_DEBUG=true
`;

    // Write files
    fs.writeFileSync(backendEnvPath, backendEnvContent);
    fs.writeFileSync(frontendEnvPath, frontendEnvContent);

    console.log('\n✅ Environment files created successfully!');
    console.log('📁 Backend: backend/.env');
    console.log('📁 Frontend: frontend/.env');

    console.log('\n📋 Next Steps:');
    console.log('1. Install dependencies: npm install (in both backend and frontend directories)');
    console.log('2. Start MongoDB');
    console.log('3. Create admin user: cd backend && npm run create-admin');
    console.log('4. Start the application: npm run dev (backend) && npm start (frontend)');

    console.log('\n🔑 Default Admin Credentials:');
    console.log('Email: irtazamira@gmail.com');
    console.log('Password: 123456');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run setup
setupEnvironment();
