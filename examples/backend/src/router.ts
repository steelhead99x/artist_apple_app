import { Router } from 'express';
import authRoutes from './routes/auth.js';
import configRoutes from './routes/config.js';
import bandRoutes from './routes/bands.js';
import bandMediaRoutes from './routes/bandMedia.js';
import barRoutes from './routes/bars.js';
import tourRoutes from './routes/tours.js';
import toursManagementRoutes from './routes/toursManagement.js';
import tourPaymentRoutes from './routes/tourPayments.js';
import venuePaymentRoutes from './routes/venuePayments.js';
import paymentRoutes from './routes/payments.js';
import reviewRoutes from './routes/reviews.js';
import adminRoutes from './routes/admin.js';
import w2Routes from './routes/w2.js';
import artistW2Routes from './routes/artistW2.js';
import studioRoutes from './routes/studios.js';
import sessionRoutes from './routes/sessions.js';
import bandMemberRoutes from './routes/bandMembers.js';
import livekitRoutes from './routes/livekit.js';
import passwordResetRoutes from './routes/passwordReset.js';
import subscriptionRoutes from './routes/subscriptions.js';
import giftCardRoutes from './routes/giftCards.js';
import adminGiftCardRoutes from './routes/adminGiftCards.js';
import mailingListRoutes from './routes/mailingList.js';
import liveStreamRoutes from './routes/liveStreams.js';
import muxRoutes from './routes/mux.js';
import muxPlayerRoutes from './routes/muxPlayer.js';
import bookingManagerRoutes from './routes/bookingManager.js';
import venueRoutes from './routes/venue.js';
import contactRoutes from './routes/contact.js';
import adminBookingAgentRoutes from './routes/adminBookingAgents.js';
import eventStatusManagementRoutes from './routes/eventStatusManagement.js';
import userBalanceRoutes from './routes/userBalance.js';
import artistDashboardRoutes from './routes/artistDashboard.js';
import diagnosticsRoutes from './routes/diagnostics.js';
import streamingContentRoutes from './routes/streamingContent.js';
import messagesRoutes from './routes/messages.js';
import humboldHatRoutes from './routes/humboldHat.js';
import { query } from './db.js';
import { sendEmail, emailTemplates, getAppUrl } from './utils/email.js';
import { v4 as uuidv4 } from 'uuid';

export const router = Router();

// Mailing list signup handler function
const handleMailingListSignup = async (req: any, res: any) => {
  try {
    const { email, name, source = 'website', metadata } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check if database is available
    try {
      // Check if already subscribed
      const existingResult = await query(
        'SELECT id, status FROM mailing_list_subscribers WHERE email = $1',
        [email]
      );

      if (existingResult.rows.length > 0) {
        const existing = existingResult.rows[0];
        if (existing.status === 'active') {
          return res.status(200).json({
            success: true,
            message: 'Email already subscribed to mailing list'
          });
        } else {
          // Reactivate subscription
          await query(
            'UPDATE mailing_list_subscribers SET status = $1, updated_at = NOW() WHERE id = $2',
            ['active', existing.id]
          );
        }
      } else {
        // Create new subscription
        const id = uuidv4();
        await query(
          'INSERT INTO mailing_list_subscribers (id, email, name, source, metadata, subscribed_at) VALUES ($1, $2, $3, $4, $5, NOW())',
          [id, email, name || null, source, metadata ? JSON.stringify(metadata) : null]
        );
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      // If database is not available, still return success but log the error
      console.log('Database not available, mailing list signup logged:', { email, name, source });
    }

    // Send notification to admin about new mailing list signup
    // Check if email service is configured
    const mailjetApiKey = process.env.MAILJET_API_KEY || process.env.MAILJET_API;
    const mailjetApiSecret = process.env.MAILJET_API_SECRET || process.env.MAILJET_KEY;

    if (!mailjetApiKey || !mailjetApiSecret) {
      console.log('Email service not configured. Mailing list signup successful but no admin notification sent.');
      return res.status(200).json({
        success: true,
        message: 'Successfully subscribed to mailing list'
      });
    }

    try {
      const adminResult = await query(
        'SELECT email, name FROM users WHERE user_type = $1 AND status = $2 LIMIT 1',
        ['booking_agent', 'approved']
      );

      if (adminResult.rows.length > 0) {
        const admin = adminResult.rows[0];
        const notificationMessage = `New Mailing List Signup\n\nName: ${name || 'Not provided'}\nEmail: ${email}\nSource: ${source}\n\nTime: ${new Date().toLocaleString()}`;
        
        const emailContent = emailTemplates.adminNotification(
          'New Mailing List Signup',
          notificationMessage,
          getAppUrl()
        );

        await sendEmail({
          to: admin.email,
          subject: emailContent.subject,
          html: emailContent.html,
        });
      }
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
      // Don't fail the subscription if admin notification fails
    }

    return res.status(200).json({
      success: true,
      message: 'Successfully subscribed to mailing list'
    });

  } catch (error: any) {
    console.error('Mailing list subscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to subscribe to mailing list',
      error: error.message
    });
  }
};

// Public routes
router.use('/config', configRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/mailing-list', mailingListRoutes);
router.use('/diagnostics', diagnosticsRoutes);
router.use('/humbold-hat', humboldHatRoutes);

// Add the /api/mailing-list-signup endpoint for frontend compatibility
router.post('/mailing-list-signup', handleMailingListSignup);

// Auth routes
router.use('/auth', authRoutes);

// Password reset routes (public)
router.use('/password-reset', passwordResetRoutes);

// Protected routes
router.use('/bands', bandRoutes);
router.use('/band-media', bandMediaRoutes);
router.use('/bars', barRoutes);
router.use('/tours', tourRoutes);
router.use('/tours-management', toursManagementRoutes);
router.use('/tour-payments', tourPaymentRoutes);
router.use('/venue-payments', venuePaymentRoutes);
router.use('/payments', paymentRoutes);
router.use('/reviews', reviewRoutes);
router.use('/admin', adminRoutes);
router.use('/w2', w2Routes);
router.use('/artist-w2', artistW2Routes);
router.use('/studios', studioRoutes);
router.use('/sessions', sessionRoutes);
router.use('/band-members', bandMemberRoutes);
router.use('/livekit', livekitRoutes);
router.use('/gift-cards', giftCardRoutes);
router.use('/admin/gift-cards', adminGiftCardRoutes);
router.use('/live-streams', liveStreamRoutes);
router.use('/mux', muxRoutes);
router.use('/mux', muxPlayerRoutes);
router.use('/booking-manager', bookingManagerRoutes);
router.use('/venue', venueRoutes);
router.use('/contact', contactRoutes);
router.use('/admin-booking', adminBookingAgentRoutes);
router.use('/event-status', eventStatusManagementRoutes);
router.use('/user', userBalanceRoutes);
router.use('/artist-dashboard', artistDashboardRoutes);
router.use('/streaming-content', streamingContentRoutes);
router.use('/messages', messagesRoutes);

export default router;

