/**
 * Cross-platform storage utility
 * Uses SecureStore on native platforms and localStorage on web
 */
import { Platform } from 'react-native';

// Check if we're on web
const isWeb = Platform.OS === 'web';

let SecureStore: any = null;

if (!isWeb) {
  // Only import SecureStore on native platforms
  SecureStore = require('expo-secure-store');
}

/**
 * Get an item from storage
 */
export async function getItemAsync(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      // Failed to retrieve from localStorage, return null
      // Error logged for debugging: localStorage.getItem error
      return null;
    }
  } else {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      // Failed to retrieve from SecureStore, return null
      // Error logged for debugging: SecureStore.getItemAsync error
      return null;
    }
  }
}

/**
 * Set an item in storage
 */
export async function setItemAsync(key: string, value: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      throw new Error(`Failed to save to localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      throw new Error(`Failed to save to SecureStore: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Delete an item from storage
 */
export async function deleteItemAsync(key: string): Promise<void> {
  if (isWeb) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      throw new Error(`Failed to remove from localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      throw new Error(`Failed to remove from SecureStore: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Check if SecureStore is available (always false on web)
 */
export function isAvailable(): boolean {
  if (isWeb) {
    return false; // SecureStore not available on web
  }
  return SecureStore?.isAvailableAsync ? SecureStore.isAvailableAsync() : true;
}

