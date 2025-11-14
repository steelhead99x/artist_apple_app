import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';

const router = Router();

// GET /api/event-status/computed - Get events with computed statuses
router.get('/computed', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { status, band_id, booking_agent_id } = req.query;

    let queryText = `
      SELECT * FROM event_status_computed
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    // Filter by user type
    if (user.userType === 'band') {
      // Get bands owned by this user
      const bands = await query('SELECT id FROM bands WHERE user_id = $1', [user.userId]);
      const bandIds = bands.rows.map(b => b.id);
      
      if (bandIds.length > 0) {
        queryText += ` AND band_id = ANY($${paramCount}::uuid[])`;
        params.push(bandIds);
        paramCount++;
      } else {
        return res.json([]);
      }
    } else if (user.userType === 'venue') {
      // Get venues owned by this user
      const venues = await query('SELECT id FROM venues WHERE user_id = $1', [user.userId]);
      const venueIds = venues.rows.map(v => v.id);
      
      if (venueIds.length > 0) {
        queryText += ` AND venue_id = ANY($${paramCount}::uuid[])`;
        params.push(venueIds);
        paramCount++;
      } else {
        return res.json([]);
      }
    } else if (user.userType === 'booking_agent') {
      // Booking agents see all or filter by their assigned events
      if (booking_agent_id) {
        queryText += ` AND booking_agent_id = $${paramCount}`;
        params.push(booking_agent_id);
        paramCount++;
      }
    }

    // Filter by computed status
    if (status) {
      queryText += ` AND computed_status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Filter by band_id
    if (band_id) {
      queryText += ` AND band_id = $${paramCount}`;
      params.push(band_id);
      paramCount++;
    }

    queryText += ' ORDER BY date ASC, start_time ASC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get computed statuses error:', error);
    res.status(500).json({ error: 'Failed to fetch event statuses' });
  }
});

// GET /api/event-status/pending-finalization - Get events pending finalization
router.get('/pending-finalization', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    let queryText = 'SELECT * FROM events_pending_finalization WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    // Filter by user type
    if (user.userType === 'booking_agent') {
      // Booking agents see their events or all if they want
      const { show_all } = req.query;
      
      if (!show_all) {
        queryText += ` AND (booking_agent_id = $${paramCount} OR booking_agent_id IS NULL)`;
        params.push(user.userId);
        paramCount++;
      }
    } else if (user.userType !== 'admin') {
      // Non-booking agents shouldn't access this
      return res.status(403).json({ error: 'Only booking agents can access finalization queue' });
    }

    queryText += ' ORDER BY date ASC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get pending finalization error:', error);
    res.status(500).json({ error: 'Failed to fetch pending finalization events' });
  }
});

// GET /api/event-status/payment-pending - Get events with pending payments
router.get('/payment-pending', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    let queryText = 'SELECT * FROM events_payment_pending WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    // Filter by user type
    if (user.userType === 'booking_agent') {
      const { show_all } = req.query;
      
      if (!show_all) {
        queryText += ` AND (booking_agent_id = $${paramCount} OR booking_agent_id IS NULL)`;
        params.push(user.userId);
        paramCount++;
      }
    } else if (user.userType === 'band') {
      // Bands can see their own payment pending events
      const bands = await query('SELECT id FROM bands WHERE user_id = $1', [user.userId]);
      const bandIds = bands.rows.map(b => b.id);
      
      if (bandIds.length > 0) {
        queryText += ` AND band_id = ANY($${paramCount}::uuid[])`;
        params.push(bandIds);
        paramCount++;
      } else {
        return res.json([]);
      }
    } else if (user.userType !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    queryText += ' ORDER BY date ASC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get payment pending error:', error);
    res.status(500).json({ error: 'Failed to fetch payment pending events' });
  }
});

// GET /api/event-status/payment-complete - Get events with completed payments
router.get('/payment-complete', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    let queryText = `
      SELECT e.* 
      FROM event_status_computed e
      WHERE e.payment_completed = true
        AND e.computed_status IN ('confirmed', 'in_progress', 'completed', 'completed_pending_finalization')
    `;
    const params: any[] = [];
    let paramCount = 1;

    // Filter by user type
    if (user.userType === 'booking_agent') {
      const { show_all } = req.query;
      
      if (!show_all) {
        queryText += ` AND (e.booking_agent_id = $${paramCount} OR e.booking_agent_id IS NULL)`;
        params.push(user.userId);
        paramCount++;
      }
    } else if (user.userType === 'band') {
      // Bands can see their own payment complete events
      const bands = await query('SELECT id FROM bands WHERE user_id = $1', [user.userId]);
      const bandIds = bands.rows.map(b => b.id);
      
      if (bandIds.length > 0) {
        queryText += ` AND e.band_id = ANY($${paramCount}::uuid[])`;
        params.push(bandIds);
        paramCount++;
      } else {
        return res.json([]);
      }
    } else if (user.userType !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    queryText += ' ORDER BY e.date ASC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get payment complete error:', error);
    res.status(500).json({ error: 'Failed to fetch payment complete events' });
  }
});

// POST /api/event-status/:id/finalize - Finalize an event
router.post('/:id/finalize', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { notes } = req.body;

    // Only booking agents can finalize
    if (user.userType !== 'booking_agent') {
      return res.status(403).json({ error: 'Only booking agents can finalize events' });
    }

    // Call the finalize_event function
    try {
      await query(
        'SELECT finalize_event($1, $2, $3)',
        [id, user.userId, notes || null]
      );

      // Get the updated event
      const result = await query(
        'SELECT * FROM event_status_computed WHERE id = $1',
        [id]
      );

      res.json({
        success: true,
        message: 'Event finalized successfully',
        event: result.rows[0]
      });
    } catch (error: any) {
      if (error.message?.includes('cannot be finalized')) {
        return res.status(400).json({ error: error.message });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Finalize event error:', error);
    res.status(500).json({ 
      error: 'Failed to finalize event',
      details: error.message 
    });
  }
});

// POST /api/event-status/update-all - Manually trigger status updates
router.post('/update-all', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    // Only booking agents or admins can trigger updates
    if (user.userType !== 'booking_agent' && user.userType !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Call the update function
    const result = await query('SELECT update_event_statuses()');
    const updatedCount = result.rows[0].update_event_statuses;

    res.json({
      success: true,
      message: `Updated ${updatedCount} event(s) to in_progress status`,
      updated_count: updatedCount
    });
  } catch (error) {
    console.error('Update statuses error:', error);
    res.status(500).json({ error: 'Failed to update event statuses' });
  }
});

// PUT /api/event-status/:id/unfinalize - Allow unfinalizing an event (admin/booking agent only)
router.put('/:id/unfinalize', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;

    // Only booking agents can unfinalize
    if (user.userType !== 'booking_agent') {
      return res.status(403).json({ error: 'Only booking agents can unfinalize events' });
    }

    // Unfinalize the event
    await query(`
      UPDATE tour_dates
      SET 
        finalized = FALSE,
        finalized_at = NULL,
        finalized_by = NULL,
        finalization_notes = NULL,
        status = 'confirmed'
      WHERE id = $1
    `, [id]);

    // Get the updated event
    const result = await query(
      'SELECT * FROM event_status_computed WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Event unfinalized successfully',
      event: result.rows[0]
    });
  } catch (error) {
    console.error('Unfinalize event error:', error);
    res.status(500).json({ error: 'Failed to unfinalize event' });
  }
});

// GET /api/event-status/:id - Get single event with computed status
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'SELECT * FROM event_status_computed WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get event status error:', error);
    res.status(500).json({ error: 'Failed to fetch event status' });
  }
});

export default router;

