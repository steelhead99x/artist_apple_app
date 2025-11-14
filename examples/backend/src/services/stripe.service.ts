import Stripe from 'stripe';

// Initialize Stripe with secret key from environment
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover' as any,
    })
  : null;

export interface StripePaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface CreatePaymentIntentParams {
  amount: number; // in smallest currency unit (cents for USD)
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
}

/**
 * Create a Stripe payment intent
 */
export async function createPaymentIntent(
  params: CreatePaymentIntentParams
): Promise<StripePaymentIntent> {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amount,
    currency: params.currency.toLowerCase(),
    description: params.description,
    metadata: params.metadata || {},
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return {
    id: paymentIntent.id,
    client_secret: paymentIntent.client_secret || '',
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: paymentIntent.status,
  };
}

/**
 * Verify a payment intent was successful
 */
export async function verifyPaymentIntent(paymentIntentId: string): Promise<boolean> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  return paymentIntent.status === 'succeeded';
}

/**
 * Get payment intent details
 */
export async function getPaymentIntent(paymentIntentId: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return await stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Refund a payment
 */
export async function refundPayment(paymentIntentId: string, amount?: number) {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount, // Optional: partial refund
  });
}

export default {
  createPaymentIntent,
  verifyPaymentIntent,
  getPaymentIntent,
  refundPayment,
};

