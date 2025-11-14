import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';
import { convertToEth, isValidCurrency } from '../utils/currency.js';

const router = Router();

// GET /api/tours/tour/:tourId - Get all tour dates for a specific tour
router.get('/tour/:tourId', async (req, res) => {
  try {
    const { tourId } = req.params;

    const queryText = `
      SELECT 
        td.*,
        esc.computed_status,
        esc.payment_completed,
        esc.tour_payment_status,
        b.band_name, 
        v.venue_name, 
        v.city, 
        v.state,
        k.attendance, 
        k.bar_sales, 
        k.new_customers
      FROM tour_dates td
      LEFT JOIN event_status_computed esc ON td.id = esc.id
      JOIN bands b ON td.band_id = b.id
      JOIN venues v ON td.venue_id = v.id
      LEFT JOIN tour_kpis k ON td.id = k.tour_date_id
      WHERE td.tour_id = $1
      ORDER BY td.date ASC, td.start_time ASC
    `;

    const result = await query(queryText, [tourId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get tour dates error:', error);
    res.status(500).json({ error: 'Failed to fetch tour dates' });
  }
});

// GET /api/tours - Get all tour dates
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, band_id, venue_id } = req.query;

    let queryText = `
      SELECT esc.*, 
             b.band_name, 
             v.venue_name, v.city, v.state,
             k.attendance, k.bar_sales, k.new_customers
      FROM event_status_computed esc
      JOIN tour_dates td ON esc.id = td.id
      JOIN bands b ON td.band_id = b.id
      JOIN venues v ON td.venue_id = v.id
      LEFT JOIN tour_kpis k ON esc.id = k.tour_date_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      // For 'pending' status, check computed_status which reflects actual business state
      // For other statuses, check both computed_status and original status
      if (status === 'pending') {
        queryText += ` AND esc.computed_status = $${paramIndex}`;
      } else {
        queryText += ` AND (esc.computed_status = $${paramIndex} OR esc.status = $${paramIndex})`;
      }
      params.push(status);
      paramIndex++;
    }
    if (band_id) {
      queryText += ` AND td.band_id = $${paramIndex}`;
      params.push(band_id);
      paramIndex++;
    }
    if (venue_id) {
      queryText += ` AND td.venue_id = $${paramIndex}`;
      params.push(venue_id);
      paramIndex++;
    }

    queryText += ' ORDER BY esc.date DESC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get tours error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      code: error?.code
    });
    res.status(500).json({ 
      error: 'Failed to fetch tours',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// POST /api/tours - Create new tour date
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { band_id, venue_id, date, start_time, end_time, payment_amount, payment_currency, notes } = req.body;
    const user = (req as any).user;

    if (!band_id || !venue_id || !date || !start_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate and default payment currency
    const currency = payment_currency || 'USD';
    if (!isValidCurrency(currency)) {
      return res.status(400).json({ error: 'Invalid payment currency' });
    }

    // Convert payment to ETH if amount provided
    let paymentAmountEth = null;
    let exchangeRate = null;
    if (payment_amount && payment_amount > 0) {
      const conversion = await convertToEth(parseFloat(payment_amount), currency as 'USD' | 'USDC' | 'ETH');
      paymentAmountEth = conversion.ethAmount;
      exchangeRate = conversion.exchangeRate;
    }

    // Capture the booking agent who created this tour
    const bookingAgentId = user.userType === 'booking_agent' ? user.userId : null;

    const result = await query(`
      INSERT INTO tour_dates (band_id, venue_id, date, start_time, end_time, payment_amount, payment_currency, payment_amount_eth, exchange_rate, notes, status, booking_agent_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11)
      RETURNING *
    `, [band_id, venue_id, date, start_time, end_time, payment_amount, currency, paymentAmountEth, exchangeRate, notes, bookingAgentId]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create tour error:', error);
    res.status(500).json({ error: 'Failed to create tour' });
  }
});

// PUT /api/tours/:id - Update tour date
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, date, start_time, end_time, payment_amount, payment_currency, notes } = req.body;

    // Handle currency conversion if payment details are being updated
    let paymentAmountEth = null;
    let exchangeRate = null;
    let currency = payment_currency;

    if (payment_amount && payment_currency) {
      if (!isValidCurrency(payment_currency)) {
        return res.status(400).json({ error: 'Invalid payment currency' });
      }
      const conversion = await convertToEth(parseFloat(payment_amount), payment_currency as 'USD' | 'USDC' | 'ETH');
      paymentAmountEth = conversion.ethAmount;
      exchangeRate = conversion.exchangeRate;
    }

    await query(`
      UPDATE tour_dates 
      SET status = COALESCE($1, status),
          date = COALESCE($2, date),
          start_time = COALESCE($3, start_time),
          end_time = COALESCE($4, end_time),
          payment_amount = COALESCE($5, payment_amount),
          payment_currency = COALESCE($6, payment_currency),
          payment_amount_eth = COALESCE($7, payment_amount_eth),
          exchange_rate = COALESCE($8, exchange_rate),
          notes = COALESCE($9, notes)
      WHERE id = $10
    `, [status, date, start_time, end_time, payment_amount, currency, paymentAmountEth, exchangeRate, notes, id]);

    const updated = await query('SELECT * FROM tour_dates WHERE id = $1', [id]);

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    res.json(updated.rows[0]);
  } catch (error) {
    console.error('Update tour error:', error);
    res.status(500).json({ error: 'Failed to update tour' });
  }
});

// GET /api/tours/:id/kpis - Get KPIs for a tour
router.get('/:id/kpis', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    if (user.userType !== 'booking_agent' && user.userType !== 'bar' && user.userType !== 'band') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await query(`
      SELECT * FROM tour_kpis WHERE tour_date_id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'KPIs not found for this tour' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get KPI error:', error);
    res.status(500).json({ error: 'Failed to fetch KPI' });
  }
});

// POST /api/tours/:id/kpis - Add KPIs to tour
router.post('/:id/kpis', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { attendance, bar_sales, sales_currency, new_customers, notes } = req.body;

    if (user.userType !== 'booking_agent' && user.userType !== 'bar') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Validate and default sales currency
    const currency = sales_currency || 'USD';
    if (!isValidCurrency(currency)) {
      return res.status(400).json({ error: 'Invalid sales currency' });
    }

    // Convert bar sales to ETH if amount provided
    let barSalesEth = null;
    let exchangeRate = null;
    if (bar_sales && bar_sales > 0) {
      const conversion = await convertToEth(parseFloat(bar_sales), currency as 'USD' | 'USDC' | 'ETH');
      barSalesEth = conversion.ethAmount;
      exchangeRate = conversion.exchangeRate;
    }

    // Insert KPI data
    const kpiResult = await query(`
      INSERT INTO tour_kpis (tour_date_id, attendance, bar_sales, sales_currency, bar_sales_eth, exchange_rate, new_customers, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [id, attendance, bar_sales, currency, barSalesEth, exchangeRate, new_customers, notes]);

    // Update tour status to completed
    await query(
      'UPDATE tour_dates SET status = $1 WHERE id = $2',
      ['completed', id]
    );

    res.status(201).json(kpiResult.rows[0]);
  } catch (error) {
    console.error('Create KPI error:', error);
    res.status(500).json({ error: 'Failed to create KPI' });
  }
});

// PUT /api/tours/:id/kpis - Update KPIs for a tour
router.put('/:id/kpis', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { attendance, bar_sales, sales_currency, new_customers, notes } = req.body;

    if (user.userType !== 'booking_agent' && user.userType !== 'bar') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if KPIs exist
    const existingKpis = await query(
      'SELECT * FROM tour_kpis WHERE tour_date_id = $1',
      [id]
    );

    if (existingKpis.rows.length === 0) {
      return res.status(404).json({ error: 'KPIs not found for this tour. Use POST to create.' });
    }

    // Validate and default sales currency
    const currency = sales_currency || existingKpis.rows[0].sales_currency || 'USD';
    if (!isValidCurrency(currency)) {
      return res.status(400).json({ error: 'Invalid sales currency' });
    }

    // Convert bar sales to ETH if amount provided
    let barSalesEth = null;
    let exchangeRate = null;
    if (bar_sales && bar_sales > 0) {
      const conversion = await convertToEth(parseFloat(bar_sales), currency as 'USD' | 'USDC' | 'ETH');
      barSalesEth = conversion.ethAmount;
      exchangeRate = conversion.exchangeRate;
    }

    // Update KPI data
    const kpiResult = await query(`
      UPDATE tour_kpis 
      SET attendance = COALESCE($1, attendance),
          bar_sales = COALESCE($2, bar_sales),
          sales_currency = COALESCE($3, sales_currency),
          bar_sales_eth = COALESCE($4, bar_sales_eth),
          exchange_rate = COALESCE($5, exchange_rate),
          new_customers = COALESCE($6, new_customers),
          notes = COALESCE($7, notes),
          updated_at = NOW()
      WHERE tour_date_id = $8
      RETURNING *
    `, [attendance, bar_sales, currency, barSalesEth, exchangeRate, new_customers, notes, id]);

    res.json(kpiResult.rows[0]);
  } catch (error) {
    console.error('Update KPI error:', error);
    res.status(500).json({ error: 'Failed to update KPI' });
  }
});

export default router;
