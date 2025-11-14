#!/usr/bin/env node

/**
 * Recurring Payment Processor
 * 
 * This script processes recurring monthly payments for active subscriptions.
 * It should be run as a cron job daily to check for subscriptions that need renewal.
 * 
 * Usage:
 *   node processRecurringPayments.js
 * 
 * Cron job example (runs daily at 2 AM):
 *   0 2 * * * cd /path/to/backend && node src/scripts/processRecurringPayments.js
 */

// Using Node.js 18+ native fetch (no import needed)
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const API_KEY = process.env.RECURRING_PAYMENT_API_KEY || 'your-secure-api-key';

async function processRecurringPayments() {
  try {
    console.log(`[${new Date().toISOString()}] Starting recurring payment processing...`);

    const response = await fetch(`${API_BASE_URL}/api/subscriptions/process-recurring`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'User-Agent': 'RecurringPaymentProcessor/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`[${new Date().toISOString()}] Successfully processed ${result.processedCount} recurring payments`);
      
      if (result.processedSubscriptions && result.processedSubscriptions.length > 0) {
        console.log('Processed subscriptions:');
        result.processedSubscriptions.forEach(sub => {
          console.log(`  - Subscription ${sub.subscriptionId} (User: ${sub.userId}, Plan: ${sub.planName}, Amount: $${sub.amount})`);
        });
      }
    } else {
      console.error(`[${new Date().toISOString()}] Failed to process recurring payments:`, result.error);
      process.exit(1);
    }

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing recurring payments:`, error.message);
    process.exit(1);
  }
}

// Run the script
processRecurringPayments();
