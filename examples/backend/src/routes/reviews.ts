import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';

const router = Router();

// GET /api/reviews - Get reviews
router.get('/', async (req, res) => {
  try {
    const { reviewee_id, status: statusFilter } = req.query;
    const status = statusFilter || 'approved';

    let queryText = `
      SELECT r.*, 
             u1.name as reviewer_name, u1.user_type as reviewer_type,
             u2.name as reviewee_name, u2.user_type as reviewee_type
      FROM reviews r
      JOIN users u1 ON r.reviewer_id = u1.id
      JOIN users u2 ON r.reviewee_id = u2.id
      WHERE r.status = $1
    `;
    const params: any[] = [status];

    if (reviewee_id) {
      queryText += ' AND r.reviewee_id = $2';
      params.push(reviewee_id);
    }

    queryText += ' ORDER BY r.created_at DESC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /api/reviews - Create new review
router.post('/', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { reviewee_id, tour_date_id, rating, review_text } = req.body;

    if (!reviewee_id || !rating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const result = await query(`
      INSERT INTO reviews (reviewer_id, reviewee_id, tour_date_id, rating, review_text, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `, [user.userId, reviewee_id, tour_date_id, rating, review_text]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// GET /api/reviews/average/:id - Get average rating for user
router.get('/average/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT AVG(rating) as average_rating, COUNT(*) as review_count
      FROM reviews
      WHERE reviewee_id = $1 AND status = 'approved'
    `, [id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get average rating error:', error);
    res.status(500).json({ error: 'Failed to fetch rating' });
  }
});

export default router;
