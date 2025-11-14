import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';

const router = Router();

// GET /api/artist-dashboard/data - Get all dashboard data for an artist
router.get('/data', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user.userId;

    // Only artists (user type) can access this
    if (user.userType !== 'user' && user.userType !== 'band') {
      return res.status(403).json({ error: 'Unauthorized: This endpoint is for artists only' });
    }

    // Get all bands where user is owner or member
    let bandsResult;
    try {
      bandsResult = await query(`
        SELECT DISTINCT
          b.id,
          b.band_name,
          b.description,
          b.genre,
          b.website,
          b.created_at,
          CASE 
            WHEN b.user_id = $1 THEN 'owner'
            ELSE 'member'
          END as role,
          u.name as owner_name,
          u.email as owner_email,
          booking_mgr.id as booking_manager_id,
          booking_mgr.name as booking_manager_name,
          booking_mgr.email as booking_manager_email,
          NULL::VARCHAR as booking_manager_phone,
          NULL::VARCHAR as booking_manager_company
        FROM bands b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN users booking_mgr ON b.booking_manager_id = booking_mgr.id
        WHERE b.user_id = $1
           OR EXISTS (
             SELECT 1 FROM band_members bm
             WHERE bm.band_id = b.id
               AND bm.user_id = $1
               AND bm.status = 'active'
           )
        ORDER BY b.band_name ASC
      `, [userId]);
    } catch (bandsError: any) {
      console.error('Failed to load bands:', bandsError);
      throw bandsError; // Re-throw since we can't continue without bands
    }

    const bands = bandsResult.rows;
    const bandIds = bands.map(b => b.id).filter((id): id is string => id != null);

    if (bandIds.length === 0) {
      return res.json({
        bands,
        tours: [],
        media: [],
        bookingAgents: []
      });
    }

    // Get all tours/events for all bands (both upcoming and completed)
    let toursResult: { rows: any[] } = { rows: [] };
    try {
      // Ensure we have valid UUIDs
      if (bandIds.length > 0) {
        toursResult = await query(`
          SELECT 
            td.id,
            td.band_id,
            td.venue_id,
            td.date,
            td.start_time,
            td.end_time,
            td.status,
            td.payment_amount,
            COALESCE(td.payment_currency, 'USD') as payment_currency,
            b.band_name,
            v.venue_name,
            v.city,
            v.state,
            v.address,
            t.id as tour_id,
            t.tour_name,
            esc.computed_status,
            esc.payment_completed,
            CASE 
              WHEN td.date < CURRENT_DATE THEN false
              WHEN td.status IN ('completed', 'cancelled') THEN false
              WHEN td.date >= CURRENT_DATE THEN true
              ELSE true
            END as is_upcoming
          FROM tour_dates td
          JOIN bands b ON td.band_id = b.id
          JOIN venues v ON td.venue_id = v.id
          LEFT JOIN tours t ON td.tour_id = t.id
          LEFT JOIN event_status_computed esc ON td.id = esc.id
          WHERE td.band_id = ANY($1::uuid[])
          ORDER BY td.date DESC, td.start_time ASC
          LIMIT 200
        `, [bandIds]);
      }
    } catch (toursError: any) {
      console.error('Tours query error:', toursError.message);
      console.error('Error code:', toursError.code);
      // Continue with empty tours array instead of failing the entire request
      toursResult = { rows: [] };
    }

    // Get media for all bands
    let mediaResult: { rows: any[] } = { rows: [] };
    try {
      if (bandIds.length > 0) {
        mediaResult = await query(`
          SELECT 
            id,
            band_id,
            media_type,
            media_url,
            thumbnail_url,
            title,
            description,
            created_at
          FROM band_media
          WHERE band_id = ANY($1::uuid[])
          ORDER BY created_at DESC
          LIMIT 20
        `, [bandIds]);
      }
    } catch (mediaError: any) {
      console.error('Failed to load media:', mediaError);
      // Continue with empty media array
    }

    // Get unique booking agents/managers for all bands
    let bookingAgentsResult: { rows: any[] } = { rows: [] };
    try {
      if (bandIds.length > 0) {
        bookingAgentsResult = await query(`
          SELECT DISTINCT
            u.id,
            u.name,
            u.email,
            NULL::VARCHAR as phone,
            NULL::VARCHAR as company,
            u.user_type
          FROM users u
          WHERE u.id IN (
            SELECT DISTINCT booking_manager_id
            FROM bands
            WHERE id = ANY($1::uuid[])
              AND booking_manager_id IS NOT NULL
          )
          OR u.user_type = 'booking_agent'
            AND u.id IN (
              SELECT DISTINCT booking_agent_id
              FROM tour_dates
              WHERE band_id = ANY($1::uuid[])
                AND booking_agent_id IS NOT NULL
            )
          ORDER BY u.name ASC
        `, [bandIds]);
      }
    } catch (agentsError: any) {
      console.error('Failed to load booking agents:', agentsError);
      // Continue with empty booking agents array
    }

    res.json({
      bands,
      tours: toursResult.rows,
      media: mediaResult.rows,
      bookingAgents: bookingAgentsResult.rows
    });
  } catch (error: any) {
    console.error('Get artist dashboard data error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error hint:', error.hint);
    console.error('Error detail:', error.detail);
    res.status(500).json({ 
      error: 'Failed to fetch artist dashboard data', 
      details: error.message,
      code: error.code,
      hint: error.hint,
      detail: error.detail,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/artist-dashboard/payment-ledger - Get payment ledger for artist (only their payments)
router.get('/payment-ledger', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user.userId;

    // Only artists (user type) can access this
    if (user.userType !== 'user' && user.userType !== 'band') {
      return res.status(403).json({ error: 'Unauthorized: This endpoint is for artists only' });
    }

    // Get all payments sent to this artist from booking managers
    // This includes all tour_member_payouts where user_id matches
    const ledgerResult = await query(`
      SELECT 
        tmp.id,
        tmp.tour_payment_id,
        tmp.user_id,
        tmp.band_member_name,
        tmp.payout_amount,
        tmp.payout_status,
        tmp.payment_method,
        tmp.transaction_hash,
        tmp.notes,
        tmp.created_at,
        tmp.updated_at,
        tp.venue_payment_amount,
        tp.booking_agent_fee_percentage,
        tp.booking_agent_fee_amount,
        tp.other_fees_amount,
        tp.total_band_payout,
        tp.payment_status as tour_payment_status,
        tp.payment_date,
        tp.notes as tour_payment_notes,
        td.id as tour_date_id,
        td.date as tour_date,
        td.start_time,
        td.end_time,
        td.status as tour_status,
        td.payment_amount,
        td.payment_currency,
        b.id as band_id,
        b.band_name,
        v.id as venue_id,
        v.venue_name,
        v.city,
        v.state,
        t.id as tour_id,
        t.tour_name,
        ba_user.name as booking_agent_name,
        ba_user.email as booking_agent_email
      FROM tour_member_payouts tmp
      JOIN tour_payments tp ON tmp.tour_payment_id = tp.id
      JOIN tour_dates td ON tp.tour_date_id = td.id
      JOIN bands b ON td.band_id = b.id
      JOIN venues v ON td.venue_id = v.id
      LEFT JOIN tours t ON td.tour_id = t.id
      LEFT JOIN users ba_user ON td.booking_agent_id = ba_user.id
      WHERE tmp.user_id = $1
      ORDER BY td.date DESC, tmp.created_at DESC
    `, [userId]);

    res.json(ledgerResult.rows);
  } catch (error: any) {
    console.error('Get artist payment ledger error:', error);
    res.status(500).json({ error: 'Failed to fetch payment ledger', details: error.message });
  }
});

// GET /api/artist-dashboard/band-payment-summary/:bandId - Get band payment summary for a specific band
router.get('/band-payment-summary/:bandId', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user.userId;
    const { bandId } = req.params;

    // Verify user has access to this band
    const bandCheck = await query(`
      SELECT user_id 
      FROM bands 
      WHERE id = $1
    `, [bandId]);

    if (bandCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Band not found' });
    }

    const isBandOwner = bandCheck.rows[0].user_id === userId;
    
    const isBandMember = await query(`
      SELECT id 
      FROM band_members 
      WHERE band_id = $1 AND user_id = $2 AND status = 'active'
    `, [bandId, userId]);

    if (!isBandOwner && isBandMember.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized: You do not have access to this band' });
    }

    // Get band payment summary grouped by tour/event
    const summaryResult = await query(`
      SELECT 
        td.id as tour_date_id,
        td.date as tour_date,
        td.start_time,
        td.status as tour_status,
        td.payment_amount,
        td.payment_currency,
        v.venue_name,
        v.city,
        v.state,
        t.id as tour_id,
        t.tour_name,
        tp.id as tour_payment_id,
        tp.venue_payment_amount,
        tp.booking_agent_fee_percentage,
        tp.booking_agent_fee_amount,
        tp.other_fees_amount,
        tp.total_band_payout,
        tp.payment_status,
        tp.payment_date,
        COUNT(tmp.id) as member_count,
        COALESCE(SUM(tmp.payout_amount), 0) as total_allocated,
        COALESCE(SUM(CASE WHEN tmp.payout_status = 'paid' THEN tmp.payout_amount ELSE 0 END), 0) as paid_amount
      FROM tour_dates td
      JOIN bands b ON td.band_id = b.id
      JOIN venues v ON td.venue_id = v.id
      LEFT JOIN tours t ON td.tour_id = t.id
      LEFT JOIN tour_payments tp ON td.id = tp.tour_date_id
      LEFT JOIN tour_member_payouts tmp ON tp.id = tmp.tour_payment_id
      WHERE td.band_id = $1
      GROUP BY 
        td.id, td.date, td.start_time, td.status, td.payment_amount, td.payment_currency,
        v.venue_name, v.city, v.state,
        t.id, t.tour_name,
        tp.id, tp.venue_payment_amount, tp.booking_agent_fee_percentage, 
        tp.booking_agent_fee_amount, tp.other_fees_amount, tp.total_band_payout,
        tp.payment_status, tp.payment_date
      ORDER BY td.date DESC
    `, [bandId]);

    res.json(summaryResult.rows);
  } catch (error: any) {
    console.error('Get band payment summary error:', error);
    res.status(500).json({ error: 'Failed to fetch band payment summary', details: error.message });
  }
});

export default router;

