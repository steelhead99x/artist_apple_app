import apiService from './api';
import { TourDate, CreateTourData, TourKPI } from '../types';

/**
 * Tour API Service
 * Handles all tour and booking-related API calls
 */
class TourService {
  // ============================================================================
  // TOUR DATES
  // ============================================================================

  /**
   * Get all tour dates with filters
   */
  async getTours(params?: {
    status?: string;
    band_id?: string;
    venue_id?: string;
  }): Promise<TourDate[]> {
    return await apiService.get('/tours', params);
  }

  /**
   * Get my tour dates (as a band member)
   */
  async getMyTours(): Promise<TourDate[]> {
    return await apiService.get('/tours/my-tours');
  }

  /**
   * Get all tour dates for a specific tour
   */
  async getTourDates(tourId: string): Promise<TourDate[]> {
    return await apiService.get(`/tours/tour/${tourId}`);
  }

  /**
   * Create new tour date
   */
  async createTour(data: CreateTourData): Promise<TourDate> {
    return await apiService.post('/tours', data);
  }

  /**
   * Update tour date
   */
  async updateTour(
    tourId: string,
    data: {
      status?: string;
      date?: string;
      start_time?: string;
      end_time?: string;
      payment_amount?: number;
      payment_currency?: string;
      notes?: string;
    }
  ): Promise<TourDate> {
    return await apiService.put(`/tours/${tourId}`, data);
  }

  /**
   * Delete/cancel tour date
   */
  async cancelTour(tourId: string): Promise<void> {
    return await apiService.put(`/tours/${tourId}`, { status: 'cancelled' });
  }

  // ============================================================================
  // TOUR KPIs
  // ============================================================================

  /**
   * Get KPIs for a tour
   */
  async getTourKPIs(tourId: string): Promise<TourKPI> {
    return await apiService.get(`/tours/${tourId}/kpis`);
  }

  /**
   * Add KPIs to tour (for venues/agents)
   */
  async addTourKPIs(
    tourId: string,
    data: {
      attendance?: number;
      bar_sales?: number;
      sales_currency?: string;
      new_customers?: number;
      notes?: string;
    }
  ): Promise<TourKPI> {
    return await apiService.post(`/tours/${tourId}/kpis`, data);
  }

  /**
   * Update tour KPIs
   */
  async updateTourKPIs(
    tourId: string,
    data: {
      attendance?: number;
      bar_sales?: number;
      sales_currency?: string;
      new_customers?: number;
      notes?: string;
    }
  ): Promise<TourKPI> {
    return await apiService.put(`/tours/${tourId}/kpis`, data);
  }

  // ============================================================================
  // TOUR MANAGEMENT (Multi-date tours)
  // ============================================================================

  /**
   * Get bands for tour management
   */
  async getBandsForTour(): Promise<any[]> {
    return await apiService.get('/tours-management/bands');
  }

  /**
   * Create multi-date tour
   */
  async createMultiDateTour(data: {
    tour_name: string;
    band_id: string;
    description?: string;
    dates: Array<{
      venue_id: string;
      date: string;
      start_time: string;
      end_time?: string;
      payment_amount?: number;
      payment_currency?: string;
      notes?: string;
    }>;
  }): Promise<any> {
    return await apiService.post('/tours-management/tours', data);
  }

  /**
   * Add dates to existing tour
   */
  async addTourDates(
    tourId: string,
    dates: Array<{
      venue_id: string;
      date: string;
      start_time: string;
      end_time?: string;
      payment_amount?: number;
      payment_currency?: string;
      notes?: string;
    }>
  ): Promise<any> {
    return await apiService.post(`/tours-management/tours/${tourId}/dates`, { dates });
  }
}

export default new TourService();
