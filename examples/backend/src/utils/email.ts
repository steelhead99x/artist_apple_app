interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Get the base app URL from VITE_API_URL environment variable
 * Strips the /api suffix if present
 * Falls back to APP_URL or a default production URL
 */
export function getAppUrl(): string {
  // First try VITE_API_URL (strip /api if present)
  const viteApiUrl = process.env.VITE_API_URL;
  if (viteApiUrl) {
    return viteApiUrl.replace(/\/api\/?$/, '');
  }
  
  // Fallback to APP_URL if set
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  
  // Default to production URL
  return 'https://www.artist-space.com';
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  // Check if Mailjet configuration is available
  const mailjetApiKey = process.env.MAILJET_API_KEY || process.env.MAILJET_API;
  const mailjetApiSecret = process.env.MAILJET_API_SECRET || process.env.MAILJET_KEY;
  const fromEmail = process.env.OUTBOUND_EMAIL || 'noreply@artist-space.com';

  if (!mailjetApiKey || !mailjetApiSecret) {
    console.log('Mailjet not configured. Email would be sent to:', options.to);
    console.log('Subject:', options.subject);
    console.log('Content:', options.html);
    return;
  }

  try {
    // Use Mailjet API
    const response = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${mailjetApiKey}:${mailjetApiSecret}`).toString('base64')}`
      },
      body: JSON.stringify({
        Messages: [
          {
            From: {
              Email: fromEmail,
              Name: 'Artist Space'
            },
            To: [
              {
                Email: options.to,
                Name: options.to.split('@')[0] // Use email prefix as name
              }
            ],
            Subject: options.subject,
            HTMLPart: options.html
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Mailjet API error:', response.status, errorData);
      throw new Error(`Mailjet API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Email sent successfully to:', options.to);
    console.log('Mailjet response:', result);
  } catch (error) {
    console.error('Failed to send email via Mailjet:', error);
    throw error;
  }
}

export const emailTemplates = {
  passwordResetPin: (name: string, pin: string) => ({
    subject: 'Password Reset PIN - Artist Space',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>You requested a password reset for your Artist Space account. Use the following PIN code to reset your password:</p>
        <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #333; margin: 0; font-size: 32px; letter-spacing: 5px;">${pin}</h1>
        </div>
        <p>This PIN will expire in 15 minutes.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Artist Space Team</p>
      </div>
    `
  }),

  loginPin: (name: string, pin: string) => ({
    subject: 'Your Login PIN Code - Artist Space',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">Login PIN Code</h2>
        <p>Hello ${name},</p>
        <p>You requested a login PIN code for your Artist Space account. Use the following 9-digit code to sign in:</p>
        <div style="background-color: #f0f9ff; border: 2px solid #0ea5e9; padding: 30px; text-align: center; margin: 30px 0; border-radius: 8px;">
          <h1 style="color: #0ea5e9; margin: 0; font-size: 36px; letter-spacing: 8px; font-weight: bold;">${pin}</h1>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This PIN code will expire in 15 minutes for security reasons.</p>
        <p style="color: #6b7280; font-size: 14px;">If you didn't request this login PIN, please ignore this email or contact support if you're concerned about your account security.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">Artist Space Team</p>
      </div>
    `
  }),

  userWelcome: (name: string, userType: string, appUrl: string) => ({
    subject: 'Welcome to Artist Space! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">Welcome to Artist Space!</h2>
        <p>Hi ${name},</p>
        <p>Thank you for signing up for Artist Space! We're excited to have you join our community.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Your Account Details</h3>
          <p style="margin: 10px 0;"><strong>Name:</strong> ${name}</p>
          <p style="margin: 10px 0;"><strong>Account Type:</strong> ${userType.charAt(0).toUpperCase() + userType.slice(1)}</p>
          <p style="margin: 10px 0;"><strong>Status:</strong> Pending Approval</p>
        </div>

        <p>Your account is currently pending approval from our booking agent. Once approved, you'll have access to:</p>
        
        ${userType === 'user' ? `
          <ul style="color: #6b7280;">
            <li>Join bands and collaborate with other musicians</li>
            <li>Track your performance payments</li>
            <li>View tour dates and bookings</li>
            <li>Connect with venues and studios</li>
          </ul>
        ` : userType === 'bar' ? `
          <ul style="color: #6b7280;">
            <li>Manage your venue profile</li>
            <li>Book bands for performances</li>
            <li>Track venue KPIs and metrics</li>
            <li>Review bands you've hosted</li>
          </ul>
        ` : userType === 'studio' ? `
          <ul style="color: #6b7280;">
            <li>Manage your studio profile</li>
            <li>Book recording sessions</li>
            <li>Track session details and payments</li>
            <li>Connect with artists and bands</li>
          </ul>
        ` : `
          <ul style="color: #6b7280;">
            <li>Complete your profile information</li>
            <li>Connect with other users</li>
            <li>Access platform features</li>
            <li>Build your network</li>
          </ul>
        `}

        <p>You'll receive an email notification once your account is approved. In the meantime, you can:</p>
        <ul style="color: #6b7280;">
          <li>Complete your profile information</li>
          <li>Explore the platform features</li>
          <li>Contact our support team if you have questions</li>
        </ul>

        <p><a href="${appUrl}/login" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Login to Your Account</a></p>
        
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Welcome to the Artist Space community!</p>
        <p>- The Artist Space Team</p>
      </div>
    `,
  }),

  bookingAgentNewUserNotification: (userName: string, userType: string, userEmail: string, appUrl: string) => ({
    subject: 'New User Registration - Pending Approval',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">New User Registration</h2>
        <p>A new user has registered on Artist Space and is waiting for your approval.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">User Details</h3>
          <p style="margin: 10px 0;"><strong>Name:</strong> ${userName}</p>
          <p style="margin: 10px 0;"><strong>Account Type:</strong> ${userType.charAt(0).toUpperCase() + userType.slice(1)}</p>
          <p style="margin: 10px 0;"><strong>Email:</strong> ${userEmail || 'Wallet-based account'}</p>
          <p style="margin: 10px 0;"><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        <p>Please review this user's registration and approve or reject their account in your dashboard.</p>
        
        <p><a href="${appUrl}/booking-agent" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Review in Dashboard</a></p>
        
        <p>Thank you for helping maintain the quality of our community!</p>
        <p>- Artist Space System</p>
      </div>
    `,
  }),

  adminNotification: (subject: string, message: string, appUrl: string) => ({
    subject: `Artist Space Admin Notification: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">${subject}</h2>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; margin: 0;">${message}</pre>
        </div>
        <p><a href="${appUrl}/booking-agent" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Go to Admin Dashboard</a></p>
        <p>- Artist Space System</p>
      </div>
    `,
  }),

  accountSelfDeleted: (name: string, appUrl: string) => ({
    subject: 'Your Artist Space Account Has Been Deleted',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">Account Deletion Confirmation</h2>
        <p>Hello ${name},</p>
        <p>This email confirms that your Artist Space account has been successfully deleted as per your request.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">What This Means:</h3>
          <ul style="color: #6b7280;">
            <li>Your account and all associated data have been permanently removed</li>
            <li>You have been unsubscribed from all emails and communications</li>
            <li>Your subscription (if any) has been cancelled</li>
            <li>This action cannot be reversed</li>
          </ul>
        </div>

        <h3>Want to Come Back?</h3>
        <p>If you change your mind, you're always welcome to create a new account:</p>
        <ul style="color: #6b7280;">
          <li>You will need to sign up again with new credentials</li>
          <li>Your new account will require approval</li>
          <li>Previous data cannot be recovered</li>
        </ul>

        <p><a href="${appUrl}/register" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Create New Account</a></p>
        
        <p style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Questions or Concerns?</strong><br>
          If you did not request this deletion or have any questions, please contact our support team immediately at <a href="mailto:support@artist-space.com" style="color: #0ea5e9;">support@artist-space.com</a>
        </p>
        
        <p>Thank you for being part of Artist Space. We're sorry to see you go!</p>
        <p>- The Artist Space Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `,
  }),

  accountDeleted: (name: string, userType: string, appUrl: string) => ({
    subject: 'Your Artist Space Account Has Been Suspended - 30 Day Recovery Period',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Account Suspension Notice</h2>
        <p>Hello ${name},</p>
        <p>We're writing to inform you that your Artist Space account has been suspended by our administrative team.</p>
        
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #92400e;">⏱️ 30-Day Recovery Period</h3>
          <p style="margin: 10px 0; font-size: 16px;"><strong>Your account can be recovered for the next 30 days.</strong></p>
          <p style="margin: 10px 0;"><strong>Account Type:</strong> ${userType.charAt(0).toUpperCase() + userType.slice(1)}</p>
          <p style="margin: 10px 0;"><strong>Suspension Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p style="margin: 10px 0;"><strong>Recovery Deadline:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
        </div>

        <h3>What This Means:</h3>
        <ul style="color: #6b7280;">
          <li>Your account has been suspended and is not currently accessible</li>
          <li>Your data is preserved for 30 days from the suspension date</li>
          <li>You can request account recovery within this 30-day period</li>
          <li>After 30 days, your account will be permanently deleted</li>
          <li>You will no longer receive regular emails from Artist Space</li>
        </ul>

        <div style="background-color: #dbeafe; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #075985;">🔄 To Recover Your Account:</h3>
          <p style="margin: 10px 0;">Contact your booking agent immediately to request account recovery. They can restore your account with all your data intact during the 30-day recovery period.</p>
          <p style="margin: 10px 0;"><strong>Important:</strong> Account recovery requests must be made before ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
        </div>

        <p style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Questions or Believe This Was Done in Error?</strong><br>
          Please reach out to your booking agent or contact our support team at <a href="mailto:support@artist-space.com" style="color: #0ea5e9;">support@artist-space.com</a> as soon as possible.
        </p>
        
        <p>We hope to see you back on Artist Space soon.</p>
        <p>- The Artist Space Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `,
  }),

  accountRecovered: (name: string, userType: string, appUrl: string) => ({
    subject: 'Your Artist Space Account Has Been Recovered!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">✅ Account Recovery Successful</h2>
        <p>Hello ${name},</p>
        <p>Great news! Your Artist Space account has been successfully recovered and is now active again.</p>
        
        <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #065f46;">Account Details</h3>
          <p style="margin: 10px 0;"><strong>Account Type:</strong> ${userType.charAt(0).toUpperCase() + userType.slice(1)}</p>
          <p style="margin: 10px 0;"><strong>Recovery Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p style="margin: 10px 0;"><strong>Status:</strong> Active</p>
        </div>

        <h3>What's Been Restored:</h3>
        <ul style="color: #6b7280;">
          <li>✅ Your account is fully active and accessible</li>
          <li>✅ All your previous data has been preserved</li>
          <li>✅ Your profile and settings are intact</li>
          <li>✅ You can now log in and use all features</li>
        </ul>

        <p style="background-color: #dbeafe; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Next Steps:</strong><br>
          You can now log in to your account and continue where you left off. All your data is exactly as it was before the suspension.
        </p>

        <p><a href="${appUrl}/login" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Log In to Your Account</a></p>
        
        <p style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Questions?</strong><br>
          If you have any questions or need assistance, please contact our support team at <a href="mailto:support@artist-space.com" style="color: #0ea5e9;">support@artist-space.com</a>
        </p>
        
        <p>Welcome back to Artist Space!</p>
        <p>- The Artist Space Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `,
  }),

  accountPermanentlyDeleted: (name: string, userType: string, appUrl: string) => ({
    subject: 'Artist Space Account Permanently Deleted',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Account Permanently Deleted</h2>
        <p>Hello ${name},</p>
        <p>This is a final notice that your Artist Space account has been permanently deleted after the 30-day recovery period.</p>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #991b1b;">Account Details</h3>
          <p style="margin: 10px 0;"><strong>Account Type:</strong> ${userType.charAt(0).toUpperCase() + userType.slice(1)}</p>
          <p style="margin: 10px 0;"><strong>Deletion Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p style="margin: 10px 0;"><strong>Status:</strong> Permanently Deleted</p>
        </div>

        <h3>What This Means:</h3>
        <ul style="color: #6b7280;">
          <li>Your account and all associated data have been permanently removed</li>
          <li>This action cannot be undone or reversed</li>
          <li>You have been unsubscribed from all communications</li>
          <li>All your previous data is no longer accessible</li>
        </ul>

        <h3>To Use Artist Space in the Future:</h3>
        <ul style="color: #6b7280;">
          <li>You will need to create a completely new account</li>
          <li>Your new account will require approval from our booking agent</li>
          <li>Previous data cannot be recovered</li>
        </ul>

        <p><a href="${appUrl}/register" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Create New Account</a></p>
        
        <p>Thank you for your time with Artist Space.</p>
        <p>- The Artist Space Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `,
  }),

  cleanupNotification: (agentName: string, deletedCount: number, failedCount: number, accounts: any[], appUrl: string) => ({
    subject: `Account Cleanup Report - ${deletedCount} Account(s) Permanently Deleted`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">🗑️ Automated Account Cleanup Report</h2>
        <p>Hello ${agentName},</p>
        <p>This is an automated report of the 30-day account cleanup process.</p>
        
        <div style="background-color: #eff6ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #075985;">Cleanup Summary</h3>
          <p style="margin: 10px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p style="margin: 10px 0;"><strong>Accounts Deleted:</strong> ${deletedCount}</p>
          ${failedCount > 0 ? `<p style="margin: 10px 0; color: #dc2626;"><strong>Failed:</strong> ${failedCount}</p>` : ''}
          <p style="margin: 10px 0;"><strong>Total Processed:</strong> ${accounts.length}</p>
        </div>

        ${deletedCount > 0 ? `
          <h3>Deleted Accounts:</h3>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px;">
            ${accounts.map(acc => `
              <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 3px;">
                <p style="margin: 5px 0;"><strong>${acc.name}</strong></p>
                <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">
                  Type: ${acc.user_type} | Email: ${acc.email || 'N/A'}
                </p>
                <p style="margin: 5px 0; font-size: 12px; color: #9ca3af;">
                  Deleted: ${new Date(acc.deleted_at).toLocaleDateString()} (${Math.floor(acc.days_since_deletion)} days ago)
                </p>
              </div>
            `).join('')}
          </div>
        ` : '<p>No accounts were processed in this cleanup cycle.</p>'}

        <p style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Note:</strong> All deleted accounts were past the 30-day recovery period. Users were notified via email before permanent deletion.
        </p>

        <p><a href="${appUrl}/booking-agent" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Dashboard</a></p>
        
        <p>- The Artist Space Automated System</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `,
  }),

  bookingAgentMessage: (agentName: string, senderName: string, senderEmail: string, subject: string, message: string, appUrl: string) => ({
    subject: `New Inquiry: ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">New Booking Inquiry</h2>
        <p>Hello ${agentName},</p>
        <p>You have received a new inquiry through the Artist Space platform:</p>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0369a1;">Message Details</h3>
          <p style="margin: 10px 0;"><strong>From:</strong> ${senderName}</p>
          <p style="margin: 10px 0;"><strong>Email:</strong> ${senderEmail}</p>
          <p style="margin: 10px 0;"><strong>Subject:</strong> ${subject}</p>
        </div>

        <div style="background-color: #ffffff; border: 1px solid #e5e7eb; padding: 20px; margin: 20px 0; border-radius: 5px;">
          <h3 style="margin-top: 0; color: #1f2937;">Message</h3>
          <p style="white-space: pre-wrap; color: #4b5563;">${message}</p>
        </div>

        <p style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Next Steps:</strong><br>
          Please respond to this inquiry by replying directly to the sender at <a href="mailto:${senderEmail}" style="color: #0ea5e9;">${senderEmail}</a> or log in to your dashboard to manage this inquiry.
        </p>

        <p><a href="${appUrl}/booking-agent-dashboard" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Dashboard</a></p>
        
        <p>Best regards,<br>The Artist Space Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated message from Artist Space. You received this because someone contacted you through the platform.
        </p>
      </div>
    `,
  }),

  bookingAgentUserDeletionNotification: (agentName: string, userName: string, userEmail: string, userType: string, appUrl: string) => ({
    subject: 'User Account Deleted - Artist Space',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">User Account Deletion Notice</h2>
        <p>Hello ${agentName},</p>
        <p>This is to inform you that a user account has been deleted from the Artist Space platform.</p>
        
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #92400e;">Deleted Account Details</h3>
          <p style="margin: 10px 0;"><strong>User Name:</strong> ${userName}</p>
          <p style="margin: 10px 0;"><strong>Email:</strong> ${userEmail}</p>
          <p style="margin: 10px 0;"><strong>Account Type:</strong> ${userType.charAt(0).toUpperCase() + userType.slice(1)}</p>
          <p style="margin: 10px 0;"><strong>Deletion Date:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>

        <h3>What This Means:</h3>
        <ul style="color: #6b7280;">
          <li>The user's account and all associated data have been removed</li>
          <li>All subscriptions have been cancelled</li>
          <li>User has been unsubscribed from the mailing list</li>
          <li>This change is reflected in your dashboard statistics</li>
        </ul>

        <p style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Action Required:</strong><br>
          No action is required on your part. This is a notification for your records. The dashboard will automatically update to reflect this change.
        </p>

        <p><a href="${appUrl}/booking-agent-dashboard" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Dashboard</a></p>
        
        <p>Best regards,<br>The Artist Space Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated notification from Artist Space. You received this because you are a booking agent on the platform.
        </p>
      </div>
    `,
  }),

  bandAdminNewMember: (bandName: string, memberName: string, memberEmail: string, memberRole: string, bandEmail: string, appUrl: string) => ({
    subject: `New Member Joined ${bandName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">New Band Member Notification</h2>
        <p>Hello,</p>
        <p>A new artist has joined your band <strong>${bandName}</strong> on Artist Space.</p>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0369a1;">New Member Details</h3>
          <p style="margin: 10px 0;"><strong>Name:</strong> ${memberName}</p>
          <p style="margin: 10px 0;"><strong>Email:</strong> ${memberEmail}</p>
          <p style="margin: 10px 0;"><strong>Role:</strong> ${memberRole || 'Member'}</p>
          <p style="margin: 10px 0;"><strong>Joined:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>

        <h3>What You Can Do:</h3>
        <ul style="color: #6b7280;">
          <li><strong>Manage Permissions:</strong> Set whether this member can modify the band profile</li>
          <li><strong>Email Notifications:</strong> Choose if they receive band-related emails</li>
          <li><strong>View Activity:</strong> Monitor their contributions to the band</li>
          <li><strong>Remove Member:</strong> Remove them from the band if needed</li>
        </ul>

        <p style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Band Contact:</strong><br>
          Your band's unique email address is: <strong>${bandEmail}</strong><br>
          Use this for all official band communications.
        </p>

        <p><a href="${appUrl}/band-dashboard" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Manage Band Members</a></p>
        
        <p>Best regards,<br>The Artist Space Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          You're receiving this because you're the admin of ${bandName}. To unsubscribe from band notifications, update your preferences in your band dashboard.
        </p>
      </div>
    `,
  }),

  bandWelcome: (bandName: string, bandEmail: string, adminEmail: string, tempPassword: string, appUrl: string) => ({
    subject: `Welcome to Artist Space - ${bandName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">Welcome to Artist Space!</h2>
        <p>Your band <strong>${bandName}</strong> has been successfully created on Artist Space.</p>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0369a1;">Band Account Details</h3>
          <p style="margin: 10px 0;"><strong>Band Name:</strong> ${bandName}</p>
          <p style="margin: 10px 0;"><strong>Band Email:</strong> ${bandEmail}</p>
          <p style="margin: 10px 0;"><strong>Admin Email:</strong> ${adminEmail}</p>
          ${tempPassword ? `<p style="margin: 10px 0;"><strong>Temporary Password:</strong> <code style="background-color: #e0f2fe; padding: 5px 10px; border-radius: 3px;">${tempPassword}</code></p>` : ''}
        </div>

        <h3>Next Steps:</h3>
        <ol style="color: #6b7280;">
          <li><strong>Complete Your Profile:</strong> Add a description, genre, and social links</li>
          <li><strong>Upload Media:</strong> Add photos, videos, and audio files</li>
          <li><strong>Invite Members:</strong> Add artists to your band</li>
          <li><strong>Set Permissions:</strong> Control who can edit your band profile</li>
          <li><strong>Start Booking:</strong> Create tour dates and connect with venues</li>
        </ol>

        <p style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <strong>⚡ Important:</strong><br>
          As the band admin, you'll receive notifications when new artists join your band. You can manage member permissions and control who can modify your band's profile.
        </p>

        <p><a href="${appUrl}/login" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Get Started</a></p>
        
        <p>Welcome to the Artist Space community!</p>
        <p>Best regards,<br>The Artist Space Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is a one-time welcome message. For questions or support, please contact your booking agent.
        </p>
      </div>
    `,
  }),

  bandMemberPermissionsUpdated: (bandName: string, memberName: string, canModifyProfile: boolean, canReceiveEmails: boolean, bandEmail: string, appUrl: string) => ({
    subject: `Your Permissions Updated - ${bandName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">Band Permissions Updated</h2>
        <p>Hello ${memberName},</p>
        <p>Your permissions for <strong>${bandName}</strong> have been updated by the band admin.</p>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0369a1;">Your Current Permissions</h3>
          <p style="margin: 10px 0;">
            <strong>Modify Band Profile:</strong> 
            ${canModifyProfile ? '<span style="color: #10b981;">✓ Enabled</span>' : '<span style="color: #6b7280;">✗ Disabled</span>'}
          </p>
          <p style="margin: 10px 0;">
            <strong>Receive Band Emails:</strong> 
            ${canReceiveEmails ? '<span style="color: #10b981;">✓ Enabled</span>' : '<span style="color: #6b7280;">✗ Disabled</span>'}
          </p>
        </div>

        <h3>What This Means:</h3>
        <ul style="color: #6b7280;">
          ${canModifyProfile ? '<li>You can now edit the band\'s profile, description, and media</li>' : '<li>You currently cannot edit the band profile (view only)</li>'}
          ${canReceiveEmails ? '<li>You will receive important band notifications and updates</li>' : '<li>You won\'t receive band email notifications</li>'}
        </ul>

        <p style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Band Contact:</strong> ${bandEmail}<br>
          <small>Questions about your permissions? Contact your band admin.</small>
        </p>

        <p><a href="${appUrl}/band-dashboard" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Band Dashboard</a></p>
        
        <p>Best regards,<br>The Artist Space Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated notification from Artist Space.
        </p>
      </div>
    `,
  }),

  adminItemMovedToRecovery: (
    agentName: string, 
    itemType: string, 
    itemName: string, 
    itemEmail: string, 
    deletedBy: string,
    appUrl: string
  ) => ({
    subject: `${itemType} Moved to Recovery - Artist Space`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Item Moved to Recovery</h2>
        <p>Hello ${agentName},</p>
        <p>A ${itemType.toLowerCase()} has been moved to the recovery section and can be restored within 90 days.</p>
        
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #92400e;">${itemType} Details</h3>
          <p style="margin: 10px 0;"><strong>Name:</strong> ${itemName}</p>
          ${itemEmail ? `<p style="margin: 10px 0;"><strong>Email:</strong> ${itemEmail}</p>` : ''}
          <p style="margin: 10px 0;"><strong>Type:</strong> ${itemType}</p>
          <p style="margin: 10px 0;"><strong>Deleted By:</strong> ${deletedBy}</p>
          <p style="margin: 10px 0;"><strong>Deleted:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>

        <h3>Recovery Information:</h3>
        <ul style="color: #6b7280;">
          <li><strong>Recovery Period:</strong> 90 days from deletion</li>
          <li><strong>Recovery Deadline:</strong> ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}</li>
          <li><strong>Location:</strong> Recovery section in admin dashboard</li>
          <li><strong>Actions Available:</strong> Recover or Purge Permanently</li>
        </ul>

        <p style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>💡 Note:</strong> This ${itemType.toLowerCase()} can be recovered from the Recovery section of your dashboard within 90 days. After that, it will be permanently deleted.
        </p>

        <p><a href="${appUrl}/booking-agent-dashboard?tab=recovery" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Recovery Section</a></p>
        
        <p>Best regards,<br>The Artist Space Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated notification. You received this because you are an admin booking agent on the platform.
        </p>
      </div>
    `,
  }),

  adminItemPurged: (
    agentName: string, 
    itemType: string, 
    itemName: string, 
    itemEmail: string, 
    purgedBy: string,
    reason: string,
    appUrl: string
  ) => ({
    subject: `${itemType} Permanently Deleted - Artist Space`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Item Permanently Deleted</h2>
        <p>Hello ${agentName},</p>
        <p>A ${itemType.toLowerCase()} has been permanently deleted from the Artist Space platform and <strong>cannot be recovered</strong>.</p>
        
        <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #991b1b;">${itemType} Details</h3>
          <p style="margin: 10px 0;"><strong>Name:</strong> ${itemName}</p>
          ${itemEmail ? `<p style="margin: 10px 0;"><strong>Email:</strong> ${itemEmail}</p>` : ''}
          <p style="margin: 10px 0;"><strong>Type:</strong> ${itemType}</p>
          <p style="margin: 10px 0;"><strong>Purged By:</strong> ${purgedBy}</p>
          <p style="margin: 10px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          ${reason ? `<p style="margin: 10px 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>

        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #78350f;"><strong>⚠️ Important:</strong> This action is permanent and cannot be undone. All data associated with this ${itemType.toLowerCase()} has been permanently removed from the database.</p>
        </div>

        <h3>What This Means:</h3>
        <ul style="color: #6b7280;">
          <li>All ${itemType.toLowerCase()} data has been permanently removed</li>
          <li>This ${itemType.toLowerCase()} cannot be recovered</li>
          <li>Associated records and history have been deleted</li>
          <li>Dashboard statistics have been updated</li>
        </ul>

        <p style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Action Required:</strong><br>
          No action is required. This is a notification for your records.
        </p>

        <p><a href="${appUrl}/booking-agent-dashboard" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Dashboard</a></p>
        
        <p>Best regards,<br>The Artist Space Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated notification. You received this because you are an admin booking agent on the platform.
        </p>
      </div>
    `,
  }),

  w2UploadArtistConfirmation: (artistName: string, taxYear: number, bookingAgentName: string, appUrl: string) => ({
    subject: 'W-2 Form Upload Confirmation - Artist Space',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">✅ W-2 Form Upload Confirmation</h2>
        <p>Hello ${artistName},</p>
        <p>This email confirms that your W-2 form has been successfully uploaded and securely transferred to your booking agent.</p>
        
        <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #065f46;">Upload Details</h3>
          <p style="margin: 10px 0;"><strong>Tax Year:</strong> ${taxYear}</p>
          <p style="margin: 10px 0;"><strong>Booking Agent:</strong> ${bookingAgentName}</p>
          <p style="margin: 10px 0;"><strong>Upload Date:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p style="margin: 10px 0;"><strong>Status:</strong> Successfully Received</p>
        </div>

        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #1e40af;"><strong>🔒 Security Information:</strong></p>
          <ul style="color: #1e40af; margin: 10px 0; padding-left: 20px;">
            <li>Your document is encrypted with bank-level security</li>
            <li>Only your assigned booking agent can access this document</li>
            <li>You will not be able to access this document after upload for security reasons</li>
            <li>All access is logged and monitored</li>
          </ul>
        </div>

        <p style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Next Steps:</strong><br>
          Your booking agent has been notified and will process your W-2 form. If you need to make any changes or have questions, please contact your booking agent directly.
        </p>

        <p><a href="${appUrl}/dashboard" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View Dashboard</a></p>
        
        <p>Thank you for using Artist Space!</p>
        <p>Best regards,<br>The Artist Space Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated confirmation email. Please do not reply to this email. For questions, contact your booking agent.
        </p>
      </div>
    `,
  }),

  w2UploadBookingAgentNotification: (agentName: string, artistName: string, artistEmail: string, taxYear: number, appUrl: string) => ({
    subject: `New W-2 Form Received - ${taxYear} - Artist Space`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">📄 New W-2 Form Received</h2>
        <p>Hello ${agentName},</p>
        <p>An artist has uploaded a new W-2 form that requires your attention.</p>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #0369a1;">Document Details</h3>
          <p style="margin: 10px 0;"><strong>Artist Name:</strong> ${artistName}</p>
          <p style="margin: 10px 0;"><strong>Artist Email:</strong> ${artistEmail}</p>
          <p style="margin: 10px 0;"><strong>Tax Year:</strong> ${taxYear}</p>
          <p style="margin: 10px 0;"><strong>Received:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p style="margin: 10px 0;"><strong>Status:</strong> Awaiting Review</p>
        </div>

        <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #1e40af;"><strong>🔒 Security Information:</strong></p>
          <ul style="color: #1e40af; margin: 10px 0; padding-left: 20px;">
            <li>Document is encrypted with bank-level security (AES-256)</li>
            <li>Only you (the assigned booking agent) can access this document</li>
            <li>The artist cannot access their uploaded document for security reasons</li>
            <li>All document access is logged and tracked</li>
          </ul>
        </div>

        <p style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <strong>Action Required:</strong><br>
          Please review the W-2 form in your dashboard. The document is available for download and review in the "Artist W-2 Forms" section.
        </p>

        <p><a href="${appUrl}/booking-agent-dashboard?tab=artist-w2" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">View W-2 Documents</a></p>
        
        <p>Best regards,<br>The Artist Space Team</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          This is an automated notification. You received this because you are the assigned booking agent for ${artistName}.
        </p>
      </div>
    `,
  }),
};
