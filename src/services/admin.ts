import apiService from './api';
import { User, ManagedUser, BillingAdjustment, UserFeature, UserState, GiftCard } from '../types';

/**
 * Admin API Service
 * Handles all admin and booking manager operations
 */
class AdminService {
  // ============================================================================
  // USER MANAGEMENT (Booking Agents)
  // ============================================================================

  /**
   * Get all users (admin only)
   */
  async getAllUsers(params?: {
    user_type?: string;
    status?: string;
    search?: string;
  }): Promise<User[]> {
    return await apiService.get('/admin/users', params);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    return await apiService.get(`/admin/users/${userId}`);
  }

  /**
   * Approve user
   */
  async approveUser(userId: string): Promise<User> {
    return await apiService.put(`/admin/users/${userId}/approve`, {});
  }

  /**
   * Reject user
   */
  async rejectUser(userId: string, reason?: string): Promise<void> {
    return await apiService.put(`/admin/users/${userId}/reject`, { reason });
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(userId: string, suspensionReason?: string): Promise<void> {
    return await apiService.delete(`/admin/users/${userId}`, {
      suspension_reason: suspensionReason,
    });
  }

  /**
   * Get admin statistics
   */
  async getAdminStats(): Promise<any> {
    return await apiService.get('/admin/stats');
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(): Promise<{
    users: User[];
    bands: any[];
    total: number;
  }> {
    return await apiService.get('/admin/pending-approvals');
  }

  // ============================================================================
  // BOOKING MANAGER OPERATIONS
  // ============================================================================

  /**
   * Get managed users (for booking managers)
   */
  async getManagedUsers(userType?: string): Promise<{
    success: boolean;
    users: ManagedUser[];
  }> {
    const params = userType ? { userType } : undefined;
    return await apiService.get('/booking-manager/my-users', params);
  }

  /**
   * Update user status
   */
  async updateUserStatus(
    userId: string,
    status: 'pending' | 'approved' | 'rejected'
  ): Promise<{
    success: boolean;
    user: User;
    message: string;
  }> {
    return await apiService.put(`/booking-manager/users/${userId}/status`, { status });
  }

  /**
   * Set custom band limit for user
   */
  async setUserBandLimit(userId: string, bandLimit: number | null): Promise<{
    success: boolean;
    user: User;
    message: string;
  }> {
    return await apiService.put(`/booking-manager/users/${userId}/band-limit`, { bandLimit });
  }

  /**
   * Soft delete user
   */
  async softDeleteUser(userId: string, suspensionReason?: string): Promise<{
    success: boolean;
    message: string;
    user: User;
  }> {
    return await apiService.delete(`/booking-manager/users/${userId}`, { suspensionReason });
  }

  // ============================================================================
  // BILLING ADJUSTMENTS
  // ============================================================================

  /**
   * Create or update billing adjustment
   */
  async createBillingAdjustment(
    userId: string,
    data: {
      originalAmount: number;
      adjustedAmount: number;
      discountPercentage?: number;
      reason?: string;
    }
  ): Promise<{
    success: boolean;
    adjustment: BillingAdjustment;
    message: string;
  }> {
    return await apiService.put(`/booking-manager/users/${userId}/billing-adjustment`, data);
  }

  // ============================================================================
  // FEATURE ASSIGNMENT
  // ============================================================================

  /**
   * Assign feature to user
   */
  async assignFeature(
    userId: string,
    data: {
      featureType: string;
      featureValue?: any;
      expiresAt?: string;
    }
  ): Promise<{
    success: boolean;
    feature: UserFeature;
    message: string;
  }> {
    return await apiService.post(`/booking-manager/users/${userId}/features`, data);
  }

  /**
   * Remove feature from user
   */
  async removeFeature(userId: string, featureId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return await apiService.delete(`/booking-manager/users/${userId}/features/${featureId}`);
  }

  // ============================================================================
  // USER STATE MANAGEMENT
  // ============================================================================

  /**
   * Assign state to user
   */
  async assignState(
    userId: string,
    data: {
      stateType: string;
      stateValue: string;
      metadata?: any;
    }
  ): Promise<{
    success: boolean;
    state: UserState;
    message: string;
  }> {
    return await apiService.post(`/booking-manager/users/${userId}/states`, data);
  }

  /**
   * Remove state from user
   */
  async removeState(userId: string, stateId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return await apiService.delete(`/booking-manager/users/${userId}/states/${stateId}`);
  }

  /**
   * Assign user to booking manager
   */
  async assignUser(userId: string, notes?: string): Promise<{
    success: boolean;
    assignment: any;
    message: string;
  }> {
    return await apiService.post('/booking-manager/assign-user', { userId, notes });
  }

  // ============================================================================
  // GIFT CARDS (Admin)
  // ============================================================================

  /**
   * Get all gift cards
   */
  async getGiftCards(params?: {
    status?: string;
    recipient_type?: string;
  }): Promise<GiftCard[]> {
    return await apiService.get('/admin-gift-cards', params);
  }

  /**
   * Create gift card
   */
  async createGiftCard(data: {
    amount: number;
    recipient_type: string;
    recipient_id: string;
    expires_at?: string;
    notes?: string;
  }): Promise<{
    success: boolean;
    giftCard: GiftCard;
    message: string;
  }> {
    return await apiService.post('/admin-gift-cards', data);
  }

  /**
   * Update gift card
   */
  async updateGiftCard(
    giftCardId: string,
    data: {
      status?: string;
      notes?: string;
    }
  ): Promise<GiftCard> {
    return await apiService.put(`/admin-gift-cards/${giftCardId}`, data);
  }

  /**
   * Get gift card transactions
   */
  async getGiftCardTransactions(giftCardId: string): Promise<any[]> {
    return await apiService.get(`/admin-gift-cards/${giftCardId}/transactions`);
  }

  // ============================================================================
  // BOOKING AGENT MANAGEMENT
  // ============================================================================

  /**
   * Get all booking agents
   */
  async getBookingAgents(): Promise<any[]> {
    return await apiService.get('/admin-booking-agents');
  }

  /**
   * Update booking agent status
   */
  async updateAgentStatus(
    agentId: string,
    status: 'pending' | 'active' | 'suspended'
  ): Promise<any> {
    return await apiService.put(`/admin-booking-agents/${agentId}/status`, { status });
  }

  /**
   * Set agent as admin
   */
  async setAdminAgent(agentId: string, isAdmin: boolean): Promise<any> {
    return await apiService.put(`/admin-booking-agents/${agentId}/admin`, { is_admin_agent: isAdmin });
  }
}

export default new AdminService();
