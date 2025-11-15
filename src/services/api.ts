import axios, { AxiosInstance, AxiosError } from 'axios';
import { getItemAsync, setItemAsync, deleteItemAsync } from './storage';
import {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  ApiResponse
} from '../types';

// Configuration
// Load from environment variables (configured in .env file)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8787/api';
const API_TIMEOUT = parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '15000', 10);

// Validate API URL is configured
if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
  console.warn('⚠️ EXPO_PUBLIC_API_BASE_URL not configured. Using default localhost. Please create .env file from .env.example');
}

// Error handling helper
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: API_TIMEOUT,
    });

    // Add auth token to requests
    this.client.interceptors.request.use(
      async (config) => {
        const token = await getItemAsync('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Handle responses and errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Clear token on unauthorized
          await deleteItemAsync('authToken');
          // You might want to trigger logout in your app here
        }

        const message =
          (error.response?.data as any)?.error ||
          (error.response?.data as any)?.message ||
          error.message ||
          'An unexpected error occurred';

        throw new ApiError(
          message,
          error.response?.status,
          error.response?.data
        );
      }
    );
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.client.post('/auth/login', credentials);

    if (response.data.token) {
      await setItemAsync('authToken', response.data.token);
      // Store user data for offline access
      await setItemAsync('userData', JSON.stringify(response.data.user));
    }

    return response.data;
  }

  async requestLoginPin(email: string): Promise<ApiResponse> {
    const response = await this.client.post('/auth/request-login-pin', { email });
    return response.data;
  }

  async loginWithPin(email: string, pinCode: string): Promise<AuthResponse> {
    const response = await this.client.post('/auth/login', {
      email: email.trim().toLowerCase(),
      pinCode
    });

    if (response.data.token) {
      await setItemAsync('authToken', response.data.token);
      // Store user data for offline access
      await setItemAsync('userData', JSON.stringify(response.data.user));
    }

    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.client.post('/auth/register', data);

    if (response.data.token) {
      await SecureStore.setItemAsync('authToken', response.data.token);
      await SecureStore.setItemAsync('userData', JSON.stringify(response.data.user));
    }

    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } catch (error) {
      // Logout anyway even if API call fails
    } finally {
      await deleteItemAsync('authToken');
      await deleteItemAsync('userData');
    }
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async requestPasswordReset(email: string) {
    const response = await this.client.post('/password-reset/request', { email });
    return response.data;
  }

  async verifyPasswordResetPin(email: string, pin_code: string) {
    const response = await this.client.post('/password-reset/verify', { email, pin_code });
    return response.data;
  }

  async resetPassword(email: string, pin_code: string, new_password: string) {
    const response = await this.client.post('/password-reset/reset', {
      email,
      pin_code,
      new_password
    });
    return response.data;
  }

  // ============================================================================
  // GENERIC API METHODS
  // ============================================================================

  async get<T = any>(endpoint: string, params?: any): Promise<T> {
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  async post<T = any>(endpoint: string, data: any): Promise<T> {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  async put<T = any>(endpoint: string, data: any): Promise<T> {
    const response = await this.client.put(endpoint, data);
    return response.data;
  }

  async patch<T = any>(endpoint: string, data: any): Promise<T> {
    const response = await this.client.patch(endpoint, data);
    return response.data;
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    const response = await this.client.delete(endpoint);
    return response.data;
  }

  // ============================================================================
  // FILE UPLOAD
  // ============================================================================

  async uploadFile(endpoint: string, file: FormData, onProgress?: (progress: number) => void) {
    const response = await this.client.post(endpoint, file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return response.data;
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  async healthCheck() {
    const response = await this.client.get('/health');
    return response.data;
  }

  // ============================================================================
  // UTILITY
  // ============================================================================

  async getStoredToken(): Promise<string | null> {
    return await getItemAsync('authToken');
  }

  async getStoredUser(): Promise<any | null> {
    const userJson = await getItemAsync('userData');
    return userJson ? JSON.parse(userJson) : null;
  }
}

export default new ApiService();
