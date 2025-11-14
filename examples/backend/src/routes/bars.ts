import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';

const router = Router();

// GET /api/bars - Get all bars
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT b.id, b.user_id, b.venue_name, b.address, b.city, b.state,
             b.capacity, b.eth_wallet, b.description, b.amenities, b.created_at,
             u.name, u.status 
      FROM venues b 
      JOIN users u ON b.user_id = u.id 
      WHERE u.status = 'approved'
      ORDER BY b.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Get bars error:', error);
    res.status(500).json({ error: 'Failed to fetch bars' });
  }
});

// GET /api/bars/:id - Get bar by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT b.id, b.user_id, b.venue_name, b.address, b.city, b.state,
             b.capacity, b.eth_wallet, b.description, b.amenities, b.created_at,
             u.name, u.status 
      FROM venues b 
      JOIN users u ON b.user_id = u.id 
      WHERE b.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bar not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get bar error:', error);
    res.status(500).json({ error: 'Failed to fetch bar' });
  }
});

// GET /api/bars/:id/performance-kpis - Get venue performance KPIs (public endpoint)
router.get('/:id/performance-kpis', async (req, res) => {
  try {
    const { id } = req.params;

    // Get all completed tours for this venue with their KPIs
    const result = await query(`
      SELECT 
        COUNT(td.id) as total_shows,
        COALESCE(SUM(CASE 
          WHEN td.payment_currency = 'USD' THEN td.payment_amount
          WHEN td.payment_currency = 'ETH' THEN td.payment_amount_eth * 2000
          ELSE td.payment_amount 
        END), 0) as total_revenue_usd,
        COALESCE(SUM(tk.attendance), 0) as total_attendance,
        COALESCE(AVG(CASE 
          WHEN td.payment_currency = 'USD' THEN td.payment_amount
          WHEN td.payment_currency = 'ETH' THEN td.payment_amount_eth * 2000
          ELSE td.payment_amount 
        END), 0) as avg_revenue_per_show,
        COALESCE(AVG(tk.attendance), 0) as avg_attendance_per_show,
        COALESCE(SUM(CASE 
          WHEN tk.sales_currency = 'USD' THEN tk.bar_sales
          WHEN tk.sales_currency = 'ETH' THEN tk.bar_sales_eth * 2000
          ELSE tk.bar_sales 
        END), 0) as total_bar_sales_usd,
        COALESCE(AVG(CASE 
          WHEN tk.sales_currency = 'USD' THEN tk.bar_sales
          WHEN tk.sales_currency = 'ETH' THEN tk.bar_sales_eth * 2000
          ELSE tk.bar_sales 
        END), 0) as avg_bar_sales_per_show,
        COALESCE(SUM(tk.new_customers), 0) as total_new_customers,
        COALESCE(AVG(tk.new_customers), 0) as avg_new_customers_per_show
      FROM tour_dates td
      LEFT JOIN tour_kpis tk ON td.id = tk.tour_date_id
      WHERE td.venue_id = $1 AND td.status = 'completed'
    `, [id]);

    const kpis = result.rows[0] || {
      total_shows: 0,
      total_revenue_usd: 0,
      total_attendance: 0,
      avg_revenue_per_show: 0,
      avg_attendance_per_show: 0,
      total_bar_sales_usd: 0,
      avg_bar_sales_per_show: 0,
      total_new_customers: 0,
      avg_new_customers_per_show: 0
    };

    res.json({
      total_shows: parseInt(kpis.total_shows) || 0,
      total_revenue: parseFloat(kpis.total_revenue_usd) || 0,
      total_attendance: parseInt(kpis.total_attendance) || 0,
      avg_revenue_per_show: parseFloat(kpis.avg_revenue_per_show) || 0,
      avg_attendance_per_show: Math.round(parseFloat(kpis.avg_attendance_per_show)) || 0,
      total_bar_sales: parseFloat(kpis.total_bar_sales_usd) || 0,
      avg_bar_sales_per_show: parseFloat(kpis.avg_bar_sales_per_show) || 0,
      total_new_customers: parseInt(kpis.total_new_customers) || 0,
      avg_new_customers_per_show: Math.round(parseFloat(kpis.avg_new_customers_per_show)) || 0
    });
  } catch (error) {
    console.error('Get venue KPIs error:', error);
    res.status(500).json({ error: 'Failed to fetch venue performance KPIs' });
  }
});

// PUT /api/bars/:id - Update bar profile
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { venue_name, address, city, state, capacity, eth_wallet, description, amenities } = req.body;

    // Check if user owns this bar
    const barResult = await query(
      'SELECT user_id FROM venues WHERE id = $1',
      [id]
    );

    if (barResult.rows.length === 0) {
      return res.status(404).json({ error: 'Bar not found' });
    }

    const bar = barResult.rows[0];

    if (bar.user_id !== user.userId && user.userType !== 'booking_agent') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update bar
    await query(`
      UPDATE venues 
      SET venue_name = COALESCE($1, venue_name),
          address = COALESCE($2, address),
          city = COALESCE($3, city),
          state = COALESCE($4, state),
          capacity = COALESCE($5, capacity),
          eth_wallet = COALESCE($6, eth_wallet),
          description = COALESCE($7, description),
          amenities = COALESCE($8, amenities)
      WHERE id = $9
    `, [venue_name, address, city, state, capacity, eth_wallet, description, amenities, id]);

    // Fetch updated bar
    const updated = await query('SELECT * FROM venues WHERE id = $1', [id]);

    res.json(updated.rows[0]);
  } catch (error) {
    console.error('Update bar error:', error);
    res.status(500).json({ error: 'Failed to update bar' });
  }
});

export default router;
