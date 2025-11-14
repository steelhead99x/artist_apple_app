import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';
import { getUserBandSubscriptionLevel } from '../utils/bandSubscription.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// Generate a unique stream key
function generateStreamKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Check if user has streaming subscription (via personal or band subscription)
async function hasStreamingSubscription(userId: string): Promise<boolean> {
  // Check personal subscription first
  const personalResult = await query(`
    SELECT sp.id FROM user_subscriptions us
    JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE us.user_id = $1 AND us.status = 'active'
    AND sp.id IN ('artist_streaming', 'venue_streaming', 'studio_premium', 'studio_pro')
  `, [userId]);
  
  if (personalResult.rows.length > 0) {
    return true;
  }

  // Check band subscriptions - get highest tier from all bands user is in
  const bandSub = await getUserBandSubscriptionLevel(userId);
  return bandSub.hasStreaming;
}

// Get user streaming limits
async function getUserStreamingLimits(userId: string) {
  const result = await query(`
    SELECT usl.*, sp.name as plan_name FROM user_streaming_limits usl
    LEFT JOIN user_subscriptions us ON us.user_id = usl.user_id
    LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
    WHERE usl.user_id = $1 AND us.status = 'active'
  `, [userId]);
  
  if (result.rows.length === 0) {
    // Return default limits for non-streaming users
    return {
      max_concurrent_streams: 0,
      can_record_streams: false,
      can_use_overlays: false,
      plan_name: 'Free'
    };
  }
  
  return result.rows[0];
}

// POST /api/live-streams/create - Create a new live stream
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const { title, description, is_public = true, max_viewers = 100 } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Check if user has streaming subscription
    const hasSubscription = await hasStreamingSubscription(user.userId);
    if (!hasSubscription) {
      return res.status(403).json({ 
        error: 'Live streaming requires a streaming subscription',
        upgrade_required: true 
      });
    }

    // Get user limits
    const limits = await getUserStreamingLimits(user.userId);
    
    // Check concurrent stream limit
    const activeStreams = await query(`
      SELECT COUNT(*) as count FROM live_streams 
      WHERE user_id = $1 AND status = 'live'
    `, [user.userId]);
    
    if (activeStreams.rows[0].count >= limits.max_concurrent_streams) {
      return res.status(400).json({ 
        error: `Maximum concurrent streams limit reached (${limits.max_concurrent_streams})` 
      });
    }

    const streamId = uuidv4();
    const streamKey = generateStreamKey();
    
    // Create stream record
    const result = await query(`
      INSERT INTO live_streams (id, user_id, title, description, stream_key, is_public, max_viewers)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [streamId, user.userId, title, description, streamKey, is_public, max_viewers]);

    res.status(201).json({
      success: true,
      stream: result.rows[0],
      limits: limits
    });
  } catch (error) {
    console.error('Create stream error:', error);
    res.status(500).json({ error: 'Failed to create stream' });
  }
});

// GET /api/live-streams - Get user's streams
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const { status, limit = 20, offset = 0 } = req.query;

    let whereClause = 'WHERE user_id = $1';
    let params = [user.userId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status as string);
      paramIndex++;
    }

    const result = await query(`
      SELECT * FROM live_streams 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    res.json({
      success: true,
      streams: result.rows
    });
  } catch (error) {
    console.error('Get streams error:', error);
    res.status(500).json({ error: 'Failed to get streams' });
  }
});

// GET /api/live-streams/public - Get public streams (for discovery)
router.get('/public', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const result = await query(`
      SELECT ls.*, u.username, u.display_name 
      FROM live_streams ls
      JOIN users u ON ls.user_id = u.id
      WHERE ls.is_public = true AND ls.status = 'live'
      ORDER BY ls.started_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json({
      success: true,
      streams: result.rows
    });
  } catch (error) {
    console.error('Get public streams error:', error);
    res.status(500).json({ error: 'Failed to get public streams' });
  }
});

// GET /api/live-streams/:id - Get specific stream
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT ls.*, u.username, u.display_name 
      FROM live_streams ls
      JOIN users u ON ls.user_id = u.id
      WHERE ls.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    res.json({
      success: true,
      stream: result.rows[0]
    });
  } catch (error) {
    console.error('Get stream error:', error);
    res.status(500).json({ error: 'Failed to get stream' });
  }
});

// PUT /api/live-streams/:id/start - Start a stream
router.put('/:id/start', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { stream_url, playback_url } = req.body;

    // Verify stream ownership
    const streamResult = await query(`
      SELECT * FROM live_streams WHERE id = $1 AND user_id = $2
    `, [id, user.userId]);

    if (streamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    const stream = streamResult.rows[0];
    
    if (stream.status !== 'draft') {
      return res.status(400).json({ error: 'Stream is not in draft status' });
    }

    // Update stream status
    const updateResult = await query(`
      UPDATE live_streams 
      SET status = 'live', started_at = NOW(), stream_url = $1, playback_url = $2
      WHERE id = $3
      RETURNING *
    `, [stream_url, playback_url, id]);

    res.json({
      success: true,
      stream: updateResult.rows[0]
    });
  } catch (error) {
    console.error('Start stream error:', error);
    res.status(500).json({ error: 'Failed to start stream' });
  }
});

// PUT /api/live-streams/:id/end - End a stream
router.put('/:id/end', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    // Verify stream ownership
    const streamResult = await query(`
      SELECT * FROM live_streams WHERE id = $1 AND user_id = $2
    `, [id, user.userId]);

    if (streamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    const stream = streamResult.rows[0];
    
    if (stream.status !== 'live') {
      return res.status(400).json({ error: 'Stream is not live' });
    }

    // Calculate duration
    const duration = stream.started_at ? 
      Math.floor((Date.now() - new Date(stream.started_at).getTime()) / 1000) : 0;

    // Update stream status
    const updateResult = await query(`
      UPDATE live_streams 
      SET status = 'ended', ended_at = NOW(), duration_seconds = $1
      WHERE id = $2
      RETURNING *
    `, [duration, id]);

    res.json({
      success: true,
      stream: updateResult.rows[0]
    });
  } catch (error) {
    console.error('End stream error:', error);
    res.status(500).json({ error: 'Failed to end stream' });
  }
});

// POST /api/live-streams/:id/comments - Add comment to stream
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify stream exists and is live
    const streamResult = await query(`
      SELECT * FROM live_streams WHERE id = $1 AND status = 'live'
    `, [id]);

    if (streamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stream not found or not live' });
    }

    const commentId = uuidv4();
    
    // Add comment
    const result = await query(`
      INSERT INTO stream_comments (id, stream_id, user_id, username, message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [commentId, id, user.userId, user.email, message.trim()]);

    res.status(201).json({
      success: true,
      comment: result.rows[0]
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// GET /api/live-streams/:id/comments - Get stream comments
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await query(`
      SELECT * FROM stream_comments 
      WHERE stream_id = $1 AND is_deleted = false
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [id, limit, offset]);

    res.json({
      success: true,
      comments: result.rows
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

// GET /api/live-streams/:id/analytics - Get stream analytics
router.get('/:id/analytics', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    // Verify stream ownership
    const streamResult = await query(`
      SELECT * FROM live_streams WHERE id = $1 AND user_id = $2
    `, [id, user.userId]);

    if (streamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    // Get analytics data
    const analyticsResult = await query(`
      SELECT * FROM stream_analytics 
      WHERE stream_id = $1
      ORDER BY recorded_at DESC
      LIMIT 100
    `, [id]);

    res.json({
      success: true,
      analytics: analyticsResult.rows
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// GET /api/live-streams/limits - Get user streaming limits
router.get('/limits', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const limits = await getUserStreamingLimits(user.userId);
    
    res.json({
      success: true,
      limits: limits
    });
  } catch (error) {
    console.error('Get limits error:', error);
    res.status(500).json({ error: 'Failed to get limits' });
  }
});

export default router;
