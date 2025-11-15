import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response, NextFunction} from 'express';
import bcrypt from 'bcryptjs';

// SECURITY: JWT_SECRET must be set in production
let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set!');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  // Use a random secret in development (will be different each restart)
  JWT_SECRET = crypto.randomBytes(64).toString('hex');
  console.warn('WARNING: Using temporary random JWT secret for development. All tokens will be invalidated on restart.');
  console.warn('Generated secret length:', JWT_SECRET.length, 'characters');
}

export interface JWTPayload {
  id: string;
  userId: string;
  email: string;
  userType: string;
  user_type: string;
  is_admin_agent?: boolean;
  agent_status?: string;
  wallet_address?: string;
}

// SECURITY: Reduced from 7d to 1d for better security
// Users should use refresh tokens for longer sessions
export function generateToken(payload: JWTPayload): string {
  // JWT_SECRET is guaranteed to be set (either from env or generated for dev)
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: '1d' });
}

// Generate refresh token (valid for 30 days)
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: '30d' });
}

export function verifyToken(token: string): JWTPayload {
  // JWT_SECRET is guaranteed to be set (either from env or generated for dev)
  return jwt.verify(token, JWT_SECRET!) as JWTPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Helper function to check if route is payment-related
function isPaymentRoute(path: string): boolean {
  const paymentRoutes = [
    '/api/auth/me',
    '/api/subscriptions',
    '/api/user/balance',
    '/api/user/invoices',
    '/api/user/payment',
    '/api/checkout',
    '/api/stripe'
  ];
  return paymentRoutes.some(route => path.startsWith(route));
}

// Middleware to verify JWT token
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const payload = verifyToken(token);
    
    // Check if user is deleted/suspended by querying the database
    const { query } = await import('../db.js');
    
    // Get current user data including admin status
    let userResult;
    try {
      userResult = await query(
        'SELECT deleted_at, status, suspension_reason, user_type, is_admin_agent, agent_status FROM users WHERE id = $1',
        [payload.userId]
      );
    } catch (dbError: any) {
      // If suspension_reason or admin columns don't exist, query without them
      if (dbError.message && (dbError.message.includes('suspension_reason') || dbError.message.includes('is_admin_agent'))) {
        userResult = await query(
          'SELECT deleted_at, status, user_type FROM users WHERE id = $1',
          [payload.userId]
        );
      } else {
        throw dbError;
      }
    }
    
    if (userResult.rows.length === 0) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    
    const user = userResult.rows[0];
    const isSuspended = user.deleted_at !== null || user.status === 'deleted';
    
    if (isSuspended) {
      // Allow payment-suspended users to access payment-related routes
      if (user.suspension_reason === 'payment_overdue' && isPaymentRoute(req.path)) {
        (req as any).user = payload;
        (req as any).user.suspended = true;
        (req as any).user.suspension_reason = 'payment_overdue';
        next();
        return;
      }
      
      // Block all other suspended users
      res.status(403).json({ 
        error: 'Account suspended',
        code: 'ACCOUNT_SUSPENDED',
        suspension_reason: user.suspension_reason || 'admin_deleted',
        message: user.suspension_reason === 'payment_overdue' 
          ? 'Your account has been suspended due to an overdue balance. Please pay your outstanding balance to restore access.'
          : 'Your account has been suspended. Please contact your booking agent or support for more information.'
      });
      return;
    }
    
    // Check if booking agent admin status has changed and needs token refresh
    let needsTokenRefresh = false;
    if (user.user_type === 'booking_agent') {
      const currentIsAdmin = user.is_admin_agent === true;
      const currentAgentStatus = user.agent_status || 'pending';
      const tokenIsAdmin = payload.is_admin_agent === true;
      const tokenAgentStatus = payload.agent_status;
      
      // Refresh token if admin status or agent status has changed
      if (currentIsAdmin !== tokenIsAdmin || currentAgentStatus !== tokenAgentStatus) {
        needsTokenRefresh = true;
        console.log(`Booking agent role changed for user ${payload.email}: admin=${tokenIsAdmin}->${currentIsAdmin}, status=${tokenAgentStatus}->${currentAgentStatus}`);
      }
    }
    
    // If token needs refresh, generate new token and attach it to response
    if (needsTokenRefresh) {
      const newPayload: JWTPayload = {
        id: payload.userId,
        userId: payload.userId,
        email: payload.email,
        userType: user.user_type,
        user_type: user.user_type,
        is_admin_agent: user.is_admin_agent === true,
        agent_status: user.agent_status || 'pending',
        wallet_address: payload.wallet_address
      };
      
      const newToken = generateToken(newPayload);
      
      // Send new token in response header
      res.setHeader('X-New-Token', newToken);
      res.setHeader('X-Token-Refreshed', 'true');
      
      // Update payload for this request
      (req as any).user = newPayload;
      console.log(`✓ JWT token auto-refreshed for ${payload.email}`);
    } else {
      (req as any).user = payload;
    }
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(403).json({ error: 'Invalid token' });
  }
}

// Optional authentication (doesn't fail if no token)
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const payload = verifyToken(token);
      (req as any).user = payload;
    } catch (error) {
      // Token invalid, but we continue anyway
    }
  }
  
  next();
}

