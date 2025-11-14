import { Router } from 'express';
import { pool, query } from '../db.js';
import { authenticateToken } from '../utils/auth.js';
import { sendEmail, emailTemplates, getAppUrl } from '../utils/email.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// POST /api/contact/booking-agent - Send a message to a booking agent
router.post('/booking-agent', authenticateToken, async (req, res) => {
  try {
    const { booking_agent_id, subject, message } = req.body;
    const senderId = (req as any).user.userId;
    const senderName = (req as any).user.name;

    // Validate required fields
    if (!booking_agent_id || !subject || !message) {
      return res.status(400).json({
        error: 'Booking agent ID, subject, and message are required'
      });
    }

    // Get booking agent information
    const bookingAgentResult = await query(
      'SELECT id, name, email, user_type FROM users WHERE id = $1',
      [booking_agent_id]
    );

    if (bookingAgentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Booking agent not found'
      });
    }

    const bookingAgent = bookingAgentResult.rows[0];

    // Verify that the recipient is actually a booking agent
    if (bookingAgent.user_type !== 'booking_agent') {
      return res.status(400).json({
        error: 'Recipient is not a booking agent'
      });
    }

    // Get sender information
    const senderResult = await query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [senderId]
    );

    if (senderResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Sender not found'
      });
    }

    const sender = senderResult.rows[0];

    // Store the message in the database (optional - creates an audit trail)
    const messageId = uuidv4();
    try {
      await query(
        `INSERT INTO contact_messages 
         (id, sender_id, recipient_id, subject, message, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [messageId, senderId, booking_agent_id, subject, message]
      );
    } catch (dbError) {
      // If the table doesn't exist, log it but continue to send the email
      console.log('Contact messages table not found, skipping database storage');
    }

    // Send email notification to booking agent
    if (bookingAgent.email) {
      try {
        const emailContent = emailTemplates.bookingAgentMessage(
          bookingAgent.name,
          sender.name,
          sender.email || 'No email provided',
          subject,
          message,
          getAppUrl()
        );

        await sendEmail({
          to: bookingAgent.email,
          subject: emailContent.subject,
          html: emailContent.html,
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
        // Don't fail the request if email fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Message sent successfully',
      messageId: messageId
    });

  } catch (error) {
    console.error('Contact booking agent error:', error);
    res.status(500).json({
      error: 'Failed to send message'
    });
  }
});

export default router;

