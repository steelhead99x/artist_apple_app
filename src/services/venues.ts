import apiService from './api';
import { Venue } from '../types';

/**
 * Venue API Service
 * Handles all venue-related API calls
 */
class VenueService {
  // ============================================================================
  // VENUE MANAGEMENT
  // ============================================================================

  /**
   * Get all venues
   */
  async getAllVenues(): Promise<Venue[]> {
    return await apiService.get('/bars'); // Note: venues are called "bars" in backend
  }

  /**
   * Get venue by ID
   */
  async getVenueById(venueId: string): Promise<Venue> {
    return await apiService.get(`/bars/${venueId}`);
  }

  /**
   * Create a new venue
   */
  async createVenue(data: {
    venue_name: string;
    address: string;
    city: string;
    state: string;
    capacity?: number;
    description?: string;
    amenities?: string[];
    eth_wallet?: string;
  }): Promise<Venue> {
    return await apiService.post('/bars', data);
  }

  /**
   * Update venue profile
   */
  async updateVenue(venueId: string, data: Partial<Venue>): Promise<void> {
    return await apiService.put(`/bars/${venueId}`, data);
  }

  // ============================================================================
  // PREMIUM CONTENT (for premium venue subscribers)
  // ============================================================================

  /**
   * Get premium video content
   * Requires venue premium subscription
   */
  async getPremiumContent(): Promise<{
    success: boolean;
    assets: Array<{
      id: string;
      title: string;
      description: string;
      playbackId: string;
      thumbnailTime: number;
    }>;
    total: number;
    max_allowed: number;
  }> {
    return await apiService.get('/venue/premium-content');
  }

  /**
   * Get premium band analytics
   * Requires venue premium subscription
   */
  async getPremiumBandInfo(): Promise<{
    success: boolean;
    bands: Array<{
      id: string;
      band_name: string;
      genre?: string;
      description?: string;
      members: any[];
      stats: {
        total_shows: number;
        avg_attendance: number;
        total_revenue: number;
        avg_rating: number;
        review_count: number;
      };
      social_media: {
        instagram?: string | null;
        facebook?: string | null;
        twitter?: string | null;
        spotify?: string | null;
      };
      upcoming_shows: number;
      last_performance_date?: string | null;
    }>;
  }> {
    return await apiService.get('/venue/bands/premium-info');
  }

  /**
   * Get specific band premium info
   */
  async getBandPremiumInfo(bandId: string): Promise<{
    success: boolean;
    band: any;
  }> {
    return await apiService.get(`/venue/bands/${bandId}/premium-info`);
  }
}

export default new VenueService();
