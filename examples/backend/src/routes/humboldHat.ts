import { Router } from 'express';
import { sendEmail, emailTemplates, getAppUrl } from '../utils/email.js';

export const router = Router();

// POST /api/humbold-hat/order - Submit order for mohair hat (PUBLIC - NO AUTH REQUIRED)
router.post('/order', async (req, res) => {
  try {
    const { name, email, phone, street1, street2, city, state, zip, country, size, color, notes } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !street1 || !city || !state || !zip || !size || !color) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
      });
    }
    
    // Build formatted address string
    const addressParts = [street1];
    if (street2 && street2.trim()) addressParts.push(street2.trim());
    addressParts.push(`${city}, ${state} ${zip}`);
    const addressCountry = (country && country.trim()) || 'United States';
    if (addressCountry.toLowerCase() !== 'united states') {
      addressParts.push(addressCountry);
    }
    const address = addressParts.join('\n');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    const orderDetails = {
      name,
      email,
      phone,
      address,
      size,
      color,
      notes: notes || 'None',
      product: 'Winter Hat Preorder',
      price: '$350',
      paymentMethod: 'Cash on Delivery (COD)'
    };

    // Create order confirmation email for customer
    const customerEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #3A3A3A; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FAF7F0 0%, #D4C5A9 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #E5E5E5; }
          .order-details { background: #FAF7F0; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(107, 91, 71, 0.1); }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: 600; color: #6B5B47; }
          .footer { text-align: center; padding: 20px; color: #6B6B6B; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #2C2416; font-family: 'Cormorant Garamond', serif;">Humboldt Hat Company</h1>
          </div>
          <div class="content">
            <h2 style="color: #2C2416; font-family: 'Cormorant Garamond', serif;">Thank You for Your Order!</h2>
            <p>Dear ${name},</p>
            <p>We've received your preorder for our handmade mohair wool winter hat. We're excited to craft your hat with care and attention to detail.</p>
            
            <div class="order-details">
              <h3 style="margin-top: 0; color: #2C2416; font-family: 'Cormorant Garamond', serif;">Order Details</h3>
              <div class="detail-row">
                <span class="detail-label">Product:</span>
                <span>${orderDetails.product}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Size:</span>
                <span>${size}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Color:</span>
                <span>${color}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Price:</span>
                <span>${orderDetails.price}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Payment Method:</span>
                <span>${orderDetails.paymentMethod}</span>
              </div>
              ${notes && notes !== 'None' ? `
              <div class="detail-row">
                <span class="detail-label">Special Notes:</span>
                <span>${notes}</span>
              </div>
              ` : ''}
            </div>

            <div class="order-details">
              <h3 style="margin-top: 0; color: #2C2416; font-family: 'Cormorant Garamond', serif;">Shipping Information</h3>
              <div class="detail-row">
                <span class="detail-label">Name:</span>
                <span>${name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span>${email}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Phone:</span>
                <span>${phone}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Address:</span>
                <span style="text-align: right;">${address.replace(/\n/g, '<br>')}</span>
              </div>
            </div>

            <p><strong>What's Next?</strong></p>
            <p>We'll be in touch soon to confirm your order. Please allow 3-4 weeks for your handmade hat to be crafted with care. Payment will be collected upon delivery via Cash on Delivery (COD).</p>
            
            <p>Your purchase directly supports our ranch operations, helping us improve our facilities and enhance our breeding program.</p>
            
            <p>If you have any questions, please don't hesitate to reach out to us at <a href="mailto:orders@artistspace.info">orders@artistspace.info</a>.</p>
            
            <p>Warm regards,<br>The Humboldt Hat Company Team</p>
          </div>
          <div class="footer">
            <p>Handcrafted with love from our ranch to your home.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Create order notification email for admin
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #3A3A3A; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2C2416; color: white; padding: 20px; text-align: center; }
          .content { background: white; padding: 30px; border: 1px solid #E5E5E5; }
          .order-details { background: #FAF7F0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 3px solid #9CAF88; }
          .detail-row { padding: 8px 0; }
          .detail-label { font-weight: 600; color: #6B5B47; }
          .timestamp { color: #6B6B6B; font-size: 0.9rem; text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">New Humboldt Hat Order</h1>
          </div>
          <div class="content">
            <h2>New Order Received</h2>
            <p>A new order has been placed for a mohair wool hat.</p>
            
            <div class="order-details">
              <h3 style="margin-top: 0; color: #2C2416;">Customer Information</h3>
              <div class="detail-row"><span class="detail-label">Name:</span> ${name}</div>
              <div class="detail-row"><span class="detail-label">Email:</span> <a href="mailto:${email}">${email}</a></div>
              <div class="detail-row"><span class="detail-label">Phone:</span> ${phone}</div>
              <div class="detail-row"><span class="detail-label">Shipping Address:</span></div>
              <div class="detail-row" style="white-space: pre-line; margin-left: 20px;">${address}</div>
            </div>

            <div class="order-details">
              <h3 style="margin-top: 0; color: #2C2416;">Order Information</h3>
              <div class="detail-row"><span class="detail-label">Product:</span> ${orderDetails.product}</div>
              <div class="detail-row"><span class="detail-label">Size:</span> ${size}</div>
              <div class="detail-row"><span class="detail-label">Color:</span> ${color}</div>
              <div class="detail-row"><span class="detail-label">Price:</span> ${orderDetails.price}</div>
              <div class="detail-row"><span class="detail-label">Payment Method:</span> ${orderDetails.paymentMethod}</div>
              ${notes && notes !== 'None' ? `
              <div class="detail-row"><span class="detail-label">Special Notes:</span></div>
              <div class="detail-row" style="white-space: pre-line; margin-left: 20px;">${notes}</div>
              ` : ''}
            </div>

            <div class="timestamp">
              <p>Order received: ${new Date().toLocaleString('en-US', { 
                timeZone: 'America/Los_Angeles',
                dateStyle: 'full',
                timeStyle: 'long'
              })}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send emails
    try {
      // Send confirmation email to customer
      await sendEmail({
        to: email,
        subject: 'Order Confirmation - Humboldt Hat Company',
        html: customerEmailHtml
      });

      // Send notification email to orders@artistspace.info
      await sendEmail({
        to: 'orders@artistspace.info',
        subject: `New Humboldt Hat Order - ${name} - ${color}`,
        html: adminEmailHtml
      });

      console.log(`Order submitted successfully: ${name} (${email}) - ${color}`);
    } catch (emailError) {
      console.error('Failed to send order emails:', emailError);
      // Still return success if emails fail - we don't want to lose the order
      // In production, you might want to log this to a database
    }

    res.status(200).json({
      success: true,
      message: 'Order submitted successfully'
    });

  } catch (error: any) {
    console.error('Humboldt hat order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process order. Please try again or contact us directly.'
    });
  }
});

export default router;

