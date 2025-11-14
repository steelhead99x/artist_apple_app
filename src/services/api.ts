import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';

// Configuration
const API_BASE_URL = 'https://stage-www.artist-space.com/api';
// Change to production when ready: https://www.artist-space.com/api

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
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

    // Handle 401 unauthorized responses
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await SecureStore.deleteItemAsync('authToken');
          // Trigger logout in your app
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(username: string, password: string) {
    const response = await this.client.post('/auth/login', {
      username,
      password,
    });
    
    if (response.data.token) {
      await SecureStore.setItemAsync('authToken', response.data.token);
    }
    
    return response.data;
  }

  async register(data: { username: string; email: string; password: string; userType: string }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async logout() {
    await SecureStore.deleteItemAsync('authToken');
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Generic API methods
  async get(endpoint: string, params?: any) {
    const response = await this.client.get(endpoint, { params });
    return response.data;
  }

  async post(endpoint: string, data: any) {
    const response = await this.client.post(endpoint, data);
    return response.data;
  }

  async put(endpoint: string, data: any) {
    const response = await this.client.put(endpoint, data);
    return response.data;
  }

  async delete(endpoint: string) {
    const response = await this.client.delete(endpoint);
    return response.data;
  }
}

export default new ApiService();
