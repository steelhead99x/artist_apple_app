import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { pool } from '../db.js';
import bcrypt from 'bcrypt';
import { sendEmail } from '../utils/email.js';
import { passwordResetRateLimiter, pinVerificationRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Generate 6-digit PIN using cryptographically secure random
function generatePin(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

// Validate email format
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// POST /api/password-reset/request - Request password reset (rate limited: 3 per hour)
router.post('/request', passwordResetRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, useRecoveryEmail } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email or username required' });
    }

    // Determine if we're looking up by recovery email or regular email/username
    let userResult;
    let targetEmail: string;

    if (useRecoveryEmail === true) {
      // Find user by recovery email
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Valid recovery email required' });
      }
      userResult = await pool.query(
        'SELECT id, name, email, recovery_email FROM users WHERE recovery_email = $1',
        [email.toLowerCase()]
      );
      if (userResult.rows.length > 0) {
        targetEmail = userResult.rows[0].recovery_email || userResult.rows[0].email;
      }
    } else {
      // Find user by regular email (username/login)
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Valid email required' });
      }
      userResult = await pool.query(
        'SELECT id, name, email, recovery_email FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      if (userResult.rows.length > 0) {
        targetEmail = userResult.rows[0].email;
      }
    }

    if (userResult.rows.length === 0) {
      // Don't reveal if user exists, return success anyway
      return res.status(200).json({
        success: true,
        message: 'If an account exists, you will receive a PIN code shortly.'
      });
    }

    const user = userResult.rows[0];

    // Generate PIN
    const pin = generatePin();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset request - use the target email (recovery or regular)
    await pool.query(`
      INSERT INTO password_resets (user_id, email, pin_code, expires_at, used)
      VALUES ($1, $2, $3, $4, false)
    `, [user.id, targetEmail!.toLowerCase(), pin, expiresAt]);

    // Send email with PIN
    const emailContent = {
      subject: 'Password Reset PIN - Artist Space',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>You requested a password reset for your Artist Space account. Use the following PIN code to reset your password:</p>
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #333; margin: 0; font-size: 32px; letter-spacing: 5px;">${pin}</h1>
          </div>
          <p>This PIN will expire in 15 minutes.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Artist Space Team</p>
        </div>
      `
    };

    try {
      await sendEmail({
        to: targetEmail!,
        subject: emailContent.subject,
        html: emailContent.html,
      });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // Still return success to not reveal if user exists
    }

    return res.status(200).json({
      success: true,
      message: 'If an account exists, you will receive a PIN code shortly.'
    });
  } catch (error: any) {
    console.error('Password reset request error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/password-reset/verify - Verify PIN and reset password (rate limited: 10 per hour)
router.post('/verify', pinVerificationRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, pin, newPassword } = req.body;

    if (!email || !pin || !newPassword) {
      return res.status(400).json({ error: 'Email, PIN, and new password required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Find valid reset request - check if email matches the stored email in password_resets
    // or matches the user's regular/recovery email for flexibility
    let resetResult = await pool.query(`
      SELECT pr.*, u.email as user_email, u.recovery_email as user_recovery_email
      FROM password_resets pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.email = $1 AND pr.pin_code = $2 AND pr.used = false AND pr.expires_at > NOW()
      ORDER BY pr.created_at DESC
      LIMIT 1
    `, [email.toLowerCase(), pin]);

    // If not found, try matching against user's email or recovery email
    if (resetResult.rows.length === 0) {
      resetResult = await pool.query(`
        SELECT pr.*, u.email as user_email, u.recovery_email as user_recovery_email
        FROM password_resets pr
        JOIN users u ON pr.user_id = u.id
        WHERE (u.email = $1 OR u.recovery_email = $1) 
          AND pr.pin_code = $2 
          AND pr.used = false 
          AND pr.expires_at > NOW()
        ORDER BY pr.created_at DESC
        LIMIT 1
      `, [email.toLowerCase(), pin]);
    }

    if (resetResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired PIN code' });
    }

    const reset = resetResult.rows[0];

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update user password and clear requires_password_reset flag
    await pool.query(`
      UPDATE users 
      SET password_hash = $1, requires_password_reset = false, updated_at = NOW()
      WHERE id = $2
    `, [passwordHash, reset.user_id]);

    // Mark reset as used
    await pool.query(
      'UPDATE password_resets SET used = true WHERE id = $1',
      [reset.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error: any) {
    console.error('Password reset verify error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/password-reset/check-required - Check if password reset is required (used after login)
router.get('/check-required', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    
    // SECURITY FIX: Properly verify JWT signature instead of just decoding
    const { verifyToken } = await import('../utils/auth.js');
    try {
      const payload = verifyToken(token);
      
      const userResult = await pool.query(
        'SELECT requires_password_reset FROM users WHERE id = $1',
        [payload.userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' });
      }

      return res.status(200).json({
        requiresReset: userResult.rows[0].requires_password_reset === true
      });
    } catch (verifyError) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error: any) {
    console.error('Check password reset required error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
});

export default router;
