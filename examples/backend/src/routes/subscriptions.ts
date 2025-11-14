import { Router } from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../utils/auth.js';
import crypto from 'crypto';

const router = Router();

// Get all subscription plans (public endpoint)
router.get('/plans', async (req, res) => {
  try {
    // Mock data for development - replace with actual database query when DB is set up
    const mockPlans = [
      {
        id: 'artist_free',
        name: 'Free Artist',
        user_type: 'user',
        price_monthly: 0,
        price_yearly: 0,
        features: '["Basic profile", "View venues", "Basic booking requests", "Community access"]',
        is_active: 1
      },
      {
        id: 'artist_premium',
        name: 'Premium Artist',
        user_type: 'user',
        price_monthly: 8.99,
        price_yearly: 97.09,
        features: '["Everything in Free", "Multi-band support", "Interactive jam sessions", "Priority booking", "Advanced analytics", "Direct messaging"]',
        is_active: 1
      },
      {
        id: 'artist_streaming',
        name: 'Artist Streaming Pro',
        user_type: 'user',
        price_monthly: 14.99,
        price_yearly: 161.89,
        features: '["Everything in Premium", "Live streaming", "Stream recording", "Analytics dashboard", "Priority support"]',
        is_active: 1
      },
      {
        id: 'venue_free',
        name: 'Free Venue',
        user_type: 'bar',
        price_monthly: 0,
        price_yearly: 0,
        features: '["Basic venue profile", "Booking management", "View band reviews", "Community access", "3% booking fee"]',
        is_active: 1
      },
      {
        id: 'venue_premium',
        name: 'Premium Venue',
        user_type: 'bar',
        price_monthly: 49.99,
        price_yearly: 539.89,
        features: '["Everything in Free", "Premium video content (5 assets)", "Premium band analytics", "No booking fees (0%)", "Advanced analytics", "Priority support"]',
        is_active: 1
      },
      {
        id: 'venue_streaming',
        name: 'Venue Streaming Pro',
        user_type: 'bar',
        price_monthly: 0,
        price_yearly: 0,
        features: '["Everything in Premium", "Live streaming", "Multi-camera support", "Stream recording", "Advanced analytics", "Priority support"]',
        is_active: 1
      },
      {
        id: 'studio_free',
        name: 'Studio Free',
        user_type: 'studio',
        price_monthly: 0,
        price_yearly: 0,
        features: '["Basic studio profile", "Session booking", "Basic time tracking", "Community access"]',
        is_active: 1
      },
      {
        id: 'studio_premium',
        name: 'Studio Premium',
        user_type: 'studio',
        price_monthly: 89.99,
        price_yearly: 971.89,
        features: '["Everything in Free", "Live streaming", "Multi-track recording", "Professional tools", "Advanced analytics", "Priority support"]',
        is_active: 0
      },
      {
        id: 'studio_pro',
        name: 'Studio Pro',
        user_type: 'studio',
        price_monthly: 0,
        price_yearly: 0,
        features: '["Everything in Studio Premium", "Unlimited streams", "VR/AR support", "Custom solutions", "Dedicated support", "Price determined by booking agent"]',
        is_active: 1
      }
    ];
    
    res.json({
      success: true,
      plans: mockPlans
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plans'
    });
  }
});

// Get current user subscription
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    const result = await pool.query(`
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.price_monthly,
        sp.price_yearly,
        sp.features
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = $1 AND us.status = 'active'
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        subscription: null
      });
    }

    const subscription = result.rows[0];
    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan_id: subscription.plan_id,
        plan_name: subscription.plan_name,
        billing_cycle: subscription.billing_cycle,
        status: subscription.status,
        price_monthly: subscription.price_monthly,
        price_yearly: subscription.price_yearly,
        features: subscription.features,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        payment_method: subscription.payment_method,
        created_at: subscription.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current subscription'
    });
  }
});

// Get all active subscriptions for user (multiple account types)
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    const result = await pool.query(`
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.user_type,
        sp.price_monthly,
        sp.price_yearly,
        sp.features
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = $1 AND us.status = 'active'
      ORDER BY us.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      subscriptions: result.rows.map(subscription => ({
        id: subscription.id,
        plan_id: subscription.plan_id,
        plan_name: subscription.plan_name,
        user_type: subscription.user_type,
        billing_cycle: subscription.billing_cycle,
        status: subscription.status,
        price_monthly: subscription.price_monthly,
        price_yearly: subscription.price_yearly,
        features: subscription.features,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        payment_method: subscription.payment_method,
        created_at: subscription.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching all subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscriptions'
    });
  }
});

// Subscribe to a plan
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { planId, paymentMethod, billingCycle, giftCardCode } = req.body;
    const userId = req.user?.id;

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required'
      });
    }

    // Handle gift card payment
    if (paymentMethod === 'gift_card') {
      if (!giftCardCode) {
        return res.status(400).json({
          success: false,
          error: 'Gift card code is required for gift card payment'
        });
      }

      // Get plan details to determine amount
      const planResult = await pool.query(
        'SELECT * FROM subscription_plans WHERE id = $1',
        [planId]
      );

      if (planResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Subscription plan not found'
        });
      }

      const plan = planResult.rows[0];
      const amount = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;

      // Use a transaction to prevent race conditions in gift card redemption
      const client = await pool.connect();
      let subscription;
      let giftCard: any;
      let newBalance: number;
      try {
        await client.query('BEGIN');

        // Lock the gift card row for update to prevent concurrent redemptions
        const giftCardResult = await client.query(
          'SELECT * FROM gift_cards WHERE code = $1 AND status = $2 AND recipient_id = $3 FOR UPDATE',
          [giftCardCode.toUpperCase(), 'active', userId]
        );

        if (giftCardResult.rows.length === 0) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(400).json({
            success: false,
            error: 'Invalid or unauthorized gift card'
          });
        }

        giftCard = giftCardResult.rows[0];

        if (giftCard.remaining_balance < amount) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(400).json({
            success: false,
            error: `Insufficient gift card balance. Available: $${giftCard.remaining_balance}, Required: $${amount}`
          });
        }

        // Calculate subscription period
        const now = new Date();
        const periodEnd = new Date(now);
        const selectedBillingCycle = billingCycle || 'monthly';
        if (selectedBillingCycle === 'yearly') {
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        // Create subscription in database
        const subscriptionId = crypto.randomUUID();
        await client.query(`
          INSERT INTO user_subscriptions (
            id, user_id, plan_id, billing_cycle, status,
            current_period_start, current_period_end, payment_method
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          subscriptionId,
          userId,
          planId,
          selectedBillingCycle,
          'active',
          now,
          periodEnd,
          'gift_card'
        ]);

        // Create payment record
        const paymentId = crypto.randomUUID();
        await client.query(`
          INSERT INTO subscription_payments (
            id, subscription_id, amount, payment_method, status, paid_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          paymentId,
          subscriptionId,
          amount,
          'gift_card',
          'succeeded',
          now
        ]);

        subscription = {
          id: subscriptionId,
          userId,
          planId,
          billingCycle: selectedBillingCycle,
          paymentMethod: 'gift_card',
          status: 'active',
          transactionId: giftCardCode,
          createdAt: now.toISOString(),
          currentPeriodEnd: periodEnd.toISOString(),
          amount
        };

        // Update gift card balance
        newBalance = giftCard.remaining_balance - amount;
        const status = newBalance <= 0 ? 'redeemed' : 'active';

        await client.query(`
          UPDATE gift_cards
          SET remaining_balance = $1, status = $2, redeemed_at = $3, redeemed_by = $4
          WHERE id = $5
        `, [
          newBalance,
          status,
          new Date(),
          userId,
          giftCard.id
        ]);

        // Create gift card transaction record
        await client.query(`
          INSERT INTO gift_card_transactions (
            gift_card_id, transaction_type, amount, currency, user_id,
            service_type, service_id, description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          giftCard.id,
          'redeem',
          amount,
          giftCard.currency,
          userId,
          'subscription',
          subscriptionId,
          `Subscription payment for ${plan.name}`
        ]);

        await client.query('COMMIT');
        client.release();
      } catch (error) {
        await client.query('ROLLBACK');
        client.release();
        throw error;
      }

      return res.json({
        success: true,
        subscription,
        giftCard: {
          code: giftCard.code,
          remainingBalance: newBalance
        },
        message: 'Subscription created successfully with gift card'
      });
    }

    // Mock payment processing based on payment method
    let paymentStatus = 'pending';
    let transactionId = null;

    switch (paymentMethod) {
      case 'free':
        // Free plan - no payment required
        paymentStatus = 'completed';
        transactionId = `free_${Date.now()}`;
        break;
      case 'eth_wallet':
        // Mock crypto wallet payment
        paymentStatus = 'completed';
        transactionId = `crypto_${Date.now()}`;
        break;
      case 'paypal':
        // Mock PayPal payment
        paymentStatus = 'completed';
        transactionId = `paypal_${Date.now()}`;
        break;
      case 'stripe':
        // Mock Stripe payment
        paymentStatus = 'completed';
        transactionId = `stripe_${Date.now()}`;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid payment method'
        });
    }

    // Get plan details to determine amount and validate billing cycle
    const planResult = await pool.query(
      'SELECT * FROM subscription_plans WHERE id = $1',
      [planId]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Subscription plan not found'
      });
    }

    const plan = planResult.rows[0];
    const selectedBillingCycle = billingCycle || 'monthly';
    const amount = selectedBillingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;

    // Check if user already has an active subscription for this specific plan
    const existingSubscription = await pool.query(
      'SELECT * FROM user_subscriptions WHERE user_id = $1 AND plan_id = $2 AND status = $3',
      [userId, planId, 'active']
    );

    if (existingSubscription.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active subscription for this plan'
      });
    }

    // Calculate subscription period
    const now = new Date();
    const periodEnd = new Date(now);
    if (selectedBillingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Create subscription in database
    const subscriptionId = crypto.randomUUID();
    await pool.query(`
      INSERT INTO user_subscriptions (
        id, user_id, plan_id, billing_cycle, status, 
        current_period_start, current_period_end, payment_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      subscriptionId,
      userId,
      planId,
      selectedBillingCycle,
      'active',
      now,
      periodEnd,
      paymentMethod
    ]);

    // Create payment record
    const paymentId = crypto.randomUUID();
    await pool.query(`
      INSERT INTO subscription_payments (
        id, subscription_id, amount, payment_method, status, paid_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      paymentId,
      subscriptionId,
      amount,
      paymentMethod,
      'succeeded',
      now
    ]);

    const subscription = {
      id: subscriptionId,
      userId,
      planId,
      billingCycle: selectedBillingCycle,
      paymentMethod,
      status: 'active',
      transactionId,
      createdAt: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      amount
    };

    res.json({
      success: true,
      subscription,
      message: 'Subscription created successfully'
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription'
    });
  }
});

// Cancel subscription
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    // Mock response for development
    res.json({
      success: true,
      message: 'Subscription cancelled successfully (mock)'
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
});

// Process recurring payments for monthly subscriptions
router.post('/process-recurring', async (req, res) => {
  try {
    // This endpoint should be called by a cron job or scheduled task
    // Find all active monthly subscriptions that need renewal
    const now = new Date();
    const result = await pool.query(`
      SELECT 
        us.*,
        sp.price_monthly,
        sp.name as plan_name
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.status = 'active' 
        AND us.billing_cycle = 'monthly'
        AND us.current_period_end <= $1
    `, [now]);

    const processedSubscriptions = [];

    for (const subscription of result.rows) {
      try {
        // Calculate new period
        const newPeriodStart = new Date(subscription.current_period_end);
        const newPeriodEnd = new Date(newPeriodStart);
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

        // Update subscription with new period
        await pool.query(`
          UPDATE user_subscriptions 
          SET 
            current_period_start = $1,
            current_period_end = $2,
            updated_at = $3
          WHERE id = $4
        `, [newPeriodStart, newPeriodEnd, now, subscription.id]);

        // Create payment record (in real implementation, this would process actual payment)
        const paymentId = crypto.randomUUID();
        await pool.query(`
          INSERT INTO subscription_payments (
            id, subscription_id, amount, payment_method, status, paid_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          paymentId,
          subscription.id,
          subscription.price_monthly,
          subscription.payment_method,
          'succeeded',
          now
        ]);

        processedSubscriptions.push({
          subscriptionId: subscription.id,
          userId: subscription.user_id,
          planName: subscription.plan_name,
          amount: subscription.price_monthly,
          newPeriodEnd: newPeriodEnd.toISOString()
        });

      } catch (error) {
        console.error(`Error processing recurring payment for subscription ${subscription.id}:`, error);
        
        // Mark subscription as past_due if payment fails
        await pool.query(`
          UPDATE user_subscriptions 
          SET status = 'past_due', updated_at = $1
          WHERE id = $2
        `, [now, subscription.id]);
      }
    }

    res.json({
      success: true,
      processedCount: processedSubscriptions.length,
      processedSubscriptions,
      message: `Processed ${processedSubscriptions.length} recurring payments`
    });

  } catch (error) {
    console.error('Error processing recurring payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process recurring payments'
    });
  }
});

export default router;
