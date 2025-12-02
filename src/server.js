/**
 * Customer Support Backend Server
 * 
 * Quickstart:
 * 1. npm install
 * 2. Update .env with your MongoDB URI and SMTP settings (optional)
 * 3. npm run dev (development) or npm start (production)
 * 
 * Features:
 * - MongoDB integration with Mongoose
 * - Email notifications (if SMTP configured)
 * - Rate limiting on contact form
 * - Input validation with Zod
 * - Security headers with Helmet
 * - Request logging with Morgan
 * - CORS support
 * - Graceful error handling
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';

// Load environment variables
import './config/env.js';

// Validate required environment variables
const requiredEnvVars = ['PORT', 'MONGO_URI', 'JWT_ACCESS_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Import database connection
import connectDB from './config/db.js';

// Import routes (new minimal set)
import searchRoutes from './routes/search.routes.js';
import branchRoutes from './routes/branches.routes.js';
import userRoutes from './routes/users.routes.js';
import authRoutes from './routes/auth.routes.js';
import adminsRoutes from './routes/admins.routes.js';
import clientsRoutes from './routes/clients.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import otpRoutes from './routes/otp.routes.js';

// Import middleware
import { notFound, errorHandler } from './middlewares/error.js';
import { apiRateLimit } from './middlewares/rateLimit.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Trust proxy - Required for nginx reverse proxy
app.set('trust proxy', 1);

// Connect to MongoDB
connectDB();

// Security middleware - Mobile-friendly configuration
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API server (CSP should be on frontend)
  crossOriginEmbedderPolicy: false, // Allow external resources
  crossOriginOpenerPolicy: false, // Allow cross-origin openers
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
}));

// CORS middleware with flexible origin support
const whitelist = (process.env.CORS_WHITELIST || process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const defaultAllowedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With', 'x-otp-token', 'X-OTP-Token'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) return callback(null, true);
    
    console.log('🔍 CORS Request from origin:', origin);
    
    // If whitelist is empty, allow all origins
    if (whitelist.length === 0) {
      console.log('✅ CORS: Whitelist empty, allowing all origins');
      return callback(null, true);
    }
    
    // Check exact match in whitelist
    if (whitelist.includes(origin)) {
      console.log('✅ CORS: Origin matched in whitelist');
      return callback(null, true);
    }
    
    // Allow both http and https versions of IP addresses and domains
    const originWithoutProtocol = origin.replace(/^https?:\/\//, '');
    for (const allowed of whitelist) {
      const allowedWithoutProtocol = allowed.replace(/^https?:\/\//, '');
      if (originWithoutProtocol === allowedWithoutProtocol) {
        console.log('✅ CORS: Origin matched (without protocol)');
        return callback(null, true);
      }
    }
    
    console.log('❌ CORS: Origin not allowed:', origin);
    console.log('📋 Whitelist:', whitelist);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: defaultAllowedHeaders,
  exposedHeaders: defaultAllowedHeaders
}));

// Force HTTPS to HTTP redirect for mixed content (if needed)
app.use((req, res, next) => {
  // If request comes with HTTPS but we're on HTTP, handle gracefully
  if (req.get('x-forwarded-proto') === 'https' && !req.secure) {
    console.log('⚠️ HTTPS request on HTTP server - CORS will handle this');
  }
  next();
});

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitization & hardening middlewares
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Logging middleware
app.use(morgan('tiny'));

// Rate limiting (apply to public APIs)
app.use(
  ['/search', '/branches', '/users', '/auth/login', '/admins', '/clients', '/otp/send'],
  apiRateLimit,
);

// API Routes (minimal)
app.use('/search', searchRoutes);
app.use('/branches', branchRoutes);
app.use('/users', userRoutes);
app.use('/auth', authRoutes);
app.use('/admins', adminsRoutes);
app.use('/clients', clientsRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/otp', otpRoutes);

// Health endpoint
app.get('/health', (req, res) => {
  return res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Testing backend server status after multiple deployments'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Customer Support API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      search: 'GET /search?userId=AB123',
      branches: 'GET /branches?page=1&limit=10',
      users: 'GET /users?page=1&limit=10',
      auth: 'POST /auth/login, GET /auth/me, POST /auth/logout',
      admins: 'POST /admins (Root only)',
      clients: 'GET /clients (SubAdmin only)'
    }
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  
  if (process.env.EMAIL_HOST || process.env.SMTP_HOST) {
    console.log('📧 Email notifications enabled');
  } else {
    console.log('📧 Email notifications disabled (EMAIL_HOST not configured)');
  }
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Exiting to allow clean restart.`);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

export default app;