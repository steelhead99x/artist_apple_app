import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';
import { getUserBandSubscriptionLevel } from '../utils/bandSubscription.js';
import jwt from 'jsonwebtoken';

interface MuxLiveStreamResponse {
  data: {
    id: string;
    stream_key: string;
    rtmp_url: string;
    playback_ids?: Array<{
      id: string;
      playback_url: string;
    }>;
    reconnect_url?: string;
    status?: string;
    active_asset_id?: string;
    current_viewer_count?: number;
  };
}

const router = Router();

// Mux Live Stream API integration
// This handles the integration with Mux's Live Streaming API

// POST /api/mux/live-streams/create - Create Mux live stream
router.post('/live-streams/create', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const { title, description, max_viewers = 100 } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Check if user has streaming subscription (via personal or band subscription)
    const bandSub = await getUserBandSubscriptionLevel(user.userId);
    
    // Also check personal subscription
    const personalResult = await query(`
      SELECT sp.id FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = $1 AND us.status = 'active'
      AND sp.id IN ('artist_streaming', 'venue_streaming', 'studio_premium', 'studio_pro')
    `, [user.userId]);
    
    const hasStreaming = personalResult.rows.length > 0 || bandSub.hasStreaming;
    
    if (!hasStreaming) {
      return res.status(403).json({ 
        error: 'Live streaming requires a streaming subscription (Artist Streaming Pro tier)',
        upgrade_required: true 
      });
    }

    // Create Mux live stream
    const muxResponse = await fetch('https://api.mux.com/video/v1/live-streams', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playback_policy: ['public'],
        new_asset_settings: {
          playback_policy: ['public'],
          mp4_support: 'standard'
        },
        max_continuous_duration: 3600, // 1 hour max
        reconnect_window: 60,
        reduced_latency_signaling: true,
        latency_mode: 'low',
        max_resolution_tier: '1080p',
        stream_key: `${user.userId}-${Date.now()}`,
        reconnect_slate_url: process.env.MUX_RECONNECT_SLATE_URL || null,
        slate: {
          source_url: process.env.MUX_SLATE_URL || null
        }
      })
    });

    if (!muxResponse.ok) {
      const error = await muxResponse.text();
      console.error('Mux API error:', error);
      return res.status(500).json({ error: 'Failed to create Mux live stream' });
    }

    const muxStream = await muxResponse.json() as MuxLiveStreamResponse;

    // Save to our database
    const result = await query(`
      INSERT INTO live_streams (
        id, user_id, title, description, stream_key, 
        playback_id, status, is_public, max_viewers,
        stream_url, playback_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      muxStream.data.id,
      user.userId,
      title,
      description,
      muxStream.data.stream_key,
      muxStream.data.playback_ids?.[0]?.id || null,
      'draft',
      true,
      max_viewers,
      muxStream.data.rtmp_url,
      muxStream.data.playback_ids?.[0]?.playback_url || null
    ]);

    res.status(201).json({
      success: true,
      stream: result.rows[0],
      mux_data: {
        stream_key: muxStream.data.stream_key,
        rtmp_url: muxStream.data.rtmp_url,
        playback_url: muxStream.data.playback_ids?.[0]?.playback_url,
        reconnect_url: muxStream.data.reconnect_url
      }
    });
  } catch (error) {
    console.error('Create Mux live stream error:', error);
    res.status(500).json({ error: 'Failed to create live stream' });
  }
});

// PUT /api/mux/live-streams/:id/start - Start Mux live stream
router.put('/live-streams/:id/start', authenticateToken, async (req, res) => {
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
    
    if (stream.status !== 'draft') {
      return res.status(400).json({ error: 'Stream is not in draft status' });
    }

    // Start Mux live stream
    const muxResponse = await fetch(`https://api.mux.com/video/v1/live-streams/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'active'
      })
    });

    if (!muxResponse.ok) {
      const error = await muxResponse.text();
      console.error('Mux API error:', error);
      return res.status(500).json({ error: 'Failed to start Mux live stream' });
    }

    const muxStream = await muxResponse.json() as MuxLiveStreamResponse;

    // Update our database
    const updateResult = await query(`
      UPDATE live_streams 
      SET status = 'live', started_at = NOW(), playback_url = $1
      WHERE id = $2
      RETURNING *
    `, [muxStream.data.playback_ids?.[0]?.playback_url, id]);

    res.json({
      success: true,
      stream: updateResult.rows[0],
      mux_data: {
        playback_url: muxStream.data.playback_ids?.[0]?.playback_url,
        reconnect_url: muxStream.data.reconnect_url
      }
    });
  } catch (error) {
    console.error('Start Mux live stream error:', error);
    res.status(500).json({ error: 'Failed to start live stream' });
  }
});

// PUT /api/mux/live-streams/:id/end - End Mux live stream
router.put('/live-streams/:id/end', authenticateToken, async (req, res) => {
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

    // End Mux live stream
    const muxResponse = await fetch(`https://api.mux.com/video/v1/live-streams/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'idle'
      })
    });

    if (!muxResponse.ok) {
      const error = await muxResponse.text();
      console.error('Mux API error:', error);
      return res.status(500).json({ error: 'Failed to end Mux live stream' });
    }

    // Calculate duration
    const duration = stream.started_at ? 
      Math.floor((Date.now() - new Date(stream.started_at).getTime()) / 1000) : 0;

    // Update our database
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
    console.error('End Mux live stream error:', error);
    res.status(500).json({ error: 'Failed to end live stream' });
  }
});

// GET /api/mux/live-streams/:id/status - Get Mux live stream status
router.get('/live-streams/:id/status', authenticateToken, async (req, res) => {
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

    // Get Mux live stream status
    const muxResponse = await fetch(`https://api.mux.com/video/v1/live-streams/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString('base64')}`,
      }
    });

    if (!muxResponse.ok) {
      const error = await muxResponse.text();
      console.error('Mux API error:', error);
      return res.status(500).json({ error: 'Failed to get Mux live stream status' });
    }

    const muxStream = await muxResponse.json() as MuxLiveStreamResponse;

    res.json({
      success: true,
      stream: streamResult.rows[0],
      mux_status: {
        status: muxStream.data.status,
        active_asset_id: muxStream.data.active_asset_id,
        current_viewer_count: muxStream.data.current_viewer_count,
        playback_ids: muxStream.data.playback_ids,
        reconnect_url: muxStream.data.reconnect_url
      }
    });
  } catch (error) {
    console.error('Get Mux live stream status error:', error);
    res.status(500).json({ error: 'Failed to get live stream status' });
  }
});

// Helper function to generate JWT for Live Stream Health Stats API
function generateMuxHealthStatsToken(liveStreamId: string): string {
  const signingKey = process.env.MUX_SIGNING_KEY_ID;
  const privateKeyBase64 = process.env.MUX_SIGNING_KEY_PRIVATE;

  if (!signingKey || !privateKeyBase64) {
    throw new Error('Mux signing key not configured');
  }

  // Decode the base64 private key
  const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf-8');

  // Create JWT with required claims
  const payload = {
    sub: liveStreamId,              // Live stream ID
    aud: 'live_stream_id',          // Audience type
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // Expires in 24 hours
    kid: signingKey,                // Key ID
  };

  // Sign the JWT using RS256 algorithm
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    keyid: signingKey,
  });
}

// GET /api/mux/live-streams/:id/monitoring - Get real-time health stats (Beta API)
router.get('/live-streams/:id/monitoring', authenticateToken, async (req, res) => {
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

    // Generate JWT for health stats API
    let healthToken: string;
    try {
      healthToken = generateMuxHealthStatsToken(id);
    } catch (error) {
      console.error('Failed to generate health stats token:', error);
      // Fall back to basic stream info without health stats
      return res.json({
        data: {
          status: 'unknown',
          health: {
            status: 'unknown',
            issues: ['Health monitoring not configured']
          }
        }
      });
    }

    // Get real-time health stats from Mux (updates every 5 seconds)
    const healthResponse = await fetch(`https://stats.mux.com/live-stream-health?token=${healthToken}`);

    if (!healthResponse.ok) {
      const error = await healthResponse.text();
      console.error('Mux health stats API error:', error);
      return res.status(500).json({ error: 'Failed to get stream health stats' });
    }

    const healthData = await healthResponse.json();

    // Also get basic stream info
    const streamInfoResponse = await fetch(`https://api.mux.com/video/v1/live-streams/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString('base64')}`,
      }
    });

    let streamInfo: any = null;
    if (streamInfoResponse.ok) {
      const streamInfoData = await streamInfoResponse.json();
      streamInfo = streamInfoData.data;
    }

    // Extract health metrics
    const ingestHealth = healthData.data?.[0]?.ingest_health || null;

    // Determine connection quality from status
    const statusToQuality: Record<string, 'excellent' | 'good' | 'fair' | 'poor'> = {
      'excellent': 'excellent',
      'good': 'good',
      'poor': 'fair',
      'unknown': 'poor',
    };

    // Construct health monitoring response
    res.json({
      data: {
        status: streamInfo?.status || 'unknown',
        active_asset_id: streamInfo?.active_asset_id,
        current_viewer_count: 0, // Would require Mux Data API
        max_viewer_count: 0,

        // Stream health metrics (from Live Stream Health Stats API)
        stream_metrics: ingestHealth ? {
          stream_drift_session_avg: ingestHealth.stream_drift_session_avg,
          stream_drift_deviation: ingestHealth.stream_drift_deviation_from_rolling_avg,
          status: ingestHealth.status,
          updated_at: ingestHealth.updated_at,
          // These require additional API calls or metadata
          video_bitrate: 0,
          audio_bitrate: 0,
          frame_rate: 0,
          width: 0,
          height: 0,
        } : null,

        // Health indicators
        health: {
          status: ingestHealth?.status || 'unknown',
          connection_quality: ingestHealth ? statusToQuality[ingestHealth.status] || 'poor' : 'poor',
          issues: ingestHealth ? [] : ['No health data available'],
          metrics: {
            stream_drift: ingestHealth?.stream_drift_session_avg || 0,
            deviation: ingestHealth?.stream_drift_deviation_from_rolling_avg || 0,
          }
        },

        // Recording status
        recording: {
          enabled: streamInfo?.new_asset_settings?.mp4_support === 'standard',
          duration: 0,
        },

        // Additional metadata
        playback_ids: streamInfo?.playback_ids || [],
        reconnect_window: streamInfo?.reconnect_window || 0,
        latency_mode: streamInfo?.latency_mode || 'standard',
        test_mode: streamInfo?.test || false,
      }
    });
  } catch (error) {
    console.error('Get stream monitoring data error:', error);
    res.status(500).json({ error: 'Failed to get stream monitoring data' });
  }
});

// GET /api/mux/live-streams/:id/playback-metrics - Get playback metrics
router.get('/live-streams/:id/playback-metrics', authenticateToken, async (req, res) => {
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

    // Get playback ID from stream
    if (!stream.playback_id) {
      return res.json({
        success: true,
        metrics: null,
        message: 'No playback ID available yet'
      });
    }

    // Note: Real-time metrics would require Mux Data API
    // This is a placeholder for the structure
    res.json({
      success: true,
      metrics: {
        playback_id: stream.playback_id,
        current_viewers: 0,
        peak_viewers: 0,
        total_view_time: 0,
        average_watch_time: 0,
        rebuffer_percentage: 0,
        rebuffer_count: 0,
        rebuffer_duration: 0,
        startup_time_ms: 0,
        requests: 0,
        errors: 0,
      }
    });
  } catch (error) {
    console.error('Get playback metrics error:', error);
    res.status(500).json({ error: 'Failed to get playback metrics' });
  }
});

// POST /api/mux/live-streams/:id/recording - Enable/disable recording
router.post('/live-streams/:id/recording', authenticateToken, async (req, res) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { enabled } = req.body;

    // Verify stream ownership
    const streamResult = await query(`
      SELECT * FROM live_streams WHERE id = $1 AND user_id = $2
    `, [id, user.userId]);

    if (streamResult.rows.length === 0) {
      return res.status(404).json({ error: 'Stream not found' });
    }

    // Check if user can record streams
    const limitsResult = await query(`
      SELECT can_record_streams FROM user_streaming_limits usl
      JOIN user_subscriptions us ON us.user_id = usl.user_id
      WHERE usl.user_id = $1 AND us.status = 'active'
    `, [user.userId]);

    if (limitsResult.rows.length === 0 || !limitsResult.rows[0].can_record_streams) {
      return res.status(403).json({ error: 'Recording not allowed for your subscription' });
    }

    // Update Mux live stream recording settings
    const muxResponse = await fetch(`https://api.mux.com/video/v1/live-streams/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.MUX_TOKEN_ID}:${process.env.MUX_TOKEN_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        new_asset_settings: {
          mp4_support: enabled ? 'standard' : 'none'
        }
      })
    });

    if (!muxResponse.ok) {
      const error = await muxResponse.text();
      console.error('Mux API error:', error);
      return res.status(500).json({ error: 'Failed to update recording settings' });
    }

    res.json({
      success: true,
      recording_enabled: enabled
    });
  } catch (error) {
    console.error('Update recording settings error:', error);
    res.status(500).json({ error: 'Failed to update recording settings' });
  }
});

export default router;
