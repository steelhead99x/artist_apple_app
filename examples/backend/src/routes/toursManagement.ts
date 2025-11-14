import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';

const router = Router();

// GET /api/tours-management - Get all tours (with filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { band_id, status, booking_agent_id } = req.query;

    let queryText = `
      SELECT * FROM tour_summary
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    // Filter by band if user is a band owner
    if (user.userType === 'band') {
      queryText += ` AND band_owner_id = $${paramCount}`;
      params.push(user.userId);
      paramCount++;
    }

    // Filter by band_id if specified
    if (band_id) {
      queryText += ` AND band_id = $${paramCount}`;
      params.push(band_id);
      paramCount++;
    }

    // Filter by status
    if (status) {
      queryText += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Filter by booking agent
    if (booking_agent_id) {
      queryText += ` AND booking_agent_id = $${paramCount}`;
      params.push(booking_agent_id);
      paramCount++;
    } else if (user.userType === 'booking_agent') {
      // Booking agents see their own tours or unassigned tours
      queryText += ` AND (booking_agent_id = $${paramCount} OR booking_agent_id IS NULL)`;
      params.push(user.userId);
      paramCount++;
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get tours error:', error);
    res.status(500).json({ error: 'Failed to fetch tours' });
  }
});

// GET /api/tours-management/:id - Get specific tour with events
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get tour summary
    const tourResult = await query('SELECT * FROM tour_summary WHERE id = $1', [id]);
    
    if (tourResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    // Get all events for this tour
    const eventsResult = await query(`
      SELECT * FROM events_with_tour
      WHERE tour_id = $1
      ORDER BY date ASC, start_time ASC
    `, [id]);

    res.json({
      tour: tourResult.rows[0],
      events: eventsResult.rows
    });
  } catch (error) {
    console.error('Get tour error:', error);
    res.status(500).json({ error: 'Failed to fetch tour details' });
  }
});

// POST /api/tours-management - Create new tour
router.post('/', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      band_id,
      tour_name,
      description,
      start_date,
      end_date,
      notes
    } = req.body;

    if (!band_id || !tour_name) {
      return res.status(400).json({ error: 'Band ID and tour name are required' });
    }

    // Check permissions
    if (user.userType === 'band') {
      // Verify band ownership
      const bandCheck = await query('SELECT user_id FROM bands WHERE id = $1', [band_id]);
      if (bandCheck.rows.length === 0 || bandCheck.rows[0].user_id !== user.userId) {
        return res.status(403).json({ error: 'Unauthorized to create tour for this band' });
      }
    } else if (user.userType !== 'booking_agent') {
      return res.status(403).json({ error: 'Only bands and booking agents can create tours' });
    }

    // Create tour
    const result = await query(`
      INSERT INTO tours (
        band_id,
        booking_agent_id,
        tour_name,
        description,
        start_date,
        end_date,
        notes,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'planning')
      RETURNING *
    `, [
      band_id,
      user.userType === 'booking_agent' ? user.userId : null,
      tour_name,
      description,
      start_date,
      end_date,
      notes
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create tour error:', error);
    res.status(500).json({ error: 'Failed to create tour' });
  }
});

// PUT /api/tours-management/:id - Update tour
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const {
      tour_name,
      description,
      start_date,
      end_date,
      status,
      notes
    } = req.body;

    // Check permissions
    const tourCheck = await query(`
      SELECT t.*, b.user_id as band_owner_id
      FROM tours t
      JOIN bands b ON t.band_id = b.id
      WHERE t.id = $1
    `, [id]);

    if (tourCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    const tour = tourCheck.rows[0];
    const isOwner = tour.band_owner_id === user.userId;
    const isBookingAgent = user.userType === 'booking_agent' && tour.booking_agent_id === user.userId;

    if (!isOwner && !isBookingAgent && user.userType !== 'booking_agent') {
      return res.status(403).json({ error: 'Unauthorized to update this tour' });
    }

    // Update tour
    const result = await query(`
      UPDATE tours SET
        tour_name = COALESCE($1, tour_name),
        description = COALESCE($2, description),
        start_date = COALESCE($3, start_date),
        end_date = COALESCE($4, end_date),
        status = COALESCE($5, status),
        notes = COALESCE($6, notes),
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [tour_name, description, start_date, end_date, status, notes, id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update tour error:', error);
    res.status(500).json({ error: 'Failed to update tour' });
  }
});

// DELETE /api/tours-management/:id - Delete tour (and optionally its events)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { delete_events } = req.query; // If true, delete events; if false, unlink them

    // Check permissions
    const tourCheck = await query(`
      SELECT t.*, b.user_id as band_owner_id
      FROM tours t
      JOIN bands b ON t.band_id = b.id
      WHERE t.id = $1
    `, [id]);

    if (tourCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    const tour = tourCheck.rows[0];
    const isOwner = tour.band_owner_id === user.userId;
    const isBookingAgent = user.userType === 'booking_agent';

    if (!isOwner && !isBookingAgent) {
      return res.status(403).json({ error: 'Unauthorized to delete this tour' });
    }

    if (delete_events === 'true') {
      // Delete events along with tour
      await query('DELETE FROM tour_dates WHERE tour_id = $1', [id]);
    } else {
      // Unlink events from tour (make them standalone)
      await query('UPDATE tour_dates SET tour_id = NULL WHERE tour_id = $1', [id]);
    }

    // Delete tour
    await query('DELETE FROM tours WHERE id = $1', [id]);

    res.json({ success: true, message: 'Tour deleted successfully' });
  } catch (error) {
    console.error('Delete tour error:', error);
    res.status(500).json({ error: 'Failed to delete tour' });
  }
});

// POST /api/tours-management/:id/add-event - Add existing event to tour
router.post('/:id/add-event', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { event_id } = req.body;

    if (!event_id) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    // Check permissions on tour
    const tourCheck = await query(`
      SELECT t.*, b.user_id as band_owner_id
      FROM tours t
      JOIN bands b ON t.band_id = b.id
      WHERE t.id = $1
    `, [id]);

    if (tourCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    const tour = tourCheck.rows[0];
    const isAuthorized = 
      tour.band_owner_id === user.userId ||
      (user.userType === 'booking_agent' && tour.booking_agent_id === user.userId) ||
      user.userType === 'booking_agent';

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check that event belongs to same band
    const eventCheck = await query(
      'SELECT band_id FROM tour_dates WHERE id = $1',
      [event_id]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (eventCheck.rows[0].band_id !== tour.band_id) {
      return res.status(400).json({ error: 'Event must belong to the same band as the tour' });
    }

    // Add event to tour
    await query('UPDATE tour_dates SET tour_id = $1 WHERE id = $2', [id, event_id]);

    res.json({ success: true, message: 'Event added to tour' });
  } catch (error) {
    console.error('Add event to tour error:', error);
    res.status(500).json({ error: 'Failed to add event to tour' });
  }
});

// DELETE /api/tours-management/:id/remove-event/:event_id - Remove event from tour
router.delete('/:id/remove-event/:event_id', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { id, event_id } = req.params;

    // Check permissions
    const tourCheck = await query(`
      SELECT t.*, b.user_id as band_owner_id
      FROM tours t
      JOIN bands b ON t.band_id = b.id
      WHERE t.id = $1
    `, [id]);

    if (tourCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    const tour = tourCheck.rows[0];
    const isAuthorized = 
      tour.band_owner_id === user.userId ||
      (user.userType === 'booking_agent' && tour.booking_agent_id === user.userId) ||
      user.userType === 'booking_agent';

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Remove event from tour (make it standalone)
    await query(
      'UPDATE tour_dates SET tour_id = NULL WHERE id = $1 AND tour_id = $2',
      [event_id, id]
    );

    res.json({ success: true, message: 'Event removed from tour' });
  } catch (error) {
    console.error('Remove event from tour error:', error);
    res.status(500).json({ error: 'Failed to remove event from tour' });
  }
});

export default router;

