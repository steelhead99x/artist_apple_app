import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import { getItemAsync, setItemAsync, deleteItemAsync } from './storage';
import apiService, { ApiError } from './api';
import messageService from './messages';
import encryptionService from './encryption';
import { User, LoginCredentials, RegisterData } from '../types';

// Conditionally import LocalAuthentication only on native platforms
let LocalAuthentication: any = null;
if (Platform.OS !== 'web') {
  LocalAuthentication = require('expo-local-authentication');
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  biometricAvailable: boolean;
  biometricEnabled: boolean;
  login: (credentials: LoginCredentials, rememberMe?: boolean) => Promise<void>;
  loginWithPin: (email: string, pinCode: string) => Promise<void>;
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
      // Check biometric availability (only on native platforms)
      if (LocalAuthentication) {
        try {
          const compatible = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          setBiometricAvailable(compatible && enrolled);
        } catch (error) {
          console.warn('Biometric check failed:', error);
          setBiometricAvailable(false);
        }
      } else {
        setBiometricAvailable(false);
      }

      // Check if biometric is enabled
      const bioEnabled = await getItemAsync(BIOMETRIC_KEY);
      setBiometricEnabled(bioEnabled === 'true');

      // Try to restore session
      const token = await getItemAsync('authToken');
      if (token) {
        try {
          const userData = await apiService.getCurrentUser();
          setUser(userData);
        } catch (error) {
          // Token expired or invalid, clear it
          await deleteItemAsync('authToken');
          await deleteItemAsync('userData');
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
        await setItemAsync(BIOMETRIC_KEY, 'true');
        await setItemAsync('refreshToken', response.refreshToken);
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
   * Login with email and PIN code
   */
  const loginWithPin = async (email: string, pinCode: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiService.loginWithPin(email.trim().toLowerCase(), pinCode.trim());
      setUser(response.user);

      // Initialize E2EE encryption keys
      try {
        await messageService.initializeE2EE();
        if (__DEV__) console.log('✅ E2EE initialized successfully');
      } catch (e2eeError) {
        if (__DEV__) console.error('⚠️ E2EE initialization failed (non-critical):', e2eeError);
        // Don't fail login if E2EE initialization fails
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Invalid or expired PIN code. Please try again.';
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
      await deleteItemAsync('refreshToken');
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
      if (!LocalAuthentication || !biometricAvailable) {
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
        await setItemAsync(BIOMETRIC_KEY, 'true');
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
      await deleteItemAsync(BIOMETRIC_KEY);
      await deleteItemAsync('refreshToken');
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
      if (!LocalAuthentication || !biometricEnabled || !biometricAvailable) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Log in to Artist Space',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // SECURITY: Use refresh token instead of stored credentials
        const refreshToken = await getItemAsync('refreshToken');
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
            await deleteItemAsync('refreshToken');
            await deleteItemAsync(BIOMETRIC_KEY);
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
        loginWithPin,
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
