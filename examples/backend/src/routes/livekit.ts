import { Router } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { authenticateToken } from '../utils/auth.js';
import { getUserBandSubscriptionLevel } from '../utils/bandSubscription.js';
import { query } from '../db.js';

const router = Router();

/**
 * Get LiveKit URL for specific instance
 * Supports: main (backend), meet (meet.artist-space.com), chat (chat.artist-space.com)
 */
function getInstanceUrl(instance?: string): string {
  switch (instance) {
    case 'meet':
      return process.env.LIVEKIT_MEET_URL || 'wss://meet.artist-space.com';
    case 'chat':
      return process.env.LIVEKIT_CHAT_URL || 'wss://chat.artist-space.com';
    case 'main':
    default:
      return process.env.LIVEKIT_WS_URL || process.env.LIVEKIT_URL || '';
  }
}

/**
 * POST /api/livekit/token
 * Generate LiveKit access token with E2EE support
 *
 * Supports multiple instances:
 * - main: Backend LiveKit instance
 * - meet: meet.artist-space.com (video meetings)
 * - chat: chat.artist-space.com (real-time chat)
 */
router.post('/token', authenticateToken, async (req, res) => {
  try {
    const { instance, roomName, participantName, isAdmin, e2eeEnabled } = req.body;
    const user = (req as any).user;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({
        error: 'LiveKit not configured',
        details: 'LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set',
      });
    }

    if (!roomName) {
      return res.status(400).json({ error: 'roomName is required' });
    }

    // Check if user has meet access for video calls (Premium or Pro tier)
    // Studios always have access
    // Chat instance doesn't require premium
    if (instance === 'meet' && user.userType !== 'studio') {
      // Check personal subscription for premium/pro
      const personalResult = await query(`
        SELECT sp.id FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = $1 AND us.status = 'active'
        AND sp.id IN ('artist_premium', 'artist_streaming', 'venue_premium', 'venue_streaming', 'studio_premium', 'studio_pro')
      `, [user.userId]);

      // Check band subscriptions
      const bandSub = await getUserBandSubscriptionLevel(user.userId);

      const hasMeetAccess = personalResult.rows.length > 0 || bandSub.hasMeet;

      if (!hasMeetAccess) {
        return res.status(403).json({
          error: 'Meet (video calls) requires Premium or Pro subscription',
          upgrade_required: true,
          required_tier: 'premium',
          message: 'Upgrade to Premium to use video calls on meet.artist-space.com',
        });
      }
    }

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.userId,
      name: participantName || user.name || user.userId,
      // Token valid for 6 hours
      ttl: '6h',
      // Metadata for identifying user
      metadata: JSON.stringify({
        userId: user.userId,
        userType: user.userType,
        email: user.email,
      }),
    });

    // Grant permissions based on instance
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
      // Enable admin features if requested and user is admin
      roomAdmin: isAdmin && (user.userType === 'booking_agent' || user.is_admin_agent),
      // Recording permissions for admins
      roomRecord: isAdmin && (user.userType === 'booking_agent' || user.is_admin_agent),
    });

    // Generate JWT token
    const token = await at.toJwt();

    res.json({
      token,
      url: getInstanceUrl(instance),
      roomName,
      participantName: participantName || user.name || user.userId,
      e2eeSupported: true,
      e2eeEnabled: e2eeEnabled || false,
      instance: instance || 'main',
    });

  } catch (error) {
    console.error('LiveKit token error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

/**
 * POST /api/livekit/create-room
 * Create a new LiveKit room with specific configuration
 */
router.post('/create-room', authenticateToken, async (req, res) => {
  try {
    const { instance, roomName, maxParticipants, emptyTimeout, e2eeEnabled } = req.body;

    if (!roomName) {
      return res.status(400).json({ error: 'roomName is required' });
    }

    // Room configuration
    const roomConfig = {
      name: roomName,
      emptyTimeout: emptyTimeout || 300, // 5 minutes default
      maxParticipants: maxParticipants || 20,
      e2eeEnabled: e2eeEnabled || false,
    };

    // In production, you'd call LiveKit API to create room
    res.json({
      success: true,
      room: roomConfig,
      url: getInstanceUrl(instance),
      message: 'Room will be created on first participant join',
    });
  } catch (error) {
    console.error('LiveKit create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

/**
 * GET /api/livekit/rooms
 * List active rooms (admin only)
 */
router.get('/rooms', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    // Check if user is admin
    if (user.userType !== 'booking_agent' && !user.is_admin_agent) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // In production, you'd call LiveKit API to list rooms
    res.json({
      rooms: [],
      message: 'Implement LiveKit API integration to list rooms',
    });
  } catch (error) {
    console.error('LiveKit list rooms error:', error);
    res.status(500).json({ error: 'Failed to list rooms' });
  }
});

export default router;
