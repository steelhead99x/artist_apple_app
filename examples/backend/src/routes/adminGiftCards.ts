import { Router } from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../utils/auth.js';
import { isAdminBookingAgent } from '../utils/adminBookingAgents.js';

const router = Router();

/**
 * Middleware to verify admin booking agent status
 */
async function requireAdminBookingAgent(req: any, res: any, next: any) {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const isAdmin = await isAdminBookingAgent(userId);
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin booking agent access required'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify admin status'
    });
  }
}

/**
 * GET /api/admin/gift-cards/overview
 * Get overview of all gift cards by all booking agents (admin only)
 */
router.get('/overview', authenticateToken, requireAdminBookingAgent, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM admin_gift_card_overview
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      giftCards: result.rows
    });
  } catch (error) {
    console.error('Error fetching gift card overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gift card overview'
    });
  }
});

/**
 * GET /api/admin/gift-cards/stats-by-agent
 * Get gift card statistics grouped by booking agent (admin only)
 */
router.get('/stats-by-agent', authenticateToken, requireAdminBookingAgent, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM get_gift_card_stats_by_agent()
    `);

    res.json({
      success: true,
      agents: result.rows,
      summary: {
        totalAgents: result.rows.length,
        adminAgents: result.rows.filter((r: any) => r.is_admin_agent).length,
        regularAgents: result.rows.filter((r: any) => !r.is_admin_agent).length,
        totalCardsPurchased: result.rows.reduce((sum: number, r: any) => sum + parseInt(r.total_cards_purchased), 0),
        totalAmountPurchased: result.rows.reduce((sum: number, r: any) => sum + parseFloat(r.total_amount_purchased), 0),
        totalActiveCards: result.rows.reduce((sum: number, r: any) => sum + parseInt(r.active_cards), 0),
        totalActiveBalance: result.rows.reduce((sum: number, r: any) => sum + parseFloat(r.active_balance), 0),
        totalSuspendedCards: result.rows.reduce((sum: number, r: any) => sum + parseInt(r.suspended_cards), 0)
      }
    });
  } catch (error) {
    console.error('Error fetching gift card stats by agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gift card statistics'
    });
  }
});

/**
 * GET /api/admin/gift-cards/by-agent/:agentId
 * Get all gift cards for a specific booking agent (admin only)
 */
router.get('/by-agent/:agentId', authenticateToken, requireAdminBookingAgent, async (req, res) => {
  try {
    const { agentId } = req.params;

    const result = await pool.query(`
      SELECT * FROM admin_gift_card_overview
      WHERE purchaser_id = $1
      ORDER BY created_at DESC
    `, [agentId]);

    // Get agent info
    const agentResult = await pool.query(`
      SELECT id, email, name, is_admin_agent, agent_status
      FROM users
      WHERE id = $1 AND user_type = 'booking_agent'
    `, [agentId]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking agent not found'
      });
    }

    // Get monthly stats
    const monthlyResult = await pool.query(`
      SELECT * FROM gift_card_monthly_summary
      WHERE purchaser_id = $1
      ORDER BY month DESC
      LIMIT 12
    `, [agentId]);

    res.json({
      success: true,
      agent: agentResult.rows[0],
      giftCards: result.rows,
      monthlyStats: monthlyResult.rows
    });
  } catch (error) {
    console.error('Error fetching gift cards by agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch gift cards'
    });
  }
});

/**
 * GET /api/admin/gift-cards/monthly-summary
 * Get monthly summary of all gift cards by all booking agents
 */
router.get('/monthly-summary', authenticateToken, requireAdminBookingAgent, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        month,
        COUNT(DISTINCT purchaser_id) as active_agents,
        SUM(cards_purchased) as total_cards,
        SUM(total_amount) as total_amount,
        SUM(active_cards) as active_cards,
        SUM(active_balance) as active_balance,
        SUM(redeemed_cards) as redeemed_cards,
        SUM(suspended_cards) as suspended_cards
      FROM gift_card_monthly_summary
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `);

    res.json({
      success: true,
      monthlySummary: result.rows
    });
  } catch (error) {
    console.error('Error fetching monthly summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly summary'
    });
  }
});

/**
 * POST /api/admin/gift-cards/suspend/:cardId
 * Suspend a gift card (admin only)
 */
router.post('/suspend/:cardId', authenticateToken, requireAdminBookingAgent, async (req, res) => {
  try {
    const { cardId } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id;

    const result = await pool.query(`
      SELECT * FROM admin_suspend_gift_card($1, $2, $3)
    `, [cardId, adminId, reason || 'No reason provided']);

    const response = result.rows[0];

    if (!response.success) {
      return res.status(400).json({
        success: false,
        error: response.message
      });
    }

    res.json({
      success: true,
      message: response.message,
      giftCardId: response.gift_card_id
    });
  } catch (error) {
    console.error('Error suspending gift card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to suspend gift card'
    });
  }
});

/**
 * POST /api/admin/gift-cards/unsuspend/:cardId
 * Unsuspend a gift card (admin only)
 */
router.post('/unsuspend/:cardId', authenticateToken, requireAdminBookingAgent, async (req, res) => {
  try {
    const { cardId } = req.params;
    const adminId = req.user?.id;

    const result = await pool.query(`
      SELECT * FROM admin_unsuspend_gift_card($1, $2)
    `, [cardId, adminId]);

    const response = result.rows[0];

    if (!response.success) {
      return res.status(400).json({
        success: false,
        error: response.message
      });
    }

    res.json({
      success: true,
      message: response.message
    });
  } catch (error) {
    console.error('Error unsuspending gift card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unsuspend gift card'
    });
  }
});

/**
 * DELETE /api/admin/gift-cards/:cardId
 * Delete (cancel) a gift card (admin only)
 */
router.delete('/:cardId', authenticateToken, requireAdminBookingAgent, async (req, res) => {
  try {
    const { cardId } = req.params;
    const { reason } = req.body;
    const adminId = req.user?.id;

    const result = await pool.query(`
      SELECT * FROM admin_delete_gift_card($1, $2, $3)
    `, [cardId, adminId, reason || 'Deleted by admin']);

    const response = result.rows[0];

    if (!response.success) {
      return res.status(400).json({
        success: false,
        error: response.message
      });
    }

    res.json({
      success: true,
      message: response.message
    });
  } catch (error) {
    console.error('Error deleting gift card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete gift card'
    });
  }
});

/**
 * PUT /api/admin/gift-cards/:cardId/notes
 * Update admin notes for a gift card
 */
router.put('/:cardId/notes', authenticateToken, requireAdminBookingAgent, async (req, res) => {
  try {
    const { cardId } = req.params;
    const { notes } = req.body;

    await pool.query(`
      UPDATE gift_cards
      SET admin_notes = $1, updated_at = NOW()
      WHERE id = $2
    `, [notes, cardId]);

    res.json({
      success: true,
      message: 'Notes updated successfully'
    });
  } catch (error) {
    console.error('Error updating gift card notes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notes'
    });
  }
});

/**
 * GET /api/admin/gift-cards/search
 * Search gift cards by code, email, or other criteria
 */
router.get('/search', authenticateToken, requireAdminBookingAgent, async (req, res) => {
  try {
    const { query, status, agentId } = req.query;

    let sqlQuery = `
      SELECT * FROM admin_gift_card_overview
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (query) {
      params.push(`%${query}%`);
      sqlQuery += ` AND (
        code ILIKE $${paramCount} OR
        purchaser_email ILIKE $${paramCount} OR
        recipient_email ILIKE $${paramCount} OR
        purchaser_name ILIKE $${paramCount} OR
        recipient_name ILIKE $${paramCount}
      )`;
      paramCount++;
    }

    if (status) {
      params.push(status);
      sqlQuery += ` AND status = $${paramCount}`;
      paramCount++;
    }

    if (agentId) {
      params.push(agentId);
      sqlQuery += ` AND purchaser_id = $${paramCount}`;
      paramCount++;
    }

    sqlQuery += ` ORDER BY created_at DESC LIMIT 100`;

    const result = await pool.query(sqlQuery, params);

    res.json({
      success: true,
      giftCards: result.rows
    });
  } catch (error) {
    console.error('Error searching gift cards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search gift cards'
    });
  }
});

/**
 * POST /api/admin/gift-cards/create
 * Create a gift card as admin (bypasses monthly limits)
 * Default expiration is 1 year (365 days), but can be customized
 */
router.post('/create', authenticateToken, requireAdminBookingAgent, async (req, res) => {
  try {
    const { amount, currency = 'USD', message, recipientEmail, recipientType, expiresInDays = 365 } = req.body;
    const adminId = req.user?.id;
    
    // Default is 1 year, but admin can set earlier expiration
    const expirationDays = expiresInDays > 0 && expiresInDays <= 365 ? expiresInDays : 365;

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    if (recipientType && !['user', 'venue', 'studio', 'band'].includes(recipientType)) {
      return res.status(400).json({
        success: false,
        error: 'Recipient type must be "user", "venue", "studio", or "band"'
      });
    }

    // Generate unique gift card code
    const generateGiftCardCode = (): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = 'GC-';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      result += '-';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    let giftCardCode = generateGiftCardCode();
    let codeExists = true;
    let attempts = 0;
    
    while (codeExists && attempts < 10) {
      const codeCheck = await pool.query(
        'SELECT id FROM gift_cards WHERE code = $1',
        [giftCardCode]
      );
      codeExists = codeCheck.rows.length > 0;
      if (codeExists) {
        giftCardCode = generateGiftCardCode();
      }
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

    // Create gift card (admin gift cards are marked with purchase_payment_method = 'admin_created')
    const giftCardResult = await pool.query(`
      INSERT INTO gift_cards (
        code, amount, currency, purchaser_id, purchaser_type, 
        purchase_payment_method, remaining_balance, expires_at, message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      giftCardCode,
      amount,
      currency,
      adminId,
      'booking_agent',
      'admin_created',
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
      adminId,
      'Gift card created by admin'
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
      message: 'Gift card created successfully'
    });

  } catch (error) {
    console.error('Error creating gift card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create gift card'
    });
  }
});

/**
 * PUT /api/admin/gift-cards/:cardId/edit
 * Edit a gift card (admin only)
 * Note: Expiration date cannot be changed - all gift cards expire in 1 year from creation
 */
router.put('/:cardId/edit', authenticateToken, requireAdminBookingAgent, async (req, res) => {
  try {
    const { cardId } = req.params;
    const { amount, message, recipientId, recipientType } = req.body;
    const adminId = req.user?.id;

    // Get current gift card
    const currentCard = await pool.query(
      'SELECT * FROM gift_cards WHERE id = $1',
      [cardId]
    );

    if (currentCard.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Gift card not found'
      });
    }

    const card = currentCard.rows[0];

    // Don't allow editing redeemed or cancelled cards
    if (card.status === 'redeemed' || card.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: `Cannot edit ${card.status} gift cards`
      });
    }

    // Validate recipient type if provided
    if (recipientType && !['user', 'venue', 'studio', 'band'].includes(recipientType)) {
      return res.status(400).json({
        success: false,
        error: 'Recipient type must be "user", "venue", "studio", or "band"'
      });
    }

    // If recipientId is provided, verify the user exists
    if (recipientId) {
      const recipientCheck = await pool.query(
        'SELECT id, user_type FROM users WHERE id = $1',
        [recipientId]
      );

      if (recipientCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Recipient user not found'
        });
      }

      // If recipient type is provided, validate it matches the user type
      if (recipientType) {
        const actualUserType = recipientCheck.rows[0].user_type;
        // Map user types to recipient types
        const typeMapping: { [key: string]: string } = {
          'band': 'band',
          'venue': 'venue',
          'studio': 'studio',
          'booking_agent': 'user',
          'fan': 'user'
        };
        
        const expectedRecipientType = typeMapping[actualUserType];
        if (recipientType !== expectedRecipientType) {
          return res.status(400).json({
            success: false,
            error: `User type ${actualUserType} does not match recipient type ${recipientType}`
          });
        }
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (amount !== undefined && amount > 0) {
      updates.push(`amount = $${paramCount}`);
      params.push(amount);
      paramCount++;
      
      // Also update remaining balance proportionally
      const usedAmount = card.amount - card.remaining_balance;
      const newRemainingBalance = Math.max(0, amount - usedAmount);
      updates.push(`remaining_balance = $${paramCount}`);
      params.push(newRemainingBalance);
      paramCount++;
    }

    if (message !== undefined) {
      updates.push(`message = $${paramCount}`);
      params.push(message);
      paramCount++;
    }

    // Handle recipient allocation
    if (recipientId !== undefined) {
      updates.push(`recipient_id = $${paramCount}`);
      params.push(recipientId || null);
      paramCount++;

      // If allocating to a recipient, mark as awarded
      if (recipientId) {
        // Recipient type is required when allocating
        if (!recipientType) {
          return res.status(400).json({
            success: false,
            error: 'Recipient type is required when allocating a gift card'
          });
        }

        updates.push(`recipient_type = $${paramCount}`);
        params.push(recipientType);
        paramCount++;

        updates.push(`awarded_at = $${paramCount}`);
        params.push(new Date());
        paramCount++;

        updates.push(`awarded_by = $${paramCount}`);
        params.push(adminId);
        paramCount++;
      } else {
        // If removing recipient, clear awarded fields
        updates.push(`awarded_at = NULL`);
        updates.push(`awarded_by = NULL`);
        updates.push(`recipient_type = NULL`);
      }
    }

    // Note: Expiration date is fixed at 1 year from creation and cannot be changed

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    updates.push(`updated_at = NOW()`);
    params.push(cardId);

    const updateQuery = `
      UPDATE gift_cards
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, params);
    const updatedCard = result.rows[0];

    // Create transaction record for the edit
    let description = `Gift card edited by admin: ${updates.filter(u => !u.includes('updated_at')).join(', ')}`;
    if (recipientId && !card.recipient_id) {
      description = 'Gift card allocated to recipient by admin';
      
      // Create an award transaction using the card's current amount value (after any edits)
      // Use updatedCard.amount if it was changed, otherwise use card.amount
      const awardAmount = updatedCard.amount || card.amount;
      
      await pool.query(`
        INSERT INTO gift_card_transactions (
          gift_card_id, transaction_type, amount, currency, user_id, description
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        cardId,
        'award',
        awardAmount, // Use the card's amount (the award value)
        card.currency,
        recipientId,
        'Gift card awarded by admin'
      ]);
    }

    await pool.query(`
      INSERT INTO gift_card_transactions (
        gift_card_id, transaction_type, amount, currency, user_id, description
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      cardId,
      'admin_edit',
      0,
      card.currency,
      adminId,
      description
    ]);

    res.json({
      success: true,
      message: 'Gift card updated successfully',
      giftCard: result.rows[0]
    });
  } catch (error) {
    console.error('Error editing gift card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to edit gift card'
    });
  }
});

/**
 * GET /api/admin/gift-cards/available-recipients
 * Get list of all users that can receive gift cards (admin only)
 */
router.get('/available-recipients', authenticateToken, requireAdminBookingAgent, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.user_type,
        CASE
          WHEN u.user_type = 'band' THEN b.band_name
          WHEN u.user_type = 'bar' THEN v.venue_name
          WHEN u.user_type = 'studio' THEN s.studio_name
          ELSE u.name
        END as display_name,
        CASE
          WHEN u.user_type = 'band' THEN 'band'
          WHEN u.user_type = 'bar' THEN 'venue'
          WHEN u.user_type = 'studio' THEN 'studio'
          ELSE 'user'
        END as recipient_type
      FROM users u
      LEFT JOIN bands b ON u.id = b.user_id AND u.user_type = 'band'
      LEFT JOIN venues v ON u.id = v.user_id AND u.user_type = 'bar'
      LEFT JOIN recording_studios s ON u.id = s.user_id AND u.user_type = 'studio'
      WHERE u.status = 'approved' AND u.deleted_at IS NULL
      ORDER BY u.user_type, display_name
    `);

    res.json({
      success: true,
      recipients: result.rows
    });
  } catch (error) {
    console.error('Error fetching available recipients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available recipients'
    });
  }
});

export default router;

