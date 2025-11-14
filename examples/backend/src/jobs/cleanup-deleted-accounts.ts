/**
 * Automated cleanup job for permanently deleting accounts past 30-day recovery period
 * 
 * This script should be run daily via cron job or scheduled task
 * Example cron: 0 2 * * * (runs at 2 AM every day)
 */

import { query } from '../db.js';
import { sendEmail, emailTemplates, getAppUrl } from '../utils/email.js';

export async function cleanupDeletedAccounts() {
  try {
    console.log('Starting cleanup of deleted accounts past 30-day recovery period...');

    // Find all users deleted more than 30 days ago
    const result = await query(`
      SELECT u.id, u.name, u.email, u.user_type, u.deleted_at,
             DATE_PART('day', NOW() - u.deleted_at) as days_since_deletion
      FROM users u
      WHERE u.deleted_at IS NOT NULL
        AND u.deleted_at < NOW() - INTERVAL '30 days'
      ORDER BY u.deleted_at ASC
    `);

    const expiredAccounts = result.rows;

    if (expiredAccounts.length === 0) {
      console.log('No accounts found past 30-day recovery period.');
      return {
        success: true,
        deleted: 0,
        message: 'No accounts to clean up'
      };
    }

    console.log(`Found ${expiredAccounts.length} account(s) past 30-day recovery period.`);

    // Permanently delete each account
    let successCount = 0;
    let failureCount = 0;

    for (const account of expiredAccounts) {
      try {
        console.log(`Permanently deleting account: ${account.name} (${account.email}) - ${account.days_since_deletion} days since deletion`);

        // Send final notification email before deletion (if email exists)
        if (account.email) {
          try {
            const emailContent = emailTemplates.accountPermanentlyDeleted(
              account.name,
              account.user_type,
              getAppUrl()
            );
            
            await sendEmail({
              to: account.email,
              subject: emailContent.subject,
              html: emailContent.html,
            });
            console.log(`  ✓ Final notification email sent to ${account.email}`);
          } catch (emailError) {
            console.error(`  ✗ Failed to send final notification email:`, emailError);
            // Continue with deletion even if email fails
          }
        }

        // Permanently delete the user (CASCADE will handle related records)
        await query('DELETE FROM users WHERE id = $1', [account.id]);
        
        console.log(`  ✓ Account permanently deleted: ${account.name}`);
        successCount++;
      } catch (error) {
        console.error(`  ✗ Failed to delete account ${account.name}:`, error);
        failureCount++;
      }
    }

    const summary = {
      success: true,
      deleted: successCount,
      failed: failureCount,
      total: expiredAccounts.length,
      message: `Cleanup complete: ${successCount} account(s) deleted, ${failureCount} failed`
    };

    console.log('\n=== Cleanup Summary ===');
    console.log(summary.message);
    console.log(`Total processed: ${summary.total}`);
    console.log('=======================\n');

    // Notify booking agents about the cleanup
    try {
      const bookingAgentsResult = await query(
        'SELECT email, name FROM users WHERE user_type = $1 AND status = $2',
        ['booking_agent', 'approved']
      );

      for (const agent of bookingAgentsResult.rows) {
        if (agent.email) {
          try {
            const notificationEmail = emailTemplates.cleanupNotification(
              agent.name,
              successCount,
              failureCount,
              expiredAccounts,
              getAppUrl()
            );
            await sendEmail({
              to: agent.email,
              subject: notificationEmail.subject,
              html: notificationEmail.html,
            });
          } catch (agentEmailError) {
            console.error(`Failed to send cleanup notification to booking agent ${agent.email}:`, agentEmailError);
          }
        }
      }
    } catch (notificationError) {
      console.error('Failed to notify booking agents about cleanup:', notificationError);
    }

    return summary;
  } catch (error) {
    console.error('Fatal error during cleanup:', error);
    return {
      success: false,
      deleted: 0,
      failed: 0,
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Cleanup failed'
    };
  }
}

// Run if called directly (for testing or manual execution)
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupDeletedAccounts()
    .then((result) => {
      console.log('Job completed:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Job failed:', error);
      process.exit(1);
    });
}

