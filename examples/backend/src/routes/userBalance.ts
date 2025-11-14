import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';

const router = Router();

// GET /api/user/balance - Get current user's balance and outstanding invoices
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    
    // Get user's outstanding balance from subscription_users table
    const balanceResult = await query(
      `SELECT 
        u.id as user_id,
        u.name,
        u.email,
        u.status,
        u.deleted_at,
        u.suspension_reason,
        COALESCE(SUM(CASE WHEN su.status = 'past_due' THEN su.amount_due ELSE 0 END), 0) as balance_due,
        COALESCE(SUM(CASE WHEN su.status = 'paid' THEN su.amount_due ELSE 0 END), 0) as total_paid,
        COUNT(CASE WHEN su.status = 'past_due' THEN 1 END) as past_due_count
      FROM users u
      LEFT JOIN subscription_users su ON u.id = su.user_id
      WHERE u.id = $1
      GROUP BY u.id, u.name, u.email, u.status, u.deleted_at, u.suspension_reason`,
      [user.userId]
    );

    if (balanceResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const balanceData = balanceResult.rows[0];

    // Get detailed list of past due invoices
    const invoicesResult = await query(
      `SELECT 
        su.id,
        su.subscription_id,
        sp.name as subscription_name,
        sp.price as amount,
        su.status,
        su.created_at,
        su.next_billing_date,
        EXTRACT(DAY FROM NOW() - su.next_billing_date) as days_overdue
      FROM subscription_users su
      JOIN subscription_plans sp ON su.subscription_id = sp.id
      WHERE su.user_id = $1 AND su.status = 'past_due'
      ORDER BY su.next_billing_date ASC`,
      [user.userId]
    );

    res.json({
      user_id: balanceData.user_id,
      name: balanceData.name,
      email: balanceData.email,
      suspended: balanceData.deleted_at !== null || balanceData.status === 'deleted',
      suspension_reason: balanceData.suspension_reason,
      balance_due: parseFloat(balanceData.balance_due),
      total_paid: parseFloat(balanceData.total_paid),
      past_due_count: parseInt(balanceData.past_due_count),
      invoices: invoicesResult.rows.map((inv: any) => ({
        id: inv.id,
        subscription_id: inv.subscription_id,
        subscription_name: inv.subscription_name,
        amount: parseFloat(inv.amount),
        status: inv.status,
        created_at: inv.created_at,
        next_billing_date: inv.next_billing_date,
        days_overdue: parseInt(inv.days_overdue) || 0
      }))
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// POST /api/user/payment - Process payment for outstanding balance
router.post('/payment', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { amount, payment_method, invoice_ids } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Mark specified invoices as paid
      if (invoice_ids && invoice_ids.length > 0) {
        await query(
          `UPDATE subscription_users 
           SET status = 'paid', updated_at = NOW() 
           WHERE id = ANY($1) AND user_id = $2 AND status = 'past_due'`,
          [invoice_ids, user.userId]
        );
      }

      // Check if all invoices are now paid
      const remainingResult = await query(
        `SELECT COUNT(*) as count 
         FROM subscription_users 
         WHERE user_id = $1 AND status = 'past_due'`,
        [user.userId]
      );

      const remainingPastDue = parseInt(remainingResult.rows[0].count);

      // If no past due invoices remain, unsuspend the account
      if (remainingPastDue === 0) {
        await query(
          `UPDATE users 
           SET deleted_at = NULL, 
               status = 'approved', 
               suspension_reason = NULL 
           WHERE id = $1 AND suspension_reason = 'payment_overdue'`,
          [user.userId]
        );
      }

      await query('COMMIT');

      res.json({
        success: true,
        amount_paid: amount,
        invoices_paid: invoice_ids?.length || 0,
        remaining_balance: remainingPastDue,
        account_restored: remainingPastDue === 0,
        message: remainingPastDue === 0 
          ? 'Payment successful! Your account has been restored.' 
          : `Payment successful! You still have ${remainingPastDue} past due invoice(s).`
      });
    } catch (err) {
      await query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

export default router;

