import { Router } from 'express';
import { query } from '../db.js';
import { sendEmail, emailTemplates, getAppUrl } from '../utils/email.js';
import { authenticateToken } from '../utils/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Mailing list signup handler function
const handleMailingListSignup = async (req: any, res: any) => {
  try {
    const { email, name, source = 'website', metadata } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if database is available
    try {
      // Check if already subscribed
      const existingResult = await query(
        'SELECT id, status FROM mailing_list_subscribers WHERE email = $1',
        [email]
      );

      if (existingResult.rows.length > 0) {
        const existing = existingResult.rows[0];
        if (existing.status === 'active') {
          return res.status(200).json({
            success: true,
            message: 'Email already subscribed to mailing list'
          });
        } else {
          // Reactivate subscription
          await query(
            'UPDATE mailing_list_subscribers SET status = $1, updated_at = NOW() WHERE id = $2',
            ['active', existing.id]
          );
        }
      } else {
        // Create new subscription
        const id = uuidv4();
        await query(
          'INSERT INTO mailing_list_subscribers (id, email, name, source, metadata, subscribed_at) VALUES ($1, $2, $3, $4, $5, NOW())',
          [id, email, name || null, source, metadata ? JSON.stringify(metadata) : null]
        );
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // If database is not available, still return success but log the error
      console.log('Database not available, mailing list signup logged:', { email, name, source });
    }

    // Send notification to admin about new mailing list signup
    // Check if email service is configured
    const mailjetApiKey = process.env.MAILJET_API_KEY || process.env.MAILJET_API;
    const mailjetApiSecret = process.env.MAILJET_API_SECRET || process.env.MAILJET_KEY;

    if (!mailjetApiKey || !mailjetApiSecret) {
      console.log('Email service not configured. Mailing list signup successful but no admin notification sent.');
      return res.status(200).json({
        success: true,
        message: 'Successfully subscribed to mailing list'
      });
    }

    try {
      const adminResult = await query(
        'SELECT email, name FROM users WHERE user_type = $1 AND status = $2 LIMIT 1',
        ['booking_agent', 'approved']
      );

      if (adminResult.rows.length > 0) {
        const admin = adminResult.rows[0];
        const notificationMessage = `New Mailing List Signup\n\nName: ${name || 'Not provided'}\nEmail: ${email}\nSource: ${source}\n\nTime: ${new Date().toLocaleString()}`;
        
        const emailContent = emailTemplates.adminNotification(
          'New Mailing List Signup',
          notificationMessage,
          getAppUrl()
        );

        await sendEmail({
          to: admin.email,
          subject: emailContent.subject,
          html: emailContent.html,
        });
      }
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
      // Don't fail the subscription if admin notification fails
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully subscribed to mailing list'
    });

  } catch (error: any) {
    console.error('Mailing list subscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to subscribe to mailing list',
      error: error.message
    });
  }
};

// POST /api/mailing-list/signup - Subscribe to mailing list
router.post('/signup', handleMailingListSignup);

// Middleware to verify admin access
const verifyAdmin = async (req: any, res: any, next: any) => {
  if (req.user.userType !== 'booking_agent') {
    return res.status(403).json({ error: 'Unauthorized: Admin access required' });
  }

  try {
    const userResult = await query(
      'SELECT is_admin_agent, agent_status FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (user.is_admin_agent === true && user.agent_status === 'active') {
      return next();
    }

    return res.status(403).json({
      error: 'Unauthorized: Admin booking agent access required'
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/mailing-list/subscribers - Get mailing list subscribers (admin only)
router.get('/subscribers', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, name, status, source, created_at FROM mailing_list_subscribers ORDER BY created_at DESC'
    );

    return res.status(200).json({
      success: true,
      subscribers: result.rows,
      count: result.rows.length
    });

  } catch (error: any) {
    console.error('Get subscribers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get subscribers',
      error: error.message
    });
  }
});

export default router;