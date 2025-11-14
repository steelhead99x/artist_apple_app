import { query } from '../db.js';
import { Request } from 'express';

export type EventCategory = 'authentication' | 'authorization' | 'data_access' | 'admin' | 'payment';
export type EventStatus = 'success' | 'failure' | 'pending';
export type SecurityLevel = 'info' | 'warning' | 'critical';

interface AuditLogParams {
  userId?: string;
  email?: string;
  eventType: string;
  eventCategory: EventCategory;
  eventStatus: EventStatus;
  ipAddress?: string;
  userAgent?: string;
  requestPath?: string;
  requestMethod?: string;
  userType?: string;
  details?: Record<string, any>;
  securityLevel?: SecurityLevel;
}

interface AdminActionParams {
  adminUserId: string;
  adminEmail: string;
  actionType: string;
  targetUserId?: string;
  targetEmail?: string;
  targetType?: string;
  reason?: string;
  actionDetails?: Record<string, any>;
  ipAddress?: string;
}

/**
 * Utility to extract IP address from request
 */
export function getIpAddress(req: Request): string {
  // Check for IP from various proxy headers
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (forwarded as string).split(',');
    return ips[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(params: AuditLogParams): Promise<string | null> {
  try {
    const result = await query(
      `INSERT INTO audit_logs (
        user_id, email, event_type, event_category, event_status,
        ip_address, user_agent, request_path, request_method,
        user_type, details, security_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        params.userId || null,
        params.email || null,
        params.eventType,
        params.eventCategory,
        params.eventStatus,
        params.ipAddress || null,
        params.userAgent || null,
        params.requestPath || null,
        params.requestMethod || null,
        params.userType || null,
        params.details ? JSON.stringify(params.details) : null,
        params.securityLevel || 'info'
      ]
    );

    return result.rows[0]?.id || null;
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should not break the main flow
    return null;
  }
}

/**
 * Log authentication events (login, logout, password change)
 */
export async function logAuthEvent(
  eventType: 'login' | 'logout' | 'password_change' | 'password_reset' | 'pin_login' | 'wallet_login',
  userId: string | null,
  email: string,
  status: EventStatus,
  req?: Request,
  details?: Record<string, any>
): Promise<string | null> {
  return logAuditEvent({
    userId: userId || undefined,
    email,
    eventType,
    eventCategory: 'authentication',
    eventStatus: status,
    ipAddress: req ? getIpAddress(req) : undefined,
    userAgent: req?.headers['user-agent'],
    requestPath: req?.path,
    requestMethod: req?.method,
    details,
    securityLevel: status === 'failure' ? 'warning' : 'info'
  });
}

/**
 * Log failed login attempt
 */
export async function logFailedLogin(
  email: string,
  attemptType: 'password' | 'pin' | 'wallet',
  req: Request,
  userId?: string
): Promise<void> {
  try {
    const ipAddress = getIpAddress(req);
    const userAgent = req.headers['user-agent'] || null;

    // Log to audit logs
    await logAuthEvent('login', userId || null, email, 'failure', req, {
      attemptType,
      reason: 'invalid_credentials'
    });

    // Log to failed_login_attempts table
    await query(
      `INSERT INTO failed_login_attempts (
        user_id, email, ip_address, user_agent, attempt_type
      ) VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, email, ipAddress, userAgent, attemptType]
    );

    // Update user's failed login count if user exists
    if (userId) {
      await query(
        `UPDATE users
         SET failed_login_count = COALESCE(failed_login_count, 0) + 1,
             last_failed_login = NOW()
         WHERE id = $1`,
        [userId]
      );
    }
  } catch (error) {
    console.error('Failed to log failed login attempt:', error);
  }
}

/**
 * Check if account should be locked due to too many failed attempts
 */
export async function checkAndLockAccount(email: string): Promise<{ locked: boolean; attempts: number }> {
  try {
    // Count failed attempts in last 15 minutes
    const result = await query(
      `SELECT COUNT(*) as count
       FROM failed_login_attempts
       WHERE email = $1
         AND attempted_at > NOW() - INTERVAL '15 minutes'`,
      [email]
    );

    const attempts = parseInt(result.rows[0]?.count || '0');

    // Lock account if 5 or more failed attempts in last 15 minutes
    if (attempts >= 5) {
      await query(
        `UPDATE users
         SET locked_until = NOW() + INTERVAL '1 hour',
             lockout_reason = 'too_many_failed_attempts'
         WHERE email = $1
           AND (locked_until IS NULL OR locked_until < NOW())`,
        [email]
      );

      // Log the lockout
      const userResult = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (userResult.rows.length > 0) {
        await logAuditEvent({
          userId: userResult.rows[0].id,
          email,
          eventType: 'account_locked',
          eventCategory: 'authentication',
          eventStatus: 'success',
          details: { reason: 'too_many_failed_attempts', attempts },
          securityLevel: 'warning'
        });
      }

      return { locked: true, attempts };
    }

    return { locked: false, attempts };
  } catch (error) {
    console.error('Error checking account lockout:', error);
    return { locked: false, attempts: 0 };
  }
}

/**
 * Check if account is currently locked
 */
export async function isAccountLocked(email: string): Promise<{ locked: boolean; lockedUntil?: Date; reason?: string }> {
  try {
    const result = await query(
      `SELECT locked_until, lockout_reason
       FROM users
       WHERE email = $1
         AND locked_until IS NOT NULL
         AND locked_until > NOW()`,
      [email]
    );

    if (result.rows.length > 0) {
      return {
        locked: true,
        lockedUntil: result.rows[0].locked_until,
        reason: result.rows[0].lockout_reason
      };
    }

    return { locked: false };
  } catch (error) {
    console.error('Error checking if account is locked:', error);
    return { locked: false };
  }
}

/**
 * Clear failed login attempts after successful login
 */
export async function clearFailedAttempts(userId: string): Promise<void> {
  try {
    await query(
      `UPDATE users
       SET failed_login_count = 0,
           last_failed_login = NULL,
           locked_until = NULL,
           lockout_reason = NULL
       WHERE id = $1`,
      [userId]
    );

    // Optionally delete old failed attempts records
    await query(
      `DELETE FROM failed_login_attempts
       WHERE user_id = $1`,
      [userId]
    );
  } catch (error) {
    console.error('Failed to clear failed attempts:', error);
  }
}

/**
 * Log admin actions
 */
export async function logAdminAction(params: AdminActionParams): Promise<string | null> {
  try {
    const result = await query(
      `INSERT INTO admin_action_logs (
        admin_user_id, admin_email, action_type,
        target_user_id, target_email, target_type,
        reason, action_details, ip_address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        params.adminUserId,
        params.adminEmail,
        params.actionType,
        params.targetUserId || null,
        params.targetEmail || null,
        params.targetType || null,
        params.reason || null,
        params.actionDetails ? JSON.stringify(params.actionDetails) : null,
        params.ipAddress || null
      ]
    );

    // Also log to main audit_logs
    await logAuditEvent({
      userId: params.adminUserId,
      email: params.adminEmail,
      eventType: `admin_action_${params.actionType}`,
      eventCategory: 'admin',
      eventStatus: 'success',
      ipAddress: params.ipAddress,
      details: {
        action_type: params.actionType,
        target_user_id: params.targetUserId,
        target_email: params.targetEmail,
        target_type: params.targetType,
        reason: params.reason,
        ...params.actionDetails
      },
      securityLevel: 'info'
    });

    return result.rows[0]?.id || null;
  } catch (error) {
    console.error('Failed to log admin action:', error);
    return null;
  }
}
