import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * CSRF Protection using Double Submit Cookie pattern
 *
 * This is a modern alternative to the deprecated csurf package.
 *
 * How it works:
 * 1. Server generates a random CSRF token
 * 2. Token is sent to client both in a cookie AND in response body
 * 3. Client must send token back in a custom header for state-changing requests
 * 4. Server verifies that cookie token matches header token
 *
 * This prevents CSRF because:
 * - Cookies are automatically sent by browser
 * - But custom headers require JavaScript (which CSRF attacks can't use)
 * - Attacker can't read the cookie value due to Same-Origin Policy
 */

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure CSRF token
 */
function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Middleware to generate and set CSRF token
 * Use this on routes that render pages or return initial data
 */
export function setCsrfToken(req: Request, res: Response, next: NextFunction): void {
  // Generate new token if one doesn't exist
  let token = req.cookies?.[CSRF_COOKIE_NAME];

  if (!token) {
    token = generateCsrfToken();

    // Set cookie with security options
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Must be false so JavaScript can read it
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // Prevent CSRF
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    });
  }

  // Also send token in response header for convenience
  res.setHeader('X-CSRF-Token', token);

  // Attach token to request for potential use in views
  (req as any).csrfToken = token;

  next();
}

/**
 * Middleware to verify CSRF token on state-changing requests
 * Use this on POST, PUT, PATCH, DELETE routes
 */
export function verifyCsrfToken(req: Request, res: Response, next: NextFunction): void {
  // Skip verification for safe methods (GET, HEAD, OPTIONS)
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Get token from cookie
  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

  // Get token from header (or body as fallback)
  const headerToken = req.headers[CSRF_HEADER_NAME] as string || req.body?._csrf;

  // Verify both tokens exist
  if (!cookieToken) {
    res.status(403).json({
      error: 'CSRF token missing',
      message: 'CSRF cookie not found. Please refresh the page and try again.',
      code: 'CSRF_COOKIE_MISSING'
    });
    return;
  }

  if (!headerToken) {
    res.status(403).json({
      error: 'CSRF token missing',
      message: 'CSRF token not provided in request header or body. Include X-CSRF-Token header.',
      code: 'CSRF_HEADER_MISSING'
    });
    return;
  }

  // Verify tokens match
  // Use constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    res.status(403).json({
      error: 'Invalid CSRF token',
      message: 'CSRF token validation failed. Please refresh the page and try again.',
      code: 'CSRF_INVALID'
    });
    return;
  }

  // Token is valid, continue
  next();
}

/**
 * Combined middleware that sets and verifies CSRF token
 * Use this as a single middleware for most routes
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // First set the token (if needed)
  setCsrfToken(req, res, () => {
    // Then verify it (for state-changing requests)
    verifyCsrfToken(req, res, next);
  });
}

/**
 * Utility function to get CSRF token from request
 * Useful for including in API responses
 */
export function getCsrfToken(req: Request): string | null {
  return req.cookies?.[CSRF_COOKIE_NAME] || (req as any).csrfToken || null;
}
