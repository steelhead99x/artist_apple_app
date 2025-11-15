import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db.js';
import { hashPassword, verifyPassword } from '../utils/passwordHash.js';
import { generateToken, generateRefreshToken, authenticateToken, verifyToken } from '../utils/auth.js';
import { validateEmail, validatePassword, validateUserType } from '../utils/validation.js';
import { sendEmail, emailTemplates, getAppUrl } from '../utils/email.js';
import { authRateLimiter, pinVerificationRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, walletAddress, userType, name, artistType, bandName } = req.body;

    // Validation
    if (!email && !walletAddress) {
      return res.status(400).json({ error: 'Email or wallet address required' });
    }

    if (!userType || !name) {
      return res.status(400).json({ error: 'User type and name required' });
    }

    if (!validateUserType(userType)) {
      return res.status(400).json({ error: 'Invalid user type' });
    }

    if (email && !validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.error });
      }
    }

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      passwordHash = await hashPassword(password);
    }

    // Booking agents are auto-approved, others need approval
    const status = userType === 'booking_agent' ? 'approved' : 'pending';

    // All musicians/artists register as 'user' type (they are individuals who can join bands)
    // Bands are separate entities created separately or automatically (for solo artists)
    let actualUserType = userType;
    if (userType === 'band') {
      // Anyone registering as band/artist is actually a 'user' (person)
      actualUserType = 'user';
    }

    // Insert user
    const userResult = await query(
      `INSERT INTO users (email, password_hash, wallet_address, user_type, name, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, user_type, name, status`,
      [email || null, passwordHash, walletAddress || null, actualUserType, name, status]
    );

    const user = userResult.rows[0];

    // Create profile based on user type and artist type
    if ((userType === 'band' || userType === 'user') && artistType === 'solo') {
      // Solo artists: Create a band entity and add them as the first member
      // Status is 'pending' - requires booking agent approval
      const soloBandName = `solo - ${name}`;
      const bandIdResult = await query('SELECT uuid_generate_v4() as id');
      const bandId = bandIdResult.rows[0].id;
      
      // Create the solo band (pending approval)
      await query(
        `INSERT INTO bands (id, user_id, band_name, status, admin_notes, admin_email) 
         VALUES ($1, $2, $3, 'pending', $4, $5)`,
        [
          bandId, 
          user.id, 
          soloBandName, 
          '✨ SOLO ARTIST: This is a solo artist band auto-created during registration. Solo artist can add additional musicians as members. Awaiting approval.',
          email || null
        ]
      );

      // Add the solo artist as the first member of their own band
      const memberIdResult = await query('SELECT uuid_generate_v4() as id');
      const memberId = memberIdResult.rows[0].id;
      
      await query(
        `INSERT INTO band_members (id, band_id, user_id, role, status, permissions) 
         VALUES ($1, $2, $3, $4, 'active', $5)`,
        [
          memberId,
          bandId,
          user.id,
          'Solo Artist / Lead',
          JSON.stringify({ 
            can_modify_profile: true, 
            can_receive_band_emails: true,
            can_manage_members: true,
            is_owner: true
          })
        ]
      );
    } else if ((userType === 'band' || userType === 'user') && artistType === 'band' && bandName) {
      // Band/Group artists: Check if band exists
      const existingBandResult = await query(
        'SELECT id, user_id, admin_email FROM bands WHERE LOWER(band_name) = LOWER($1)',
        [bandName]
      );

      if (existingBandResult.rows.length === 0) {
        // Band doesn't exist - create it and add user as first member (owner)
        // Status is 'pending' - requires booking agent approval
        const bandIdResult = await query('SELECT uuid_generate_v4() as id');
        const bandId = bandIdResult.rows[0].id;
        
        await query(
          `INSERT INTO bands (id, user_id, band_name, status, admin_notes, admin_email) 
           VALUES ($1, $2, $3, 'pending', $4, $5)`,
          [
            bandId, 
            user.id, 
            bandName, 
            `🎸 BAND: Created by ${name} during registration. Additional members can be added. Awaiting approval.`,
            email || null
          ]
        );

        // Add the user as the first member and owner of the band
        const memberIdResult = await query('SELECT uuid_generate_v4() as id');
        const memberId = memberIdResult.rows[0].id;
        
        await query(
          `INSERT INTO band_members (id, band_id, user_id, role, status, permissions) 
           VALUES ($1, $2, $3, $4, 'active', $5)`,
          [
            memberId,
            bandId,
            user.id,
            'Band Member',
            JSON.stringify({ 
              can_modify_profile: true, 
              can_receive_band_emails: true,
              can_manage_members: true,
              is_owner: true
            })
          ]
        );
      } else {
        // Band exists - add user as pending member (requires booking agent approval)
        const existingBand = existingBandResult.rows[0];
        const memberIdResult = await query('SELECT uuid_generate_v4() as id');
        const memberId = memberIdResult.rows[0].id;
        
        await query(
          `INSERT INTO band_members (id, band_id, user_id, role, status, permissions) 
           VALUES ($1, $2, $3, $4, 'pending', $5)`,
          [
            memberId,
            existingBand.id,
            user.id,
            'Band Member',
            JSON.stringify({ 
              can_modify_profile: false, 
              can_receive_band_emails: false,
              can_manage_members: false,
              is_owner: false
            })
          ]
        );

        // Get the full band details including band_email
        const bandDetailsResult = await query(
          'SELECT band_email FROM bands WHERE id = $1',
          [existingBand.id]
        );
        const bandEmail = bandDetailsResult.rows[0]?.band_email || '';

        // Notify band admin about the new member request
        if (existingBand.admin_email) {
          try {
            const appUrl = getAppUrl();
            const emailContent = emailTemplates.bandAdminNewMember(
              bandName,
              name,
              email || 'Wallet user',
              'Band Member',
              bandEmail,
              appUrl
            );
            await sendEmail({
              to: existingBand.admin_email,
              subject: emailContent.subject,
              html: emailContent.html,
            });
          } catch (emailError) {
            console.error('Failed to send band admin notification:', emailError);
          }
        }
      }
    }
    
    if (userType === 'bar') {
      await query(
        'INSERT INTO venues (user_id, venue_name, address, city, state) VALUES ($1, $2, $3, $4, $5)',
        [user.id, name, '', '', '']
      );
    } else if (userType === 'studio') {
      await query(
        'INSERT INTO recording_studios (user_id, studio_name) VALUES ($1, $2)',
        [user.id, name]
      );
    }

    // Generate JWT token with admin booking agent fields
    const token = generateToken({
      id: user.id,
      userId: user.id,
      email: user.email || walletAddress,
      userType: user.user_type,
      user_type: user.user_type,
      is_admin_agent: user.user_type === 'booking_agent' ? (user.is_admin_agent || false) : undefined,
      agent_status: user.user_type === 'booking_agent' ? (user.agent_status || 'pending') : undefined,
    });

    // Send welcome email to the user (if they have an email)
    if (email) {
      try {
        const welcomeEmail = emailTemplates.userWelcome(name, userType, getAppUrl());
        await sendEmail({
          to: email,
          subject: welcomeEmail.subject,
          html: welcomeEmail.html,
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail registration if email fails
      }
    }

    // Send notification to booking agents about new user registration
    if (status === 'pending') {
      try {
        console.log(`[REGISTRATION] User ${name} (${userType}) registered with status: ${status}. Checking for booking agents...`);
        
        // Get all booking agents
        const bookingAgentsResult = await query(
          'SELECT email, name FROM users WHERE user_type = $1 AND status = $2',
          ['booking_agent', 'approved']
        );

        console.log(`[REGISTRATION] Found ${bookingAgentsResult.rows.length} booking agent(s) with approved status`);

        if (bookingAgentsResult.rows.length === 0) {
          console.warn('[REGISTRATION] WARNING: No booking agents found in database. Notification will not be sent.');
          console.warn('[REGISTRATION] Make sure there is at least one user with user_type="booking_agent" and status="approved"');
        }

        // Send notification to each booking agent
        let notificationCount = 0;
        for (const agent of bookingAgentsResult.rows) {
          if (agent.email) {
            console.log(`[REGISTRATION] Sending notification to booking agent: ${agent.name} (${agent.email})`);
            const notificationEmail = emailTemplates.bookingAgentNewUserNotification(
              name,
              userType,
              email || 'Wallet-based account',
              getAppUrl()
            );
            await sendEmail({
              to: agent.email,
              subject: notificationEmail.subject,
              html: notificationEmail.html,
            });
            notificationCount++;
            console.log(`[REGISTRATION] Successfully sent notification email to ${agent.email}`);
          } else {
            console.warn(`[REGISTRATION] WARNING: Booking agent ${agent.name} has no email address. Skipping notification.`);
          }
        }
        
        console.log(`[REGISTRATION] Completed: Sent ${notificationCount} notification(s) to booking agents`);
      } catch (emailError) {
        console.error('[REGISTRATION] Failed to send booking agent notification:', emailError);
        console.error('[REGISTRATION] Error details:', emailError instanceof Error ? emailError.message : String(emailError));
        // Don't fail registration if notification fails
      }
    } else {
      console.log(`[REGISTRATION] User ${name} (${userType}) registered with status: ${status}. No notification needed (auto-approved).`);
    }

    return res.status(201).json({
      token,
      userId: user.id,
      name: user.name,
      userType: user.user_type,
      status: user.status,
      message: status === 'pending' ? 'Account created. Waiting for admin approval.' : 'Account created successfully.',
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Provide more specific error messages for common issues
    if (error.code === '42883') { // Function does not exist
      console.error('⚠️ CRITICAL: uuid_generate_v4() function not available. uuid-ossp extension may not be installed.');
      return res.status(500).json({ 
        error: 'Database configuration error',
        details: 'Required database extensions are not installed. Please contact support.',
        code: 'MISSING_DB_EXTENSION'
      });
    }
    
    if (error.code === '42P01') { // Table does not exist
      console.error('⚠️ CRITICAL: Required database table does not exist. Database may not be properly initialized.');
      return res.status(500).json({ 
        error: 'Database configuration error',
        details: 'Database schema is not properly initialized. Please contact support.',
        code: 'MISSING_DB_TABLE'
      });
    }
    
    // Generic error response
    return res.status(500).json({ 
      error: 'Registration failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during registration',
      code: error.code || 'UNKNOWN_ERROR'
    });
  }
});

// POST /api/auth/request-login-pin (rate limited: 5 requests per 15 minutes)
router.post('/request-login-pin', pinVerificationRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Find user by email
    const userResult = await query(
      'SELECT id, email, name, deleted_at, status FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if user exists for security
      return res.json({ 
        success: true, 
        message: 'If an account exists with this email, a PIN code has been sent.' 
      });
    }

    const user = userResult.rows[0];

    // Check if user account is deleted/suspended
    if (user.deleted_at !== null || user.status === 'deleted') {
      // Don't reveal account status for security
      return res.json({ 
        success: true, 
        message: 'If an account exists with this email, a PIN code has been sent.' 
      });
    }

    // Generate 9-digit PIN code using cryptographically secure random
    const pinCode = crypto.randomInt(100000000, 1000000000).toString();

    // Expires in 15 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Invalidate any existing unused PIN codes for this email
    await query(
      'UPDATE login_pin_codes SET used = TRUE WHERE email = $1 AND used = FALSE AND expires_at > NOW()',
      [email]
    );

    // Store PIN code
    await query(
      'INSERT INTO login_pin_codes (user_id, email, pin_code, expires_at) VALUES ($1, $2, $3, $4)',
      [user.id, email, pinCode, expiresAt]
    );

    // Send email with PIN code
    try {
      const loginPinEmail = emailTemplates.loginPin(user.name, pinCode);
      await sendEmail({
        to: email,
        subject: loginPinEmail.subject,
        html: loginPinEmail.html,
      });
    } catch (emailError) {
      console.error('Failed to send login PIN email:', emailError);
      // Still return success to not reveal if email failed
    }

    return res.json({ 
      success: true, 
      message: 'If an account exists with this email, a PIN code has been sent.' 
    });

  } catch (error: any) {
    console.error('Request login PIN error:', error);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    // Provide more specific error message if it's a database error
    if (error?.code === '42P01') {
      // Table doesn't exist
      console.error('login_pin_codes table does not exist. Please run the migration: backend/migration_login_pin_codes.sql');
      return res.status(500).json({ 
        error: 'Database configuration error. Please contact support.',
        details: 'login_pin_codes table not found'
      });
    }
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// POST /api/auth/login (rate limited: 5 attempts per 15 minutes)
router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password, walletAddress, pinCode } = req.body;

    let userResult;
    
    // Login with PIN code
    if (email && pinCode) {
      // Find active PIN code
      const pinResult = await query(
        `SELECT lp.id as pin_id, lp.user_id, lp.email as pin_email, lp.pin_code, lp.expires_at, lp.used,
                u.id, u.email, u.name, u.user_type, u.status, u.deleted_at, u.suspension_reason, u.is_admin_agent, u.agent_status
         FROM login_pin_codes lp
         JOIN users u ON lp.user_id = u.id
         WHERE lp.email = $1 AND lp.pin_code = $2 AND lp.used = FALSE AND lp.expires_at > NOW()`,
        [email, pinCode]
      );

      if (pinResult.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid or expired PIN code' });
      }

      const pinRecord = pinResult.rows[0];
      const user = {
        id: pinRecord.id,
        email: pinRecord.email,
        name: pinRecord.name,
        user_type: pinRecord.user_type,
        status: pinRecord.status,
        deleted_at: pinRecord.deleted_at,
        suspension_reason: pinRecord.suspension_reason,
        is_admin_agent: pinRecord.is_admin_agent,
        agent_status: pinRecord.agent_status,
      };

      // Check if user account is deleted/suspended
      if (user.deleted_at !== null || user.status === 'deleted') {
        return res.status(403).json({ 
          error: 'Account suspended',
          code: 'ACCOUNT_SUSPENDED',
          suspension_reason: user.suspension_reason || 'admin_deleted',
          message: user.suspension_reason === 'payment_overdue'
            ? 'Your account has been suspended due to an overdue balance. Please pay your outstanding balance to restore access.'
            : 'Your account has been suspended. Please contact your booking agent or support for more information.'
        });
      }

      // Mark PIN as used
      await query(
        'UPDATE login_pin_codes SET used = TRUE WHERE id = $1',
        [pinRecord.pin_id]
      );

      // Generate token with admin booking agent fields
      const token = generateToken({
        id: user.id,
        userId: user.id,
        email: user.email,
        userType: user.user_type,
        user_type: user.user_type,
        is_admin_agent: user.user_type === 'booking_agent' ? (user.is_admin_agent || false) : undefined,
        agent_status: user.user_type === 'booking_agent' ? (user.agent_status || 'pending') : undefined,
      });

      return res.json({
        token,
        userId: user.id,
        name: user.name,
        userType: user.user_type,
        status: user.status,
        isAdminAgent: user.user_type === 'booking_agent' ? (user.is_admin_agent || false) : false,
        agentStatus: user.user_type === 'booking_agent' ? (user.agent_status || 'pending') : null,
      });
    }
    
    // Login with email/password
    else if (email && password) {
      userResult = await query(
        'SELECT id, email, password_hash, user_type, name, status, deleted_at, suspension_reason, is_admin_agent, agent_status FROM users WHERE email = $1',
        [email]
      );

      const user = userResult.rows[0];

      // Use a dummy hash if user doesn't exist to prevent timing attacks
      // This ensures password verification always happens regardless of whether user exists
      const hash = user?.password_hash || '$2a$10$invalidhashxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
      const valid = await verifyPassword(password, hash);

      // Check if user exists and password is valid
      if (!user || !valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if user account is deleted/suspended
      if (user.deleted_at !== null || user.status === 'deleted') {
        return res.status(403).json({
          error: 'Account suspended',
          code: 'ACCOUNT_SUSPENDED',
          suspension_reason: user.suspension_reason || 'admin_deleted',
          message: user.suspension_reason === 'payment_overdue'
            ? 'Your account has been suspended due to an overdue balance. Please pay your outstanding balance to restore access.'
            : 'Your account has been suspended. Please contact your booking agent or support for more information.'
        });
      }

      // Generate token with admin booking agent fields
      const token = generateToken({
        id: user.id,
        userId: user.id,
        email: user.email,
        userType: user.user_type,
        user_type: user.user_type,
        is_admin_agent: user.user_type === 'booking_agent' ? (user.is_admin_agent || false) : undefined,
        agent_status: user.user_type === 'booking_agent' ? (user.agent_status || 'pending') : undefined,
      });

      return res.json({
        token,
        userId: user.id,
        name: user.name,
        userType: user.user_type,
        status: user.status,
        isAdminAgent: user.user_type === 'booking_agent' ? (user.is_admin_agent || false) : false,
        agentStatus: user.user_type === 'booking_agent' ? (user.agent_status || 'pending') : null,
      });
    }
    
    // Login with wallet
    else if (walletAddress) {
      userResult = await query(
        'SELECT id, email, wallet_address, user_type, name, status, deleted_at, suspension_reason, is_admin_agent, agent_status FROM users WHERE wallet_address = $1',
        [walletAddress]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'Wallet not registered' });
      }

      const user = userResult.rows[0];

      // Check if user account is deleted/suspended
      if (user.deleted_at !== null || user.status === 'deleted') {
        return res.status(403).json({ 
          error: 'Account suspended',
          code: 'ACCOUNT_SUSPENDED',
          suspension_reason: user.suspension_reason || 'admin_deleted',
          message: user.suspension_reason === 'payment_overdue'
            ? 'Your account has been suspended due to an overdue balance. Please pay your outstanding balance to restore access.'
            : 'Your account has been suspended. Please contact your booking agent or support for more information.'
        });
      }

      const token = generateToken({
        id: user.id,
        userId: user.id,
        email: walletAddress,
        userType: user.user_type,
        user_type: user.user_type,
        is_admin_agent: user.user_type === 'booking_agent' ? (user.is_admin_agent || false) : undefined,
        agent_status: user.user_type === 'booking_agent' ? (user.agent_status || 'pending') : undefined,
      });

      return res.json({
        token,
        userId: user.id,
        name: user.name,
        userType: user.user_type,
        status: user.status,
        isAdminAgent: user.user_type === 'booking_agent' ? (user.is_admin_agent || false) : false,
        agentStatus: user.user_type === 'booking_agent' ? (user.agent_status || 'pending') : null,
      });
    }

    return res.status(400).json({ error: 'Email/password, email/PIN code, or wallet address required' });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me (get current user info)
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { verifyToken } = await import('../utils/auth.js');
    const payload = verifyToken(token);

    // Try to get suspension_reason and contact fields, but handle if columns don't exist
    let userResult;
    try {
      userResult = await query(
        'SELECT id, email, wallet_address, user_type, name, status, is_admin_agent, deleted_at, suspension_reason, contact_phone, contact_email, contact_address, recovery_email FROM users WHERE id = $1',
        [payload.userId]
      );
    } catch (dbError: any) {
      // If columns don't exist, query without them
      if (dbError.message && (dbError.message.includes('suspension_reason') || dbError.message.includes('contact_'))) {
        try {
          userResult = await query(
            'SELECT id, email, wallet_address, user_type, name, status, is_admin_agent, deleted_at, suspension_reason FROM users WHERE id = $1',
            [payload.userId]
          );
        } catch (dbError2: any) {
          if (dbError2.message && dbError2.message.includes('suspension_reason')) {
            userResult = await query(
              'SELECT id, email, wallet_address, user_type, name, status, is_admin_agent, deleted_at FROM users WHERE id = $1',
              [payload.userId]
            );
          } else {
            throw dbError2;
          }
        }
      } else {
        throw dbError;
      }
    }

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    
    // Check if user account is deleted/suspended
    // Note: Payment-suspended users CAN access /me to see their status
    if (user.deleted_at !== null || user.status === 'deleted') {
      // Return user data with suspension info for payment-overdue users
      if (user.suspension_reason === 'payment_overdue') {
        return res.json({
          ...user,
          isAdminAgent: user.user_type === 'booking_agent' ? (user.is_admin_agent || false) : false,
          suspended: true,
          suspension_reason: 'payment_overdue'
        });
      }
      
      // Block other suspended users
      return res.status(403).json({ 
        error: 'Account suspended',
        code: 'ACCOUNT_SUSPENDED',
        suspension_reason: user.suspension_reason || 'admin_deleted',
        message: 'Your account has been suspended. Please contact your booking agent or support for more information.'
      });
    }

    return res.json({
      ...user,
      isAdminAgent: user.user_type === 'booking_agent' ? (user.is_admin_agent || false) : false,
    });

  } catch (error) {
    console.error('Get user error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// DELETE /api/auth/account - Delete own account
router.delete('/account', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { verifyToken } = await import('../utils/auth.js');
    const payload = verifyToken(token);

    // Get user info before deletion
    const userResult = await query(
      'SELECT name, email, user_type FROM users WHERE id = $1',
      [payload.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const deletedUser = userResult.rows[0];

    // Delete user (CASCADE will handle related records)
    await query('DELETE FROM users WHERE id = $1', [payload.userId]);

    // Send confirmation email if user has email
    if (deletedUser.email) {
      try {
        const { sendEmail, emailTemplates } = await import('../utils/email.js');
        const emailContent = emailTemplates.accountSelfDeleted(
          deletedUser.name,
          getAppUrl()
        );
        
        await sendEmail({
          to: deletedUser.email,
          subject: emailContent.subject,
          html: emailContent.html,
        });
      } catch (emailError) {
        console.error('Failed to send deletion confirmation email:', emailError);
      }
    }

    // Notify booking agents about the account deletion
    try {
      const { sendEmail, emailTemplates } = await import('../utils/email.js');
      const bookingAgentsResult = await query(
        'SELECT email, name FROM users WHERE user_type = $1 AND status = $2',
        ['booking_agent', 'approved']
      );

      for (const agent of bookingAgentsResult.rows) {
        if (agent.email) {
          try {
            const notificationEmail = emailTemplates.bookingAgentUserDeletionNotification(
              agent.name,
              deletedUser.name,
              deletedUser.email || 'No email on file',
              deletedUser.user_type,
              getAppUrl()
            );
            await sendEmail({
              to: agent.email,
              subject: notificationEmail.subject,
              html: notificationEmail.html,
            });
          } catch (agentEmailError) {
            console.error(`Failed to send notification to booking agent ${agent.email}:`, agentEmailError);
            // Continue with other booking agents even if one fails
          }
        }
      }
    } catch (notificationError) {
      console.error('Failed to notify booking agents about account deletion:', notificationError);
      // Don't fail the deletion if notifications fail
    }

    res.json({ 
      success: true, 
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, email, wallet_address, contact_phone, contact_email, contact_address, recovery_email } = req.body;

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (email !== undefined) {
      // Validate email format
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      // Check if email is already taken by another user
      const existingEmailResult = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, user.userId]
      );
      if (existingEmailResult.rows.length > 0) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      updates.push(`email = $${paramIndex}`);
      values.push(email);
      paramIndex++;
    }

    if (wallet_address !== undefined) {
      // Check if wallet is already taken by another user
      if (wallet_address) {
        const existingWalletResult = await query(
          'SELECT id FROM users WHERE wallet_address = $1 AND id != $2',
          [wallet_address, user.userId]
        );
        if (existingWalletResult.rows.length > 0) {
          return res.status(400).json({ error: 'Wallet address already in use' });
        }
      }
      updates.push(`wallet_address = $${paramIndex}`);
      values.push(wallet_address || null);
      paramIndex++;
    }

    if (contact_phone !== undefined) {
      updates.push(`contact_phone = $${paramIndex}`);
      values.push(contact_phone || null);
      paramIndex++;
    }

    if (contact_email !== undefined) {
      if (contact_email && !validateEmail(contact_email)) {
        return res.status(400).json({ error: 'Invalid contact email format' });
      }
      updates.push(`contact_email = $${paramIndex}`);
      values.push(contact_email || null);
      paramIndex++;
    }

    if (contact_address !== undefined) {
      updates.push(`contact_address = $${paramIndex}`);
      values.push(contact_address || null);
      paramIndex++;
    }

    if (recovery_email !== undefined) {
      if (recovery_email && !validateEmail(recovery_email)) {
        return res.status(400).json({ error: 'Invalid recovery email format' });
      }
      updates.push(`recovery_email = $${paramIndex}`);
      values.push(recovery_email || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add updated_at
    updates.push(`updated_at = NOW()`);
    
    // Add user ID for WHERE clause
    values.push(user.userId);

    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, name, wallet_address, contact_phone, contact_email, contact_address, recovery_email, user_type, status
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/auth/refresh
// Refresh access token using refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    let payload;
    try {
      payload = verifyToken(refreshToken);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Get fresh user data from database
    const userResult = await query(
      'SELECT id, email, name, user_type, status, deleted_at, is_admin_agent, agent_status FROM users WHERE id = $1',
      [payload.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Check if user is deleted/suspended
    if (user.deleted_at !== null || user.status === 'deleted') {
      return res.status(403).json({ error: 'Account suspended or deleted' });
    }

    // Generate new access token
    const newAccessToken = generateToken({
      id: user.id,
      userId: user.id,
      email: user.email,
      userType: user.user_type,
      user_type: user.user_type,
      is_admin_agent: user.user_type === 'booking_agent' ? (user.is_admin_agent || false) : undefined,
      agent_status: user.user_type === 'booking_agent' ? (user.agent_status || 'pending') : undefined,
    });

    // Optionally generate new refresh token (token rotation for better security)
    const newRefreshToken = generateRefreshToken({
      id: user.id,
      userId: user.id,
      email: user.email,
      userType: user.user_type,
      user_type: user.user_type,
      is_admin_agent: user.user_type === 'booking_agent' ? (user.is_admin_agent || false) : undefined,
      agent_status: user.user_type === 'booking_agent' ? (user.agent_status || 'pending') : undefined,
    });

    res.json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: user.user_type,
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

export default router;

