import { Router } from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../utils/auth.js';

const router = Router();

// Middleware to verify booking agent or booking manager
const verifyBookingRole = async (req: any, res: any, next: any) => {
  if (!['booking_agent', 'booking_manager'].includes(req.user.userType)) {
    return res.status(403).json({ error: 'Unauthorized: Booking agent or manager only' });
  }
  
  // If booking_agent, must be admin
  if (req.user.userType === 'booking_agent') {
    try {
      const userResult = await pool.query(
        'SELECT is_admin_agent, agent_status FROM users WHERE id = $1',
        [req.user.userId]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(403).json({ error: 'User not found' });
      }
      
      const user = userResult.rows[0];
      if (!user.is_admin_agent || user.agent_status !== 'active') {
        return res.status(403).json({ 
          error: 'Unauthorized: Admin booking agent access required',
          message: 'Only admin booking agents can manage users'
        });
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  next();
};

// GET /api/booking-manager/my-users - Get all users managed by this booking manager
router.get('/my-users', authenticateToken, verifyBookingRole, async (req, res) => {
  try {
    const managerId = req.user?.userId || req.user?.id;
    const userType = req.user?.userType || req.user?.user_type;
    const filterUserType = req.query.userType as string;

    let query: string;
    let params: any[];

    if (userType === 'booking_agent') {
      // Booking agents can see all users
      const baseCondition = `u.deleted_at IS NULL AND u.user_type != 'booking_agent'`;
      // Map 'venue' to 'bar' since database stores venues as 'bar'
      const dbFilterUserType = filterUserType === 'venue' ? 'bar' : filterUserType;
      const userTypeCondition = (dbFilterUserType && dbFilterUserType !== 'all') ? ' AND u.user_type = $1' : '';
      params = dbFilterUserType && dbFilterUserType !== 'all' ? [dbFilterUserType] : [];
      
      query = `
        SELECT 
          u.id, u.name, u.email, u.user_type, u.status, u.created_at, u.custom_band_limit,
          v.venue_name, b.band_name,
          
          -- Get subscription info
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'plan_id', sp.id,
                'plan_name', sp.name,
                'price', sp.price_monthly,
                'status', s.status,
                'current_period_end', s.current_period_end
              )
            ) FILTER (WHERE sp.id IS NOT NULL),
            '[]'::json
          ) as subscriptions,
          
          -- Get billing adjustments
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', uba.id,
                'original_amount', uba.original_amount,
                'adjusted_amount', uba.adjusted_amount,
                'discount_percentage', uba.discount_percentage,
                'reason', uba.reason,
                'active', uba.active
              )
            ) FILTER (WHERE uba.id IS NOT NULL),
            '[]'::json
          ) as billing_adjustments,
          
          -- Get assigned features
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', uf.id,
                'feature_type', uf.feature_type,
                'feature_value', uf.feature_value,
                'active', uf.active,
                'expires_at', uf.expires_at
              )
            ) FILTER (WHERE uf.id IS NOT NULL),
            '[]'::json
          ) as features,
          
          -- Get assigned states
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', us.id,
                'state_type', us.state_type,
                'state_value', us.state_value,
                'metadata', us.metadata,
                'active', us.active
              )
            ) FILTER (WHERE us.id IS NOT NULL),
            '[]'::json
          ) as states
          
        FROM users u
        LEFT JOIN venues v ON u.id = v.user_id AND u.user_type = 'bar'
        LEFT JOIN bands b ON u.id = b.user_id AND u.user_type = 'band'
        LEFT JOIN user_subscriptions s ON u.id = s.user_id AND s.status = 'active'
        LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
        LEFT JOIN user_billing_adjustments uba ON u.id = uba.user_id AND uba.active = true
        LEFT JOIN user_features uf ON u.id = uf.user_id AND uf.active = true
        LEFT JOIN user_states us ON u.id = us.user_id AND us.active = true
        WHERE ${baseCondition}${userTypeCondition}
        GROUP BY u.id, u.name, u.email, u.user_type, u.status, u.created_at, u.custom_band_limit, v.venue_name, b.band_name
        ORDER BY u.created_at DESC
      `;
    } else {
      // Booking managers can only see users assigned to them
      const baseCondition = `bma.manager_id = $1 AND u.deleted_at IS NULL`;
      // Map 'venue' to 'bar' since database stores venues as 'bar'
      const dbFilterUserType = filterUserType === 'venue' ? 'bar' : filterUserType;
      const userTypeCondition = (dbFilterUserType && dbFilterUserType !== 'all') ? ' AND u.user_type = $2' : '';
      params = dbFilterUserType && dbFilterUserType !== 'all' ? [managerId, dbFilterUserType] : [managerId];
      
      query = `
        SELECT 
          u.id, u.name, u.email, u.user_type, u.status, u.created_at, u.custom_band_limit,
          bma.assigned_at, bma.notes as manager_notes,
          v.venue_name, b.band_name,
          
          -- Get subscription info
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'plan_id', sp.id,
                'plan_name', sp.name,
                'price', sp.price_monthly,
                'status', s.status,
                'current_period_end', s.current_period_end
              )
            ) FILTER (WHERE sp.id IS NOT NULL),
            '[]'::json
          ) as subscriptions,
          
          -- Get billing adjustments
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', uba.id,
                'original_amount', uba.original_amount,
                'adjusted_amount', uba.adjusted_amount,
                'discount_percentage', uba.discount_percentage,
                'reason', uba.reason,
                'active', uba.active
              )
            ) FILTER (WHERE uba.id IS NOT NULL),
            '[]'::json
          ) as billing_adjustments,
          
          -- Get assigned features
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', uf.id,
                'feature_type', uf.feature_type,
                'feature_value', uf.feature_value,
                'active', uf.active,
                'expires_at', uf.expires_at
              )
            ) FILTER (WHERE uf.id IS NOT NULL),
            '[]'::json
          ) as features,
          
          -- Get assigned states
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', us.id,
                'state_type', us.state_type,
                'state_value', us.state_value,
                'metadata', us.metadata,
                'active', us.active
              )
            ) FILTER (WHERE us.id IS NOT NULL),
            '[]'::json
          ) as states
          
        FROM users u
        INNER JOIN booking_manager_assignments bma ON u.id = bma.user_id
        LEFT JOIN venues v ON u.id = v.user_id AND u.user_type = 'bar'
        LEFT JOIN bands b ON u.id = b.user_id AND u.user_type = 'band'
        LEFT JOIN user_subscriptions s ON u.id = s.user_id AND s.status = 'active'
        LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
        LEFT JOIN user_billing_adjustments uba ON u.id = uba.user_id AND uba.active = true
        LEFT JOIN user_features uf ON u.id = uf.user_id AND uf.active = true
        LEFT JOIN user_states us ON u.id = us.user_id AND us.active = true
        WHERE ${baseCondition}${userTypeCondition}
        GROUP BY u.id, u.name, u.email, u.user_type, u.status, u.created_at, u.custom_band_limit, bma.assigned_at, bma.notes, v.venue_name, b.band_name
        ORDER BY u.created_at DESC
      `;
    }

    const result = await pool.query(query, params);

    res.json({
      success: true,
      users: result.rows
    });

  } catch (error) {
    console.error('Error fetching managed users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch managed users'
    });
  }
});

// PUT /api/booking-manager/users/:userId/billing-adjustment - Create or update billing adjustment
router.put('/users/:userId/billing-adjustment', authenticateToken, verifyBookingRole, async (req, res) => {
  try {
    const { userId } = req.params;
    const { originalAmount, adjustedAmount, discountPercentage, reason } = req.body;
    const adjustedBy = req.user?.id;

    if (!originalAmount || !adjustedAmount) {
      return res.status(400).json({
        success: false,
        error: 'Original amount and adjusted amount are required'
      });
    }

    // Deactivate existing adjustments
    await pool.query(
      'UPDATE user_billing_adjustments SET active = false WHERE user_id = $1',
      [userId]
    );

    // Create new adjustment
    const result = await pool.query(`
      INSERT INTO user_billing_adjustments (user_id, adjusted_by, original_amount, adjusted_amount, discount_percentage, reason)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, adjustedBy, originalAmount, adjustedAmount, discountPercentage, reason]);

    res.json({
      success: true,
      adjustment: result.rows[0],
      message: 'Billing adjustment applied successfully'
    });

  } catch (error) {
    console.error('Error applying billing adjustment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply billing adjustment'
    });
  }
});

// POST /api/booking-manager/users/:userId/features - Assign feature to user
router.post('/users/:userId/features', authenticateToken, verifyBookingRole, async (req, res) => {
  try {
    const { userId } = req.params;
    const { featureType, featureValue, expiresAt } = req.body;
    const assignedBy = req.user?.id;

    if (!featureType) {
      return res.status(400).json({
        success: false,
        error: 'Feature type is required'
      });
    }

    // Insert or update feature
    const result = await pool.query(`
      INSERT INTO user_features (user_id, feature_type, feature_value, assigned_by, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, feature_type)
      DO UPDATE SET 
        feature_value = $3,
        assigned_by = $4,
        expires_at = $5,
        active = true,
        updated_at = NOW()
      RETURNING *
    `, [userId, featureType, featureValue ? JSON.stringify(featureValue) : null, assignedBy, expiresAt]);

    res.json({
      success: true,
      feature: result.rows[0],
      message: 'Feature assigned successfully'
    });

  } catch (error) {
    console.error('Error assigning feature:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign feature'
    });
  }
});

// DELETE /api/booking-manager/users/:userId/features/:featureId - Remove feature from user
router.delete('/users/:userId/features/:featureId', authenticateToken, verifyBookingRole, async (req, res) => {
  try {
    const { featureId } = req.params;

    await pool.query(
      'UPDATE user_features SET active = false WHERE id = $1',
      [featureId]
    );

    res.json({
      success: true,
      message: 'Feature removed successfully'
    });

  } catch (error) {
    console.error('Error removing feature:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove feature'
    });
  }
});

// POST /api/booking-manager/users/:userId/states - Assign state to user
router.post('/users/:userId/states', authenticateToken, verifyBookingRole, async (req, res) => {
  try {
    const { userId } = req.params;
    const { stateType, stateValue, metadata } = req.body;
    const assignedBy = req.user?.id;

    if (!stateType || !stateValue) {
      return res.status(400).json({
        success: false,
        error: 'State type and value are required'
      });
    }

    const result = await pool.query(`
      INSERT INTO user_states (user_id, state_type, state_value, assigned_by, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [userId, stateType, stateValue, assignedBy, metadata ? JSON.stringify(metadata) : null]);

    res.json({
      success: true,
      state: result.rows[0],
      message: 'State assigned successfully'
    });

  } catch (error) {
    console.error('Error assigning state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign state'
    });
  }
});

// DELETE /api/booking-manager/users/:userId/states/:stateId - Remove state from user
router.delete('/users/:userId/states/:stateId', authenticateToken, verifyBookingRole, async (req, res) => {
  try {
    const { stateId } = req.params;

    await pool.query(
      'UPDATE user_states SET active = false WHERE id = $1',
      [stateId]
    );

    res.json({
      success: true,
      message: 'State removed successfully'
    });

  } catch (error) {
    console.error('Error removing state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove state'
    });
  }
});

// POST /api/booking-manager/assign-user - Assign user to booking manager
router.post('/assign-user', authenticateToken, verifyBookingRole, async (req, res) => {
  try {
    const { userId, notes } = req.body;
    const managerId = req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    // Check if assignment already exists
    const existing = await pool.query(
      'SELECT id FROM booking_manager_assignments WHERE manager_id = $1 AND user_id = $2',
      [managerId, userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User is already assigned to this manager'
      });
    }

    const result = await pool.query(`
      INSERT INTO booking_manager_assignments (manager_id, user_id, notes)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [managerId, userId, notes]);

    res.json({
      success: true,
      assignment: result.rows[0],
      message: 'User assigned successfully'
    });

  } catch (error) {
    console.error('Error assigning user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign user'
    });
  }
});

// PUT /api/booking-manager/users/:userId/status - Update user status
router.put('/users/:userId/status', authenticateToken, verifyBookingRole, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Valid status is required (pending, approved, or rejected)'
      });
    }

    const result = await pool.query(
      'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0],
      message: 'User status updated successfully'
    });

  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user status'
    });
  }
});

// PUT /api/booking-manager/users/:userId/band-limit - Update user's custom band limit
router.put('/users/:userId/band-limit', authenticateToken, verifyBookingRole, async (req, res) => {
  try {
    const { userId } = req.params;
    const { bandLimit } = req.body;

    // bandLimit can be a number or null (to reset to default)
    if (bandLimit !== null && (typeof bandLimit !== 'number' || bandLimit < 0)) {
      return res.status(400).json({
        success: false,
        error: 'Band limit must be a positive number or null'
      });
    }

    const result = await pool.query(
      'UPDATE users SET custom_band_limit = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [bandLimit, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0],
      message: 'Band limit updated successfully'
    });

  } catch (error) {
    console.error('Error updating band limit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update band limit'
    });
  }
});

// DELETE /api/booking-manager/users/:userId - Soft delete a user
router.delete('/users/:userId', authenticateToken, verifyBookingRole, async (req, res) => {
  try {
    const { userId } = req.params;
    const { suspensionReason } = req.body;

    // Soft delete the user
    const result = await pool.query(
      `UPDATE users 
       SET deleted_at = NOW(), 
           status = 'deleted',
           suspension_reason = $2,
           updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [userId, suspensionReason || 'admin_deleted']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User soft-deleted successfully',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

export default router;

