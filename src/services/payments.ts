import apiService from './api';
import {
  TourPayment,
  TourMemberPayout,
  CreateTourPaymentData,
  CreateMemberPayoutData,
} from '../types';

/**
 * Payment API Service
 * Handles all payment-related API calls
 */
class PaymentService {
  // ============================================================================
  // TOUR PAYMENTS
  // ============================================================================

  /**
   * Get all tour payments
   */
  async getTourPayments(params?: {
    tour_date_id?: string;
    band_id?: string;
    status?: string;
  }): Promise<TourPayment[]> {
    return await apiService.get('/tour-payments', params);
  }

  /**
   * Get tour payment by ID
   */
  async getTourPayment(paymentId: string): Promise<TourPayment> {
    return await apiService.get(`/tour-payments/${paymentId}`);
  }

  /**
   * Create tour payment
   */
  async createTourPayment(data: CreateTourPaymentData): Promise<{
    success: boolean;
    payment: TourPayment;
    message: string;
  }> {
    return await apiService.post('/tour-payments', data);
  }

  /**
   * Update tour payment
   */
  async updateTourPayment(
    paymentId: string,
    data: Partial<CreateTourPaymentData>
  ): Promise<TourPayment> {
    return await apiService.put(`/tour-payments/${paymentId}`, data);
  }

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    paymentId: string,
    status: 'pending' | 'succeeded' | 'failed' | 'cancelled'
  ): Promise<TourPayment> {
    return await apiService.put(`/tour-payments/${paymentId}/status`, { status });
  }

  // ============================================================================
  // MEMBER PAYOUTS
  // ============================================================================

  /**
   * Get member payouts for a tour payment
   */
  async getMemberPayouts(tourPaymentId: string): Promise<TourMemberPayout[]> {
    return await apiService.get(`/tour-payments/${tourPaymentId}/member-payouts`);
  }

  /**
   * Distribute payment to band members
   */
  async distributeMemberPayouts(
    tourPaymentId: string,
    payouts: CreateMemberPayoutData[]
  ): Promise<{
    success: boolean;
    payouts: TourMemberPayout[];
    message: string;
  }> {
    return await apiService.post(`/tour-payments/${tourPaymentId}/member-payouts`, {
      payouts,
    });
  }

  /**
   * Update member payout
   */
  async updateMemberPayout(
    tourPaymentId: string,
    payoutId: string,
    data: {
      payout_amount?: number;
      payout_status?: string;
      payment_method?: string;
      transaction_hash?: string;
      notes?: string;
    }
  ): Promise<TourMemberPayout> {
    return await apiService.put(`/tour-payments/${tourPaymentId}/member-payouts/${payoutId}`, data);
  }

  /**
   * Mark payout as paid
   */
  async markPayoutAsPaid(
    tourPaymentId: string,
    payoutId: string,
    transactionHash?: string
  ): Promise<TourMemberPayout> {
    return await apiService.put(`/tour-payments/${tourPaymentId}/member-payouts/${payoutId}`, {
      payout_status: 'succeeded',
      transaction_hash: transactionHash,
    });
  }

  // ============================================================================
  // VENUE PAYMENTS
  // ============================================================================

  /**
   * Get venue payments
   */
  async getVenuePayments(venueId?: string): Promise<any[]> {
    const params = venueId ? { venue_id: venueId } : undefined;
    return await apiService.get('/venue-payments', params);
  }

  /**
   * Create venue payment
   */
  async createVenuePayment(data: {
    tour_date_id: string;
    amount: number;
    currency?: string;
    payment_method?: string;
    transaction_hash?: string;
    notes?: string;
  }): Promise<any> {
    return await apiService.post('/venue-payments', data);
  }

  // ============================================================================
  // STRIPE INTEGRATION
  // ============================================================================

  /**
   * Create Stripe payment intent
   */
  async createPaymentIntent(data: {
    amount: number;
    currency?: string;
    description?: string;
    metadata?: any;
  }): Promise<{
    clientSecret: string;
    paymentIntentId: string;
  }> {
    return await apiService.post('/payments/create-payment-intent', data);
  }

  /**
   * Confirm Stripe payment
   */
  async confirmPayment(paymentIntentId: string): Promise<any> {
    return await apiService.post(`/payments/${paymentIntentId}/confirm`, {});
  }

  // ============================================================================
  // USER PAYMENTS (ARTIST VIEW)
  // ============================================================================

  /**
   * Get my payments as an artist
   * Returns all payments the current user has received from gigs
   */
  async getMyPayments(): Promise<TourPayment[]> {
    return await apiService.get('/tour-payments/my-payments');
  }
}

export default new PaymentService();
