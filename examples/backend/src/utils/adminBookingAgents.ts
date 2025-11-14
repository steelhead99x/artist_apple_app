/**
 * Admin Booking Agent Management Utilities
 * 
 * Handles synchronization of admin booking agents from environment variables
 * and provides helper functions for checking admin status.
 */

import { query } from '../db.js';

/**
 * Sync admin booking agents from environment variable
 * Reads ADMIN_BOOKING_AGENTS from env and updates database
 */
export async function syncAdminBookingAgents(): Promise<void> {
  try {
    const adminEmails = process.env.ADMIN_BOOKING_AGENTS || '';
    
    if (!adminEmails.trim()) {
      console.log('ℹ️  No ADMIN_BOOKING_AGENTS configured in environment');
      return;
    }

    // Parse comma-separated list of emails
    const emailList = adminEmails
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(email => email.length > 0);

    if (emailList.length === 0) {
      console.log('ℹ️  ADMIN_BOOKING_AGENTS is empty');
      return;
    }

    console.log(`🔧 Syncing admin booking agents: ${emailList.join(', ')}`);

    // Call the database function to set admin agents
    const result = await query(`
      SELECT * FROM set_admin_booking_agents($1)
    `, [emailList]);

    const adminAgents = result.rows.filter(r => r.is_now_admin);
    const normalAgents = result.rows.filter(r => !r.is_now_admin);

    console.log(`✅ Admin booking agents synced successfully:`);
    console.log(`   • ${adminAgents.length} admin agent(s): ${adminAgents.map(a => a.email).join(', ')}`);
    console.log(`   • ${normalAgents.length} normal agent(s)`);
  } catch (error) {
    console.error('❌ Error syncing admin booking agents:', error);
    throw error;
  }
}

/**
 * Check if a user is an admin booking agent
 */
export async function isAdminBookingAgent(userId: string): Promise<boolean> {
  try {
    const result = await query(`
      SELECT is_admin_agent, agent_status, user_type
      FROM users
      WHERE id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return false;
    }

    const user = result.rows[0];
    return user.user_type === 'booking_agent' && 
           user.is_admin_agent === true &&
           user.agent_status === 'active';
  } catch (error) {
    console.error('Error checking admin booking agent status:', error);
    return false;
  }
}

/**
 * Middleware to require admin booking agent access
 */
export function requireAdminBookingAgent(req: any, res: any, next: any) {
  const user = req.user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (user.userType !== 'booking_agent') {
    return res.status(403).json({ error: 'Only booking agents can access this resource' });
  }

  // Check admin status in real-time from database
  isAdminBookingAgent(user.userId)
    .then((isAdmin) => {
      if (!isAdmin) {
        return res.status(403).json({ 
          error: 'Admin booking agent access required',
          message: 'You must be an admin booking agent to access this resource'
        });
      }
      next();
    })
    .catch((error) => {
      console.error('Error in requireAdminBookingAgent middleware:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
}

/**
 * Get booking agent access level and filter function
 * Returns whether user is admin and a function to filter tours/data
 */
export async function getBookingAgentAccess(userId: string) {
  const isAdmin = await isAdminBookingAgent(userId);
  
  return {
    isAdmin,
    // SQL WHERE clause addition for filtering
    // SECURITY FIX: Use parameterized query instead of string interpolation
    getSqlFilter: (tableAlias: string = 't') => {
      if (isAdmin) {
        return { clause: '', params: [] }; // Admin sees everything
      }
      // Return parameterized clause and value
      return { 
        clause: `AND ${tableAlias}.booking_agent_id = $1`, 
        params: [userId] 
      };
    },
    // JavaScript filter function for arrays
    getArrayFilter: <T extends { booking_agent_id?: string }>(items: T[]): T[] => {
      if (isAdmin) {
        return items; // Admin sees everything
      }
      return items.filter(item => item.booking_agent_id === userId);
    },
    // Direct userId for parameterized queries
    userId: isAdmin ? null : userId
  };
}

