/**
 * MongoDB Database Configuration
 */

import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Check if MONGO_URI is set
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI is not defined in environment variables');
      process.exit(1);
    }

    // Connection options for better reliability
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      connectTimeoutMS: 10000, // Give up initial connection after 10s
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain at least 2 socket connections
      retryWrites: true,
      w: 'majority'
    };

    console.log('🔄 Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGO_URI, options);
    
    console.log(`✅ MongoDB Connected Successfully!`);
    console.log(`📊 Host: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`📊 Ready State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    
    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully');
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connection established');
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed!');
    console.error('Error Details:');
    console.error('- Message:', error.message);
    
    // Provide helpful error messages based on error type
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Solution: Check your MongoDB username and password in MONGO_URI');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('\n💡 Solution: Check your MongoDB cluster URL/hostname in MONGO_URI');
    } else if (error.message.includes('timeout')) {
      console.error('\n💡 Solution:');
      console.error('   1. Check your internet connection');
      console.error('   2. Verify MongoDB Atlas IP whitelist (allow 0.0.0.0/0 for testing)');
      console.error('   3. Check if MongoDB service is running');
    } else if (error.message.includes('MongoServerError')) {
      console.error('\n💡 Solution: Check MongoDB Atlas dashboard for service status');
    } else {
      console.error('\n💡 Common Solutions:');
      console.error('   1. Verify MONGO_URI format: mongodb+srv://username:password@cluster.mongodb.net/database');
      console.error('   2. Check MongoDB Atlas IP whitelist');
      console.error('   3. Verify database credentials');
      console.error('   4. Ensure MongoDB cluster is running');
    }
    
    console.error('\n📋 Current MONGO_URI format (hidden):', 
      process.env.MONGO_URI ? 
        process.env.MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') : 
        'NOT SET'
    );
    
    process.exit(1);
  }
};

export default connectDB;
