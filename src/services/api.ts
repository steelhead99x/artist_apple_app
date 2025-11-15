import axios, { AxiosInstance, AxiosError } from 'axios';
import { Platform } from 'react-native';
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
const IS_WEB = Platform.OS === 'web';

// Validate API URL is configured
if (!process.env.EXPO_PUBLIC_API_BASE_URL) {
  console.warn('⚠️ EXPO_PUBLIC_API_BASE_URL not configured. Using default localhost. Please create .env file from .env.example');
}

// Warn if on web and using remote API (likely CORS issue)
if (IS_WEB && API_BASE_URL.startsWith('https://') && !API_BASE_URL.includes('localhost')) {
  console.warn('⚠️ CORS WARNING: You are on web platform using a remote API URL.');
  console.warn('   This will likely cause CORS errors unless the backend sends CORS headers.');
  console.warn('   Solutions:');
  console.warn('   1. Use the proxy server: npm run proxy (then set EXPO_PUBLIC_API_BASE_URL=http://localhost:3001/api)');
  console.warn('   2. Use native platforms: npm run ios or npm run android');
  console.warn('   3. Configure backend to send CORS headers');
  console.warn(`   Current API URL: ${API_BASE_URL}`);
}

// Error handling helper
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiService {
  private client: AxiosInstance;

  constructor() {
    // Configure default headers for CORS on web
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add CORS-friendly headers for web platform
    if (IS_WEB) {
      defaultHeaders['Accept'] = 'application/json';
      defaultHeaders['X-Requested-With'] = 'XMLHttpRequest';
    }

    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: defaultHeaders,
      timeout: API_TIMEOUT,
      // For web, don't send credentials by default unless needed
      withCredentials: false,
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
        // Handle CORS errors on web platform
        if (IS_WEB && !error.response) {
          const isCorsError = 
            error.message?.includes('CORS') ||
            error.message?.includes('Network Error') ||
            error.code === 'ERR_NETWORK' ||
            error.code === 'ECONNABORTED';

          if (isCorsError) {
            const corsMessage =
              'CORS error: The API server is not configured to allow requests from this origin. ' +
              'Please ensure the backend has CORS headers configured, or contact the API administrator.';

            throw new ApiError(
              corsMessage,
              undefined,
              { corsError: true, originalError: error.message, url: error.config?.url }
            );
          }
        }

        if (error.response?.status === 401) {
          // Clear token on unauthorized
          await deleteItemAsync('authToken');
          // You might want to trigger logout in your app here
        }

        const responseData = error.response?.data as Record<string, unknown> | undefined;
        const message =
          (responseData?.error as string) ||
          (responseData?.message as string) ||
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
      await setItemAsync('authToken', response.data.token);
      await setItemAsync('userData', JSON.stringify(response.data.user));
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

  async get<T = unknown>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  async post<T = unknown>(endpoint: string, data: unknown): Promise<T> {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  async put<T = unknown>(endpoint: string, data: unknown): Promise<T> {
    const response = await this.client.put(endpoint, data);
    return response.data;
  }

  async patch<T = unknown>(endpoint: string, data: unknown): Promise<T> {
    const response = await this.client.patch(endpoint, data);
    return response.data;
  }

  async delete<T = unknown>(endpoint: string): Promise<T> {
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

  async getStoredUser(): Promise<unknown | null> {
    try {
      const userJson = await getItemAsync('userData');
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      // Failed to parse stored user data, return null
      return null;
    }
  }
}

export default new ApiService();
