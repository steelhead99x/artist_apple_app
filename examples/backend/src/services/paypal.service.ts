import { Client as PayPalClient } from '@paypal/paypal-server-sdk';

// Initialize PayPal client
const paypalClient = process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
  ? new PayPalClient({
      clientCredentialsAuthCredentials: {
        oAuthClientId: process.env.PAYPAL_CLIENT_ID,
        oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET,
      },
      environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as any,
    })
  : null;

export interface PayPalOrder {
  id: string;
  status: string;
  amount: number;
  currency: string;
}

export interface CreateOrderParams {
  amount: number; // in currency units (dollars, not cents)
  currency: string;
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

/**
 * Create a PayPal order
 */
export async function createOrder(params: CreateOrderParams): Promise<{ orderId: string; approvalUrl?: string }> {
  if (!paypalClient) {
    throw new Error('PayPal is not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.');
  }

  try {
    const ordersController = (paypalClient as any).ordersController;
    const request = {
      body: {
        intent: 'CAPTURE',
        purchaseUnits: [
          {
            amount: {
              currencyCode: params.currency,
              value: params.amount.toFixed(2),
            },
            description: params.description || 'Gift Card Purchase',
          },
        ],
        applicationContext: {
          returnUrl: params.returnUrl || `${process.env.FRONTEND_URL}/payment/success`,
          cancelUrl: params.cancelUrl || `${process.env.FRONTEND_URL}/payment/cancel`,
        },
      },
    };

    const response = await ordersController.ordersCreate(request);
    const orderId = response.result?.id;

    if (!orderId) {
      throw new Error('Failed to create PayPal order');
    }

    // Get approval URL from HATEOAS links
    const approvalUrl = response.result?.links?.find((link: any) => link.rel === 'approve')?.href;

    return {
      orderId,
      approvalUrl,
    };
  } catch (error: any) {
    console.error('PayPal create order error:', error);
    throw new Error(`PayPal order creation failed: ${error.message}`);
  }
}

/**
 * Capture a PayPal order (complete the payment)
 */
export async function captureOrder(orderId: string): Promise<PayPalOrder> {
  if (!paypalClient) {
    throw new Error('PayPal is not configured');
  }

  try {
    const ordersController = (paypalClient as any).ordersController;
    const response = await ordersController.ordersCapture({
      id: orderId,
    });

    const result = response.result;
    const amount = parseFloat(result?.purchaseUnits?.[0]?.amount?.value || '0');
    const currency = result?.purchaseUnits?.[0]?.amount?.currencyCode || 'USD';

    return {
      id: orderId,
      status: result?.status || 'UNKNOWN',
      amount,
      currency,
    };
  } catch (error: any) {
    console.error('PayPal capture order error:', error);
    throw new Error(`PayPal order capture failed: ${error.message}`);
  }
}

/**
 * Verify a PayPal order was completed
 */
export async function verifyOrder(orderId: string): Promise<boolean> {
  if (!paypalClient) {
    throw new Error('PayPal is not configured');
  }

  try {
    const ordersController = (paypalClient as any).ordersController;
    const response = await ordersController.ordersGet({ id: orderId });
    return response.result?.status === 'COMPLETED';
  } catch (error: any) {
    console.error('PayPal verify order error:', error);
    return false;
  }
}

/**
 * Get order details
 */
export async function getOrder(orderId: string) {
  if (!paypalClient) {
    throw new Error('PayPal is not configured');
  }

  const ordersController = (paypalClient as any).ordersController;
  const response = await ordersController.ordersGet({ id: orderId });
  return response.result;
}

export default {
  createOrder,
  captureOrder,
  verifyOrder,
  getOrder,
};

