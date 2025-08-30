const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const config = require('./index');
    console.log('🔗 Attempting to connect to MongoDB...');
    console.log(`🗄️ URI: ${config.mongodb.uri.substring(0, 30)}...`);
    
    // For development, if MongoDB Atlas fails, try local MongoDB
    let conn;
    try {
      conn = await mongoose.connect(config.mongodb.uri, {
        serverSelectionTimeoutMS: 10000, // 10 seconds
        socketTimeoutMS: 45000, // 45 seconds
        connectTimeoutMS: 10000, // 10 seconds
        maxPoolSize: 10,
        retryWrites: true,
        w: 'majority'
      });
    } catch (atlasError) {
      console.log('⚠️ MongoDB Atlas connection failed, trying local MongoDB...');
      const localUri = 'mongodb://127.0.0.1:27017/hrms_iwiz';
      conn = await mongoose.connect(localUri, {
        serverSelectionTimeoutMS: 5000, // 5 seconds
        socketTimeoutMS: 45000,
        connectTimeoutMS: 5000,
        maxPoolSize: 10
      });
    }

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
    console.error('🔍 Error details:', {
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname
    });
    
    console.log('⚠️ Continuing without database connection...');
    console.log('💡 To fix this:');
    console.log('   1. Install MongoDB locally: https://docs.mongodb.com/manual/installation/');
    console.log('   2. Or update MONGODB_URI in .env file with a valid connection string');
    return null;
  }
};

module.exports = connectDB;
