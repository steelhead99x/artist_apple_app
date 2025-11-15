import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Helper function to validate user can message recipient
async function canMessage(senderId: string, recipientId: string): Promise<boolean> {
  // Get both users
  const usersResult = await query(
    'SELECT id, user_type FROM users WHERE id IN ($1, $2)',
    [senderId, recipientId]
  );

  if (usersResult.rows.length !== 2) {
    return false;
  }

  const sender = usersResult.rows.find(u => u.id === senderId);
  const recipient = usersResult.rows.find(u => u.id === recipientId);

  if (!sender || !recipient) {
    return false;
  }

  // Booking agents can message anyone in the system
  if (sender.user_type === 'booking_agent' || sender.user_type === 'booking_manager') {
    return true; // Can message all user types
  }

  // Recording studios can message anyone
  if (sender.user_type === 'studio') {
    return true; // Can message all user types
  }

  // Artists can message recording studios and booking agents
  if (sender.user_type === 'artist' || sender.user_type === 'band') {
    return recipient.user_type === 'studio' || 
           recipient.user_type === 'booking_agent' || 
           recipient.user_type === 'booking_manager';
  }

  // Venues can message booking agent and recording studio
  if (sender.user_type === 'bar') {
    return recipient.user_type === 'booking_agent' || 
           recipient.user_type === 'booking_manager' || 
           recipient.user_type === 'studio';
  }

  return false;
}

// POST /api/messages/send - Send an encrypted message
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { recipient_id, encrypted_content, iv } = req.body;
    const senderId = (req as any).user.userId;

    if (!recipient_id || !encrypted_content || !iv) {
      return res.status(400).json({
        error: 'recipient_id, encrypted_content, and iv are required'
      });
    }

    // Validate sender can message recipient
    if (!(await canMessage(senderId, recipient_id))) {
      return res.status(403).json({
        error: 'You are not authorized to message this user'
      });
    }

    // Insert message
    const messageId = uuidv4();
    await query(
      `INSERT INTO messages (id, sender_id, recipient_id, encrypted_content, iv, message_type)
       VALUES ($1, $2, $3, $4, $5, 'text')`,
      [messageId, senderId, recipient_id, encrypted_content, iv]
    );

    res.json({
      success: true,
      message_id: messageId,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/messages/conversations - Get all conversations for the current user
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }

    // Get all unique conversations (people the user has messaged or been messaged by)
    // Use a simpler query that avoids complex CTE/JOIN issues
    const conversationsResult = await query(
      `SELECT 
         CASE 
           WHEN sender_id = $1 THEN recipient_id
           ELSE sender_id
         END as other_user_id,
         MAX(created_at) as last_message_at
       FROM messages
       WHERE sender_id = $1 OR recipient_id = $1
       GROUP BY 
         CASE 
           WHEN sender_id = $1 THEN recipient_id
           ELSE sender_id
         END
       ORDER BY last_message_at DESC`,
      [userId]
    );

    // Get unread counts and user details for each conversation
    const conversations = await Promise.all(
      conversationsResult.rows.map(async (conv: any) => {
        try {
          const otherUserId = conv.other_user_id;

          // Get unread count
          const unreadResult = await query(
            `SELECT COUNT(*) as count 
             FROM messages 
             WHERE recipient_id = $1 
               AND sender_id = $2 
               AND (is_read = FALSE OR is_read IS NULL)`,
            [userId, otherUserId]
          );
          const unread_count = parseInt(unreadResult.rows[0]?.count || '0', 10);

          // Get user details
          const userResult = await query(
            'SELECT id, name, email, user_type FROM users WHERE id = $1',
            [otherUserId]
          );

          if (userResult.rows.length === 0) {
            return null;
          }

          const user = userResult.rows[0];
          let display_name = user.name;

          // Get venue name if user is a venue
          if (user.user_type === 'bar') {
            const venueResult = await query(
              'SELECT venue_name FROM venues WHERE user_id = $1',
              [user.id]
            );
            if (venueResult.rows.length > 0 && venueResult.rows[0].venue_name) {
              display_name = venueResult.rows[0].venue_name;
            }
          }

          // Get band name if user is a band
          if (user.user_type === 'band') {
            const bandResult = await query(
              'SELECT band_name FROM bands WHERE user_id = $1',
              [user.id]
            );
            if (bandResult.rows.length > 0 && bandResult.rows[0].band_name) {
              display_name = bandResult.rows[0].band_name;
            }
          }

          // Get studio name if user is a studio
          if (user.user_type === 'studio') {
            const studioResult = await query(
              'SELECT studio_name FROM recording_studios WHERE user_id = $1',
              [user.id]
            );
            if (studioResult.rows.length > 0 && studioResult.rows[0].studio_name) {
              display_name = studioResult.rows[0].studio_name;
            }
          }

          return {
            user_id: user.id,
            name: display_name,
            email: user.email,
            user_type: user.user_type,
            last_message_at: conv.last_message_at,
            unread_count: unread_count
          };
        } catch (convError) {
          console.error(`Error processing conversation for user ${conv.other_user_id}:`, convError);
          return null;
        }
      })
    );

    const filteredConversations = conversations.filter(c => c !== null);
    res.json(filteredConversations);
  } catch (error: any) {
    console.error('Get conversations error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Failed to fetch conversations',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/messages/contacts - Get list of users the current user can message
// NOTE: This must come BEFORE /:otherUserId route to avoid route matching conflicts
router.get('/contacts', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;

    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }

    // Get user type
    const userResult = await query(
      'SELECT user_type FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userType = userResult.rows[0].user_type;
    const contacts: any[] = [];

    try {
      if (userType === 'booking_agent' || userType === 'booking_manager') {
        // Booking agents can message anyone in the system
        const allUsersResult = await query(
          `SELECT u.id, u.name, u.email, u.user_type, v.venue_name, b.band_name
           FROM users u
           LEFT JOIN venues v ON u.id = v.user_id
           LEFT JOIN bands b ON u.id = b.user_id
           WHERE u.status = 'approved' AND u.id != $1
           ORDER BY u.user_type, u.name
           LIMIT 500`,
          [userId]
        );

        // Get studio names for studios
        const studioIds = allUsersResult.rows.filter(u => u.user_type === 'studio').map(u => u.id);
        const studioNamesMap: Record<string, string> = {};
        if (studioIds.length > 0) {
          const studiosResult = await query(
            `SELECT user_id, studio_name FROM recording_studios WHERE user_id = ANY($1::uuid[])`,
            [studioIds]
          );
          studiosResult.rows.forEach((row: any) => {
            studioNamesMap[row.user_id] = row.studio_name;
          });
        }

        for (const user of allUsersResult.rows) {
          // Use venue_name, band_name, or studio_name if available
          const displayName = user.venue_name || user.band_name || studioNamesMap[user.id] || user.name;
          contacts.push({
            id: user.id,
            name: displayName,
            display_name: `${displayName} (${user.email})`,
            email: user.email,
            user_type: user.user_type
          });
        }
      } else if (userType === 'studio') {
        // Recording studios can message anyone
        const allUsersResult = await query(
          `SELECT u.id, u.name, u.email, u.user_type, v.venue_name, b.band_name
           FROM users u
           LEFT JOIN venues v ON u.id = v.user_id
           LEFT JOIN bands b ON u.id = b.user_id
           WHERE u.status = 'approved' AND u.id != $1
           ORDER BY u.user_type, u.name
           LIMIT 500`,
          [userId]
        );

        // Get studio names for studios
        const studioIds = allUsersResult.rows.filter(u => u.user_type === 'studio').map(u => u.id);
        const studioNamesMap: Record<string, string> = {};
        if (studioIds.length > 0) {
          const studiosResult = await query(
            `SELECT user_id, studio_name FROM recording_studios WHERE user_id = ANY($1::uuid[])`,
            [studioIds]
          );
          studiosResult.rows.forEach((row: any) => {
            studioNamesMap[row.user_id] = row.studio_name;
          });
        }

        for (const user of allUsersResult.rows) {
          // Use venue_name, band_name, or studio_name if available
          const displayName = user.venue_name || user.band_name || studioNamesMap[user.id] || user.name;
          contacts.push({
            id: user.id,
            name: displayName,
            display_name: `${displayName} (${user.email})`,
            email: user.email,
            user_type: user.user_type
          });
        }
      } else if (userType === 'artist' || userType === 'band') {
        // Artists can message recording studios and booking agents
        const contactsResult = await query(
          `SELECT u.id, u.name, u.email, u.user_type, s.studio_name
           FROM users u
           LEFT JOIN recording_studios s ON u.id = s.user_id
           WHERE u.user_type IN ('studio', 'booking_agent', 'booking_manager') 
             AND u.status = 'approved'
           ORDER BY u.user_type, u.name
           LIMIT 200`,
          []
        );

        for (const contact of contactsResult.rows) {
          const displayName = contact.studio_name || contact.name;
          contacts.push({
            id: contact.id,
            name: displayName,
            display_name: `${displayName} (${contact.email})`,
            email: contact.email,
            user_type: contact.user_type
          });
        }
      } else if (userType === 'bar') {
        // Venues can message booking agents and recording studios
        
        // Get all booking agents
        const bookingAgentsResult = await query(
          `SELECT u.id, u.name, u.email, u.user_type
           FROM users u
           WHERE u.user_type IN ('booking_agent', 'booking_manager') 
             AND u.status = 'approved'
           ORDER BY u.name
           LIMIT 100`,
          []
        );

        for (const agent of bookingAgentsResult.rows) {
          contacts.push({
            id: agent.id,
            name: agent.name,
            display_name: `${agent.name} (${agent.email})`,
            email: agent.email,
            user_type: agent.user_type
          });
        }

        // Get all recording studios with their studio names
        const studiosResult = await query(
          `SELECT u.id, u.name, u.email, u.user_type, s.studio_name
           FROM users u
           LEFT JOIN recording_studios s ON u.id = s.user_id
           WHERE u.user_type = 'studio' AND u.status = 'approved'
           ORDER BY COALESCE(s.studio_name, u.name)
           LIMIT 100`,
          []
        );

        for (const studio of studiosResult.rows) {
          const displayName = studio.studio_name || studio.name;
          contacts.push({
            id: studio.id,
            name: displayName,
            display_name: `${displayName} (${studio.email})`,
            email: studio.email,
            user_type: studio.user_type
          });
        }
      } else {
        // Unknown user type - return empty contacts
        console.warn(`Unknown user type: ${userType} for user ${userId}`);
      }

      res.json(contacts);
    } catch (queryError: any) {
      console.error('Error fetching contacts:', queryError);
      throw queryError;
    }
  } catch (error: any) {
    console.error('Get contacts error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({ 
      error: 'Failed to fetch contacts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================================================
// E2EE KEY MANAGEMENT ENDPOINTS
// ============================================================================

// POST /api/messages/upload-public-key - Upload user's E2EE public key
router.post('/upload-public-key', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { public_key } = req.body;

    if (!public_key) {
      return res.status(400).json({ error: 'public_key is required' });
    }

    // Validate public key format (Base64)
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (!base64Regex.test(public_key)) {
      return res.status(400).json({ error: 'Invalid public key format (must be Base64)' });
    }

    // Update user's public key
    await query(
      `UPDATE users
       SET e2ee_public_key = $1, e2ee_key_updated_at = NOW()
       WHERE id = $2`,
      [public_key, userId]
    );

    res.json({
      success: true,
      message: 'Public key uploaded successfully'
    });
  } catch (error) {
    console.error('Upload public key error:', error);
    res.status(500).json({ error: 'Failed to upload public key' });
  }
});

// GET /api/messages/public-key/:userId - Get a user's E2EE public key
router.get('/public-key/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user's public key
    const result = await query(
      'SELECT e2ee_public_key, e2ee_key_updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { e2ee_public_key, e2ee_key_updated_at } = result.rows[0];

    if (!e2ee_public_key) {
      return res.status(404).json({
        error: 'User has not set up encryption yet',
        code: 'NO_PUBLIC_KEY'
      });
    }

    res.json({
      public_key: e2ee_public_key,
      updated_at: e2ee_key_updated_at
    });
  } catch (error) {
    console.error('Get public key error:', error);
    res.status(500).json({ error: 'Failed to fetch public key' });
  }
});

// ============================================================================
// MESSAGING ENDPOINTS
// ============================================================================

// GET /api/messages/booking-agent - Get assigned booking agent (for venues)
// NOTE: This must come BEFORE /:otherUserId route to avoid route matching conflicts
router.get('/booking-agent', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;

    // Get user type
    const userResult = await query(
      'SELECT user_type FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userType = userResult.rows[0].user_type;

    if (userType !== 'bar') {
      return res.status(400).json({ error: 'This endpoint is only for venues' });
    }

    // Get venue's booking agent
    const venueResult = await query(
      `SELECT v.booking_agent_id, u.name, u.email, u.user_type
       FROM venues v
       JOIN users u ON v.booking_agent_id = u.id
       WHERE v.user_id = $1`,
      [userId]
    );

    if (venueResult.rows.length === 0) {
      return res.status(404).json({ error: 'No booking agent assigned' });
    }

    res.json(venueResult.rows[0]);
  } catch (error) {
    console.error('Get booking agent error:', error);
    res.status(500).json({ error: 'Failed to fetch booking agent' });
  }
});

// GET /api/messages/:otherUserId - Get messages with a specific user
// NOTE: This must come LAST as it's a catch-all route
router.get('/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { otherUserId } = req.params;

    // Validate user can message this recipient
    if (!(await canMessage(userId, otherUserId))) {
      return res.status(403).json({
        error: 'You are not authorized to view messages with this user'
      });
    }

    // Get all messages between the two users
    const messagesResult = await query(
      `SELECT id, sender_id, recipient_id, encrypted_content, iv, message_type, 
              is_read, read_at, created_at
       FROM messages
       WHERE (sender_id = $1 AND recipient_id = $2)
          OR (sender_id = $2 AND recipient_id = $1)
       ORDER BY created_at ASC`,
      [userId, otherUserId]
    );

    // Mark messages as read
    await query(
      `UPDATE messages 
       SET is_read = TRUE, read_at = NOW()
       WHERE recipient_id = $1 AND sender_id = $2 AND is_read = FALSE`,
      [userId, otherUserId]
    );

    res.json(messagesResult.rows);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;

