import { Router } from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../utils/auth.js';
import stripeService from '../services/stripe.service.js';
import paypalService from '../services/paypal.service.js';
import braintreeService from '../services/braintree.service.js';
import cryptoService from '../services/crypto.service.js';

const router = Router();

/**
 * Create Stripe payment intent for gift card purchase
 */
router.post('/stripe/create-intent', authenticateToken, async (req, res) => {
  try {
    const { amount, currency = 'USD', resourceType = 'gift_card', resourceId, metadata } = req.body;
    const userId = req.user?.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    // Create Stripe payment intent
    const paymentIntent = await stripeService.createPaymentIntent({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      description: `${resourceType} purchase`,
      metadata: {
        userId,
        resourceType,
        resourceId: resourceId || 'pending',
        ...metadata
      }
    });

    // Store in database
    await pool.query(`
      INSERT INTO payment_intents (
        stripe_payment_intent_id, amount, currency, status, 
        resource_type, resource_id, user_id, client_secret, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      paymentIntent.id,
      amount,
      currency,
      paymentIntent.status,
      resourceType,
      resourceId,
      userId,
      paymentIntent.client_secret,
      JSON.stringify(metadata || {})
    ]);

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error: any) {
    console.error('Error creating Stripe payment intent:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create payment intent'
    });
  }
});

/**
 * Verify Stripe payment
 */
router.post('/stripe/verify', authenticateToken, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'Payment intent ID is required'
      });
    }

    // Verify with Stripe
    const isVerified = await stripeService.verifyPaymentIntent(paymentIntentId);

    if (!isVerified) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed'
      });
    }

    // Update database
    await pool.query(`
      UPDATE payment_intents 
      SET status = 'succeeded', updated_at = NOW()
      WHERE stripe_payment_intent_id = $1
    `, [paymentIntentId]);

    res.json({
      success: true,
      verified: true
    });

  } catch (error: any) {
    console.error('Error verifying Stripe payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify payment'
    });
  }
});

/**
 * Create PayPal order
 */
router.post('/paypal/create-order', authenticateToken, async (req, res) => {
  try {
    const { amount, currency = 'USD', resourceType = 'gift_card', resourceId, metadata } = req.body;
    const userId = req.user?.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    // Create PayPal order
    const order = await paypalService.createOrder({
      amount,
      currency,
      description: `${resourceType} purchase`,
      returnUrl: `${process.env.FRONTEND_URL}/payment/paypal/success`,
      cancelUrl: `${process.env.FRONTEND_URL}/payment/paypal/cancel`
    });

    // Store in database
    await pool.query(`
      INSERT INTO paypal_orders (
        paypal_order_id, amount, currency, status, 
        resource_type, resource_id, user_id, approval_url, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      order.orderId,
      amount,
      currency,
      'CREATED',
      resourceType,
      resourceId,
      userId,
      order.approvalUrl,
      JSON.stringify(metadata || {})
    ]);

    res.json({
      success: true,
      orderId: order.orderId,
      approvalUrl: order.approvalUrl
    });

  } catch (error: any) {
    console.error('Error creating PayPal order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create PayPal order'
    });
  }
});

/**
 * Capture PayPal order (complete payment)
 */
router.post('/paypal/capture', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    // Capture PayPal order
    const order = await paypalService.captureOrder(orderId);

    // Update database
    await pool.query(`
      UPDATE paypal_orders 
      SET status = $1, updated_at = NOW()
      WHERE paypal_order_id = $2
    `, [order.status, orderId]);

    res.json({
      success: true,
      order
    });

  } catch (error: any) {
    console.error('Error capturing PayPal order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to capture PayPal order'
    });
  }
});

/**
 * Generate Braintree client token (for Venmo/credit card)
 */
router.get('/braintree/client-token', authenticateToken, async (req, res) => {
  try {
    const clientToken = await braintreeService.generateClientToken();

    res.json({
      success: true,
      clientToken
    });

  } catch (error: any) {
    console.error('Error generating Braintree token:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate client token'
    });
  }
});

/**
 * Process Braintree/Venmo payment
 */
router.post('/braintree/process', authenticateToken, async (req, res) => {
  try {
    const { amount, paymentMethodNonce, deviceData, resourceType = 'gift_card', resourceId, metadata } = req.body;
    const userId = req.user?.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    if (!paymentMethodNonce) {
      return res.status(400).json({
        success: false,
        error: 'Payment method nonce is required'
      });
    }

    // Process transaction
    const transaction = await braintreeService.createTransaction({
      amount,
      paymentMethodNonce,
      deviceData,
      description: `${resourceType} purchase`
    });

    // Store in database
    await pool.query(`
      INSERT INTO braintree_transactions (
        braintree_transaction_id, amount, currency, payment_method, status, 
        resource_type, resource_id, user_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      transaction.id,
      transaction.amount,
      'USD',
      transaction.paymentMethod,
      transaction.status,
      resourceType,
      resourceId,
      userId,
      JSON.stringify(metadata || {})
    ]);

    res.json({
      success: true,
      transaction
    });

  } catch (error: any) {
    console.error('Error processing Braintree payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process payment'
    });
  }
});

/**
 * Get ETH payment address and amount
 */
router.post('/crypto/get-payment-info', authenticateToken, async (req, res) => {
  try {
    const { amount, currency = 'USD' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    if (!process.env.PLATFORM_WALLET_ADDRESS) {
      return res.status(500).json({
        success: false,
        error: 'Platform wallet not configured'
      });
    }

    // Calculate ETH amount
    const ethAmount = await cryptoService.calculateETHAmount(amount);
    const ethRate = await cryptoService.getETHtoUSDRate();

    res.json({
      success: true,
      paymentAddress: process.env.PLATFORM_WALLET_ADDRESS,
      amountETH: ethAmount,
      amountUSD: amount,
      ethUSDRate: ethRate
    });

  } catch (error: any) {
    console.error('Error getting crypto payment info:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get payment information'
    });
  }
});

/**
 * Verify crypto payment
 */
router.post('/crypto/verify', authenticateToken, async (req, res) => {
  try {
    const { transactionHash, expectedAmount, resourceType = 'gift_card', resourceId, metadata } = req.body;
    const userId = req.user?.id;
    const userWallet = req.user?.wallet_address;

    if (!transactionHash) {
      return res.status(400).json({
        success: false,
        error: 'Transaction hash is required'
      });
    }

    // Verify payment
    const payment = await cryptoService.verifyPayment({
      transactionHash,
      expectedAmount,
      fromAddress: userWallet
    });

    if (payment.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        error: 'Payment not yet confirmed. Please wait for blockchain confirmation.'
      });
    }

    // Store in database
    await pool.query(`
      INSERT INTO crypto_transactions (
        transaction_hash, from_address, to_address, amount_eth, amount_usd, 
        eth_usd_rate, block_number, confirmations, status, 
        resource_type, resource_id, user_id, verified_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (transaction_hash) DO UPDATE SET
        confirmations = $8,
        status = $9,
        verified_at = $13
    `, [
      payment.transactionHash,
      payment.from,
      payment.to,
      payment.amount,
      payment.amountUSD,
      await cryptoService.getETHtoUSDRate(),
      payment.blockNumber,
      payment.confirmations,
      payment.status,
      resourceType,
      resourceId,
      userId,
      new Date(),
      JSON.stringify(metadata || {})
    ]);

    res.json({
      success: true,
      payment
    });

  } catch (error: any) {
    console.error('Error verifying crypto payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify crypto payment'
    });
  }
});

export default router;

