const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const config = require('./index');
    
    // Validate MongoDB URI
    if (!config.mongodb.uri || config.mongodb.uri === 'mongodb://localhost:27017/hrms_iwiz') {
      console.error('❌ MONGODB_URI environment variable is not set or is default');
      console.error('💡 Please set MONGODB_URI in your environment variables');
      process.exit(1);
    }
    
    console.log('🔌 Attempting to connect to MongoDB...');
    console.log('📍 Connection string format check:', config.mongodb.uri.includes('mongodb+srv://') ? '✅ Valid Atlas format' : '⚠️ Check format');
    
    const conn = await mongoose.connect(config.mongodb.uri, {
      // Removed deprecated options for Node.js 4.0.0+
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
    });

    console.log(`✅ MongoDB connected successfully: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error during MongoDB shutdown:', err);
        process.exit(1);
      }
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // Provide helpful error messages
    if (error.code === 'ENOTFOUND') {
      console.error('💡 This usually means:');
      console.error('   1. The MongoDB Atlas cluster name is incorrect');
      console.error('   2. The connection string format is wrong');
      console.error('   3. Network/DNS resolution issues');
      console.error('🔧 Solution: Check your MONGODB_URI environment variable');
    } else if (error.code === 'EAUTH') {
      console.error('💡 Authentication failed:');
      console.error('   1. Check username and password');
      console.error('   2. Ensure user has proper permissions');
      console.error('   3. Verify database name is correct');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('💡 Connection timeout:');
      console.error('   1. Check network connectivity');
      console.error('   2. Verify MongoDB Atlas is accessible');
      console.error('   3. Check firewall settings');
    }
    
    console.error('📋 Current connection string format:', config.mongodb.uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    // In production, exit immediately; in development, continue with warning
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 Exiting due to database connection failure in production');
      process.exit(1);
    } else {
      console.warn('⚠️ Continuing in development mode despite database connection failure');
      return null;
    }
  }
};

module.exports = connectDB;
