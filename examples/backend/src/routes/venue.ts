import { Router } from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../utils/auth.js';

const router = Router();

// Get premium content for venue users (5 Mux video assets)
router.get('/premium-content', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    // Check if user has premium subscription
    const subscriptionResult = await pool.query(`
      SELECT us.*, sp.id as plan_id
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = $1 AND us.status = 'active' AND sp.id = 'venue_premium'
    `, [userId]);

    if (subscriptionResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Premium subscription required',
        upgrade_required: true
      });
    }

    // Get premium video assets from environment or database
    // For now, we'll return configuration that uses env variables
    const assets = [
      {
        id: 'asset_1',
        title: 'Featured Performance',
        description: 'Exclusive live performance footage',
        playbackId: process.env.MUX_VENUE_ASSET_1 || '',
        thumbnailTime: 0
      },
      {
        id: 'asset_2',
        title: 'Venue Showcase',
        description: 'Professional venue tour and amenities',
        playbackId: process.env.MUX_VENUE_ASSET_2 || '',
        thumbnailTime: 0
      },
      {
        id: 'asset_3',
        title: 'Band Highlight Reel',
        description: 'Best moments from recent shows',
        playbackId: process.env.MUX_VENUE_ASSET_3 || '',
        thumbnailTime: 0
      },
      {
        id: 'asset_4',
        title: 'Promotional Content',
        description: 'Marketing and promotional videos',
        playbackId: process.env.MUX_VENUE_ASSET_4 || '',
        thumbnailTime: 0
      },
      {
        id: 'asset_5',
        title: 'Behind the Scenes',
        description: 'Exclusive behind-the-scenes content',
        playbackId: process.env.MUX_VENUE_ASSET_5 || '',
        thumbnailTime: 0
      }
    ];

    // Filter out assets without playback IDs
    const availableAssets = assets.filter(asset => asset.playbackId);

    res.json({
      success: true,
      assets: availableAssets,
      total: availableAssets.length,
      max_allowed: 5
    });

  } catch (error) {
    console.error('Error fetching premium content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch premium content'
    });
  }
});

// Get premium band information
router.get('/bands/premium-info', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    // Check if user has premium subscription
    const subscriptionResult = await pool.query(`
      SELECT us.*, sp.id as plan_id
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = $1 AND us.status = 'active' AND sp.id = 'venue_premium'
    `, [userId]);

    if (subscriptionResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Premium subscription required',
        upgrade_required: true
      });
    }

    // Get bands that have performed at this venue
    const venueResult = await pool.query(
      'SELECT id FROM venues WHERE user_id = $1',
      [userId]
    );

    if (venueResult.rows.length === 0) {
      return res.json({
        success: true,
        bands: []
      });
    }

    const venueId = venueResult.rows[0].id;

    // Get bands with their stats
    const bandsResult = await pool.query(`
      SELECT 
        b.id,
        b.band_name,
        b.genre,
        b.description,
        COUNT(DISTINCT td.id) as total_shows,
        COALESCE(AVG(td.attendance), 0)::integer as avg_attendance,
        COALESCE(SUM(td.band_payment), 0) as total_revenue,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as review_count
      FROM bands b
      LEFT JOIN tour_dates td ON b.id = td.band_id AND td.venue_id = $1
      LEFT JOIN reviews r ON b.user_id = r.reviewee_id
      WHERE b.id IN (
        SELECT DISTINCT band_id FROM tour_dates WHERE venue_id = $1
      )
      GROUP BY b.id, b.band_name, b.genre, b.description
      ORDER BY total_shows DESC, avg_rating DESC
    `, [venueId]);

    // Get band members for each band
    const bands = await Promise.all(bandsResult.rows.map(async (band) => {
      const membersResult = await pool.query(
        'SELECT id, name, instrument, role FROM band_members WHERE band_id = $1',
        [band.id]
      );

      // Get upcoming shows
      const upcomingShowsResult = await pool.query(
        'SELECT COUNT(*) as count FROM tour_dates WHERE band_id = $1 AND venue_id = $2 AND date > CURRENT_DATE',
        [band.id, venueId]
      );

      // Get last performance date
      const lastPerformanceResult = await pool.query(
        'SELECT MAX(date) as last_date FROM tour_dates WHERE band_id = $1 AND venue_id = $2 AND status = $3',
        [band.id, venueId, 'completed']
      );

      return {
        id: band.id,
        band_name: band.band_name,
        genre: band.genre,
        description: band.description,
        members: membersResult.rows,
        stats: {
          total_shows: parseInt(band.total_shows) || 0,
          avg_attendance: parseInt(band.avg_attendance) || 0,
          total_revenue: parseFloat(band.total_revenue) || 0,
          avg_rating: parseFloat(band.avg_rating) || 0,
          review_count: parseInt(band.review_count) || 0
        },
        social_media: {
          // These would come from band profile data
          instagram: null,
          facebook: null,
          twitter: null,
          spotify: null
        },
        upcoming_shows: parseInt(upcomingShowsResult.rows[0]?.count) || 0,
        last_performance_date: lastPerformanceResult.rows[0]?.last_date || null
      };
    }));

    res.json({
      success: true,
      bands
    });

  } catch (error) {
    console.error('Error fetching premium band info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch band information'
    });
  }
});

// Get specific band premium info
router.get('/bands/:bandId/premium-info', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { bandId } = req.params;

    // Check if user has premium subscription
    const subscriptionResult = await pool.query(`
      SELECT us.*, sp.id as plan_id
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = $1 AND us.status = 'active' AND sp.id = 'venue_premium'
    `, [userId]);

    if (subscriptionResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Premium subscription required',
        upgrade_required: true
      });
    }

    // Get venue
    const venueResult = await pool.query(
      'SELECT id FROM venues WHERE user_id = $1',
      [userId]
    );

    if (venueResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Venue not found'
      });
    }

    const venueId = venueResult.rows[0].id;

    // Get band details with stats
    const bandResult = await pool.query(`
      SELECT 
        b.id,
        b.band_name,
        b.genre,
        b.description,
        COUNT(DISTINCT td.id) as total_shows,
        COALESCE(AVG(td.attendance), 0)::integer as avg_attendance,
        COALESCE(SUM(td.band_payment), 0) as total_revenue,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as review_count
      FROM bands b
      LEFT JOIN tour_dates td ON b.id = td.band_id AND td.venue_id = $1
      LEFT JOIN reviews r ON b.user_id = r.reviewee_id
      WHERE b.id = $2
      GROUP BY b.id, b.band_name, b.genre, b.description
    `, [venueId, bandId]);

    if (bandResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Band not found'
      });
    }

    const band = bandResult.rows[0];

    // Get band members
    const membersResult = await pool.query(
      'SELECT id, name, instrument, role FROM band_members WHERE band_id = $1',
      [bandId]
    );

    res.json({
      success: true,
      band: {
        id: band.id,
        band_name: band.band_name,
        genre: band.genre,
        description: band.description,
        members: membersResult.rows,
        stats: {
          total_shows: parseInt(band.total_shows) || 0,
          avg_attendance: parseInt(band.avg_attendance) || 0,
          total_revenue: parseFloat(band.total_revenue) || 0,
          avg_rating: parseFloat(band.avg_rating) || 0,
          review_count: parseInt(band.review_count) || 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching band premium info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch band information'
    });
  }
});

export default router;

