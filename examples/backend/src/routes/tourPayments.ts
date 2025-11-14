import { Router } from 'express';
import Decimal from 'decimal.js';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';

const router = Router();

// Configure Decimal.js for financial calculations (2 decimal places)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// GET /api/tour-payments/tour/:tourId - Get payment details for a specific tour
router.get('/tour/:tourId', authenticateToken, async (req, res) => {
  try {
    const { tourId } = req.params;
    const user = (req as any).user;

    // Get payment details using the view
    const paymentResult = await query(`
      SELECT * FROM tour_payment_details
      WHERE tour_date_id = $1
    `, [tourId]);

    if (paymentResult.rows.length === 0) {
      return res.json({ payment: null, canManage: user.userType === 'booking_agent' });
    }

    const payment = paymentResult.rows[0];

    // Check if user has access (booking agent, venue owner, or band member)
    const accessCheck = await query(`
      SELECT td.band_id, td.venue_id, b.user_id as band_owner_id, v.user_id as venue_owner_id
      FROM tour_dates td
      JOIN bands b ON td.band_id = b.id
      JOIN venues v ON td.venue_id = v.id
      WHERE td.id = $1
    `, [tourId]);

    if (accessCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    const tourInfo = accessCheck.rows[0];
    const isBookingAgent = user.userType === 'booking_agent';
    const isVenueOwner = tourInfo.venue_owner_id === user.userId;
    const isBandOwner = tourInfo.band_owner_id === user.userId;

    // Check if user is a band member
    const memberCheck = await query(`
      SELECT id FROM band_members
      WHERE band_id = $1 AND user_id = $2 AND status = 'active'
    `, [tourInfo.band_id, user.userId]);

    const isBandMember = memberCheck.rows.length > 0;

    if (!isBookingAgent && !isVenueOwner && !isBandOwner && !isBandMember) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({
      payment,
      canManage: isBookingAgent,
      canView: true
    });
  } catch (error) {
    console.error('Get tour payment error:', error);
    res.status(500).json({ error: 'Failed to fetch tour payment' });
  }
});

// GET /api/tour-payments/band/:bandId - Get all payments for a band
router.get('/band/:bandId', authenticateToken, async (req, res) => {
  try {
    const { bandId } = req.params;
    const user = (req as any).user;

    // Check if user has access
    const bandCheck = await query(`
      SELECT user_id FROM bands WHERE id = $1
    `, [bandId]);

    if (bandCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Band not found' });
    }

    const isBookingAgent = user.userType === 'booking_agent';
    const isBandOwner = bandCheck.rows[0].user_id === user.userId;

    const memberCheck = await query(`
      SELECT id FROM band_members
      WHERE band_id = $1 AND user_id = $2 AND status = 'active'
    `, [bandId, user.userId]);

    const isBandMember = memberCheck.rows.length > 0;

    if (!isBookingAgent && !isBandOwner && !isBandMember) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get all payments for this band
    const result = await query(`
      SELECT * FROM tour_payment_details
      WHERE band_id = $1
      ORDER BY tour_date DESC
    `, [bandId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get band payments error:', error);
    res.status(500).json({ error: 'Failed to fetch band payments' });
  }
});

// POST /api/tour-payments - Create or update payment allocation for a tour
router.post('/', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;

    if (user.userType !== 'booking_agent') {
      return res.status(403).json({ error: 'Only booking agents can manage payments' });
    }

    const {
      tour_date_id,
      venue_payment_amount,
      booking_agent_fee_percentage,
      other_fees_amount,
      other_fees_description,
      payment_date,
      notes,
      member_payouts
    } = req.body;

    if (!tour_date_id || !venue_payment_amount) {
      return res.status(400).json({ error: 'Tour date ID and venue payment amount are required' });
    }

    // Validate that member payouts add up correctly using Decimal.js for precision
    const totalMemberPayouts = member_payouts.reduce(
      (sum: Decimal, payout: any) => sum.plus(new Decimal(payout.payout_amount || 0)),
      new Decimal(0)
    );

    const venuePayment = new Decimal(venue_payment_amount);
    const agentFeePercentage = new Decimal(booking_agent_fee_percentage || 0);
    const otherFees = new Decimal(other_fees_amount || 0);

    // Calculate: venue_payment - (venue_payment * agent_fee% / 100) - other_fees
    const agentFee = venuePayment.times(agentFeePercentage).dividedBy(100);
    const expectedBandPayout = venuePayment.minus(agentFee).minus(otherFees);

    // Allow for tiny rounding differences (1 cent)
    const difference = totalMemberPayouts.minus(expectedBandPayout).abs();
    if (difference.greaterThan(0.01)) {
      return res.status(400).json({
        error: 'Payment allocation error',
        message: `Member payouts ($${totalMemberPayouts.toFixed(2)}) must equal total band payout ($${expectedBandPayout.toFixed(2)})`,
        totalMemberPayouts: totalMemberPayouts.toFixed(2),
        expectedBandPayout: expectedBandPayout.toFixed(2),
        difference: difference.toFixed(2)
      });
    }

    // Check if payment already exists
    const existingPayment = await query(`
      SELECT id FROM tour_payments WHERE tour_date_id = $1
    `, [tour_date_id]);

    let paymentId;

    if (existingPayment.rows.length > 0) {
      // Update existing payment
      paymentId = existingPayment.rows[0].id;

      await query(`
        UPDATE tour_payments
        SET venue_payment_amount = $1,
            booking_agent_fee_percentage = $2,
            other_fees_amount = $3,
            other_fees_description = $4,
            payment_date = $5,
            notes = $6
        WHERE id = $7
      `, [
        venue_payment_amount,
        booking_agent_fee_percentage || 0,
        other_fees_amount || 0,
        other_fees_description,
        payment_date,
        notes,
        paymentId
      ]);

      // Delete existing member payouts
      await query(`
        DELETE FROM tour_member_payouts WHERE tour_payment_id = $1
      `, [paymentId]);
    } else {
      // Create new payment
      const newPayment = await query(`
        INSERT INTO tour_payments (
          tour_date_id,
          venue_payment_amount,
          booking_agent_fee_percentage,
          other_fees_amount,
          other_fees_description,
          payment_date,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        tour_date_id,
        venue_payment_amount,
        booking_agent_fee_percentage || 0,
        other_fees_amount || 0,
        other_fees_description,
        payment_date,
        notes
      ]);

      paymentId = newPayment.rows[0].id;
    }

    // Insert member payouts
    for (const payout of member_payouts) {
      if (payout.payout_amount > 0) {
        await query(`
          INSERT INTO tour_member_payouts (
            tour_payment_id,
            user_id,
            band_member_name,
            payout_amount,
            notes
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          paymentId,
          payout.user_id,
          payout.band_member_name,
          payout.payout_amount,
          payout.notes
        ]);
      }
    }

    // Get the complete payment details
    const result = await query(`
      SELECT * FROM tour_payment_details WHERE id = $1
    `, [paymentId]);

    res.json({
      success: true,
      message: 'Payment allocation saved successfully',
      payment: result.rows[0]
    });
  } catch (error: any) {
    console.error('Create/update payment error:', error);
    res.status(500).json({
      error: 'Failed to save payment allocation',
      details: error.message
    });
  }
});

// PUT /api/tour-payments/:id/status - Update payment status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;
    const user = (req as any).user;

    if (user.userType !== 'booking_agent') {
      return res.status(403).json({ error: 'Only booking agents can update payment status' });
    }

    if (!['pending', 'approved', 'paid', 'completed'].includes(payment_status)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    await query(`
      UPDATE tour_payments
      SET payment_status = $1
      WHERE id = $2
    `, [payment_status, id]);

    // If marking as completed, mark all member payouts as paid
    if (payment_status === 'completed') {
      await query(`
        UPDATE tour_member_payouts
        SET payout_status = 'paid'
        WHERE tour_payment_id = $1 AND payout_status != 'paid'
      `, [id]);
    }

    const result = await query(`
      SELECT * FROM tour_payment_details WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      payment: result.rows[0]
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

// PUT /api/tour-payments/member-payout/:id - Update individual member payout status
router.put('/member-payout/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { payout_status, payment_method, transaction_hash } = req.body;
    const user = (req as any).user;

    if (user.userType !== 'booking_agent') {
      return res.status(403).json({ error: 'Only booking agents can update payout status' });
    }

    await query(`
      UPDATE tour_member_payouts
      SET payout_status = COALESCE($1, payout_status),
          payment_method = COALESCE($2, payment_method),
          transaction_hash = COALESCE($3, transaction_hash)
      WHERE id = $4
    `, [payout_status, payment_method, transaction_hash, id]);

    const result = await query(`
      SELECT * FROM tour_member_payouts WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      payout: result.rows[0]
    });
  } catch (error) {
    console.error('Update member payout error:', error);
    res.status(500).json({ error: 'Failed to update member payout' });
  }
});

// DELETE /api/tour-payments/:id - Delete payment allocation
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    if (user.userType !== 'booking_agent') {
      return res.status(403).json({ error: 'Only booking agents can delete payments' });
    }

    await query('DELETE FROM tour_payments WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Payment allocation deleted successfully'
    });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

export default router;

