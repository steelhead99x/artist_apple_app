import apiService from './api';
import { RecordingStudio, StudioSession } from '../types';

/**
 * Studio API Service
 * Handles all recording studio-related API calls
 */
class StudioService {
  // ============================================================================
  // STUDIO MANAGEMENT
  // ============================================================================

  /**
   * Get all studios
   */
  async getAllStudios(): Promise<RecordingStudio[]> {
    return await apiService.get('/studios');
  }

  /**
   * Get studio by ID
   */
  async getStudioById(studioId: string): Promise<RecordingStudio> {
    return await apiService.get(`/studios/${studioId}`);
  }

  /**
   * Create a new studio
   */
  async createStudio(data: {
    studio_name: string;
    description?: string;
    address?: string;
    city?: string;
    state?: string;
    equipment?: any;
    daw_software?: string;
    hourly_rate?: number;
    eth_wallet?: string;
    website?: string;
    protools_version?: string;
    sonobus_enabled?: boolean;
    webrtc_enabled?: boolean;
  }): Promise<RecordingStudio> {
    return await apiService.post('/studios', data);
  }

  /**
   * Update studio profile
   */
  async updateStudio(studioId: string, data: Partial<RecordingStudio>): Promise<void> {
    return await apiService.put(`/studios/${studioId}`, data);
  }

  // ============================================================================
  // STUDIO SESSIONS
  // ============================================================================

  /**
   * Get all sessions
   */
  async getSessions(params?: {
    studio_id?: string;
    band_id?: string;
    status?: string;
  }): Promise<StudioSession[]> {
    return await apiService.get('/sessions', params);
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<StudioSession> {
    return await apiService.get(`/sessions/${sessionId}`);
  }

  /**
   * Create a new session
   */
  async createSession(data: {
    studio_id: string;
    band_id: string;
    session_date: string;
    start_time: string;
    end_time?: string;
    connection_type?: string;
    session_notes?: string;
    livekit_room_name?: string;
  }): Promise<StudioSession> {
    return await apiService.post('/sessions', data);
  }

  /**
   * Update session
   */
  async updateSession(
    sessionId: string,
    data: {
      end_time?: string;
      session_notes?: string;
      recording_files?: any;
      status?: string;
    }
  ): Promise<StudioSession> {
    return await apiService.put(`/sessions/${sessionId}`, data);
  }

  /**
   * End session (sets end_time and calculates duration)
   */
  async endSession(sessionId: string): Promise<StudioSession> {
    return await apiService.put(`/sessions/${sessionId}`, {
      end_time: new Date().toISOString(),
      status: 'completed',
    });
  }

  /**
   * Cancel session
   */
  async cancelSession(sessionId: string): Promise<void> {
    return await apiService.put(`/sessions/${sessionId}`, {
      status: 'cancelled',
    });
  }
}

export default new StudioService();
