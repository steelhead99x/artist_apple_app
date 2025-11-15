import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
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
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

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
        const token = await SecureStore.getItemAsync('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Handle responses and errors with automatic token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest: any = error.config;

        // If 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Wait for the current refresh to complete
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then(() => this.client.request(originalRequest))
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await SecureStore.getItemAsync('refreshToken');
            if (refreshToken) {
              // Try to refresh the token
              const response = await this.client.post('/auth/refresh', { refreshToken });

              if (response.data.token) {
                await SecureStore.setItemAsync('authToken', response.data.token);
                if (response.data.refreshToken) {
                  await SecureStore.setItemAsync('refreshToken', response.data.refreshToken);
                }

                // Update Authorization header
                originalRequest.headers.Authorization = `Bearer ${response.data.token}`;

                // Process queued requests
                this.failedQueue.forEach(({ resolve }) => resolve());
                this.failedQueue = [];

                // Retry original request
                return this.client.request(originalRequest);
              }
            }
          } catch (refreshError) {
            // Refresh failed, clear all auth data
            this.failedQueue.forEach(({ reject }) => reject(refreshError));
            this.failedQueue = [];

            await SecureStore.deleteItemAsync('authToken');
            await SecureStore.deleteItemAsync('refreshToken');
            await SecureStore.deleteItemAsync('userData');

            throw refreshError;
          } finally {
            this.isRefreshing = false;
          }
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
      await SecureStore.setItemAsync('authToken', response.data.token);
      // Store user data for offline access
      await SecureStore.setItemAsync('userData', JSON.stringify(response.data.user));
    }

    // Store refresh token if provided
    if (response.data.refreshToken) {
      await SecureStore.setItemAsync('refreshToken', response.data.refreshToken);
    }

    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.client.post('/auth/register', data);

    if (response.data.token) {
      await SecureStore.setItemAsync('authToken', response.data.token);
      await SecureStore.setItemAsync('userData', JSON.stringify(response.data.user));
    }

    // Store refresh token if provided
    if (response.data.refreshToken) {
      await SecureStore.setItemAsync('refreshToken', response.data.refreshToken);
    }

    return response.data;
  }

  async refreshAuthToken(refreshToken: string): Promise<AuthResponse> {
    const response = await this.client.post('/auth/refresh', { refreshToken });

    if (response.data.token) {
      await SecureStore.setItemAsync('authToken', response.data.token);
      await SecureStore.setItemAsync('userData', JSON.stringify(response.data.user));
    }

    // Update refresh token if a new one is provided
    if (response.data.refreshToken) {
      await SecureStore.setItemAsync('refreshToken', response.data.refreshToken);
    }

    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } catch (error) {
      // Logout anyway even if API call fails
    } finally {
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('userData');
      await SecureStore.deleteItemAsync('refreshToken');
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
    return await SecureStore.getItemAsync('authToken');
  }

  async getStoredUser(): Promise<any | null> {
    try {
      const userJson = await SecureStore.getItemAsync('userData');
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      // If JSON parsing fails, clear corrupted data
      if (__DEV__) console.error('Failed to parse stored user data:', error);
      await SecureStore.deleteItemAsync('userData');
      return null;
    }
  }
}

export default new ApiService();
