import apiService from './api';
import {
  Band,
  BandLimits,
  CreateBandData,
  JoinBandData,
  UpdateBandData,
  BandMember,
  BandMedia,
  ArtistDashboardData,
  PaymentLedgerEntry,
  BandPaymentSummary,
  SubscriptionPlan,
  UserSubscription,
} from '../types';

interface SubscriptionResponse {
  current_plan?: SubscriptionPlan;
  subscription?: UserSubscription;
  features?: Record<string, boolean | number>;
  limits?: Record<string, number>;
}

interface MemberPermissions {
  can_edit_band?: boolean;
  can_manage_members?: boolean;
  can_manage_tours?: boolean;
  can_view_financials?: boolean;
  can_upload_media?: boolean;
  [key: string]: boolean | undefined;
}

/**
 * Band API Service
 * Handles all band-related API calls
 */
class BandService {
  // ============================================================================
  // BAND MANAGEMENT
  // ============================================================================

  /**
   * Get all public bands
   */
  async getAllBands(bookingManagerId?: string): Promise<Band[]> {
    const params = bookingManagerId ? { booking_manager_id: bookingManagerId } : undefined;
    return await apiService.get('/bands', params);
  }

  /**
   * Get band by ID
   */
  async getBandById(bandId: string): Promise<Band> {
    return await apiService.get(`/bands/${bandId}`);
  }

  /**
   * Get user's band limits and current count
   */
  async getBandLimits(): Promise<BandLimits> {
    return await apiService.get('/bands/my/limits');
  }

  /**
   * Get all bands user owns or is a member of
   */
  async getMyBands(): Promise<Band[]> {
    return await apiService.get('/bands/my/all');
  }

  /**
   * Create a new band
   * @param data Band creation data
   * @returns Created band with approval status
   */
  async createBand(data: CreateBandData): Promise<{
    success: boolean;
    band: Band;
    message: string;
    requiresApproval?: boolean;
    status: string;
    isSolo?: boolean;
  }> {
    return await apiService.post('/bands/create', data);
  }

  /**
   * Join an existing band
   * @param data Join band data
   * @returns Join request status
   */
  async joinBand(data: JoinBandData): Promise<{
    success: boolean;
    message: string;
    band: Band;
    status: string;
  }> {
    return await apiService.post('/bands/join', data);
  }

  /**
   * Update band profile
   * @param bandId Band ID
   * @param data Update data
   * @returns Updated band
   */
  async updateBand(bandId: string, data: UpdateBandData): Promise<Band> {
    return await apiService.put(`/bands/${bandId}`, data);
  }

  /**
   * Get band subscription level and features
   */
  async getBandSubscription(bandId: string): Promise<{
    success: boolean;
    bandId: string;
    subscription: SubscriptionResponse;
  }> {
    return await apiService.get(`/bands/${bandId}/subscription`);
  }

  /**
   * Get user's effective subscription (personal + bands)
   */
  async getMySubscription(): Promise<{
    success: boolean;
    subscription: SubscriptionResponse;
  }> {
    return await apiService.get('/bands/my/subscription');
  }

  // ============================================================================
  // BAND MEMBERS
  // ============================================================================

  /**
   * Get band members
   */
  async getBandMembers(bandId: string): Promise<BandMember[]> {
    return await apiService.get(`/band-members/${bandId}`);
  }

  /**
   * Add a band member
   */
  async addBandMember(
    bandId: string,
    data: {
      user_id: string;
      role?: string;
      permissions?: MemberPermissions;
    }
  ): Promise<BandMember> {
    return await apiService.post(`/band-members/${bandId}`, data);
  }

  /**
   * Update band member
   */
  async updateBandMember(
    bandId: string,
    memberId: string,
    data: {
      role?: string;
      status?: string;
      permissions?: MemberPermissions;
    }
  ): Promise<BandMember> {
    return await apiService.put(`/band-members/${bandId}/${memberId}`, data);
  }

  /**
   * Remove band member
   */
  async removeBandMember(bandId: string, memberId: string): Promise<void> {
    return await apiService.delete(`/band-members/${bandId}/${memberId}`);
  }

  /**
   * Approve pending band member
   */
  async approveBandMember(bandId: string, memberId: string): Promise<BandMember> {
    return await apiService.put(`/band-members/${bandId}/${memberId}/approve`, {});
  }

  /**
   * Reject pending band member
   */
  async rejectBandMember(bandId: string, memberId: string): Promise<void> {
    return await apiService.delete(`/band-members/${bandId}/${memberId}`);
  }

  // ============================================================================
  // BAND MEDIA
  // ============================================================================

  /**
   * Get band media files
   */
  async getBandMedia(bandId: string): Promise<BandMedia[]> {
    return await apiService.get(`/band-media/${bandId}`);
  }

  /**
   * Upload band media
   */
  async uploadBandMedia(
    bandId: string,
    file: FormData,
    onProgress?: (progress: number) => void
  ): Promise<BandMedia> {
    return await apiService.uploadFile(`/band-media/${bandId}`, file, onProgress);
  }

  /**
   * Delete band media
   */
  async deleteBandMedia(bandId: string, mediaId: string): Promise<void> {
    return await apiService.delete(`/band-media/${bandId}/${mediaId}`);
  }

  // ============================================================================
  // ARTIST DASHBOARD
  // ============================================================================

  /**
   * Get all artist dashboard data
   * Returns bands, tours, media, and booking agents
   */
  async getArtistDashboard(): Promise<ArtistDashboardData> {
    return await apiService.get('/artist-dashboard/data');
  }

  /**
   * Get artist payment ledger
   * Returns all payments sent to this artist from booking managers
   */
  async getPaymentLedger(): Promise<PaymentLedgerEntry[]> {
    return await apiService.get('/artist-dashboard/payment-ledger');
  }

  /**
   * Get band payment summary for a specific band
   */
  async getBandPaymentSummary(bandId: string): Promise<BandPaymentSummary[]> {
    return await apiService.get(`/artist-dashboard/band-payment-summary/${bandId}`);
  }
}

export default new BandService();
