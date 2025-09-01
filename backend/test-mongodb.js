require('dotenv').config();
const mongoose = require('mongoose');

console.log('🧪 Testing MongoDB Connection...');
console.log('📋 Environment:', process.env.NODE_ENV || 'development');
console.log('🔌 MONGODB_URI format check:', process.env.MONGODB_URI ? '✅ Set' : '❌ Not set');

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not set');
  process.exit(1);
}

// Check connection string format
const uri = process.env.MONGODB_URI;
console.log('📍 Connection string format:', uri.includes('mongodb+srv://') ? '✅ Valid Atlas format' : '⚠️ Check format');

// Test connection
async function testConnection() {
  try {
    console.log('🔌 Attempting to connect...');
    
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ MongoDB connected successfully!');
    console.log('🏠 Host:', conn.connection.host);
    console.log('🗄️ Database:', conn.connection.name);
    console.log('📊 Ready state:', conn.connection.readyState);
    
    // Test a simple operation
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('📚 Collections found:', collections.length);
    
    await mongoose.connection.close();
    console.log('✅ Connection test completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.error('💡 ENOTFOUND Error - This usually means:');
      console.error('   1. The cluster name in your connection string is wrong');
      console.error('   2. The connection string format is incorrect');
      console.error('   3. DNS resolution issues');
      console.error('');
      console.error('🔧 Example of correct format:');
      console.error('   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/database?retryWrites=true&w=majority');
      console.error('');
      console.error('📋 Your current connection string (masked):');
      console.error('   ' + uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    }
    
    process.exit(1);
  }
}

testConnection();
