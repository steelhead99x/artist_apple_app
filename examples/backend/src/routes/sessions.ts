import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';

const router = Router();

// GET /api/sessions - Get sessions (with filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { studio_id, band_id } = req.query;
    
    let queryText = `
      SELECT ss.*, 
             rs.studio_name,
             b.band_name,
             u.name as user_name
      FROM studio_sessions ss
      JOIN recording_studios rs ON ss.studio_id = rs.id
      JOIN bands b ON ss.band_id = b.id
      LEFT JOIN users u ON ss.user_id = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (studio_id) {
      queryText += ` AND ss.studio_id = $${paramIndex}`;
      params.push(studio_id);
      paramIndex++;
    }
    
    if (band_id) {
      queryText += ` AND ss.band_id = $${paramIndex}`;
      params.push(band_id);
      paramIndex++;
    }
    
    queryText += ' ORDER BY ss.session_date DESC, ss.start_time DESC';
    
    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// POST /api/sessions - Start a new session
router.post('/', authenticateToken, async (req, res) => {
  try {
    const data = req.body;
    const now = new Date();
    const sessionDate = now.toISOString().split('T')[0];
    const startTime = now.toISOString();
    
    const result = await query(`
      INSERT INTO studio_sessions 
      (studio_id, band_id, user_id, session_date, start_time, connection_type, session_notes, status) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING *
    `, [
      data.studio_id,
      data.band_id,
      data.user_id || null,
      sessionDate,
      startTime,
      data.connection_type || 'both',
      data.session_notes || null
    ]);

    res.status(201).json({ 
      ...result.rows[0],
      message: 'Session started successfully'
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// PUT /api/sessions/:id/end - End a session
router.put('/:id/end', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    const sessionResult = await query(
      'SELECT start_time FROM studio_sessions WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    const session = sessionResult.rows[0];
    const endTime = new Date().toISOString();
    const startTime = new Date(session.start_time);
    const durationMinutes = Math.round((new Date(endTime).getTime() - startTime.getTime()) / 60000);

    await query(`
      UPDATE studio_sessions 
      SET end_time = $1, duration_minutes = $2, session_notes = $3, recording_files = $4, status = 'completed'
      WHERE id = $5
    `, [
      endTime,
      durationMinutes,
      data.session_notes || null,
      data.recording_files || null,
      id
    ]);

    res.json({ 
      message: 'Session ended successfully',
      duration_minutes: durationMinutes
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// GET /api/sessions/stats/:studio_id - Get studio session statistics
router.get('/stats/:studio_id', authenticateToken, async (req, res) => {
  try {
    const { studio_id } = req.params;
    
    // Total sessions and time
    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_sessions,
        SUM(duration_minutes) as total_minutes,
        AVG(duration_minutes) as avg_duration
      FROM studio_sessions
      WHERE studio_id = $1 AND status = 'completed'
    `, [studio_id]);

    // Sessions by band
    const bandStatsResult = await query(`
      SELECT 
        b.band_name,
        COUNT(*) as session_count,
        SUM(ss.duration_minutes) as total_minutes
      FROM studio_sessions ss
      JOIN bands b ON ss.band_id = b.id
      WHERE ss.studio_id = $1 AND ss.status = 'completed'
      GROUP BY b.id, b.band_name
      ORDER BY total_minutes DESC
    `, [studio_id]);

    res.json({
      summary: statsResult.rows[0],
      by_band: bandStatsResult.rows
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/sessions/band/:band_id - Get band's session history
router.get('/band/:band_id', authenticateToken, async (req, res) => {
  try {
    const { band_id } = req.params;
    
    const result = await query(`
      SELECT ss.*, rs.studio_name, u.name as user_name
      FROM studio_sessions ss
      JOIN recording_studios rs ON ss.studio_id = rs.id
      LEFT JOIN users u ON ss.user_id = u.id
      WHERE ss.band_id = $1
      ORDER BY ss.session_date DESC, ss.start_time DESC
    `, [band_id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get band sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

export default router;
