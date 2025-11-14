import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';

const router = Router();

// GET /api/studios - List all studios
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT s.*, u.name as owner_name, u.email 
      FROM recording_studios s
      JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get studios error:', error);
    res.status(500).json({ error: 'Failed to fetch studios' });
  }
});

// GET /api/studios/:id - Get studio by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT s.*, u.name as owner_name, u.email 
      FROM recording_studios s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Studio not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get studio error:', error);
    res.status(500).json({ error: 'Failed to fetch studio' });
  }
});

// POST /api/studios - Create studio
router.post('/', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const data = req.body;

    const result = await query(`
      INSERT INTO recording_studios 
      (user_id, studio_name, description, address, city, state, equipment, 
       daw_software, hourly_rate, eth_wallet, website, protools_version, 
       sonobus_enabled, webrtc_enabled) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      user.userId,
      data.studio_name,
      data.description || null,
      data.address || null,
      data.city || null,
      data.state || null,
      data.equipment || null,
      data.daw_software || null,
      data.hourly_rate || null,
      data.eth_wallet || null,
      data.website || null,
      data.protools_version || null,
      data.sonobus_enabled !== undefined ? data.sonobus_enabled : true,
      data.webrtc_enabled !== undefined ? data.webrtc_enabled : true
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create studio error:', error);
    res.status(500).json({ error: 'Failed to create studio' });
  }
});

// PUT /api/studios/:id - Update studio
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const data = req.body;

    // Verify ownership
    const studioResult = await query(
      'SELECT user_id FROM recording_studios WHERE id = $1',
      [id]
    );

    if (studioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Studio not found' });
    }

    if (studioResult.rows[0].user_id !== user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await query(`
      UPDATE recording_studios 
      SET studio_name = $1, description = $2, address = $3, city = $4, state = $5,
          equipment = $6, daw_software = $7, hourly_rate = $8, eth_wallet = $9,
          website = $10, protools_version = $11, sonobus_enabled = $12, webrtc_enabled = $13
      WHERE id = $14
    `, [
      data.studio_name,
      data.description || null,
      data.address || null,
      data.city || null,
      data.state || null,
      data.equipment || null,
      data.daw_software || null,
      data.hourly_rate || null,
      data.eth_wallet || null,
      data.website || null,
      data.protools_version || null,
      data.sonobus_enabled !== undefined ? data.sonobus_enabled : true,
      data.webrtc_enabled !== undefined ? data.webrtc_enabled : true,
      id
    ]);

    res.json({ message: 'Studio updated successfully' });
  } catch (error) {
    console.error('Update studio error:', error);
    res.status(500).json({ error: 'Failed to update studio' });
  }
});

export default router;
