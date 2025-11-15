import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';
import apiService, { ApiError } from './api';
import messageService from './messages';
import encryptionService from './encryption';
import { User, LoginCredentials, RegisterData } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  login: (credentials: LoginCredentials, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BIOMETRIC_KEY = 'biometricEnabled';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * Initialize authentication state
   * Check for stored token and biometric availability
   */
  const initializeAuth = async () => {
    try {
      // Check biometric availability
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);

      // Check if biometric is enabled
      const bioEnabled = await SecureStore.getItemAsync(BIOMETRIC_KEY);
      setBiometricEnabled(bioEnabled === 'true');

      // Try to restore session
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        try {
          const userData = await apiService.getCurrentUser();
          setUser(userData);
        } catch (error) {
          // Token expired or invalid, clear it
          await SecureStore.deleteItemAsync('authToken');
          await SecureStore.deleteItemAsync('userData');
        }
      }
    } catch (error) {
      if (__DEV__) console.error('Auth initialization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login with email and password
   */
  const login = async (credentials: LoginCredentials, rememberMe: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.login(credentials);
      setUser(response.user);

      // Initialize E2EE encryption keys
      try {
        await messageService.initializeE2EE();
        if (__DEV__) console.log('✅ E2EE initialized successfully');
      } catch (e2eeError) {
        if (__DEV__) console.error('⚠️ E2EE initialization failed (non-critical):', e2eeError);
        // Don't fail login if E2EE initialization fails
      }

      // SECURITY: Enable biometric for future logins using refresh token
      // We store the refresh token instead of credentials for better security
      if (rememberMe && response.refreshToken) {
        await SecureStore.setItemAsync(BIOMETRIC_KEY, 'true');
        await SecureStore.setItemAsync('refreshToken', response.refreshToken);
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Login failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      setIsLoading(true);
      await apiService.logout();
      setUser(null);

      // Clear encryption keys for security
      await encryptionService.clearKeys();
      messageService.clearPublicKeyCache();

      // Clear refresh token but keep biometric setting so user can re-login with biometric
      await SecureStore.deleteItemAsync('refreshToken');
    } catch (error) {
      if (__DEV__) console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register new user
   */
  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.register(data);

      // Auto-login after successful registration
      if (response.token && response.user) {
        setUser(response.user);

        // Initialize E2EE encryption keys for new user
        try {
          await messageService.initializeE2EE();
          if (__DEV__) console.log('✅ E2EE initialized for new user');
        } catch (e2eeError) {
          if (__DEV__) console.error('⚠️ E2EE initialization failed (non-critical):', e2eeError);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Registration failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh user data
   */
  const refreshUser = async () => {
    try {
      const userData = await apiService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      if (__DEV__) console.error('Failed to refresh user:', error);
      // If refresh fails, user might need to re-login
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
      }
    }
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Enable biometric authentication
   */
  const enableBiometric = async () => {
    try {
      if (!biometricAvailable) {
        Alert.alert(
          'Biometric Not Available',
          'Biometric authentication is not available on this device.'
        );
        return;
      }

      // Test biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Enable biometric login',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await SecureStore.setItemAsync(BIOMETRIC_KEY, 'true');
        setBiometricEnabled(true);
        Alert.alert('Success', 'Biometric authentication enabled!');
      }
    } catch (error) {
      if (__DEV__) console.error('Enable biometric error:', error);
      Alert.alert('Error', 'Failed to enable biometric authentication.');
    }
  };

  /**
   * Disable biometric authentication
   */
  const disableBiometric = async () => {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
      await SecureStore.deleteItemAsync('refreshToken');
      setBiometricEnabled(false);
      Alert.alert('Success', 'Biometric authentication disabled.');
    } catch (error) {
      if (__DEV__) console.error('Disable biometric error:', error);
    }
  };

  /**
   * Authenticate with biometric
   */
  const authenticateWithBiometric = async (): Promise<boolean> => {
    try {
      if (!biometricEnabled || !biometricAvailable) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Log in to Artist Space',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // SECURITY: Use refresh token instead of stored credentials
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (refreshToken) {
          try {
            const response = await apiService.refreshAuthToken(refreshToken);
            setUser(response.user);

            // Initialize E2EE for biometric login
            try {
              await messageService.initializeE2EE();
            } catch (e2eeError) {
              if (__DEV__) console.error('E2EE initialization failed:', e2eeError);
            }

            return true;
          } catch (refreshError) {
            // Refresh token expired or invalid, clear it
            await SecureStore.deleteItemAsync('refreshToken');
            await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
            setBiometricEnabled(false);
            return false;
          }
        }
      }

      return false;
    } catch (error) {
      if (__DEV__) console.error('Biometric authentication error:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        biometricAvailable,
        biometricEnabled,
        login,
        logout,
        register,
        refreshUser,
        clearError,
        enableBiometric,
        disableBiometric,
        authenticateWithBiometric,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
