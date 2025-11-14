import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';

const router = Router();

// GET /api/mux/user-assets - Get user's Mux video assets
router.get('/user-assets', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    // Fetch assets based on user type
    let assets: any[] = [];

    if (user.userType === 'band' || user.userType === 'user') {
      // Get assets from user's bands
      const bandAssets = await query(`
        SELECT
          ma.id,
          ma.playback_id,
          ma.asset_title as title,
          ma.asset_description as description,
          ma.duration,
          ma.thumbnail_url,
          ma.created_at,
          ma.drm_token,
          b.band_name
        FROM mux_assets ma
        JOIN band_members bm ON ma.band_id = bm.band_id
        JOIN bands b ON bm.band_id = b.id
        WHERE bm.user_id = $1 AND bm.status = 'active'
        ORDER BY ma.created_at DESC
      `, [user.userId]);

      assets = bandAssets.rows.map(row => ({
        id: row.id,
        playbackId: row.playback_id,
        title: row.title || `${row.band_name} - Video`,
        description: row.asset_description,
        duration: row.duration,
        thumbnailUrl: row.thumbnail_url,
        createdAt: row.created_at,
        drmToken: row.drm_token,
        isLive: false
      }));
    } else if (user.userType === 'studio') {
      // Get assets from recording studio
      const studioAssets = await query(`
        SELECT
          ma.id,
          ma.playback_id,
          ma.asset_title as title,
          ma.asset_description as description,
          ma.duration,
          ma.thumbnail_url,
          ma.created_at,
          ma.drm_token,
          rs.studio_name
        FROM mux_assets ma
        JOIN recording_studios rs ON ma.studio_id = rs.id
        WHERE rs.user_id = $1
        ORDER BY ma.created_at DESC
      `, [user.userId]);

      assets = studioAssets.rows.map(row => ({
        id: row.id,
        playbackId: row.playback_id,
        title: row.title || `${row.studio_name} - Recording`,
        description: row.asset_description,
        duration: row.duration,
        thumbnailUrl: row.thumbnail_url,
        createdAt: row.created_at,
        drmToken: row.drm_token,
        isLive: false
      }));
    }

    res.json({ assets });
  } catch (error) {
    console.error('Get user assets error:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// GET /api/mux/live-stream - Check for active live stream
router.get('/live-stream', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    // Check for active live streams
    let liveStream = null;

    if (user.userType === 'band' || user.userType === 'user') {
      const bandLive = await query(`
        SELECT
          ml.id,
          ml.playback_id,
          ml.stream_title as title,
          ml.stream_description as description,
          ml.created_at,
          b.band_name
        FROM mux_live_streams ml
        JOIN band_members bm ON ml.band_id = bm.band_id
        JOIN bands b ON bm.band_id = b.id
        WHERE bm.user_id = $1 AND ml.status = 'active' AND bm.status = 'active'
        ORDER BY ml.created_at DESC
        LIMIT 1
      `, [user.userId]);

      if (bandLive.rows.length > 0) {
        const row = bandLive.rows[0];
        liveStream = {
          id: row.id,
          playbackId: row.playback_id,
          title: row.title || `${row.band_name} - Live`,
          description: row.description,
          createdAt: row.created_at,
          isLive: true
        };
      }
    } else if (user.userType === 'studio') {
      const studioLive = await query(`
        SELECT
          ml.id,
          ml.playback_id,
          ml.stream_title as title,
          ml.stream_description as description,
          ml.created_at,
          rs.studio_name
        FROM mux_live_streams ml
        JOIN recording_studios rs ON ml.studio_id = rs.id
        WHERE rs.user_id = $1 AND ml.status = 'active'
        ORDER BY ml.created_at DESC
        LIMIT 1
      `, [user.userId]);

      if (studioLive.rows.length > 0) {
        const row = studioLive.rows[0];
        liveStream = {
          id: row.id,
          playbackId: row.playback_id,
          title: row.title || `${row.studio_name} - Live Session`,
          description: row.description,
          createdAt: row.created_at,
          isLive: true
        };
      }
    }

    res.json({
      isLive: liveStream !== null,
      liveAsset: liveStream
    });
  } catch (error) {
    console.error('Check live stream error:', error);
    res.status(500).json({ error: 'Failed to check live stream', isLive: false });
  }
});

// GET /api/mux/public-assets - Get public assets for non-authenticated users
router.get('/public-assets', async (req, res) => {
  try {
    const publicAssets = await query(`
      SELECT
        ma.id,
        ma.playback_id,
        ma.asset_title as title,
        ma.asset_description as description,
        ma.duration,
        ma.thumbnail_url,
        ma.created_at,
        CASE
          WHEN b.band_name IS NOT NULL THEN b.band_name
          WHEN rs.studio_name IS NOT NULL THEN rs.studio_name
          ELSE 'Artist-Space'
        END as creator_name
      FROM mux_assets ma
      LEFT JOIN bands b ON ma.band_id = b.id
      LEFT JOIN recording_studios rs ON ma.studio_id = rs.id
      WHERE ma.is_public = true
      ORDER BY ma.created_at DESC
      LIMIT 20
    `);

    const assets = publicAssets.rows.map(row => ({
      id: row.id,
      playbackId: row.playback_id,
      title: row.title || `${row.creator_name} - Video`,
      description: row.asset_description,
      duration: row.duration,
      thumbnailUrl: row.thumbnail_url,
      createdAt: row.created_at,
      creator: row.creator_name,
      isLive: false
    }));

    res.json({ assets });
  } catch (error) {
    console.error('Get public assets error:', error);
    res.status(500).json({ error: 'Failed to fetch public assets' });
  }
});

export default router;
