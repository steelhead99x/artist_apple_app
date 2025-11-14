import apiService from './api';
import { SubscriptionPlan, UserSubscription } from '../types';

/**
 * Subscription API Service
 * Handles all subscription-related API calls
 */
class SubscriptionService {
  // ============================================================================
  // SUBSCRIPTION PLANS
  // ============================================================================

  /**
   * Get all subscription plans
   */
  async getPlans(userType?: string): Promise<SubscriptionPlan[]> {
    const params = userType ? { user_type: userType } : undefined;
    return await apiService.get('/subscriptions/plans', params);
  }

  /**
   * Get specific plan
   */
  async getPlan(planId: string): Promise<SubscriptionPlan> {
    return await apiService.get(`/subscriptions/plans/${planId}`);
  }

  // ============================================================================
  // USER SUBSCRIPTIONS
  // ============================================================================

  /**
   * Get current user's subscription
   */
  async getMySubscription(): Promise<UserSubscription | null> {
    return await apiService.get('/subscriptions/my-subscription');
  }

  /**
   * Subscribe to a plan
   */
  async subscribe(data: {
    plan_id: string;
    billing_cycle: 'monthly' | 'yearly';
    payment_method: string;
    stripe_payment_method_id?: string;
  }): Promise<{
    success: boolean;
    subscription: UserSubscription;
    message: string;
  }> {
    return await apiService.post('/subscriptions/subscribe', data);
  }

  /**
   * Update subscription
   */
  async updateSubscription(data: {
    plan_id?: string;
    billing_cycle?: 'monthly' | 'yearly';
  }): Promise<{
    success: boolean;
    subscription: UserSubscription;
    message: string;
  }> {
    return await apiService.put('/subscriptions/update', data);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(cancelAtPeriodEnd: boolean = true): Promise<{
    success: boolean;
    subscription: UserSubscription;
    message: string;
  }> {
    return await apiService.put('/subscriptions/cancel', {
      cancel_at_period_end: cancelAtPeriodEnd,
    });
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(): Promise<{
    success: boolean;
    subscription: UserSubscription;
    message: string;
  }> {
    return await apiService.put('/subscriptions/reactivate', {});
  }

  // ============================================================================
  // PAYMENT METHODS
  // ============================================================================

  /**
   * Get saved payment methods
   */
  async getPaymentMethods(): Promise<any[]> {
    return await apiService.get('/subscriptions/payment-methods');
  }

  /**
   * Add payment method
   */
  async addPaymentMethod(data: {
    type: string;
    stripe_payment_method_id?: string;
    eth_wallet?: string;
  }): Promise<any> {
    return await apiService.post('/subscriptions/payment-methods', data);
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(paymentMethodId: string): Promise<void> {
    return await apiService.put(`/subscriptions/payment-methods/${paymentMethodId}/default`, {});
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    return await apiService.delete(`/subscriptions/payment-methods/${paymentMethodId}`);
  }

  // ============================================================================
  // SUBSCRIPTION PAYMENTS
  // ============================================================================

  /**
   * Get subscription payment history
   */
  async getPaymentHistory(): Promise<any[]> {
    return await apiService.get('/subscriptions/payments');
  }

  /**
   * Retry failed payment
   */
  async retryPayment(paymentId: string): Promise<any> {
    return await apiService.post(`/subscriptions/payments/${paymentId}/retry`, {});
  }
}

export default new SubscriptionService();
