import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Helper function to extract IP address from request
const getIpAddress = (req: Request): string => {
  // Check for forwarded IPs (when behind a proxy)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }
  // Fall back to standard IP
  return req.ip || req.socket.remoteAddress || 'unknown';
};

// Stricter rate limiting for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    error: 'Too many authentication attempts',
    message: 'Please wait 15 minutes before trying again',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use IP address as key
  keyGenerator: (req: Request) => getIpAddress(req),
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'You have exceeded the maximum number of login attempts. Please wait 15 minutes before trying again.',
      retryAfter: 15 * 60
    });
  }
});

// Rate limiting for password reset requests (per email)
const passwordResetStore = new Map<string, { count: number; resetTime: number }>();

export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour per IP
  message: {
    error: 'Too many password reset requests',
    message: 'Please wait 1 hour before requesting another password reset',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use email from body if available, otherwise IP
    const email = req.body?.email;
    return email ? `email:${email.toLowerCase()}` : `ip:${getIpAddress(req)}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many password reset requests',
      message: 'You have exceeded the maximum number of password reset requests. Please wait 1 hour before trying again.',
      retryAfter: 60 * 60
    });
  }
});

// Rate limiting for PIN verification
export const pinVerificationRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 verification attempts per hour per IP
  message: {
    error: 'Too many PIN verification attempts',
    message: 'Please wait 1 hour before trying again',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful verifications
  keyGenerator: (req: Request) => getIpAddress(req)
});

// Rate limiting for gift card operations
export const giftCardRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 gift card operations per 15 minutes
  message: {
    error: 'Too many gift card requests',
    message: 'Please wait before making more gift card requests',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// General API rate limiter (less strict than auth)
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Reduced from 3000 to 1000 for better security
  message: {
    error: 'Too many requests',
    message: 'Please slow down your requests',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful requests to certain endpoints
  skip: (req: Request) => {
    // Don't rate limit health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});
