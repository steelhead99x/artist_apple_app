import { Router } from 'express';
import crypto from 'crypto';
import { pool } from '../db.js';
import { authenticateToken } from '../utils/auth.js';
import { validateRequired, validateEmail, validateFloat } from '../utils/validation.js';

const router = Router();

// Generate a unique gift card code using cryptographically secure random
function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'GC-';

  // Add 6 random characters using cryptographically secure random
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(crypto.randomInt(0, chars.length));
  }

  result += '-';

  // Add 6 more random characters using cryptographically secure random
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(crypto.randomInt(0, chars.length));
  }

  return result;
}

// Purchase a gift card (studios and booking agents only)
router.post('/purchase', authenticateToken, async (req, res) => {
  try {
    const { amount, currency = 'USD', message, recipientEmail, recipientType, paymentMethod, expiresInDays = 365 } = req.body;
    const purchaserId = req.user?.id;
    const purchaserType = req.user?.user_type;
    let giftCardCode = req.body.giftCardCode; // Get gift card code if provided
    
    // Default is 1 year, but can be set to expire earlier (max 365 days)
    const expirationDays = expiresInDays > 0 && expiresInDays <= 365 ? expiresInDays : 365;

    // Validate purchaser type - only booking agents can purchase gift cards
    if (!purchaserType || purchaserType !== 'booking_agent') {
      return res.status(403).json({
        success: false,
        error: 'Only booking agents can purchase gift cards'
      });
    }

    // Validate required fields
    const amountValidation = validateRequired(amount, 'Amount');
    if (!amountValidation.valid) {
      return res.status(400).json({
        success: false,
        error: amountValidation.error
      });
    }

    const amountFloatValidation = validateFloat(amount, 'Amount', 1);
    if (!amountFloatValidation.valid) {
      return res.status(400).json({
        success: false,
        error: amountFloatValidation.error
      });
    }

    if (recipientEmail && !validateEmail(recipientEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipient email'
      });
    }

    if (recipientType && !['user', 'bar', 'studio'].includes(recipientType)) {
      return res.status(400).json({
        success: false,
        error: 'Recipient type must be "user", "bar", or "studio"'
      });
    }

    // Check monthly promotion limit for non-admin booking agents
    const limitCheck = await pool.query(`
      SELECT * FROM check_booking_agent_monthly_limit($1, $2)
    `, [purchaserId, amount]);

    const limitResult = limitCheck.rows[0];
    
    if (!limitResult.within_limit) {
      return res.status(400).json({
        success: false,
        error: `Monthly promotion limit exceeded. You have $${limitResult.remaining_amount.toFixed(2)} remaining this month (limit: $${limitResult.limit_amount.toFixed(2)}, current: $${limitResult.current_month_total.toFixed(2)})`,
        limitInfo: {
          currentMonthTotal: limitResult.current_month_total,
          limitAmount: limitResult.limit_amount,
          remainingAmount: limitResult.remaining_amount,
          isAdmin: limitResult.is_admin
        }
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

      // Use a transaction to prevent race conditions
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Lock the gift card row for update to prevent concurrent redemptions
        const giftCardResult = await client.query(
          'SELECT * FROM gift_cards WHERE code = $1 AND status = $2 AND recipient_id = $3 FOR UPDATE',
          [giftCardCode.toUpperCase(), 'active', purchaserId]
        );

        if (giftCardResult.rows.length === 0) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(400).json({
            success: false,
            error: 'Invalid or unauthorized gift card'
          });
        }

        const giftCard = giftCardResult.rows[0];

        if (giftCard.remaining_balance < amount) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(400).json({
            success: false,
            error: `Insufficient gift card balance. Available: $${giftCard.remaining_balance}, Required: $${amount}`
          });
        }

        // Update gift card balance
        const newBalance = giftCard.remaining_balance - amount;
        const status = newBalance <= 0 ? 'redeemed' : 'active';

        await client.query(`
          UPDATE gift_cards
          SET remaining_balance = $1, status = $2, redeemed_at = $3, redeemed_by = $4
          WHERE id = $5
        `, [
          newBalance,
          status,
          new Date(),
          purchaserId,
          giftCard.id
        ]);

        // Create redemption transaction record
        await client.query(`
          INSERT INTO gift_card_transactions (
            gift_card_id, transaction_type, amount, currency, user_id, description
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          giftCard.id,
          'redeem',
          amount,
          currency,
          purchaserId,
          `Gift card redemption for gift card purchase`
        ]);

        // Update user's gift card balance
        await client.query(`
          UPDATE gift_card_balances
          SET total_balance = total_balance - $1, last_updated = NOW()
          WHERE user_id = $2 AND currency = $3
        `, [amount, purchaserId, currency]);

        await client.query('COMMIT');
        client.release();
      } catch (error) {
        await client.query('ROLLBACK');
        client.release();
        throw error;
      }
    } else {
      // Process other payment methods (stripe, paypal, crypto)
      let paymentStatus = 'pending';
      let transactionId = null;

      switch (paymentMethod) {
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
        case 'cod':
          // Cash on Delivery - booking agent will pay in cash
          // Transaction completes with promise to pay
          paymentStatus = 'completed';
          transactionId = `cod_${Date.now()}`;
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid payment method'
          });
      }
    }

    // Generate unique gift card code
    let generatedGiftCardCode;
    let codeExists = true;
    let attempts = 0;
    
    while (codeExists && attempts < 10) {
      generatedGiftCardCode = generateGiftCardCode();
      const codeCheck = await pool.query(
        'SELECT id FROM gift_cards WHERE code = $1',
        [generatedGiftCardCode]
      );
      codeExists = codeCheck.rows.length > 0;
      attempts++;
    }

    if (codeExists) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate unique gift card code'
      });
    }

    // Calculate expiration date (default 1 year, but can be set to expire earlier)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Create gift card
    const giftCardResult = await pool.query(`
      INSERT INTO gift_cards (
        code, amount, currency, purchaser_id, purchaser_type, 
        purchase_payment_method, remaining_balance, expires_at, message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      generatedGiftCardCode,
      amount,
      currency,
      purchaserId,
      purchaserType,
      paymentMethod || 'eth_wallet', // Use actual payment method
      amount,
      expiresAt,
      message || null
    ]);

    const giftCard = giftCardResult.rows[0];

    // Create purchase transaction record
    await pool.query(`
      INSERT INTO gift_card_transactions (
        gift_card_id, transaction_type, amount, currency, user_id, description
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      giftCard.id,
      'purchase',
      amount,
      currency,
      purchaserId,
      `Gift card purchased by ${purchaserType}`
    ]);

    res.json({
      success: true,
      giftCard: {
        id: giftCard.id,
        code: giftCard.code,
        amount: giftCard.amount,
        currency: giftCard.currency,
        expiresAt: giftCard.expires_at,
        message: giftCard.message,
        status: giftCard.status
      },
      message: 'Gift card purchased successfully'
    });

  } catch (error) {
    console.error('Error purchasing gift card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to purchase gift card'
    });
  }
});

// Award a gift card to a user/venue
router.post('/award', authenticateToken, async (req, res) => {
  try {
    const { giftCardId, recipientEmail, recipientType, message } = req.body;
    const awardedBy = req.user?.id;

    // Validate required fields
    if (!validateRequired(giftCardId, 'Gift card ID').valid) {
      return res.status(400).json({
        success: false,
        error: 'Gift card ID is required'
      });
    }

    if (!validateRequired(recipientEmail, 'Recipient email').valid || !validateEmail(recipientEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Valid recipient email is required'
      });
    }

    if (!['user', 'bar', 'studio'].includes(recipientType)) {
      return res.status(400).json({
        success: false,
        error: 'Recipient type must be "user", "bar", or "studio"'
      });
    }

    // Find recipient user
    const recipientResult = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND user_type = $2',
      [recipientEmail, recipientType]
    );

    if (recipientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found or user type mismatch'
      });
    }

    const recipientId = recipientResult.rows[0].id;

    // Check if gift card exists and is available
    const giftCardResult = await pool.query(
      'SELECT * FROM gift_cards WHERE id = $1 AND status = $2',
      [giftCardId, 'active']
    );

    if (giftCardResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Gift card not found or not available'
      });
    }

    const giftCard = giftCardResult.rows[0];

    // Check if gift card is already awarded
    if (giftCard.recipient_id) {
      return res.status(400).json({
        success: false,
        error: 'Gift card has already been awarded'
      });
    }

    // Award the gift card
    const updateResult = await pool.query(`
      UPDATE gift_cards 
      SET recipient_id = $1, recipient_type = $2, awarded_at = $3, awarded_by = $4, message = $5
      WHERE id = $6
      RETURNING *
    `, [
      recipientId,
      recipientType,
      new Date(),
      awardedBy,
      message || giftCard.message,
      giftCardId
    ]);

    const updatedGiftCard = updateResult.rows[0];

    // Create award transaction record
    await pool.query(`
      INSERT INTO gift_card_transactions (
        gift_card_id, transaction_type, amount, currency, user_id, description
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      giftCardId,
      'award',
      giftCard.amount,
      giftCard.currency,
      recipientId,
      `Gift card awarded to ${recipientType}`
    ]);

    // Update recipient's gift card balance
    await pool.query(`
      INSERT INTO gift_card_balances (user_id, total_balance, currency)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, currency)
      DO UPDATE SET 
        total_balance = gift_card_balances.total_balance + $2,
        last_updated = NOW()
    `, [recipientId, giftCard.amount, giftCard.currency]);

    res.json({
      success: true,
      giftCard: {
        id: updatedGiftCard.id,
        code: updatedGiftCard.code,
        amount: updatedGiftCard.amount,
        currency: updatedGiftCard.currency,
        recipientEmail,
        recipientType,
        message: updatedGiftCard.message,
        awardedAt: updatedGiftCard.awarded_at
      },
      message: 'Gift card awarded successfully'
    });

  } catch (error) {
    console.error('Error awarding gift card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to award gift card'
    });
  }
});

// Redeem a gift card
router.post('/redeem', authenticateToken, async (req, res) => {
  try {
    const { giftCardCode, amount, serviceType, serviceId, description } = req.body;
    const redeemedBy = req.user?.id;

    // Validate required fields
    if (!validateRequired(giftCardCode, 'Gift card code').valid) {
      return res.status(400).json({
        success: false,
        error: 'Gift card code is required'
      });
    }

    const amountValidation = validateRequired(amount, 'Amount');
    if (!amountValidation.valid) {
      return res.status(400).json({
        success: false,
        error: amountValidation.error
      });
    }

    const amountFloatValidation = validateFloat(amount, 'Amount', 0.01);
    if (!amountFloatValidation.valid) {
      return res.status(400).json({
        success: false,
        error: amountFloatValidation.error
      });
    }

    // Find gift card
    const giftCardResult = await pool.query(
      'SELECT * FROM gift_cards WHERE code = $1 AND status = $2',
      [giftCardCode.toUpperCase(), 'active']
    );

    if (giftCardResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Gift card not found or not active'
      });
    }

    const giftCard = giftCardResult.rows[0];

    // Check if gift card is awarded to this user
    if (giftCard.recipient_id !== redeemedBy) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to redeem this gift card'
      });
    }

    // Check if gift card has sufficient balance
    if (giftCard.remaining_balance < amount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. Available: $${giftCard.remaining_balance}`
      });
    }

    // Check if gift card is expired
    if (new Date(giftCard.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Gift card has expired'
      });
    }

    // Update gift card balance
    const newBalance = giftCard.remaining_balance - amount;
    const status = newBalance <= 0 ? 'redeemed' : 'active';

    await pool.query(`
      UPDATE gift_cards 
      SET remaining_balance = $1, status = $2, redeemed_at = $3, redeemed_by = $4
      WHERE id = $5
    `, [
      newBalance,
      status,
      new Date(),
      redeemedBy,
      giftCard.id
    ]);

    // Create redemption transaction record
    await pool.query(`
      INSERT INTO gift_card_transactions (
        gift_card_id, transaction_type, amount, currency, user_id, 
        service_type, service_id, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      giftCard.id,
      'redeem',
      amount,
      giftCard.currency,
      redeemedBy,
      serviceType || 'other',
      serviceId || null,
      description || `Gift card redemption for ${serviceType || 'service'}`
    ]);

    // Update user's gift card balance
    await pool.query(`
      UPDATE gift_card_balances 
      SET total_balance = total_balance - $1, last_updated = NOW()
      WHERE user_id = $2 AND currency = $3
    `, [amount, redeemedBy, giftCard.currency]);

    res.json({
      success: true,
      redemption: {
        giftCardCode: giftCard.code,
        amount,
        remainingBalance: newBalance,
        serviceType,
        serviceId
      },
      message: 'Gift card redeemed successfully'
    });

  } catch (error) {
    console.error('Error redeeming gift card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to redeem gift card'
    });
  }
});

// Get user's gift card balance
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    const balanceResult = await pool.query(
      'SELECT * FROM gift_card_balances WHERE user_id = $1',
      [userId]
    );

    const balance = balanceResult.rows[0] || {
      total_balance: 0,
      currency: 'USD'
    };

    res.json({
      success: true,
      balance: {
        totalBalance: balance.total_balance,
        currency: balance.currency,
        lastUpdated: balance.last_updated
      }
    });

  } catch (error) {
    console.error('Error fetching gift card balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gift card balance'
    });
  }
});

// Get user's gift cards (purchased and received)
router.get('/my-cards', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;

    // Get purchased gift cards
    const purchasedResult = await pool.query(`
      SELECT gc.*, u.name as recipient_name, u.email as recipient_email
      FROM gift_cards gc
      LEFT JOIN users u ON gc.recipient_id = u.id
      WHERE gc.purchaser_id = $1
      ORDER BY gc.created_at DESC
    `, [userId]);

    // Get received gift cards
    const receivedResult = await pool.query(`
      SELECT gc.*, u.name as purchaser_name
      FROM gift_cards gc
      LEFT JOIN users u ON gc.purchaser_id = u.id
      WHERE gc.recipient_id = $1
      ORDER BY gc.awarded_at DESC
    `, [userId]);

    res.json({
      success: true,
      giftCards: {
        purchased: purchasedResult.rows,
        received: receivedResult.rows
      }
    });

  } catch (error) {
    console.error('Error fetching gift cards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gift cards'
    });
  }
});

// Get gift card details by code
router.get('/details/:code', authenticateToken, async (req, res) => {
  try {
    const { code } = req.params;
    const userId = req.user?.id;

    const giftCardResult = await pool.query(`
      SELECT gc.*, 
             purchaser.name as purchaser_name,
             recipient.name as recipient_name,
             recipient.email as recipient_email
      FROM gift_cards gc
      LEFT JOIN users purchaser ON gc.purchaser_id = purchaser.id
      LEFT JOIN users recipient ON gc.recipient_id = recipient.id
      WHERE gc.code = $1 AND (gc.purchaser_id = $2 OR gc.recipient_id = $2)
    `, [code.toUpperCase(), userId]);

    if (giftCardResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Gift card not found or access denied'
      });
    }

    const giftCard = giftCardResult.rows[0];

    res.json({
      success: true,
      giftCard: {
        id: giftCard.id,
        code: giftCard.code,
        amount: giftCard.amount,
        currency: giftCard.currency,
        remainingBalance: giftCard.remaining_balance,
        status: giftCard.status,
        expiresAt: giftCard.expires_at,
        message: giftCard.message,
        purchaserName: giftCard.purchaser_name,
        recipientName: giftCard.recipient_name,
        recipientEmail: giftCard.recipient_email,
        awardedAt: giftCard.awarded_at,
        redeemedAt: giftCard.redeemed_at
      }
    });

  } catch (error) {
    console.error('Error fetching gift card details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gift card details'
    });
  }
});

// Get gift card transaction history
router.get('/transactions/:giftCardId', authenticateToken, async (req, res) => {
  try {
    const { giftCardId } = req.params;
    const userId = req.user?.id;

    // Verify user has access to this gift card
    const accessCheck = await pool.query(
      'SELECT id FROM gift_cards WHERE id = $1 AND (purchaser_id = $2 OR recipient_id = $2)',
      [giftCardId, userId]
    );

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this gift card'
      });
    }

    const transactionsResult = await pool.query(`
      SELECT * FROM gift_card_transactions 
      WHERE gift_card_id = $1 
      ORDER BY created_at DESC
    `, [giftCardId]);

    res.json({
      success: true,
      transactions: transactionsResult.rows
    });

  } catch (error) {
    console.error('Error fetching gift card transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gift card transactions'
    });
  }
});

// Get comprehensive gift card history/ledger for a user
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userType = req.user?.user_type;

    // Get all gift card transactions for this user
    const historyResult = await pool.query(`
      SELECT 
        gct.*,
        gc.code as gift_card_code,
        gc.amount as original_amount,
        gc.currency,
        gc.status as gift_card_status,
        gc.expires_at,
        gc.message as gift_card_message,
        
        -- User information
        purchaser.name as purchaser_name,
        purchaser.email as purchaser_email,
        purchaser.user_type as purchaser_type,
        recipient.name as recipient_name,
        recipient.email as recipient_email,
        recipient.user_type as recipient_type,
        
        -- Transaction user (who performed the action)
        transaction_user.name as transaction_user_name,
        transaction_user.email as transaction_user_email,
        transaction_user.user_type as transaction_user_type
        
      FROM gift_card_transactions gct
      JOIN gift_cards gc ON gct.gift_card_id = gc.id
      LEFT JOIN users purchaser ON gc.purchaser_id = purchaser.id
      LEFT JOIN users recipient ON gc.recipient_id = recipient.id
      LEFT JOIN users transaction_user ON gct.user_id = transaction_user.id
      
      WHERE 
        -- User is involved in this gift card (as purchaser, recipient, or transaction user)
        (gc.purchaser_id = $1 OR gc.recipient_id = $1 OR gct.user_id = $1)
        
      ORDER BY gct.created_at DESC
    `, [userId]);

    // Group transactions by gift card for better organization
    const giftCardGroups = new Map();
    
    historyResult.rows.forEach(transaction => {
      const giftCardId = transaction.gift_card_id;
      if (!giftCardGroups.has(giftCardId)) {
        giftCardGroups.set(giftCardId, {
          giftCardId,
          giftCardCode: transaction.gift_card_code,
          originalAmount: transaction.original_amount,
          currency: transaction.currency,
          status: transaction.gift_card_status,
          expiresAt: transaction.expires_at,
          message: transaction.gift_card_message,
          purchaser: {
            name: transaction.purchaser_name,
            email: transaction.purchaser_email,
            type: transaction.purchaser_type
          },
          recipient: {
            name: transaction.recipient_name,
            email: transaction.recipient_email,
            type: transaction.recipient_type
          },
          transactions: []
        });
      }
      
      giftCardGroups.get(giftCardId).transactions.push({
        id: transaction.id,
        type: transaction.transaction_type,
        amount: transaction.amount,
        description: transaction.description,
        serviceType: transaction.service_type,
        serviceId: transaction.service_id,
        createdAt: transaction.created_at,
        transactionUser: {
          name: transaction.transaction_user_name,
          email: transaction.transaction_user_email,
          type: transaction.transaction_user_type
        }
      });
    });

    // Calculate summary statistics
    const summary = {
      totalPurchased: 0,
      totalReceived: 0,
      totalRedeemed: 0,
      totalAwarded: 0,
      currentBalance: 0,
      giftCardsCount: giftCardGroups.size
    };

    historyResult.rows.forEach(transaction => {
      if (transaction.transaction_type === 'purchase' && transaction.purchaser_id === userId) {
        summary.totalPurchased += parseFloat(transaction.amount);
      } else if (transaction.transaction_type === 'award' && transaction.recipient_id === userId) {
        summary.totalReceived += parseFloat(transaction.amount);
      } else if (transaction.transaction_type === 'redeem' && transaction.user_id === userId) {
        summary.totalRedeemed += parseFloat(transaction.amount);
      } else if (transaction.transaction_type === 'award' && transaction.user_id === userId) {
        summary.totalAwarded += parseFloat(transaction.amount);
      }
    });

    // Get current balance
    const balanceResult = await pool.query(
      'SELECT total_balance FROM gift_card_balances WHERE user_id = $1',
      [userId]
    );
    summary.currentBalance = balanceResult.rows[0]?.total_balance || 0;

    res.json({
      success: true,
      history: Array.from(giftCardGroups.values()),
      summary,
      userType
    });

  } catch (error) {
    console.error('Error fetching gift card history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gift card history'
    });
  }
});

// Get detailed gift card ledger for booking agents (see all their distributed cards)
router.get('/ledger', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userType = req.user?.user_type;

    // Only booking agents can access the full ledger
    if (userType !== 'booking_agent') {
      return res.status(403).json({
        success: false,
        error: 'Only booking agents can access the full ledger'
      });
    }

    // Get all gift cards purchased by this booking agent and their usage
    const ledgerResult = await pool.query(`
      SELECT 
        gc.*,
        purchaser.name as purchaser_name,
        purchaser.email as purchaser_email,
        recipient.name as recipient_name,
        recipient.email as recipient_email,
        recipient.user_type as recipient_type,
        
        -- Get all transactions for this gift card
        COALESCE(
          json_agg(
            json_build_object(
              'id', gct.id,
              'type', gct.transaction_type,
              'amount', gct.amount,
              'currency', gct.currency,
              'description', gct.description,
              'serviceType', gct.service_type,
              'serviceId', gct.service_id,
              'createdAt', gct.created_at,
              'transactionUser', json_build_object(
                'name', tu.name,
                'email', tu.email,
                'type', tu.user_type
              )
            ) ORDER BY gct.created_at DESC
          ) FILTER (WHERE gct.id IS NOT NULL),
          '[]'::json
        ) as transactions
        
      FROM gift_cards gc
      LEFT JOIN users purchaser ON gc.purchaser_id = purchaser.id
      LEFT JOIN users recipient ON gc.recipient_id = recipient.id
      LEFT JOIN gift_card_transactions gct ON gc.id = gct.gift_card_id
      LEFT JOIN users tu ON gct.user_id = tu.id
      
      WHERE gc.purchaser_id = $1
      
      GROUP BY gc.id, purchaser.name, purchaser.email, recipient.name, recipient.email, recipient.user_type
      ORDER BY gc.created_at DESC
    `, [userId]);

    // Calculate ledger summary
    const summary = {
      totalCardsPurchased: ledgerResult.rows.length,
      totalAmountPurchased: 0,
      totalAmountRedeemed: 0,
      totalAmountAwarded: 0,
      totalAmountRemaining: 0,
      activeCards: 0,
      redeemedCards: 0,
      expiredCards: 0
    };

    ledgerResult.rows.forEach(card => {
      summary.totalAmountPurchased += parseFloat(card.amount);
      summary.totalAmountRemaining += parseFloat(card.remaining_balance);
      
      if (card.status === 'active') summary.activeCards++;
      else if (card.status === 'redeemed') summary.redeemedCards++;
      else if (card.status === 'expired') summary.expiredCards++;

      // Calculate redeemed and awarded amounts from transactions
      if (card.transactions) {
        card.transactions.forEach((transaction: any) => {
          if (transaction.type === 'redeem') {
            summary.totalAmountRedeemed += parseFloat(transaction.amount);
          } else if (transaction.type === 'award') {
            summary.totalAmountAwarded += parseFloat(transaction.amount);
          }
        });
      }
    });

    res.json({
      success: true,
      ledger: ledgerResult.rows,
      summary
    });

  } catch (error) {
    console.error('Error fetching gift card ledger:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gift card ledger'
    });
  }
});

// Get current monthly promotion limit status
router.get('/monthly-limit', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userType = req.user?.user_type;

    if (userType !== 'booking_agent') {
      return res.status(403).json({
        success: false,
        error: 'Only booking agents can check monthly limits'
      });
    }

    // Check current month status
    const limitCheck = await pool.query(`
      SELECT * FROM check_booking_agent_monthly_limit($1, $2)
    `, [userId, 0.00]); // Check with 0 to see current status

    const limitResult = limitCheck.rows[0];

    res.json({
      success: true,
      limitInfo: {
        isAdmin: limitResult.is_admin,
        currentMonthTotal: limitResult.current_month_total,
        limitAmount: limitResult.limit_amount,
        remainingAmount: limitResult.remaining_amount,
        withinLimit: limitResult.within_limit,
        percentUsed: limitResult.is_admin ? 0 : (limitResult.current_month_total / limitResult.limit_amount * 100)
      }
    });

  } catch (error) {
    console.error('Error fetching monthly limit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly limit'
    });
  }
});

// Get unified activity data for simplified interface
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userType = req.user?.user_type;

    // Get all gift card transactions for this user
    const activityResult = await pool.query(`
      SELECT 
        gct.*,
        gc.code as gift_card_code,
        gc.id as gift_card_id,
        
        -- User information
        purchaser.name as purchaser_name,
        purchaser.email as purchaser_email,
        purchaser.user_type as purchaser_type,
        recipient.name as recipient_name,
        recipient.email as recipient_email,
        recipient.user_type as recipient_type,
        
        -- Transaction user (who performed the action)
        transaction_user.name as transaction_user_name,
        transaction_user.email as transaction_user_email,
        transaction_user.user_type as transaction_user_type
        
      FROM gift_card_transactions gct
      JOIN gift_cards gc ON gct.gift_card_id = gc.id
      LEFT JOIN users purchaser ON gc.purchaser_id = purchaser.id
      LEFT JOIN users recipient ON gc.recipient_id = recipient.id
      LEFT JOIN users transaction_user ON gct.user_id = transaction_user.id
      
      WHERE 
        -- User is involved in this gift card (as purchaser, recipient, or transaction user)
        (gc.purchaser_id = $1 OR gc.recipient_id = $1 OR gct.user_id = $1)
        
      ORDER BY gct.created_at DESC
    `, [userId]);

    // Transform to simplified transaction format
    const transactions = activityResult.rows.map(transaction => ({
      id: transaction.id,
      type: transaction.transaction_type,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description,
      serviceType: transaction.service_type,
      serviceId: transaction.service_id,
      createdAt: transaction.created_at,
      giftCardCode: transaction.gift_card_code,
      giftCardId: transaction.gift_card_id,
      transactionUser: {
        name: transaction.transaction_user_name,
        email: transaction.transaction_user_email,
        type: transaction.transaction_user_type
      }
    }));

    res.json({
      success: true,
      transactions,
      userType
    });

  } catch (error) {
    console.error('Error fetching gift card activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gift card activity'
    });
  }
});

export default router;
