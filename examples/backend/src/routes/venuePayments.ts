import { Router } from 'express';
import Decimal from 'decimal.js';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';

const router = Router();

// Configure Decimal.js for financial calculations (2 decimal places)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// GET /api/venue-payments/outstanding - Get outstanding payments (booking agent view)
router.get('/outstanding', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    if (user.userType !== 'booking_agent') {
      return res.status(403).json({ error: 'Only booking agents can view receivables' });
    }

    const result = await query(`
      SELECT * FROM venue_payment_ledger_details
      WHERE booking_agent_id = $1
      AND payment_status != 'paid'
      ORDER BY due_date ASC, tour_date DESC
    `, [user.userId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get outstanding payments error:', error);
    res.status(500).json({ error: 'Failed to fetch outstanding payments' });
  }
});

// GET /api/venue-payments/my-dues - Get venue's own outstanding dues
router.get('/my-dues', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    // Get venue ID for this user
    const venueResult = await query(
      'SELECT id FROM venues WHERE user_id = $1',
      [user.userId]
    );

    if (venueResult.rows.length === 0) {
      return res.json([]);
    }

    const venueId = venueResult.rows[0].id;

    const result = await query(`
      SELECT * FROM venue_payment_ledger_details
      WHERE venue_id = $1
      ORDER BY due_date ASC, tour_date DESC
    `, [venueId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get venue dues error:', error);
    res.status(500).json({ error: 'Failed to fetch venue dues' });
  }
});

// GET /api/venue-payments/summary - Get payment summary (who owes what)
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    if (user.userType === 'booking_agent') {
      // Booking agent sees all venues' balances
      const result = await query(`
        SELECT * FROM venue_outstanding_balances
        WHERE outstanding_balance > 0
        ORDER BY outstanding_balance DESC
      `);

      res.json({
        role: 'booking_agent',
        venues: result.rows,
        totalOutstanding: result.rows.reduce((sum: number, v: any) => 
          sum + parseFloat(v.outstanding_balance || 0), 0
        )
      });
    } else {
      // Venue sees their own balance
      const venueResult = await query(
        'SELECT id FROM venues WHERE user_id = $1',
        [user.userId]
      );

      if (venueResult.rows.length === 0) {
        return res.json({ role: 'venue', balance: null });
      }

      const result = await query(`
        SELECT * FROM venue_outstanding_balances
        WHERE venue_id = $1
      `, [venueResult.rows[0].id]);

      res.json({
        role: 'venue',
        balance: result.rows[0] || null
      });
    }
  } catch (error) {
    console.error('Get payment summary error:', error);
    res.status(500).json({ error: 'Failed to fetch payment summary' });
  }
});

// GET /api/venue-payments/ledger/tour/:tourId - Get ledger entry for specific tour
router.get('/ledger/tour/:tourId', authenticateToken, async (req, res) => {
  try {
    const { tourId } = req.params;

    const result = await query(`
      SELECT * FROM venue_payment_ledger_details
      WHERE tour_date_id = $1
    `, [tourId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get tour ledger error:', error);
    res.status(500).json({ error: 'Failed to fetch tour ledger' });
  }
});

// POST /api/venue-payments/request-cod - Venue requests to pay via COD
router.post('/request-cod', authenticateToken, async (req, res) => {
  try {
    const { ledger_id, notes } = req.body;
    const user = (req as any).user;

    // Verify this ledger belongs to user's venue
    const venueResult = await query(
      'SELECT id FROM venues WHERE user_id = $1',
      [user.userId]
    );

    if (venueResult.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const venueId = venueResult.rows[0].id;

    // Update ledger
    const result = await query(`
      UPDATE venue_payment_ledger
      SET payment_status = 'pending',
          payment_method = 'cod',
          venue_notes = $1
      WHERE id = $2 AND venue_id = $3
      RETURNING *
    `, [notes || 'COD payment requested', ledger_id, venueId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ledger entry not found' });
    }

    // Update tour status
    await query(`
      UPDATE tour_dates
      SET venue_payment_status = 'cod_requested',
          venue_payment_method = 'cod'
      WHERE id = $1
    `, [result.rows[0].tour_date_id]);

    res.json({
      success: true,
      message: 'COD payment request submitted',
      ledger: result.rows[0]
    });
  } catch (error) {
    console.error('Request COD payment error:', error);
    res.status(500).json({ error: 'Failed to request COD payment' });
  }
});

// POST /api/venue-payments/record-payment - Booking agent records payment received
router.post('/record-payment', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    if (user.userType !== 'booking_agent') {
      return res.status(403).json({ error: 'Only booking agents can record payments' });
    }

    const {
      ledger_id,
      amount,
      payment_method,
      reference_number,
      notes,
      payment_date
    } = req.body;

    if (!ledger_id || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Ledger ID and valid amount required' });
    }

    // Get current ledger status
    const ledgerResult = await query(
      'SELECT * FROM venue_payment_ledger WHERE id = $1',
      [ledger_id]
    );

    if (ledgerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ledger entry not found' });
    }

    const ledger = ledgerResult.rows[0];

    // Use Decimal.js for precise financial calculations
    const currentAmountPaid = new Decimal(ledger.amount_paid || 0);
    const paymentAmount = new Decimal(amount);
    const newAmountPaid = currentAmountPaid.plus(paymentAmount);
    const amountDue = new Decimal(ledger.amount_due);

    // Determine new status
    let newStatus = 'partial';
    if (newAmountPaid.greaterThanOrEqualTo(amountDue)) {
      newStatus = 'paid';
    }

    // Record transaction
    await query(`
      INSERT INTO venue_payment_transactions (
        ledger_id, amount, payment_method, transaction_type,
        recorded_by, notes, reference_number
      ) VALUES ($1, $2, $3, 'payment', $4, $5, $6)
    `, [ledger_id, amount, payment_method || 'cod', user.userId, notes, reference_number]);

    // Update ledger
    const updatedLedger = await query(`
      UPDATE venue_payment_ledger
      SET amount_paid = $1,
          payment_status = $2,
          payment_date = $3,
          booking_agent_notes = $4
      WHERE id = $5
      RETURNING *
    `, [newAmountPaid.toNumber(), newStatus, payment_date || new Date().toISOString().split('T')[0], notes, ledger_id]);

    // Update tour status
    await query(`
      UPDATE tour_dates
      SET venue_payment_status = $1,
          venue_payment_date = $2,
          venue_payment_received_by = $3,
          venue_payment_received_at = NOW(),
          venue_payment_notes = $4
      WHERE id = $5
    `, [
      newStatus === 'paid' ? 'paid' : 'pending',
      payment_date || new Date().toISOString().split('T')[0],
      user.userId,
      notes,
      ledger.tour_date_id
    ]);

    res.json({
      success: true,
      message: newStatus === 'paid' ? 'Payment completed' : 'Partial payment recorded',
      ledger: updatedLedger.rows[0],
      new_status: newStatus,
      amount_paid: newAmountPaid.toNumber(),
      balance_due: amountDue.minus(newAmountPaid).toNumber()
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// GET /api/venue-payments/transactions/:ledgerId - Get payment transaction history
router.get('/transactions/:ledgerId', authenticateToken, async (req, res) => {
  try {
    const { ledgerId } = req.params;
    const user = (req as any).user;

    // Verify access
    const ledgerResult = await query(
      'SELECT * FROM venue_payment_ledger WHERE id = $1',
      [ledgerId]
    );

    if (ledgerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ledger not found' });
    }

    const ledger = ledgerResult.rows[0];

    // Check authorization
    const isBookingAgent = user.userType === 'booking_agent';
    const isVenue = await query(
      'SELECT id FROM venues WHERE id = $1 AND user_id = $2',
      [ledger.venue_id, user.userId]
    );

    if (!isBookingAgent && isVenue.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get transactions
    const result = await query(`
      SELECT 
        vpt.*,
        u.name as recorded_by_name
      FROM venue_payment_transactions vpt
      JOIN users u ON vpt.recorded_by = u.id
      WHERE vpt.ledger_id = $1
      ORDER BY vpt.transaction_date DESC
    `, [ledgerId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// PUT /api/venue-payments/mark-overdue - Mark overdue payments (cron job or manual)
router.put('/mark-overdue', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    if (user.userType !== 'booking_agent') {
      return res.status(403).json({ error: 'Only booking agents can mark overdue' });
    }

    // Mark ledgers as overdue if past due date and not paid
    const result = await query(`
      UPDATE venue_payment_ledger
      SET payment_status = 'overdue'
      WHERE payment_status IN ('pending', 'partial')
      AND due_date < CURRENT_DATE
      RETURNING id
    `);

    // Update tour statuses too
    for (const row of result.rows) {
      await query(`
        UPDATE tour_dates td
        SET venue_payment_status = 'overdue'
        FROM venue_payment_ledger vpl
        WHERE vpl.tour_date_id = td.id
        AND vpl.id = $1
      `, [row.id]);
    }

    res.json({
      success: true,
      message: `Marked ${result.rows.length} payments as overdue`,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Mark overdue error:', error);
    res.status(500).json({ error: 'Failed to mark overdue payments' });
  }
});

export default router;

