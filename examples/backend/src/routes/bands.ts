import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken, optionalAuth } from '../utils/auth.js';
import { hashPassword } from '../utils/auth.js';
import { sendEmail, emailTemplates, getAppUrl } from '../utils/email.js';
import { getBandSubscriptionLevel, getUserBandSubscriptionLevel } from '../utils/bandSubscription.js';

const router = Router();

// GET /api/bands - Get all bands (all approved bands regardless of owner user_type)
router.get('/', async (req, res) => {
  try {
    const { booking_manager_id } = req.query;
    
    // Try with bands.status first (if column exists)
    let queryStr = `
      SELECT b.id, b.user_id, b.booking_manager_id, b.band_name, b.description, b.genre, 
             b.eth_wallet, b.website, b.social_links, b.created_at,
             COALESCE(b.status, 'approved') as band_status,
             u.name, u.status, u.user_type,
             bm.name as booking_manager_name,
             bm.email as booking_manager_email
      FROM bands b 
      JOIN users u ON b.user_id = u.id 
      LEFT JOIN users bm ON b.booking_manager_id = bm.id
      WHERE u.status = 'approved' 
        AND (u.deleted_at IS NULL OR u.deleted_at > NOW())
    `;
    
    const params: any[] = [];
    if (booking_manager_id) {
      queryStr += ' AND b.booking_manager_id = $' + (params.length + 1);
      params.push(booking_manager_id);
    }
    
    queryStr += ' ORDER BY b.created_at DESC';

    const result = await query(queryStr, params);
    // Filter approved bands in application if status column exists
    const bands = result.rows.filter(b => !b.band_status || b.band_status === 'approved');
    res.json(bands);
  } catch (error: any) {
    console.error('Get bands error:', error);
    
    // If bands.status column doesn't exist, try without it
    if (error.code === '42703') {
      try {
        const { booking_manager_id } = req.query;
        let fallbackQuery = `
          SELECT b.id, b.user_id, b.booking_manager_id, b.band_name, b.description, b.genre, 
                 b.eth_wallet, b.website, b.social_links, b.created_at,
                 u.name, u.status, u.user_type,
                 bm.name as booking_manager_name,
                 bm.email as booking_manager_email
          FROM bands b 
          JOIN users u ON b.user_id = u.id 
          LEFT JOIN users bm ON b.booking_manager_id = bm.id
          WHERE u.status = 'approved'
        `;
        
        const params: any[] = [];
        if (booking_manager_id) {
          fallbackQuery += ' AND b.booking_manager_id = $' + (params.length + 1);
          params.push(booking_manager_id);
        }
        
        fallbackQuery += ' ORDER BY b.created_at DESC';
        
        const result = await query(fallbackQuery, params);
        res.json(result.rows);
        return;
      } catch (fallbackError) {
        console.error('Fallback query error:', fallbackError);
      }
    }
    
    res.status(500).json({ error: 'Failed to fetch bands' });
  }
});

// GET /api/bands/:id - Get band by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT b.id, b.user_id, b.booking_manager_id, b.band_name, b.description, b.genre, 
             b.eth_wallet, b.website, b.social_links, b.created_at,
             u.name, u.status,
             bm.name as booking_manager_name
      FROM bands b 
      JOIN users u ON b.user_id = u.id 
      LEFT JOIN users bm ON b.booking_manager_id = bm.id
      WHERE b.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Band not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get band error:', error);
    res.status(500).json({ error: 'Failed to fetch band' });
  }
});

// GET /api/bands/my/limits - Get user's band limits and current count
router.get('/my/limits', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    // First check for custom band limit set by booking agent
    const userResult = await query(`
      SELECT custom_band_limit
      FROM users
      WHERE id = $1
    `, [user.userId]);

    let maxBands = 1; // Default for free users
    let planName = 'Free';
    let isCustomLimit = false;

    // If user has a custom band limit, use that
    if (userResult.rows[0]?.custom_band_limit !== null && userResult.rows[0]?.custom_band_limit !== undefined) {
      maxBands = userResult.rows[0].custom_band_limit;
      planName = 'Enterprise (Custom)';
      isCustomLimit = true;
    } else {
      // Otherwise, get from subscription plan
      const subscriptionResult = await query(`
        SELECT sp.max_bands, sp.name as plan_name
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = $1 AND us.status = 'active'
        ORDER BY us.created_at DESC
        LIMIT 1
      `, [user.userId]);

      if (subscriptionResult.rows.length > 0) {
        maxBands = subscriptionResult.rows[0].max_bands;
        planName = subscriptionResult.rows[0].plan_name;
      }
    }

    // Get current band count (bands owned or member of)
    // Include all bands regardless of status (pending, approved, etc.)
    const bandCountResult = await query(`
      SELECT COUNT(DISTINCT band_id) as count
      FROM (
        SELECT id as band_id FROM bands WHERE user_id = $1
        UNION
        SELECT band_id FROM band_members WHERE user_id = $1 AND status = 'active'
      ) as user_bands
    `, [user.userId]);

    const currentCount = parseInt(bandCountResult.rows[0].count) || 0;

    res.json({
      maxBands,
      currentCount,
      canCreateMore: currentCount < maxBands,
      planName,
      isCustomLimit
    });
  } catch (error) {
    console.error('Get band limits error:', error);
    res.status(500).json({ error: 'Failed to fetch band limits' });
  }
});

// GET /api/bands/my/all - Get all bands user owns or is a member of
router.get('/my/all', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    // Get bands user owns (regardless of status) OR is an active member of
    // This ensures solo bands created during registration (pending status) are included
    const result = await query(`
      SELECT DISTINCT b.*, 
             CASE 
               WHEN b.user_id = $1 THEN 'owner'
               ELSE 'member'
             END as role
      FROM bands b
      LEFT JOIN band_members bm ON b.id = bm.band_id AND bm.user_id = $1 AND bm.status = 'active'
      WHERE b.user_id = $1 OR bm.id IS NOT NULL
      ORDER BY b.created_at DESC
    `, [user.userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get user bands error:', error);
    res.status(500).json({ error: 'Failed to fetch bands' });
  }
});

// POST /api/bands/create - Create a new band (checks subscription limits)
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { band_name, description, genre, website, acknowledgeDuplicate, admin_email, is_solo } = req.body;

    // Get user info for solo band name generation
    const userResult = await query(`
      SELECT custom_band_limit, email, name
      FROM users
      WHERE id = $1
    `, [user.userId]);

    const userData = userResult.rows[0];

    // If solo band, auto-generate band name
    let finalBandName = band_name;
    if (is_solo) {
      finalBandName = `solo - ${userData.name || 'Artist'}`;
    }

    if (!finalBandName || finalBandName.trim() === '') {
      return res.status(400).json({ error: 'Band name is required' });
    }

    // Validate admin email if provided
    if (admin_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin_email)) {
      return res.status(400).json({ error: 'Invalid admin email format' });
    }

    // Check if band name already exists (skip for solo bands as names are unique per user)
    const existingBandResult = await query(
      'SELECT id, band_name, status, band_email, admin_email FROM bands WHERE LOWER(band_name) = LOWER($1) AND status != $2',
      [finalBandName, 'rejected']
    );

    // If band exists and user hasn't acknowledged, return warning (unless it's a solo band)
    if (existingBandResult.rows.length > 0 && !acknowledgeDuplicate && !is_solo) {
      return res.status(409).json({
        error: 'duplicate_name',
        warning: true,
        message: `A band named "${finalBandName}" already exists in the system. Your request may be rejected by the booking agent.`,
        suggestion: 'If you are trying to join an existing band, please use the "Join Band" option instead.',
        existingBand: existingBandResult.rows[0]
      });
    }

    let maxBands = 1; // Default for users without subscription

    // If user has a custom band limit, use that
    if (userResult.rows[0]?.custom_band_limit !== null && userResult.rows[0]?.custom_band_limit !== undefined) {
      maxBands = userResult.rows[0].custom_band_limit;
    } else {
      // Otherwise, check subscription plan
      const limitsResponse = await query(`
        SELECT sp.max_bands
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = $1 AND us.status = 'active'
        ORDER BY us.created_at DESC
        LIMIT 1
      `, [user.userId]);

      if (limitsResponse.rows.length > 0) {
        maxBands = limitsResponse.rows[0].max_bands;
      }
    }

    // Get current band count (only approved bands)
    const countResult = await query(`
      SELECT COUNT(DISTINCT band_id) as count
      FROM (
        SELECT id as band_id FROM bands WHERE user_id = $1 AND status = 'approved'
        UNION
        SELECT band_id FROM band_members WHERE user_id = $1 AND status = 'active'
      ) as user_bands
    `, [user.userId]);

    const currentCount = parseInt(countResult.rows[0].count) || 0;

    if (currentCount >= maxBands) {
      // Provide detailed upsell message based on current plan
      let upgradeMessage = '';
      if (maxBands === 1) {
        upgradeMessage = `\n\n🎸 Want to be in multiple bands or have both a solo profile and band membership?\n\nUpgrade to Premium ($8.99/mo) or Streaming Pro ($14.99/mo) to get 2 bands!\n\nContact your booking agent or visit the Pricing page to upgrade.`;
      } else {
        upgradeMessage = `\n\nFor more bands, please contact your booking agent about custom limits.`;
      }
      
      return res.status(403).json({ 
        error: `Band limit reached. Your current plan allows ${maxBands} band(s).${upgradeMessage}`,
        maxBands,
        currentCount,
        needsUpgrade: true,
        upgradeOptions: maxBands === 1 ? ['artist_premium', 'artist_streaming'] : []
      });
    }

    // Create the band
    const bandIdResult = await query('SELECT uuid_generate_v4() as id');
    const bandId = bandIdResult.rows[0].id;

    // If this is a duplicate name and user acknowledged, create as pending with warning note
    const isDuplicate = existingBandResult.rows.length > 0;
    const bandStatus = isDuplicate ? 'pending' : 'approved';
    
    // Add note if it's a solo band
    let adminNotes = null;
    if (isDuplicate) {
      adminNotes = `⚠️ DUPLICATE NAME: User created band with name "${finalBandName}" despite warning that this name already exists (Band ID: ${existingBandResult.rows[0].id}). User was notified this may be rejected.`;
    } else if (is_solo) {
      adminNotes = `✨ SOLO ARTIST: This is a solo artist band for ${userData.name}`;
    }

    // Use provided admin_email or default to creator's email
    const finalAdminEmail = admin_email || userData?.email || null;

    // Insert band (band_email will be auto-generated by trigger)
    await query(`
      INSERT INTO bands (id, user_id, band_name, description, genre, website, status, admin_notes, admin_email)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [bandId, user.userId, finalBandName, description || null, genre || null, website || null, bandStatus, adminNotes, finalAdminEmail]);

    // Fetch the created band (including auto-generated band_email)
    const newBand = await query('SELECT * FROM bands WHERE id = $1', [bandId]);

    // Send welcome email to admin if email is provided
    const appUrl = getAppUrl();
    if (finalAdminEmail && newBand.rows[0].band_email) {
      try {
        const emailContent = emailTemplates.bandWelcome(
          finalBandName,
          newBand.rows[0].band_email,
          finalAdminEmail,
          '', // No temp password for user-created bands
          appUrl
        );
        
        await sendEmail({
          to: finalAdminEmail,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        console.log(`Welcome email sent to band admin: ${finalAdminEmail}`);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the band creation if email fails
      }
    }

    res.json({
      success: true,
      band: newBand.rows[0],
      message: is_solo 
        ? 'Solo artist band created successfully' 
        : isDuplicate 
          ? 'Band created and pending booking agent approval due to duplicate name'
          : 'Band created successfully',
      requiresApproval: isDuplicate,
      status: bandStatus,
      isSolo: is_solo || false
    });
  } catch (error: any) {
    console.error('Create band error:', error);
    res.status(500).json({ 
      error: 'Failed to create band',
      details: error.message 
    });
  }
});

// POST /api/bands/join - Join an existing band by name (checks subscription limits)
router.post('/join', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { band_name, role } = req.body;

    if (!band_name) {
      return res.status(400).json({ error: 'Band name is required' });
    }

    // Find band by name
    const bandResult = await query(
      'SELECT * FROM bands WHERE LOWER(band_name) = LOWER($1)',
      [band_name]
    );

    if (bandResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Band not found. Please check the band name or create a new band.',
        canCreate: true
      });
    }

    const band = bandResult.rows[0];

    // Check if user already owns this band
    if (band.user_id === user.userId) {
      return res.status(400).json({ error: 'You already own this band' });
    }

    // Check if user is already a member
    const memberCheck = await query(
      'SELECT id FROM band_members WHERE band_id = $1 AND user_id = $2',
      [band.id, user.userId]
    );

    if (memberCheck.rows.length > 0) {
      return res.status(400).json({ error: 'You are already a member of this band' });
    }

    // First check for custom band limit
    const userResult = await query(`
      SELECT custom_band_limit
      FROM users
      WHERE id = $1
    `, [user.userId]);

    let maxBands = 1; // Default

    // If user has a custom band limit, use that
    if (userResult.rows[0]?.custom_band_limit !== null && userResult.rows[0]?.custom_band_limit !== undefined) {
      maxBands = userResult.rows[0].custom_band_limit;
    } else {
      // Otherwise, check subscription plan
      const limitsResponse = await query(`
        SELECT sp.max_bands
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = $1 AND us.status = 'active'
        ORDER BY us.created_at DESC
        LIMIT 1
      `, [user.userId]);

      if (limitsResponse.rows.length > 0) {
        maxBands = limitsResponse.rows[0].max_bands;
      }
    }

    // Get current band count
    const countResult = await query(`
      SELECT COUNT(DISTINCT band_id) as count
      FROM (
        SELECT id as band_id FROM bands WHERE user_id = $1
        UNION
        SELECT band_id FROM band_members WHERE user_id = $1 AND status = 'active'
      ) as user_bands
    `, [user.userId]);

    const currentCount = parseInt(countResult.rows[0].count) || 0;

    if (currentCount >= maxBands) {
      // Provide detailed upsell message based on current plan
      let upgradeMessage = '';
      if (maxBands === 1) {
        upgradeMessage = `\n\n🎸 Want to join multiple bands or have both a solo profile and band membership?\n\nUpgrade to Premium ($8.99/mo) or Streaming Pro ($14.99/mo) to get 2 bands!\n\nContact your booking agent or visit the Pricing page to upgrade.`;
      } else {
        upgradeMessage = `\n\nFor more bands, please contact your booking agent about custom limits.`;
      }
      
      return res.status(403).json({ 
        error: `Band limit reached. Your current plan allows ${maxBands} band(s).${upgradeMessage}`,
        maxBands,
        currentCount,
        needsUpgrade: true,
        upgradeOptions: maxBands === 1 ? ['artist_premium', 'artist_streaming'] : []
      });
    }

    // Get user info for notification
    const joiningUserResult = await query(
      'SELECT name, email FROM users WHERE id = $1',
      [user.userId]
    );
    const joiningUser = joiningUserResult.rows[0];

    // Add user as band member with default permissions (initially no permissions until approved)
    const memberIdResult = await query('SELECT uuid_generate_v4() as id');
    const memberId = memberIdResult.rows[0].id;

    await query(`
      INSERT INTO band_members (id, band_id, user_id, role, status, permissions)
      VALUES ($1, $2, $3, $4, 'pending', $5)
    `, [memberId, band.id, user.userId, role || 'member', JSON.stringify({ can_modify_profile: false, can_receive_band_emails: false })]);

    // Send notification to band admin about the join request
    const appUrl = getAppUrl();
    if (band.admin_email) {
      try {
        const emailContent = emailTemplates.bandAdminNewMember(
          band.band_name,
          joiningUser.name || 'Unknown User',
          joiningUser.email || 'No email',
          role || 'member',
          band.band_email || 'N/A',
          appUrl
        );
        
        await sendEmail({
          to: band.admin_email,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        // Log the notification
        await query(`
          INSERT INTO band_notifications (band_id, notification_type, recipient_email, subject, message, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          band.id,
          'new_member',
          band.admin_email,
          emailContent.subject,
          `New member ${joiningUser.name} has joined ${band.band_name}`,
          JSON.stringify({ user_id: user.userId, user_name: joiningUser.name, role: role || 'member' })
        ]);

        console.log(`New member notification sent to band admin: ${band.admin_email}`);
      } catch (emailError) {
        console.error('Failed to send new member notification:', emailError);
        // Don't fail the join request if email fails
      }
    }

    res.json({
      success: true,
      message: 'Join request sent. Waiting for band owner approval.',
      band: band,
      status: 'pending'
    });
  } catch (error: any) {
    console.error('Join band error:', error);
    res.status(500).json({ 
      error: 'Failed to join band',
      details: error.message 
    });
  }
});

// GET /api/bands/:id/subscription - Get band subscription level and features
router.get('/:id/subscription', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Verify user is a member or owner of the band
    const bandCheck = await query(`
      SELECT b.id, b.user_id, bm.user_id as member_id
      FROM bands b
      LEFT JOIN band_members bm ON b.id = bm.band_id AND bm.status = 'active'
      WHERE b.id = $1 AND (b.user_id = $2 OR bm.user_id = $2)
    `, [id, user.userId]);

    if (bandCheck.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this band' });
    }

    const subscription = await getBandSubscriptionLevel(id);

    res.json({
      success: true,
      bandId: id,
      subscription
    });
  } catch (error) {
    console.error('Get band subscription error:', error);
    res.status(500).json({ error: 'Failed to get band subscription' });
  }
});

// GET /api/bands/my/subscription - Get user's effective subscription (personal + bands)
router.get('/my/subscription', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    const subscription = await getUserBandSubscriptionLevel(user.userId);

    res.json({
      success: true,
      subscription
    });
  } catch (error) {
    console.error('Get user band subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// PUT /api/bands/:id - Update band profile
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { band_name, description, genre, eth_wallet, website, social_links, contact_phone, contact_email, contact_address, recovery_email } = req.body;

    // Check if user owns this band
    const bandResult = await query(
      'SELECT user_id, booking_manager_id FROM bands WHERE id = $1',
      [id]
    );

    if (bandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Band not found' });
    }

    const band = bandResult.rows[0];

    // Booking agents can edit any band, band owners can only edit their own
    if (user.userType !== 'booking_agent' && band.user_id !== user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { booking_manager_id } = req.body;

    // Validate email formats if provided
    const { validateEmail } = await import('../utils/validation.js');
    if (contact_email && !validateEmail(contact_email)) {
      return res.status(400).json({ error: 'Invalid contact email format' });
    }
    if (recovery_email && !validateEmail(recovery_email)) {
      return res.status(400).json({ error: 'Invalid recovery email format' });
    }

    // Update band
    await query(`
      UPDATE bands 
      SET band_name = COALESCE($1, band_name),
          description = COALESCE($2, description),
          genre = COALESCE($3, genre),
          eth_wallet = COALESCE($4, eth_wallet),
          website = COALESCE($5, website),
          social_links = COALESCE($6, social_links),
          booking_manager_id = COALESCE($7, booking_manager_id),
          contact_phone = COALESCE($8, contact_phone),
          contact_email = COALESCE($9, contact_email),
          contact_address = COALESCE($10, contact_address),
          recovery_email = COALESCE($11, recovery_email)
      WHERE id = $12
    `, [band_name, description, genre, eth_wallet, website, social_links, booking_manager_id, contact_phone, contact_email, contact_address, recovery_email, id]);

    // Fetch updated band
    const updated = await query('SELECT * FROM bands WHERE id = $1', [id]);

    res.json(updated.rows[0]);
  } catch (error) {
    console.error('Update band error:', error);
    res.status(500).json({ error: 'Failed to update band' });
  }
});

export default router;
