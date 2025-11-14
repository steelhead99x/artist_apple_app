import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken, hashPassword } from '../utils/auth.js';
import { sendEmail, emailTemplates, getAppUrl } from '../utils/email.js';

// Helper function to notify all admin booking agents
async function notifyAdminBookingAgents(
  itemType: string,
  itemName: string,
  itemEmail: string,
  actionType: 'recovery' | 'purge',
  performedBy: string,
  reason?: string
) {
  try {
    // Get all admin booking agents
    const agentsResult = await query(`
      SELECT email, name 
      FROM users 
      WHERE user_type = 'booking_agent' 
        AND is_admin_agent = true 
        AND agent_status = 'active'
        AND deleted_at IS NULL
    `);

    const appUrl = getAppUrl();

    for (const agent of agentsResult.rows) {
      if (agent.email) {
        try {
          let emailContent;
          if (actionType === 'recovery') {
            emailContent = emailTemplates.adminItemMovedToRecovery(
              agent.name,
              itemType,
              itemName,
              itemEmail,
              performedBy,
              appUrl
            );
          } else {
            emailContent = emailTemplates.adminItemPurged(
              agent.name,
              itemType,
              itemName,
              itemEmail,
              performedBy,
              reason || 'No reason provided',
              appUrl
            );
          }

          await sendEmail({
            to: agent.email,
            subject: emailContent.subject,
            html: emailContent.html,
          });
        } catch (emailError) {
          console.error(`Failed to send notification to admin agent ${agent.email}:`, emailError);
          // Continue with other agents even if one fails
        }
      }
    }
  } catch (error) {
    console.error('Failed to notify admin booking agents:', error);
    // Don't fail the main operation if notifications fail
  }
}

const router = Router();

// Middleware to verify admin booking agent (checks database for current status)
const verifyAdmin = async (req: any, res: any, next: any) => {
  if (req.user.userType !== 'booking_agent') {
    return res.status(403).json({ error: 'Unauthorized: Booking agent only' });
  }
  
  // Check if user is an admin booking agent (query database for current status)
  try {
    const userResult = await query(
      'SELECT is_admin_agent, agent_status FROM users WHERE id = $1',
      [req.user.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Only allow access for admin booking agents with active status
    if (user.is_admin_agent === true && user.agent_status === 'active') {
      return next();
    }

    return res.status(403).json({
      error: 'Unauthorized: Admin booking agent access required',
      message: 'Only admin booking agents with active status can access this resource'
    });
  } catch (error) {
    console.error('Error checking admin booking agent status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/admin/pending-users - Get pending user approvals (artists only, excluding bands and venues)
router.get('/pending-users', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT u.*,
             CASE
               WHEN u.user_type = 'studio' THEN s.studio_name
             END as profile_name
      FROM users u
      LEFT JOIN recording_studios s ON u.id = s.user_id
      WHERE u.status = 'pending'
        AND u.user_type NOT IN ('bar', 'band', 'venue', 'booking_agent', 'booking_manager')
        AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

// GET /api/admin/pending-venues - Get pending venue approvals
router.get('/pending-venues', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT u.*,
             v.id as venue_id,
             v.venue_name,
             v.address,
             v.city,
             v.state,
             v.capacity,
             v.description
      FROM users u
      LEFT JOIN venues v ON u.id = v.user_id
      WHERE u.status = 'pending' AND u.user_type = 'bar' AND u.deleted_at IS NULL
      ORDER BY u.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get pending venues error:', error);
    res.status(500).json({ error: 'Failed to fetch pending venues' });
  }
});

// PUT /api/admin/users/:id/approve - Approve user
router.put('/users/:id/approve', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const bookingManagerId = (req as any).user.userId;

    // Get user type to determine if this is a venue
    const userResult = await query(
      'SELECT user_type FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userType = userResult.rows[0].user_type;

    // Clear any deleted_at timestamp and set status to approved
    await query(
      'UPDATE users SET status = $1, deleted_at = NULL WHERE id = $2',
      ['approved', id]
    );

    // If this is a venue, assign the booking agent to the venue
    if (userType === 'bar') {
      await query(
        `UPDATE venues 
         SET booking_agent_id = $2
         WHERE user_id = $1`,
        [id, bookingManagerId]
      );
    }

    // Also approve any pending bands owned by this user (especially for solo artists)
    // Assign the approving booking manager as the band's booking manager
    // This ensures solo bands created during registration are approved when the user is approved
    // Update bands that are pending OR don't have a booking manager assigned
    await query(
      `UPDATE bands 
       SET status = 'approved', booking_manager_id = $2
       WHERE user_id = $1 
         AND (status = 'pending' OR status IS NULL OR booking_manager_id IS NULL)`,
      [id, bookingManagerId]
    );

    res.json({ success: true, message: 'User approved' });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// PUT /api/admin/users/:id/reject - Reject user (soft delete with 30-day recovery)
router.put('/users/:id/reject', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Soft delete: Set status to rejected and mark deletion timestamp
    await query(
      'UPDATE users SET status = $1, deleted_at = NOW() WHERE id = $2',
      ['rejected', id]
    );

    res.json({ 
      success: true, 
      message: 'User rejected and moved to deleted items (30-day recovery period)' 
    });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ error: 'Failed to reject user' });
  }
});

// GET /api/admin/pending-reviews - Get pending review approvals
router.get('/pending-reviews', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT r.*, 
             u1.name as reviewer_name,
             u2.name as reviewee_name
      FROM reviews r
      JOIN users u1 ON r.reviewer_id = u1.id
      JOIN users u2 ON r.reviewee_id = u2.id
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get pending reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch pending reviews' });
  }
});

// PUT /api/admin/reviews/:id/approve - Approve review
router.put('/reviews/:id/approve', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await query(
      'UPDATE reviews SET status = $1 WHERE id = $2',
      ['approved', id]
    );

    res.json({ success: true, message: 'Review approved' });
  } catch (error) {
    console.error('Approve review error:', error);
    res.status(500).json({ error: 'Failed to approve review' });
  }
});

// PUT /api/admin/reviews/:id/reject - Reject review
router.put('/reviews/:id/reject', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await query(
      'UPDATE reviews SET status = $1 WHERE id = $2',
      ['rejected', id]
    );

    res.json({ success: true, message: 'Review rejected' });
  } catch (error) {
    console.error('Reject review error:', error);
    res.status(500).json({ error: 'Failed to reject review' });
  }
});

// GET /api/admin/all-users - Get all users for admin management (excluding deleted)
router.get('/all-users', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { userType } = req.query;
    
    let queryText = `
      SELECT u.id, u.name, u.email, u.user_type, u.status, u.created_at, u.custom_band_limit,
             b.id as band_id, b.band_name, b.description as band_description,
             b.genre, b.eth_wallet as band_eth_wallet, b.website, b.social_links,
             v.id as venue_id, v.venue_name, v.description as venue_description,
             v.address as venue_address, v.city as venue_city, v.state as venue_state,
             s.id as studio_id, s.studio_name, s.description as studio_description,
             s.address as studio_address, s.city as studio_city, s.state as studio_state
      FROM users u
      LEFT JOIN bands b ON u.id = b.user_id AND u.user_type = 'band'
      LEFT JOIN venues v ON u.id = v.user_id AND u.user_type = 'bar'
      LEFT JOIN recording_studios s ON u.id = s.user_id AND u.user_type = 'studio'
      WHERE u.deleted_at IS NULL
    `;
    
    const params: any[] = [];
    
    if (userType && userType !== 'all') {
      // Map 'venue' to 'bar' since database stores venues as 'bar'
      const dbUserType = userType === 'venue' ? 'bar' : userType;
      queryText += ' AND u.user_type = $1';
      params.push(dbUserType);
    }
    
    queryText += ' ORDER BY u.created_at DESC';
    
    const result = await query(queryText, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/admin/deleted-users - Get all deleted/rejected/suspended users (90-day recovery period)
router.get('/deleted-users', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.name, u.email, u.user_type, u.status, u.created_at, u.deleted_at,
             b.id as band_id, b.band_name, b.description as band_description, 
             b.genre, b.eth_wallet as band_eth_wallet, b.website, b.social_links,
             CASE 
               WHEN u.deleted_at IS NOT NULL AND u.deleted_at > NOW() - INTERVAL '90 days' THEN true
               WHEN u.status IN ('rejected', 'suspended') AND u.deleted_at IS NULL THEN true
               ELSE false
             END as recoverable
      FROM users u
      LEFT JOIN bands b ON u.id = b.user_id AND u.user_type = 'band'
      WHERE u.deleted_at IS NOT NULL 
         OR u.status IN ('rejected', 'suspended')
      ORDER BY COALESCE(u.deleted_at, u.created_at) DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get deleted users error:', error);
    res.status(500).json({ error: 'Failed to fetch deleted users' });
  }
});

// POST /api/admin/users/:id/recover - Recover deleted user account
router.post('/users/:id/recover', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists and is deleted
    const userResult = await query(
      'SELECT name, email, user_type, deleted_at FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (!user.deleted_at) {
      return res.status(400).json({ error: 'User is not deleted' });
    }

    // Check if recovery period has expired (90 days)
    const deletedDate = new Date(user.deleted_at);
    const now = new Date();
    const daysSinceDeleted = (now.getTime() - deletedDate.getTime()) / (1000 * 3600 * 24);

    if (daysSinceDeleted > 90) {
      return res.status(400).json({ 
        error: 'Recovery period expired',
        message: 'This account was deleted more than 90 days ago and can no longer be recovered'
      });
    }

    // Recover user (remove deleted_at, set status back to approved)
    await query('UPDATE users SET deleted_at = NULL, status = $1 WHERE id = $2', ['approved', id]);

    // Send email notification if user has email
    if (user.email) {
      try {
        const { sendEmail, emailTemplates } = await import('../utils/email.js');
        const emailContent = emailTemplates.accountRecovered(
          user.name,
          user.user_type,
          getAppUrl()
        );
        
        await sendEmail({
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
        });
      } catch (emailError) {
        console.error('Failed to send recovery notification email:', emailError);
        // Don't fail the recovery if email fails
      }
    }

    res.json({ 
      success: true, 
      message: 'User account recovered successfully',
      emailSent: !!user.email
    });
  } catch (error) {
    console.error('Recover user error:', error);
    res.status(500).json({ error: 'Failed to recover user' });
  }
});

// GET /api/admin/bands - Get all bands for admin management (all approved bands)
router.get('/bands', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT b.id, b.user_id, b.band_name, b.description, b.genre, 
             b.eth_wallet, b.website, b.social_links, b.created_at, b.admin_notes,
             u.name, u.status, u.user_type
      FROM bands b 
      JOIN users u ON b.user_id = u.id 
      WHERE u.status = 'approved'
      ORDER BY b.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get admin bands error:', error);
    res.status(500).json({ error: 'Failed to fetch bands' });
  }
});

// DELETE /api/admin/bands/:id - Delete band (soft delete)
router.delete('/bands/:id', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    // Check if band exists
    const bandResult = await query(
      'SELECT b.id, b.band_name, u.id as user_id, u.email FROM bands b JOIN users u ON b.user_id = u.id WHERE b.id = $1',
      [id]
    );

    if (bandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Band not found' });
    }

    const band = bandResult.rows[0];

    // Get current user name for notification
    const currentUserResult = await query('SELECT name FROM users WHERE id = $1', [currentUser.userId]);
    const performedBy = currentUserResult.rows[0]?.name || 'Unknown Admin';

    // Soft delete: Update user status to 'rejected' and set deleted_at
    await query(
      'UPDATE users SET status = $1, deleted_at = NOW() WHERE id = $2',
      ['rejected', band.user_id]
    );

    // Notify admin booking agents about recovery
    await notifyAdminBookingAgents(
      'Band',
      band.band_name,
      band.email || '',
      'recovery',
      performedBy
    );

    res.json({ success: true, message: `Band "${band.band_name}" has been deleted successfully` });
  } catch (error) {
    console.error('Delete band error:', error);
    res.status(500).json({ error: 'Failed to delete band' });
  }
});

// GET /api/admin/stats - Get platform statistics
router.get('/stats', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const bandCount = await query(
      'SELECT COUNT(*) as count FROM users WHERE user_type = $1 AND status = $2 AND deleted_at IS NULL',
      ['band', 'approved']
    );

    const venueCount = await query(
      'SELECT COUNT(*) as count FROM users WHERE user_type = $1 AND status = $2 AND deleted_at IS NULL',
      ['venue', 'approved']
    );

    const tourCount = await query('SELECT COUNT(*) as count FROM tours');

    const totalEvents = await query('SELECT COUNT(*) as count FROM tour_dates');

    const upcomingEvents = await query(
      'SELECT COUNT(*) as count FROM tour_dates WHERE date >= CURRENT_DATE'
    );

    const upcomingTours = await query(
      'SELECT COUNT(*) as count FROM tour_dates WHERE date >= CURRENT_DATE AND status = $1',
      ['confirmed']
    );

    const completedEvents = await query(
      'SELECT COUNT(*) as count FROM tour_dates WHERE status = $1',
      ['completed']
    );

    const pendingReviews = await query(
      'SELECT COUNT(*) as count FROM reviews WHERE status = $1',
      ['pending']
    );

    const totalRevenue = await query(
      'SELECT SUM(payment_amount) as total FROM tour_dates WHERE status = $1',
      ['completed']
    );

    const avgAttendance = await query(
      'SELECT AVG(attendance) as average FROM tour_kpis'
    );

    const avgBarSales = await query(
      'SELECT AVG(bar_sales) as average FROM tour_kpis'
    );

    const totalAttendance = await query(
      'SELECT SUM(attendance) as total FROM tour_kpis'
    );

    const activeUsers = await query(
      'SELECT COUNT(*) as count FROM users WHERE status = $1 AND deleted_at IS NULL',
      ['approved']
    );

    const pendingUsers = await query(
      'SELECT COUNT(*) as count FROM users WHERE status = $1 AND user_type NOT IN ($2, $3, $4, $5, $6) AND deleted_at IS NULL',
      ['pending', 'bar', 'band', 'venue', 'booking_agent', 'booking_manager']
    );

    res.json({
      bands: parseInt(bandCount.rows[0].count) || 0,
      venues: parseInt(venueCount.rows[0].count) || 0,
      totalTours: parseInt(tourCount.rows[0].count) || 0,
      totalEvents: parseInt(totalEvents.rows[0].count) || 0,
      upcomingEvents: parseInt(upcomingEvents.rows[0].count) || 0,
      upcomingTours: parseInt(upcomingTours.rows[0].count) || 0,
      completedEvents: parseInt(completedEvents.rows[0].count) || 0,
      pendingReviews: parseInt(pendingReviews.rows[0].count) || 0,
      totalRevenue: parseFloat(totalRevenue.rows[0].total) || 0,
      avgAttendance: parseFloat(avgAttendance.rows[0].average) || 0,
      avgBarSales: parseFloat(avgBarSales.rows[0].average) || 0,
      totalAttendance: parseInt(totalAttendance.rows[0].total) || 0,
      activeUsers: parseInt(activeUsers.rows[0].count) || 0,
      pendingUsers: parseInt(pendingUsers.rows[0].count) || 0,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// POST /api/admin/create-band - Create band manually (booking agent only)
router.post('/create-band', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const user = req.user;
    const { user_id, band_name, description, genre, eth_wallet, website, social_links, admin_email, is_solo } = req.body;

    let userId: string;
    let userName: string;
    let userEmail: string | null = null;
    let tempPassword: string | null = null;

    // If user_id is provided, use existing user; otherwise create new user
    if (user_id) {
      // Use existing user
      const existingUserResult = await query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [user_id]
      );

      if (existingUserResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const existingUser = existingUserResult.rows[0];
      userId = existingUser.id;
      userName = existingUser.name;
      userEmail = existingUser.email;
    } else {
      // Create new user account
      // If solo artist, format the band name as "solo - {band_name}"
      let finalBandName = band_name;
      if (is_solo && band_name) {
        finalBandName = `solo - ${band_name}`;
      }

      if (!finalBandName) {
        return res.status(400).json({ error: 'Band/Artist name is required' });
      }

      // Validate admin email if provided
      if (admin_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin_email)) {
        return res.status(400).json({ error: 'Invalid admin email format' });
      }

      // All artists/musicians are 'user' type (individuals who can be in bands)
      const userType = 'user';

      // Create a user account for the artist/musician
      const userIdResult = await query('SELECT uuid_generate_v4() as id');
      userId = userIdResult.rows[0].id;
      tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).toUpperCase().slice(-4);
      const passwordHash = await hashPassword(tempPassword);

      // Generate a unique email for the user using the UUID
      const bandEmail = is_solo 
        ? `solo-artist-${userId}@artistspace.internal`
        : `band-owner-${userId}@artistspace.internal`;

      // Create user record with appropriate user_type
      await query(`
        INSERT INTO users (id, email, password_hash, user_type, name, status, requires_password_reset)
        VALUES ($1, $2, $3, $4, $5, 'approved', true)
      `, [userId, bandEmail, passwordHash, userType, band_name]);

      userName = band_name;
      userEmail = bandEmail;
    }

    // For solo bands, use the user's name if user_id was provided
    let finalBandName = user_id && is_solo 
      ? `solo - ${userName}`
      : (is_solo && band_name ? `solo - ${band_name}` : band_name || userName);

    // If creating for existing user and solo, format band name
    if (user_id && is_solo) {
      finalBandName = `solo - ${userName}`;
    }

    // Create band record (band_email will be auto-generated by trigger)
    const bandIdResult = await query('SELECT uuid_generate_v4() as id');
    const bandId = bandIdResult.rows[0].id;
    
    // Add admin note if solo artist
    const adminNotes = is_solo 
      ? `✨ SOLO ARTIST: This is a solo artist band for ${userName} (created by admin). Solo artist can add additional musicians as members.`
      : null;
    
    await query(`
      INSERT INTO bands (id, user_id, booking_manager_id, band_name, description, genre, eth_wallet, website, social_links, admin_email, status, admin_notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [bandId, userId, user?.userId, finalBandName, description || null, genre || null, eth_wallet || null, website || null, social_links || null, admin_email || null, 'approved', adminNotes]);

    // If solo artist, add them as the first member of their own band
    if (is_solo) {
      const memberIdResult = await query('SELECT uuid_generate_v4() as id');
      const memberId = memberIdResult.rows[0].id;
      
      await query(
        `INSERT INTO band_members (id, band_id, user_id, role, status, permissions) 
         VALUES ($1, $2, $3, $4, 'active', $5)`,
        [
          memberId,
          bandId,
          userId,
          'Solo Artist / Lead',
          JSON.stringify({ 
            can_modify_profile: true, 
            can_receive_band_emails: true,
            can_manage_members: true,
            is_owner: true
          })
        ]
      );
    }

    const newBand = await query(`
      SELECT b.*, u.name, u.email, u.status 
      FROM bands b 
      JOIN users u ON b.user_id = u.id 
      WHERE b.id = $1
    `, [bandId]);

    // Send welcome email to admin if email is provided (only for new users, not existing ones)
    const appUrl = getAppUrl();
    if (!user_id && admin_email && newBand.rows[0].band_email) {
      try {
        const emailContent = emailTemplates.bandWelcome(
          userName,
          newBand.rows[0].band_email,
          admin_email,
          tempPassword!,
          appUrl
        );
        
        await sendEmail({
          to: admin_email,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        console.log(`Welcome email sent to band admin: ${admin_email}`);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the band creation if email fails
      }
    }

    res.json({
      success: true,
      band: newBand.rows[0],
      tempPassword: tempPassword || undefined,
      email: userEmail || undefined,
      bandEmail: newBand.rows[0].band_email, // The auto-generated unique band email
      adminEmail: admin_email,
      isSolo: is_solo || false,
      message: user_id && is_solo
        ? `Solo band "solo - ${userName}" created successfully for existing user ${userName}.`
        : is_solo
        ? `Solo artist "${userName}" created successfully with band name "solo - ${userName}". Use the provided email and password to log in.`
        : user_id
        ? `Band "${finalBandName}" created successfully for existing user ${userName}.`
        : 'Band created successfully. Use the provided email and password to log in as this band.'
    });
  } catch (error: any) {
    console.error('Create band error:', error);
    res.status(500).json({ 
      error: 'Failed to create band',
      details: error.message || 'Unknown error occurred'
    });
  }
});

// DELETE /api/admin/users/:id - Soft delete user account (booking agent only)
// Users are marked as deleted but recoverable for 90 days
router.delete('/users/:id', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    // Get user info before deletion for email notification
    const userResult = await query(
      'SELECT name, email, user_type FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found or already deleted' });
    }

    const deletedUser = userResult.rows[0];

    // Get current user name for notification
    const currentUserResult = await query('SELECT name FROM users WHERE id = $1', [currentUser.userId]);
    const performedBy = currentUserResult.rows[0]?.name || 'Unknown Admin';

    // Soft delete user (set deleted_at timestamp)
    await query('UPDATE users SET deleted_at = NOW(), status = $1 WHERE id = $2', ['suspended', id]);

    // Send email notification if user has email
    if (deletedUser.email) {
      try {
        const { sendEmail, emailTemplates } = await import('../utils/email.js');
        const emailContent = emailTemplates.accountDeleted(
          deletedUser.name,
          deletedUser.user_type,
          getAppUrl()
        );
        
        await sendEmail({
          to: deletedUser.email,
          subject: emailContent.subject,
          html: emailContent.html,
        });
      } catch (emailError) {
        console.error('Failed to send deletion notification email:', emailError);
        // Don't fail the deletion if email fails
      }
    }

    // Notify booking agents about the account deletion
    try {
      const { sendEmail, emailTemplates } = await import('../utils/email.js');
      const currentUserId = (req as any).user.userId;
      
      // Get all booking agents except the one performing the deletion
      const bookingAgentsResult = await query(
        'SELECT email, name FROM users WHERE user_type = $1 AND status = $2 AND id != $3',
        ['booking_agent', 'approved', currentUserId]
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

    // Notify admin booking agents about recovery
    await notifyAdminBookingAgents(
      'User',
      deletedUser.name,
      deletedUser.email || '',
      'recovery',
      performedBy
    );

    res.json({ 
      success: true, 
      message: 'User account deleted successfully',
      emailSent: !!deletedUser.email
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/admin/pending-bands - Get bands pending approval
router.get('/pending-bands', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT b.*, u.name as user_name, u.email as user_email, u.status as user_status
      FROM bands b
      JOIN users u ON b.user_id = u.id
      WHERE b.status = 'pending'
        AND u.deleted_at IS NULL
      ORDER BY b.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get pending bands error:', error);
    res.status(500).json({ error: 'Failed to fetch pending bands' });
  }
});

// PUT /api/admin/bands/:id/approve - Approve band
router.put('/bands/:id/approve', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const bookingManagerId = (req as any).user.userId;

    // Approve the band and assign the approving booking manager as the band's booking manager
    // Only set booking_manager_id if it's not already set
    await query(
      `UPDATE bands 
       SET status = $1, admin_notes = NULL, 
           booking_manager_id = COALESCE(booking_manager_id, $3)
       WHERE id = $2`,
      ['approved', id, bookingManagerId]
    );

    res.json({ success: true, message: 'Band approved' });
  } catch (error) {
    console.error('Approve band error:', error);
    res.status(500).json({ error: 'Failed to approve band' });
  }
});

// PUT /api/admin/bands/:id/reject - Reject band
router.put('/bands/:id/reject', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await query(
      'UPDATE bands SET status = $1, admin_notes = $2 WHERE id = $3',
      ['rejected', reason || 'Rejected by booking agent', id]
    );

    res.json({ success: true, message: 'Band rejected' });
  } catch (error) {
    console.error('Reject band error:', error);
    res.status(500).json({ error: 'Failed to reject band' });
  }
});

// PUT /api/admin/users/:id/band-limit - Set custom band limit for a user
router.put('/users/:id/band-limit', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { bandLimit } = req.body;

    // Validate band limit
    if (bandLimit !== null && (typeof bandLimit !== 'number' || bandLimit < 0)) {
      return res.status(400).json({ error: 'Band limit must be a non-negative number or null' });
    }

    // Check if user exists
    const userCheck = await query('SELECT id, name, email, user_type FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = userCheck.rows[0];

    // Only allow setting band limits for artists (user type 'user')
    if (targetUser.user_type !== 'user') {
      return res.status(400).json({ 
        error: 'Band limits can only be set for artist accounts',
        userType: targetUser.user_type
      });
    }

    // Update the custom band limit
    await query(
      'UPDATE users SET custom_band_limit = $1 WHERE id = $2',
      [bandLimit, id]
    );

    // Get updated user info
    const updatedUser = await query(`
      SELECT id, name, email, user_type, custom_band_limit,
             (SELECT COUNT(DISTINCT band_id) FROM (
               SELECT id as band_id FROM bands WHERE user_id = $1
               UNION
               SELECT band_id FROM band_members WHERE user_id = $1 AND status = 'active'
             ) as user_bands) as current_band_count
      FROM users WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: bandLimit === null 
        ? 'Custom band limit removed. User will use their subscription plan limit.' 
        : `Custom band limit set to ${bandLimit}`,
      user: updatedUser.rows[0]
    });
  } catch (error) {
    console.error('Set band limit error:', error);
    res.status(500).json({ error: 'Failed to set band limit' });
  }
});

// ============= VENUE MANAGEMENT ENDPOINTS =============

// GET /api/admin/venues - Get all venues for admin management
router.get('/venues', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id as user_id, u.name, u.email, u.status, u.created_at,
             v.id as venue_id, v.venue_name, v.address, v.city, v.state, 
             v.capacity, v.eth_wallet, v.description, v.amenities
      FROM users u
      JOIN venues v ON u.id = v.user_id
      WHERE u.status = 'approved' AND u.user_type = 'bar' AND u.deleted_at IS NULL
      ORDER BY v.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get admin venues error:', error);
    res.status(500).json({ error: 'Failed to fetch venues' });
  }
});

// PUT /api/admin/venues/:id - Update venue (booking agent only)
router.put('/venues/:id', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { venue_name, owner_name, owner_email, address, city, state, capacity, eth_wallet, description, amenities } = req.body;

    // Check if venue exists
    const venueResult = await query('SELECT id, user_id FROM venues WHERE id = $1', [id]);
    if (venueResult.rows.length === 0) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    const userId = venueResult.rows[0].user_id;

    // Update venue details
    await query(`
      UPDATE venues 
      SET venue_name = COALESCE($1, venue_name),
          address = COALESCE($2, address),
          city = COALESCE($3, city),
          state = COALESCE($4, state),
          capacity = COALESCE($5, capacity),
          eth_wallet = COALESCE($6, eth_wallet),
          description = COALESCE($7, description),
          amenities = COALESCE($8, amenities)
      WHERE id = $9
    `, [venue_name, address, city, state, capacity, eth_wallet, description, amenities, id]);

    // Always sync venue_name with user name if venue_name was updated
    // This ensures the venue name and user name stay in sync
    if (venue_name) {
      await query(`
        UPDATE users
        SET name = $1
        WHERE id = $2
      `, [venue_name, userId]);
    }

    // Update owner email if provided
    if (owner_email) {
      await query(`
        UPDATE users
        SET email = $1
        WHERE id = $2
      `, [owner_email, userId]);
    }

    // Fetch updated venue
    const updated = await query(`
      SELECT u.id as user_id, u.name, u.email, u.status,
             v.id as venue_id, v.venue_name, v.address, v.city, v.state, 
             v.capacity, v.eth_wallet, v.description, v.amenities
      FROM venues v
      JOIN users u ON v.user_id = u.id
      WHERE v.id = $1
    `, [id]);

    res.json({ 
      success: true, 
      message: 'Venue and owner updated successfully',
      venue: updated.rows[0] 
    });
  } catch (error) {
    console.error('Update venue error:', error);
    res.status(500).json({ error: 'Failed to update venue' });
  }
});

// DELETE /api/admin/venues/:id - Delete venue (soft delete by rejecting user)
router.delete('/venues/:id', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    // Check if venue exists
    const venueResult = await query(
      'SELECT v.id, v.venue_name, v.user_id, u.email FROM venues v JOIN users u ON v.user_id = u.id WHERE v.id = $1',
      [id]
    );

    if (venueResult.rows.length === 0) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    const venue = venueResult.rows[0];

    // Get current user name for notification
    const currentUserResult = await query('SELECT name FROM users WHERE id = $1', [currentUser.userId]);
    const performedBy = currentUserResult.rows[0]?.name || 'Unknown Admin';

    // Soft delete: Update user status to 'rejected'
    await query(
      'UPDATE users SET status = $1, deleted_at = NOW() WHERE id = $2',
      ['rejected', venue.user_id]
    );

    // Notify admin booking agents about recovery
    await notifyAdminBookingAgents(
      'Venue',
      venue.venue_name,
      venue.email || '',
      'recovery',
      performedBy
    );

    res.json({ 
      success: true, 
      message: `Venue "${venue.venue_name}" has been deleted successfully` 
    });
  } catch (error) {
    console.error('Delete venue error:', error);
    res.status(500).json({ error: 'Failed to delete venue' });
  }
});

// POST /api/admin/venues/:venueId/assign-tour - Assign tour to venue
router.post('/venues/:venueId/assign-tour', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { venueId } = req.params;
    const { tourDateId } = req.body;

    if (!tourDateId) {
      return res.status(400).json({ error: 'Tour date ID is required' });
    }

    // Check if venue exists
    const venueResult = await query('SELECT id, venue_name FROM venues WHERE id = $1', [venueId]);
    if (venueResult.rows.length === 0) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Check if tour date exists
    const tourResult = await query(
      'SELECT td.id, td.location, t.band_id FROM tour_dates td JOIN tours t ON td.tour_id = t.id WHERE td.id = $1',
      [tourDateId]
    );
    
    if (tourResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tour date not found' });
    }

    // Update tour date with venue
    await query(
      'UPDATE tour_dates SET venue_id = $1, location = $2 WHERE id = $3',
      [venueId, venueResult.rows[0].venue_name, tourDateId]
    );

    res.json({
      success: true,
      message: `Tour date assigned to ${venueResult.rows[0].venue_name}`
    });
  } catch (error) {
    console.error('Assign tour to venue error:', error);
    res.status(500).json({ error: 'Failed to assign tour to venue' });
  }
});

// GET /api/admin/venues/:venueId/tours - Get all tours assigned to a venue
router.get('/venues/:venueId/tours', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { venueId } = req.params;

    const result = await query(`
      SELECT td.id as tour_date_id, td.date, td.location, td.notes,
             t.id as tour_id, t.tour_name, t.start_date, t.end_date,
             b.id as band_id, b.band_name,
             tk.attendance, tk.bar_sales, tk.band_earnings
      FROM tour_dates td
      JOIN tours t ON td.tour_id = t.id
      JOIN bands b ON t.band_id = b.id
      LEFT JOIN tour_kpis tk ON td.id = tk.tour_date_id
      WHERE td.venue_id = $1
      ORDER BY td.date DESC
    `, [venueId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get venue tours error:', error);
    res.status(500).json({ error: 'Failed to fetch venue tours' });
  }
});

// GET /api/admin/deleted-venues - Get all deleted/rejected/suspended venues (90-day recovery period)
router.get('/deleted-venues', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id as user_id, u.name, u.email, u.status, u.deleted_at, u.created_at,
             v.id as venue_id, v.venue_name, v.address, v.city, v.state, 
             v.capacity, v.description,
             CASE 
               WHEN u.deleted_at IS NOT NULL THEN EXTRACT(DAY FROM (NOW() - u.deleted_at))
               ELSE 0
             END as days_since_deletion,
             CASE 
               WHEN u.deleted_at IS NOT NULL THEN 90 - EXTRACT(DAY FROM (NOW() - u.deleted_at))
               ELSE 90
             END as days_remaining
      FROM users u
      JOIN venues v ON u.id = v.user_id
      WHERE (u.deleted_at IS NOT NULL AND u.deleted_at > NOW() - INTERVAL '90 days')
         OR u.status IN ('rejected', 'suspended')
        AND u.user_type = 'bar'
      ORDER BY COALESCE(u.deleted_at, u.created_at) DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get deleted venues error:', error);
    res.status(500).json({ error: 'Failed to fetch deleted venues' });
  }
});

// POST /api/admin/venues/:id/recover - Recover a deleted venue
router.post('/venues/:id/recover', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if venue exists and is within recovery period
    const venueResult = await query(`
      SELECT u.id, u.name, u.user_type, u.deleted_at, v.venue_name
      FROM users u
      JOIN venues v ON u.id = v.user_id
      WHERE v.id = $1 AND u.deleted_at IS NOT NULL
    `, [id]);

    if (venueResult.rows.length === 0) {
      return res.status(404).json({ error: 'Venue not found or not deleted' });
    }

    const venue = venueResult.rows[0];
    const deletedDate = new Date(venue.deleted_at);
    const daysSinceDeletion = Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceDeletion > 90) {
      return res.status(400).json({ 
        error: 'Recovery period expired',
        message: 'This venue was deleted more than 90 days ago and can no longer be recovered'
      });
    }

    // Recover venue (remove deleted_at, set status back to approved)
    await query('UPDATE users SET deleted_at = NULL, status = $1 WHERE id = $2', ['approved', venue.id]);

    res.json({ 
      success: true, 
      message: `Venue "${venue.venue_name}" has been recovered successfully`
    });
  } catch (error) {
    console.error('Recover venue error:', error);
    res.status(500).json({ error: 'Failed to recover venue' });
  }
});

// GET /api/admin/deleted-bands - Get all deleted/rejected/suspended bands (90-day recovery period)
router.get('/deleted-bands', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id as user_id, u.name as user_name, u.email, u.status, u.deleted_at, u.created_at,
             b.id, b.band_name, b.genre, b.description, b.website, b.social_links,
             CASE 
               WHEN u.deleted_at IS NOT NULL AND u.deleted_at > NOW() - INTERVAL '90 days' THEN true
               WHEN u.status IN ('rejected', 'suspended') AND u.deleted_at IS NULL THEN true
               ELSE false
             END as recoverable
      FROM users u
      JOIN bands b ON u.id = b.user_id
      WHERE (u.deleted_at IS NOT NULL) 
         OR u.status IN ('rejected', 'suspended')
        AND u.user_type = 'band'
      ORDER BY COALESCE(u.deleted_at, u.created_at) DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get deleted bands error:', error);
    res.status(500).json({ error: 'Failed to fetch deleted bands' });
  }
});

// POST /api/admin/bands/:id/recover - Recover a deleted band
router.post('/bands/:id/recover', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if band exists and is within recovery period
    const bandResult = await query(`
      SELECT u.id, u.name, u.user_type, u.deleted_at, b.band_name
      FROM users u
      JOIN bands b ON u.id = b.user_id
      WHERE b.id = $1 AND u.deleted_at IS NOT NULL
    `, [id]);

    if (bandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Band not found or not deleted' });
    }

    const band = bandResult.rows[0];
    const deletedDate = new Date(band.deleted_at);
    const daysSinceDeletion = Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceDeletion > 90) {
      return res.status(400).json({ 
        error: 'Recovery period expired',
        message: 'This band was deleted more than 90 days ago and can no longer be recovered'
      });
    }

    // Recover band (remove deleted_at, set status back to approved)
    await query('UPDATE users SET deleted_at = NULL, status = $1 WHERE id = $2', ['approved', band.id]);

    res.json({ 
      success: true, 
      message: `Band "${band.band_name}" has been recovered successfully`
    });
  } catch (error) {
    console.error('Recover band error:', error);
    res.status(500).json({ error: 'Failed to recover band' });
  }
});

// GET /api/admin/deleted-reviews - Get all deleted reviews (90-day recovery period)
router.get('/deleted-reviews', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT r.id, r.rating, r.comment, r.created_at, r.deleted_at,
             u_reviewer.name as reviewer_name,
             u_reviewee.name as reviewee_name,
             CASE 
               WHEN r.deleted_at > NOW() - INTERVAL '90 days' THEN true
               ELSE false
             END as recoverable
      FROM reviews r
      LEFT JOIN users u_reviewer ON r.reviewer_id = u_reviewer.id
      LEFT JOIN users u_reviewee ON r.reviewee_id = u_reviewee.id
      WHERE r.deleted_at IS NOT NULL
      ORDER BY r.deleted_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get deleted reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch deleted reviews' });
  }
});

// POST /api/admin/reviews/:id/recover - Recover a deleted review
router.post('/reviews/:id/recover', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if review exists and is within recovery period
    const reviewResult = await query(`
      SELECT id, deleted_at
      FROM reviews
      WHERE id = $1 AND deleted_at IS NOT NULL
    `, [id]);

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found or not deleted' });
    }

    const review = reviewResult.rows[0];
    const deletedDate = new Date(review.deleted_at);
    const daysSinceDeletion = Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceDeletion > 90) {
      return res.status(400).json({ 
        error: 'Recovery period expired',
        message: 'This review was deleted more than 90 days ago and can no longer be recovered'
      });
    }

    // Recover review (remove deleted_at)
    await query('UPDATE reviews SET deleted_at = NULL WHERE id = $1', [id]);

    res.json({ 
      success: true, 
      message: 'Review has been recovered successfully'
    });
  } catch (error) {
    console.error('Recover review error:', error);
    res.status(500).json({ error: 'Failed to recover review' });
  }
});

// GET /api/admin/deleted-events - Get all deleted events/tours (90-day recovery period)
router.get('/deleted-events', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT td.id, td.date, td.start_time, td.status, td.deleted_at,
             t.band_id, b.band_name,
             t.venue_id, bar.venue_name,
             bar.city, bar.state,
             CASE 
               WHEN td.deleted_at > NOW() - INTERVAL '90 days' THEN true
               ELSE false
             END as recoverable
      FROM tour_dates td
      JOIN tours t ON td.tour_id = t.id
      LEFT JOIN bands b ON t.band_id = b.id
      LEFT JOIN venues bar ON t.venue_id = bar.id
      WHERE td.deleted_at IS NOT NULL
      ORDER BY td.deleted_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get deleted events error:', error);
    res.status(500).json({ error: 'Failed to fetch deleted events' });
  }
});

// POST /api/admin/events/:id/recover - Recover a deleted event/tour
router.post('/events/:id/recover', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if event exists and is within recovery period
    const eventResult = await query(`
      SELECT id, deleted_at
      FROM tour_dates
      WHERE id = $1 AND deleted_at IS NOT NULL
    `, [id]);

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found or not deleted' });
    }

    const event = eventResult.rows[0];
    const deletedDate = new Date(event.deleted_at);
    const daysSinceDeletion = Math.floor((Date.now() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceDeletion > 90) {
      return res.status(400).json({ 
        error: 'Recovery period expired',
        message: 'This event was deleted more than 90 days ago and can no longer be recovered'
      });
    }

    // Recover event (remove deleted_at)
    await query('UPDATE tour_dates SET deleted_at = NULL WHERE id = $1', [id]);

    res.json({ 
      success: true, 
      message: 'Event has been recovered successfully'
    });
  } catch (error) {
    console.error('Recover event error:', error);
    res.status(500).json({ error: 'Failed to recover event' });
  }
});

// ==================== PURGE ENDPOINTS (PERMANENT DELETION) ====================

// DELETE /api/admin/users/:id/purge - Permanently delete a user (NO RECOVERY)
router.delete('/users/:id/purge', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    // Verify user exists
    const userResult = await query('SELECT id, name, email, user_type, deleted_at FROM users WHERE id = $1', [id]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get current user name for notification
    const currentUserResult = await query('SELECT name FROM users WHERE id = $1', [currentUser.userId]);
    const performedBy = currentUserResult.rows[0]?.name || 'Unknown Admin';

    // Permanently delete the user from the database
    await query('DELETE FROM users WHERE id = $1', [id]);

    // Notify admin booking agents about permanent deletion
    await notifyAdminBookingAgents(
      'User',
      user.name,
      user.email || '',
      'purge',
      performedBy,
      'Permanently purged from recovery section'
    );

    res.json({ 
      success: true, 
      message: 'User permanently deleted from database'
    });
  } catch (error) {
    console.error('Purge user error:', error);
    res.status(500).json({ error: 'Failed to permanently delete user' });
  }
});

// DELETE /api/admin/venues/:id/purge - Permanently delete a venue (NO RECOVERY)
router.delete('/venues/:id/purge', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    // Verify venue exists
    const venueResult = await query(`
      SELECT u.id, u.email, v.venue_name 
      FROM users u
      LEFT JOIN venues v ON u.id = v.user_id
      WHERE u.id = $1
    `, [id]);
    
    if (venueResult.rows.length === 0) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    const venue = venueResult.rows[0];

    // Get current user name for notification
    const currentUserResult = await query('SELECT name FROM users WHERE id = $1', [currentUser.userId]);
    const performedBy = currentUserResult.rows[0]?.name || 'Unknown Admin';

    // Permanently delete the venue/user from the database
    await query('DELETE FROM users WHERE id = $1', [id]);

    // Notify admin booking agents about permanent deletion
    await notifyAdminBookingAgents(
      'Venue',
      venue.venue_name,
      venue.email || '',
      'purge',
      performedBy,
      'Permanently purged from recovery section'
    );

    res.json({ 
      success: true, 
      message: 'Venue permanently deleted from database'
    });
  } catch (error) {
    console.error('Purge venue error:', error);
    res.status(500).json({ error: 'Failed to permanently delete venue' });
  }
});

// DELETE /api/admin/bands/:id/purge - Permanently delete a band (NO RECOVERY)
router.delete('/bands/:id/purge', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    // Verify band exists
    const bandResult = await query(`
      SELECT u.id, u.email, b.band_name 
      FROM users u
      LEFT JOIN bands b ON u.id = b.user_id
      WHERE u.id = $1
    `, [id]);
    
    if (bandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Band not found' });
    }

    const band = bandResult.rows[0];

    // Get current user name for notification
    const currentUserResult = await query('SELECT name FROM users WHERE id = $1', [currentUser.userId]);
    const performedBy = currentUserResult.rows[0]?.name || 'Unknown Admin';

    // Permanently delete the band/user from the database
    await query('DELETE FROM users WHERE id = $1', [id]);

    // Notify admin booking agents about permanent deletion
    await notifyAdminBookingAgents(
      'Band',
      band.band_name,
      band.email || '',
      'purge',
      performedBy,
      'Permanently purged from recovery section'
    );

    res.json({ 
      success: true, 
      message: 'Band permanently deleted from database'
    });
  } catch (error) {
    console.error('Purge band error:', error);
    res.status(500).json({ error: 'Failed to permanently delete band' });
  }
});

// DELETE /api/admin/reviews/:id/purge - Permanently delete a review (NO RECOVERY)
router.delete('/reviews/:id/purge', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify review exists
    const reviewResult = await query('SELECT id FROM reviews WHERE id = $1', [id]);
    
    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Permanently delete the review from the database
    await query('DELETE FROM reviews WHERE id = $1', [id]);

    res.json({ 
      success: true, 
      message: 'Review permanently deleted from database'
    });
  } catch (error) {
    console.error('Purge review error:', error);
    res.status(500).json({ error: 'Failed to permanently delete review' });
  }
});

// DELETE /api/admin/events/:id/purge - Permanently delete an event (NO RECOVERY)
router.delete('/events/:id/purge', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify event exists
    const eventResult = await query('SELECT id FROM tour_dates WHERE id = $1', [id]);
    
    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Permanently delete the event from the database
    await query('DELETE FROM tour_dates WHERE id = $1', [id]);

    res.json({ 
      success: true, 
      message: 'Event permanently deleted from database'
    });
  } catch (error) {
    console.error('Purge event error:', error);
    res.status(500).json({ error: 'Failed to permanently delete event' });
  }
});

// GET /api/admin/kpi-analytics - Get comprehensive KPI analytics for booking agent dashboard
router.get('/kpi-analytics', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    // Get time period from query params (default to last 30 days)
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // 1. Overall platform metrics
    const platformMetrics = await query(`
      SELECT
        COUNT(DISTINCT CASE WHEN u.user_type = 'band' AND u.status = 'approved' AND u.deleted_at IS NULL THEN u.id END) as active_bands,
        COUNT(DISTINCT CASE WHEN u.user_type = 'bar' AND u.status = 'approved' AND u.deleted_at IS NULL THEN u.id END) as active_venues,
        COUNT(DISTINCT CASE WHEN u.user_type = 'studio' AND u.status = 'approved' AND u.deleted_at IS NULL THEN u.id END) as active_studios,
        COUNT(DISTINCT CASE WHEN u.status = 'pending' AND u.deleted_at IS NULL THEN u.id END) as pending_approvals
      FROM users u
    `);

    // 2. Events & Tours metrics
    const eventsMetrics = await query(`
      SELECT 
        COUNT(*) as total_events,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_events,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_events,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_events,
        COUNT(CASE WHEN date >= CURRENT_DATE THEN 1 END) as upcoming_events,
        COUNT(CASE WHEN date < CURRENT_DATE AND status != 'completed' THEN 1 END) as past_incomplete
      FROM tour_dates
      WHERE date >= $1
    `, [startDate.toISOString().split('T')[0]]);

    // 3. Revenue metrics
    const revenueMetrics = await query(`
      SELECT 
        COALESCE(SUM(payment_amount), 0) as total_revenue,
        COALESCE(AVG(payment_amount), 0) as avg_revenue_per_event,
        COUNT(CASE WHEN payment_amount > 0 THEN 1 END) as paid_events,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN payment_amount ELSE 0 END), 0) as completed_revenue,
        COALESCE(SUM(CASE WHEN status = 'confirmed' AND date >= CURRENT_DATE THEN payment_amount ELSE 0 END), 0) as pending_revenue
      FROM tour_dates
      WHERE date >= $1 AND payment_amount IS NOT NULL
    `, [startDate.toISOString().split('T')[0]]);

    // 4. Attendance & engagement metrics
    const attendanceMetrics = await query(`
      SELECT 
        COALESCE(SUM(k.attendance), 0) as total_attendance,
        COALESCE(AVG(k.attendance), 0) as avg_attendance,
        COALESCE(MAX(k.attendance), 0) as max_attendance,
        COUNT(CASE WHEN k.attendance > 0 THEN 1 END) as events_with_attendance
      FROM tour_dates td
      LEFT JOIN tour_kpis k ON td.id = k.tour_date_id
      WHERE td.date >= $1 AND td.status = 'completed'
    `, [startDate.toISOString().split('T')[0]]);

    // 5. Venue sales metrics
    const salesMetrics = await query(`
      SELECT 
        COALESCE(SUM(k.bar_sales), 0) as total_venue_sales,
        COALESCE(AVG(k.bar_sales), 0) as avg_venue_sales,
        COALESCE(MAX(k.bar_sales), 0) as max_venue_sales,
        COALESCE(SUM(k.new_customers), 0) as total_new_customers
      FROM tour_dates td
      LEFT JOIN tour_kpis k ON td.id = k.tour_date_id
      WHERE td.date >= $1 AND td.status = 'completed'
    `, [startDate.toISOString().split('T')[0]]);

    // 6. Top performing bands
    const topBands = await query(`
      SELECT 
        b.id,
        b.band_name,
        COUNT(td.id) as total_shows,
        COALESCE(SUM(td.payment_amount), 0) as total_earnings,
        COALESCE(AVG(k.attendance), 0) as avg_attendance,
        COALESCE(SUM(k.attendance), 0) as total_attendance
      FROM bands b
      INNER JOIN users u ON b.user_id = u.id AND u.deleted_at IS NULL
      LEFT JOIN tour_dates td ON b.id = td.band_id
      LEFT JOIN tour_kpis k ON td.id = k.tour_date_id
      WHERE td.date >= $1 AND td.status = 'completed'
      GROUP BY b.id, b.band_name
      HAVING COUNT(td.id) > 0
      ORDER BY total_earnings DESC
      LIMIT 10
    `, [startDate.toISOString().split('T')[0]]);

    // 7. Top performing venues
    const topVenues = await query(`
      SELECT 
        v.id,
        v.venue_name,
        v.city,
        v.state,
        COUNT(td.id) as total_shows,
        COALESCE(SUM(td.payment_amount), 0) as total_spent,
        COALESCE(AVG(k.attendance), 0) as avg_attendance,
        COALESCE(SUM(k.bar_sales), 0) as total_sales
      FROM venues v
      INNER JOIN users u ON v.user_id = u.id AND u.deleted_at IS NULL
      LEFT JOIN tour_dates td ON v.id = td.venue_id
      LEFT JOIN tour_kpis k ON td.id = k.tour_date_id
      WHERE td.date >= $1 AND td.status = 'completed'
      GROUP BY v.id, v.venue_name, v.city, v.state
      HAVING COUNT(td.id) > 0
      ORDER BY total_shows DESC
      LIMIT 10
    `, [startDate.toISOString().split('T')[0]]);

    // 8. Events by status over time (last 6 months, grouped by month)
    const eventsTrend = await query(`
      SELECT 
        TO_CHAR(date, 'YYYY-MM') as month,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        COALESCE(SUM(payment_amount), 0) as revenue
      FROM tour_dates
      WHERE date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month DESC
    `);

    // 9. Payment completion rate
    const paymentMetrics = await query(`
      SELECT 
        COUNT(*) as total_completed_events,
        COUNT(CASE WHEN tp.id IS NOT NULL THEN 1 END) as events_with_payments,
        COUNT(CASE WHEN tp.payment_status = 'completed' THEN 1 END) as fully_paid_events
      FROM tour_dates td
      LEFT JOIN tour_payments tp ON td.id = tp.tour_date_id
      WHERE td.status = 'completed' AND td.date >= $1
    `, [startDate.toISOString().split('T')[0]]);

    // 10. Tours metrics
    const toursMetrics = await query(`
      SELECT 
        COUNT(*) as total_tours,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_tours,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tours,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_tours,
        COALESCE(AVG(total_events), 0) as avg_events_per_tour
      FROM tours
      WHERE created_at >= $1
    `, [startDate.toISOString().split('T')[0]]);

    res.json({
      period: `${daysAgo} days`,
      platform: platformMetrics.rows[0],
      events: eventsMetrics.rows[0],
      revenue: revenueMetrics.rows[0],
      attendance: attendanceMetrics.rows[0],
      sales: salesMetrics.rows[0],
      tours: toursMetrics.rows[0],
      payment_completion: paymentMetrics.rows[0],
      top_bands: topBands.rows,
      top_venues: topVenues.rows,
      trends: eventsTrend.rows
    });
  } catch (error) {
    console.error('Get KPI analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch KPI analytics' });
  }
});

// GET /api/admin/tours-with-kpis - Get all events/tours with KPI data
router.get('/tours-with-kpis', authenticateToken, verifyAdmin, async (req, res) => {
  try {
    const { status, band_id, venue_id } = req.query;

    let queryText = `
      SELECT esc.*, 
             b.band_name, 
             v.venue_name, v.city, v.state,
             k.attendance, k.bar_sales, k.new_customers
      FROM event_status_computed esc
      JOIN bands b ON esc.band_id = b.id
      JOIN venues v ON esc.venue_id = v.id
      LEFT JOIN tour_kpis k ON esc.id = k.tour_date_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      queryText += ` AND esc.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (band_id) {
      queryText += ` AND esc.band_id = $${paramIndex}`;
      params.push(band_id);
      paramIndex++;
    }

    if (venue_id) {
      queryText += ` AND esc.venue_id = $${paramIndex}`;
      params.push(venue_id);
      paramIndex++;
    }

    queryText += ' ORDER BY esc.date DESC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get tours with KPIs error:', error);
    res.status(500).json({ error: 'Failed to fetch tours with KPIs' });
  }
});

export default router;

