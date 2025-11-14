/**
 * Admin Booking Agent Management Routes
 * 
 * Provides endpoints for admin booking agents to manage the system:
 * - View all booking agents
 * - View all tours across all agents
 * - Approve/suspend booking agents
 * - View system-wide statistics
 */

import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';
import { requireAdminBookingAgent, getBookingAgentAccess } from '../utils/adminBookingAgents.js';
import { sendEmail, emailTemplates, getAppUrl } from '../utils/email.js';

// Helper function to notify other admin booking agents
async function notifyOtherAdminAgents(
  itemType: string,
  itemName: string,
  itemEmail: string,
  actionType: 'recovery' | 'purge',
  performedBy: string,
  excludeAgentId: string,
  reason?: string
) {
  try {
    // Get all admin booking agents except the one performing the action
    const agentsResult = await query(`
      SELECT email, name 
      FROM users 
      WHERE user_type = 'booking_agent' 
        AND is_admin_agent = true 
        AND agent_status = 'active'
        AND deleted_at IS NULL
        AND id != $1
    `, [excludeAgentId]);

    const appUrl = getAppUrl();

    for (const agent of agentsResult.rows) {
      if (agent.email) {
        try {
          let emailContent;
          if (actionType === 'recovery') {
            emailContent = emailTemplates.adminItemMovedToRecovery(
              agent.name,
              itemType,
              itemName,
              itemEmail,
              performedBy,
              appUrl
            );
          } else {
            emailContent = emailTemplates.adminItemPurged(
              agent.name,
              itemType,
              itemName,
              itemEmail,
              performedBy,
              reason || 'No reason provided',
              appUrl
            );
          }

          await sendEmail({
            to: agent.email,
            subject: emailContent.subject,
            html: emailContent.html,
          });
        } catch (emailError) {
          console.error(`Failed to send notification to admin agent ${agent.email}:`, emailError);
          // Continue with other agents even if one fails
        }
      }
    }
  } catch (error) {
    console.error('Failed to notify other admin booking agents:', error);
    // Don't fail the main operation if notifications fail
  }
}

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/admin-booking/check-status - Check if current user is admin booking agent
router.get('/check-status', async (req, res) => {
  try {
    const user = (req as any).user;
    
    if (user.userType !== 'booking_agent') {
      return res.json({ 
        isAdmin: false, 
        isBookingAgent: false 
      });
    }

    const result = await query(`
      SELECT is_admin_agent, agent_status
      FROM users
      WHERE id = $1 AND user_type = 'booking_agent'
    `, [user.userId]);

    if (result.rows.length === 0) {
      return res.json({ 
        isAdmin: false, 
        isBookingAgent: false 
      });
    }

    const agentData = result.rows[0];
    res.json({
      isAdmin: agentData.is_admin_agent === true && agentData.agent_status === 'active',
      isBookingAgent: true,
      agentStatus: agentData.agent_status
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ error: 'Failed to check admin status' });
  }
});

// GET /api/admin-booking/agents - Get all booking agents (admin only)
router.get('/agents', requireAdminBookingAgent, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM booking_agent_hierarchy
      ORDER BY is_admin_agent DESC, name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching booking agents:', error);
    res.status(500).json({ error: 'Failed to fetch booking agents' });
  }
});

// GET /api/admin-booking/stats - Get system-wide statistics (admin only)
router.get('/stats', requireAdminBookingAgent, async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM admin_booking_stats
    `);

    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/admin-booking/all-tours - Get all tours from all agents (admin only)
router.get('/all-tours', requireAdminBookingAgent, async (req, res) => {
  try {
    const { status } = req.query;
    
    let queryText = `
      SELECT 
        t.*,
        b.band_name,
        v.venue_name, v.city, v.state,
        u.email as booking_agent_email,
        u.name as booking_agent_name,
        k.attendance, k.bar_sales, k.new_customers
      FROM tour_dates t
      LEFT JOIN bands b ON t.band_id = b.id
      LEFT JOIN venues v ON t.venue_id = v.id
      LEFT JOIN users u ON t.booking_agent_id = u.id
      LEFT JOIN tour_kpis k ON t.id = k.tour_date_id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (status) {
      queryText += ` AND t.status = $1`;
      params.push(status);
    }
    
    queryText += ' ORDER BY t.date DESC, t.created_at DESC';
    
    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all tours:', error);
    res.status(500).json({ error: 'Failed to fetch tours' });
  }
});

// PUT /api/admin-booking/agents/:id/status - Update booking agent status (admin only)
router.put('/agents/:id/status', requireAdminBookingAgent, async (req, res) => {
  try {
    const { id } = req.params;
    const { agent_status } = req.body;

    if (!['pending', 'active', 'suspended'].includes(agent_status)) {
      return res.status(400).json({ error: 'Invalid agent status' });
    }

    // Prevent changing own status
    const user = (req as any).user;
    if (user.userId === id) {
      return res.status(400).json({ error: 'Cannot change your own status' });
    }

    await query(`
      UPDATE users
      SET agent_status = $1, updated_at = NOW()
      WHERE id = $2 AND user_type = 'booking_agent'
    `, [agent_status, id]);

    const updated = await query(`
      SELECT id, email, name, is_admin_agent, agent_status, status
      FROM users
      WHERE id = $1
    `, [id]);

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Booking agent not found' });
    }

    res.json(updated.rows[0]);
  } catch (error) {
    console.error('Error updating agent status:', error);
    res.status(500).json({ error: 'Failed to update agent status' });
  }
});

// GET /api/admin-booking/my-tours - Get tours for current booking agent
// If admin: gets all tours. If normal agent: gets only their tours
router.get('/my-tours', async (req, res) => {
  try {
    const user = (req as any).user;
    
    if (user.userType !== 'booking_agent') {
      return res.status(403).json({ error: 'Only booking agents can access tours' });
    }

    const access = await getBookingAgentAccess(user.userId);
    const { status } = req.query;
    
    let queryText = `
      SELECT 
        t.*,
        b.band_name,
        v.venue_name, v.city, v.state,
        k.attendance, k.bar_sales, k.new_customers
      FROM tour_dates t
      LEFT JOIN bands b ON t.band_id = b.id
      LEFT JOIN venues v ON t.venue_id = v.id
      LEFT JOIN tour_kpis k ON t.id = k.tour_date_id
      WHERE 1=1
      ${access.getSqlFilter('t')}
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (status) {
      queryText += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    queryText += ' ORDER BY t.date DESC, t.created_at DESC';
    
    const result = await query(queryText, params);
    res.json({
      tours: result.rows,
      isAdmin: access.isAdmin
    });
  } catch (error) {
    console.error('Error fetching my tours:', error);
    res.status(500).json({ error: 'Failed to fetch tours' });
  }
});

// DELETE /api/admin-booking/agents/:id - Soft delete a booking agent (admin only)
router.delete('/agents/:id', requireAdminBookingAgent, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Prevent deleting own account
    if (user.userId === id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if agent exists
    const agentResult = await query(`
      SELECT id, name, email, user_type, deleted_at
      FROM users
      WHERE id = $1 AND user_type = 'booking_agent'
    `, [id]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking agent not found' });
    }

    const agent = agentResult.rows[0];

    if (agent.deleted_at) {
      return res.status(400).json({ error: 'Booking agent is already deleted' });
    }

    // Get current user name for notification
    const currentUserResult = await query('SELECT name FROM users WHERE id = $1', [user.userId]);
    const performedBy = currentUserResult.rows[0]?.name || 'Unknown Admin';

    // Soft delete: Set deleted_at timestamp and status to suspended
    await query(`
      UPDATE users
      SET deleted_at = NOW(), status = 'suspended', agent_status = 'suspended'
      WHERE id = $1
    `, [id]);

    // Notify other admin booking agents about recovery
    await notifyOtherAdminAgents(
      'Booking Agent',
      agent.name,
      agent.email || '',
      'recovery',
      performedBy,
      user.userId
    );

    res.json({
      success: true,
      message: `Booking agent "${agent.name}" has been deleted and moved to recovery (90-day period)`,
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email
      }
    });
  } catch (error) {
    console.error('Error deleting booking agent:', error);
    res.status(500).json({ error: 'Failed to delete booking agent' });
  }
});

// GET /api/admin-booking/deleted-agents - Get all deleted booking agents (admin only, 90-day recovery)
router.get('/deleted-agents', requireAdminBookingAgent, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        u.id, u.name, u.email, u.status, u.deleted_at, u.created_at,
        u.is_admin_agent, u.agent_status,
        CASE 
          WHEN u.deleted_at IS NOT NULL AND u.deleted_at > NOW() - INTERVAL '90 days' THEN true
          ELSE false
        END as recoverable,
        CASE 
          WHEN u.deleted_at IS NOT NULL THEN EXTRACT(DAY FROM (NOW() - u.deleted_at))
          ELSE 0
        END as days_since_deletion,
        CASE 
          WHEN u.deleted_at IS NOT NULL THEN 90 - EXTRACT(DAY FROM (NOW() - u.deleted_at))
          ELSE 90
        END as days_remaining,
        COUNT(DISTINCT b.id) as total_bands_managed
      FROM users u
      LEFT JOIN bands b ON u.id = b.booking_manager_id
      WHERE u.user_type = 'booking_agent' 
        AND u.deleted_at IS NOT NULL
      GROUP BY u.id, u.name, u.email, u.status, u.deleted_at, u.created_at, 
               u.is_admin_agent, u.agent_status
      ORDER BY u.deleted_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching deleted booking agents:', error);
    res.status(500).json({ error: 'Failed to fetch deleted booking agents' });
  }
});

// POST /api/admin-booking/agents/:id/recover - Recover a deleted booking agent (admin only)
router.post('/agents/:id/recover', requireAdminBookingAgent, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if agent exists and is deleted
    const agentResult = await query(`
      SELECT id, name, email, user_type, deleted_at, is_admin_agent
      FROM users
      WHERE id = $1 AND user_type = 'booking_agent'
    `, [id]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking agent not found' });
    }

    const agent = agentResult.rows[0];

    if (!agent.deleted_at) {
      return res.status(400).json({ error: 'Booking agent is not deleted' });
    }

    // Check if recovery period has expired (90 days)
    const deletedDate = new Date(agent.deleted_at);
    const now = new Date();
    const daysSinceDeleted = (now.getTime() - deletedDate.getTime()) / (1000 * 3600 * 24);

    if (daysSinceDeleted > 90) {
      return res.status(400).json({ 
        error: 'Recovery period expired',
        message: 'This booking agent was deleted more than 90 days ago and can no longer be recovered'
      });
    }

    // Recover booking agent (remove deleted_at, set status back to approved and agent_status to active)
    await query(`
      UPDATE users
      SET deleted_at = NULL, status = 'approved', agent_status = 'active'
      WHERE id = $1
    `, [id]);

    res.json({ 
      success: true, 
      message: `Booking agent "${agent.name}" has been recovered successfully`,
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        is_admin_agent: agent.is_admin_agent
      }
    });
  } catch (error) {
    console.error('Error recovering booking agent:', error);
    res.status(500).json({ error: 'Failed to recover booking agent' });
  }
});

// DELETE /api/admin-booking/agents/:id/purge - Permanently delete a booking agent (admin only, NO RECOVERY)
router.delete('/agents/:id/purge', requireAdminBookingAgent, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Prevent purging own account
    if (user.userId === id) {
      return res.status(400).json({ error: 'Cannot purge your own account' });
    }

    // Check if agent exists
    const agentResult = await query(`
      SELECT id, name, email, deleted_at
      FROM users
      WHERE id = $1 AND user_type = 'booking_agent'
    `, [id]);

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Booking agent not found' });
    }

    const agent = agentResult.rows[0];

    // Get current user name for notification
    const currentUserResult = await query('SELECT name FROM users WHERE id = $1', [user.userId]);
    const performedBy = currentUserResult.rows[0]?.name || 'Unknown Admin';

    // Permanently delete the booking agent from the database
    await query('DELETE FROM users WHERE id = $1', [id]);

    // Notify other admin booking agents about permanent deletion
    await notifyOtherAdminAgents(
      'Booking Agent',
      agent.name,
      agent.email || '',
      'purge',
      performedBy,
      user.userId,
      'Permanently purged from recovery section'
    );

    res.json({ 
      success: true, 
      message: `Booking agent "${agent.name}" has been permanently deleted from the database (NO RECOVERY)`
    });
  } catch (error) {
    console.error('Error purging booking agent:', error);
    res.status(500).json({ error: 'Failed to permanently delete booking agent' });
  }
});

export default router;

