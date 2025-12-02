/**
 * Rate Limiting Middleware
 */

import rateLimit from 'express-rate-limit';

// Rate limit for contact form submissions
export const contactRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    success: false,
    error: 'Too many contact form submissions, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limit
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Lightweight rate limit for WhatsApp redirect to avoid abuse
export const whatsappRedirectRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 redirects/min per IP
  message: {
    success: false,
    error: 'Too many redirect requests, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
