import { Router } from 'express';
import { query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';
import { sendEmail, emailTemplates, getAppUrl } from '../utils/email.js';

const router = Router();

// GET /api/band-members/band/:band_id - Get all members of a band
router.get('/band/:band_id', async (req, res) => {
  try {
    const { band_id } = req.params;
    
    const result = await query(`
      SELECT bm.*, u.name, u.email, u.user_type
      FROM band_members bm
      JOIN users u ON bm.user_id = u.id
      WHERE bm.band_id = $1 AND bm.status = 'active'
      ORDER BY bm.joined_at ASC
    `, [band_id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get band members error:', error);
    res.status(500).json({ error: 'Failed to fetch band members' });
  }
});

// POST /api/band-members - Add a member to a band
router.post('/', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const data = req.body;
    
    // Verify that the requester is the band owner, booking manager, booking agent, or existing member
    const bandResult = await query(
      'SELECT user_id, booking_manager_id FROM bands WHERE id = $1',
      [data.band_id]
    );

    if (bandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Band not found' });
    }

    const band = bandResult.rows[0];
    const isOwner = band.user_id === user.userId;
    const isBookingManager = band.booking_manager_id === user.userId;
    const isBookingAgent = user.userType === 'booking_agent' || user.user_type === 'booking_agent';
    
    const existingMemberResult = await query(
      'SELECT id FROM band_members WHERE band_id = $1 AND user_id = $2 AND status = $3',
      [data.band_id, user.userId, 'active']
    );

    if (!isOwner && !isBookingManager && !isBookingAgent && existingMemberResult.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if user is already an active member
    const activeMemberResult = await query(
      'SELECT id FROM band_members WHERE band_id = $1 AND user_id = $2 AND status = $3',
      [data.band_id, data.user_id, 'active']
    );

    if (activeMemberResult.rows.length > 0) {
      return res.status(409).json({ error: 'User is already an active member' });
    }

    // Check if user was previously a member (inactive)
    const inactiveMemberResult = await query(
      'SELECT id FROM band_members WHERE band_id = $1 AND user_id = $2 AND status = $3',
      [data.band_id, data.user_id, 'inactive']
    );

    let result;
    if (inactiveMemberResult.rows.length > 0) {
      // Reactivate the existing member
      result = await query(`
        UPDATE band_members 
        SET status = 'active', role = $1, joined_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `, [
        data.role || null,
        inactiveMemberResult.rows[0].id
      ]);
    } else {
      // Insert new member
      result = await query(`
        INSERT INTO band_members (band_id, user_id, role, status) 
        VALUES ($1, $2, $3, 'active')
        RETURNING *
      `, [
        data.band_id,
        data.user_id,
        data.role || null
      ]);
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// PUT /api/band-members/:id - Update member role
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const data = req.body;
    
    const memberResult = await query(`
      SELECT bm.band_id, b.user_id as band_owner_id, b.booking_manager_id
      FROM band_members bm
      JOIN bands b ON bm.band_id = b.id
      WHERE bm.id = $1
    `, [id]);

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = memberResult.rows[0];
    const isBookingAgent = user.userType === 'booking_agent' || user.user_type === 'booking_agent';

    // Only band owner, booking manager, or booking agent can update member roles
    if (member.band_owner_id !== user.userId && member.booking_manager_id !== user.userId && !isBookingAgent) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await query(
      'UPDATE band_members SET role = $1 WHERE id = $2',
      [data.role, id]
    );

    res.json({ message: 'Member updated successfully' });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// DELETE /api/band-members/:id - Remove member from band
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    const memberResult = await query(`
      SELECT bm.band_id, bm.user_id, b.user_id as band_owner_id, b.booking_manager_id
      FROM band_members bm
      JOIN bands b ON bm.band_id = b.id
      WHERE bm.id = $1
    `, [id]);

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = memberResult.rows[0];
    const isBookingAgent = user.userType === 'booking_agent' || user.user_type === 'booking_agent';

    // Only band owner, booking manager, booking agent, or the member themselves can remove
    if (member.band_owner_id !== user.userId && member.booking_manager_id !== user.userId && !isBookingAgent && member.user_id !== user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await query(
      'UPDATE band_members SET status = $1 WHERE id = $2',
      ['inactive', id]
    );

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// GET /api/band-members/user/:user_id - Get all bands a user is member of
router.get('/user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    
    const result = await query(`
      SELECT bm.*, b.band_name, b.genre, b.description
      FROM band_members bm
      JOIN bands b ON bm.band_id = b.id
      WHERE bm.user_id = $1 AND bm.status = 'active'
      ORDER BY bm.joined_at DESC
    `, [user_id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get user bands error:', error);
    res.status(500).json({ error: 'Failed to fetch bands' });
  }
});

// POST /api/band-members/:id/approve - Approve a pending band member
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    // Get member and band information
    const memberResult = await query(`
      SELECT bm.*, b.user_id as band_owner_id, b.booking_manager_id, b.band_name, b.band_email, b.admin_email,
             u.name as member_name, u.email as member_email
      FROM band_members bm
      JOIN bands b ON bm.band_id = b.id
      JOIN users u ON bm.user_id = u.id
      WHERE bm.id = $1
    `, [id]);

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = memberResult.rows[0];
    const isBookingAgent = user.userType === 'booking_agent' || user.user_type === 'booking_agent';

    // Only band owner, booking manager, or booking agent can approve members
    if (member.band_owner_id !== user.userId && member.booking_manager_id !== user.userId && !isBookingAgent) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update member status to active
    await query(
      'UPDATE band_members SET status = $1 WHERE id = $2',
      ['active', id]
    );

    // Send notification to band admin about approval
    const appUrl = getAppUrl();
    if (member.admin_email) {
      try {
        const emailContent = emailTemplates.bandAdminNewMember(
          member.band_name,
          member.member_name || 'Unknown User',
          member.member_email || 'No email',
          member.role || 'member',
          member.band_email || 'N/A',
          appUrl
        );
        
        await sendEmail({
          to: member.admin_email,
          subject: emailContent.subject,
          html: emailContent.html,
        });

        // Log the notification
        await query(`
          INSERT INTO band_notifications (band_id, notification_type, recipient_email, subject, message, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          member.band_id,
          'new_member',
          member.admin_email,
          emailContent.subject,
          `New member ${member.member_name} has been approved for ${member.band_name}`,
          JSON.stringify({ user_id: member.user_id, user_name: member.member_name, role: member.role || 'member' })
        ]);
      } catch (emailError) {
        console.error('Failed to send approval notification:', emailError);
      }
    }

    res.json({ message: 'Member approved successfully' });
  } catch (error) {
    console.error('Approve member error:', error);
    res.status(500).json({ error: 'Failed to approve member' });
  }
});

// PUT /api/band-members/:id/permissions - Update band member permissions
router.put('/:id/permissions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { can_modify_profile, can_receive_band_emails } = req.body;
    
    // Get member and band information
    const memberResult = await query(`
      SELECT bm.*, b.user_id as band_owner_id, b.booking_manager_id, b.band_name, b.band_email,
             u.name as member_name, u.email as member_email
      FROM band_members bm
      JOIN bands b ON bm.band_id = b.id
      JOIN users u ON bm.user_id = u.id
      WHERE bm.id = $1
    `, [id]);

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = memberResult.rows[0];
    const isBookingAgent = user.userType === 'booking_agent' || user.user_type === 'booking_agent';

    // Only band owner, booking manager, or booking agent can update permissions
    if (member.band_owner_id !== user.userId && member.booking_manager_id !== user.userId && !isBookingAgent) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update permissions
    const newPermissions = {
      can_modify_profile: can_modify_profile !== undefined ? can_modify_profile : member.permissions?.can_modify_profile || false,
      can_receive_band_emails: can_receive_band_emails !== undefined ? can_receive_band_emails : member.permissions?.can_receive_band_emails || false
    };

    await query(
      'UPDATE band_members SET permissions = $1 WHERE id = $2',
      [JSON.stringify(newPermissions), id]
    );

    // Send notification to member about permission changes
    const appUrl = getAppUrl();
    if (member.member_email) {
      try {
        const emailContent = emailTemplates.bandMemberPermissionsUpdated(
          member.band_name,
          member.member_name || 'Band Member',
          newPermissions.can_modify_profile,
          newPermissions.can_receive_band_emails,
          member.band_email || 'N/A',
          appUrl
        );
        
        await sendEmail({
          to: member.member_email,
          subject: emailContent.subject,
          html: emailContent.html,
        });
      } catch (emailError) {
        console.error('Failed to send permission update notification:', emailError);
      }
    }

    res.json({ 
      message: 'Permissions updated successfully',
      permissions: newPermissions
    });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

// GET /api/band-members/:id/permissions - Get band member permissions
router.get('/:id/permissions', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    const memberResult = await query(`
      SELECT bm.permissions, bm.user_id, b.user_id as band_owner_id, b.booking_manager_id
      FROM band_members bm
      JOIN bands b ON bm.band_id = b.id
      WHERE bm.id = $1
    `, [id]);

    if (memberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const member = memberResult.rows[0];
    const isBookingAgent = user.userType === 'booking_agent' || user.user_type === 'booking_agent';

    // Only band owner, booking manager, booking agent, or the member themselves can view permissions
    if (member.band_owner_id !== user.userId && member.booking_manager_id !== user.userId && !isBookingAgent && member.user_id !== user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({
      permissions: member.permissions || { can_modify_profile: false, can_receive_band_emails: false }
    });
  } catch (error) {
    console.error('Get permissions error:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// GET /api/band-members/pending/:band_id - Get pending members for a band
router.get('/pending/:band_id', authenticateToken, async (req, res) => {
  try {
    const { band_id } = req.params;
    const user = (req as any).user;
    
    // Verify that the requester is the band owner, booking manager, or booking agent
    const bandResult = await query(
      'SELECT user_id, booking_manager_id FROM bands WHERE id = $1',
      [band_id]
    );

    if (bandResult.rows.length === 0) {
      return res.status(404).json({ error: 'Band not found' });
    }

    const band = bandResult.rows[0];
    const isOwner = band.user_id === user.userId;
    const isBookingManager = band.booking_manager_id === user.userId;
    const isBookingAgent = user.userType === 'booking_agent' || user.user_type === 'booking_agent';

    if (!isOwner && !isBookingManager && !isBookingAgent) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const result = await query(`
      SELECT bm.*, u.name, u.email, u.user_type
      FROM band_members bm
      JOIN users u ON bm.user_id = u.id
      WHERE bm.band_id = $1 AND bm.status = 'pending'
      ORDER BY bm.joined_at DESC
    `, [band_id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get pending members error:', error);
    res.status(500).json({ error: 'Failed to fetch pending members' });
  }
});

export default router;
