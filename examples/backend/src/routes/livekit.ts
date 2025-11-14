import { Router } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { authenticateToken } from '../utils/auth.js';
import { getUserBandSubscriptionLevel } from '../utils/bandSubscription.js';
import { query } from '../db.js';

const router = Router();

// POST /api/livekit/token
router.post('/token', authenticateToken, async (req, res) => {
  try {
    const { roomName, participantName, isAdmin } = req.body;
    const user = (req as any).user;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({ error: 'LiveKit not configured' });
    }

    // Check if user has meet access (Premium or Pro tier) via personal or band subscription
    // Studios always have access
    if (user.userType !== 'studio') {
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
          required_tier: 'premium'
        });
      }
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName || user.userId,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    
    res.json({
      token,
      url: process.env.LIVEKIT_WS_URL,
    });

  } catch (error) {
    console.error('LiveKit token error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

export default router;
