# Authentication
## Multi-Method Authentication System

Complete guide to the Artist Space authentication system with support for email/password, PIN, biometric, and wallet-based authentication.

---

## 🔒 Authentication Methods

Artist Space supports four authentication methods:

1. **Email/Password** - Traditional authentication
2. **PIN** - Quick 4-6 digit PIN login
3. **Biometric** - Face ID, Touch ID, Fingerprint
4. **Wallet** - Ethereum wallet-based authentication

---

## 📧 Email/Password Authentication

### Registration

**Flow:**
```
User enters email + password
    ↓
Frontend validates password strength
    ↓
Backend hashes password with bcrypt (10 rounds)
    ↓
User record created with status 'pending' or 'approved'
    ↓
JWT tokens generated (1-day access, 30-day refresh)
    ↓
User logged in
```

**Code Example:**
```typescript
import { useAuth } from '../services/AuthContext';

function RegisterScreen() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleRegister = async () => {
    try {
      await register(email, password, name, 'user');
      // User is now logged in
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Registration Failed', error.message);
    }
  };

  return (
    <View>
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Input
        label="Full Name"
        value={name}
        onChangeText={setName}
      />
      <Button title="Register" onPress={handleRegister} />
    </View>
  );
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Login

**Code Example:**
```typescript
import { useAuth } from '../services/AuthContext';

function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    try {
      await login(email, password);
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Login Failed', 'Invalid email or password');
    }
  };

  return (
    <View>
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}
```

---

## 🔢 PIN Authentication

### Setup

Users can set up a PIN for quick authentication after initial login.

**Code Example:**
```typescript
import * as SecureStore from 'expo-secure-store';
import { hashPassword } from '../utils/crypto';

async function setupPIN(pin: string): Promise<void> {
  // Validate PIN (4-6 digits)
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error('PIN must be 4-6 digits');
  }

  // Hash PIN before storing
  const hashedPIN = await hashPassword(pin);

  // Store hashed PIN securely
  await SecureStore.setItemAsync('userPIN', hashedPIN);
}
```

### Login with PIN

**Code Example:**
```typescript
import * as SecureStore from 'expo-secure-store';
import { verifyPassword } from '../utils/crypto';

async function loginWithPIN(pin: string): Promise<void> {
  // Get stored hashed PIN
  const hashedPIN = await SecureStore.getItemAsync('userPIN');

  if (!hashedPIN) {
    throw new Error('PIN not set up');
  }

  // Verify PIN
  const isValid = await verifyPassword(pin, hashedPIN);

  if (!isValid) {
    throw new Error('Invalid PIN');
  }

  // Continue with authentication...
}
```

**Security Features:**
- PIN is hashed before storage
- 3 attempts limit per 15 minutes
- Auto-lock after failed attempts

---

## 👆 Biometric Authentication

### Setup

Enable biometric authentication (Face ID, Touch ID, Fingerprint).

**Code Example:**
```typescript
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

async function setupBiometric(): Promise<void> {
  // Check if biometric is available
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) {
    throw new Error('Biometric hardware not available');
  }

  // Check if biometric is enrolled
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!isEnrolled) {
    throw new Error('No biometric data enrolled');
  }

  // Enable biometric auth
  await SecureStore.setItemAsync('biometricEnabled', 'true');
}
```

### Login with Biometric

**Code Example:**
```typescript
import * as LocalAuthentication from 'expo-local-authentication';

async function loginWithBiometric(): Promise<void> {
  // Check if enabled
  const enabled = await SecureStore.getItemAsync('biometricEnabled');
  if (enabled !== 'true') {
    throw new Error('Biometric auth not enabled');
  }

  // Authenticate
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to access Artist Space',
    fallbackLabel: 'Use PIN',
    disableDeviceFallback: false,
  });

  if (!result.success) {
    throw new Error('Biometric authentication failed');
  }

  // User authenticated, retrieve stored credentials
  const token = await SecureStore.getItemAsync('authToken');

  if (token) {
    // Validate token and log in
    await validateAndLogin(token);
  }
}
```

---

## 💼 Wallet Authentication

### Connect Wallet

Authenticate using Ethereum wallet address.

**Code Example:**
```typescript
import { ethers } from 'ethers';

async function connectWallet(): Promise<string> {
  // Request wallet connection
  const provider = new ethers.providers.Web3Provider(window.ethereum);

  await provider.send('eth_requestAccounts', []);
  const signer = provider.getSigner();
  const address = await signer.getAddress();

  return address;
}

async function loginWithWallet(walletAddress: string): Promise<void> {
  // Request signature for verification
  const message = `Sign this message to authenticate with Artist Space.\nTimestamp: ${Date.now()}`;
  const signature = await signMessage(message, walletAddress);

  // Send to backend for verification
  const response = await apiService.post('/auth/wallet', {
    walletAddress,
    message,
    signature,
  });

  // Store tokens
  await SecureStore.setItemAsync('authToken', response.data.token);
  await SecureStore.setItemAsync('refreshToken', response.data.refreshToken);
}
```

---

## 🔄 Token Management

### Access & Refresh Tokens

**Token Lifecycle:**
- **Access Token**: 1 day expiration
- **Refresh Token**: 30 days expiration

**Code Example:**
```typescript
import apiService from '../services/api';
import * as SecureStore from 'expo-secure-store';

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await SecureStore.getItemAsync('refreshToken');

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await apiService.post('/auth/refresh', {
    refreshToken,
  });

  const { token, refreshToken: newRefreshToken } = response.data;

  // Store new tokens
  await SecureStore.setItemAsync('authToken', token);
  await SecureStore.setItemAsync('refreshToken', newRefreshToken);

  return token;
}
```

### Automatic Token Refresh

**Axios Interceptor:**
```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

apiService.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh token
        const newToken = await refreshAccessToken();

        // Update header
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        // Retry original request
        return apiService(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        await logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

---

## 🔐 Secure Storage

All authentication credentials are stored securely using Expo SecureStore.

**What's Stored:**
- `authToken` - JWT access token
- `refreshToken` - JWT refresh token
- `userPIN` - Hashed PIN (if enabled)
- `biometricEnabled` - Biometric auth flag
- `e2eeSecretKey` - E2EE private key

**Storage API:**
```typescript
import * as SecureStore from 'expo-secure-store';

// Store
await SecureStore.setItemAsync('authToken', token);

// Retrieve
const token = await SecureStore.getItemAsync('authToken');

// Delete
await SecureStore.deleteItemAsync('authToken');
```

**Security Features:**
- iOS: Keychain (encrypted)
- Android: EncryptedSharedPreferences
- Biometric-protected on supported devices

---

## 🛡️ Security Best Practices

### 1. Never Store Plain Text Credentials

```typescript
// ❌ NEVER do this
await SecureStore.setItemAsync('password', password);

// ✅ Always hash sensitive data
const hashedPIN = await hashPassword(pin);
await SecureStore.setItemAsync('userPIN', hashedPIN);
```

### 2. Handle Token Expiration

```typescript
// ✅ Always handle 401 errors
try {
  const response = await apiService.get('/users/me');
} catch (error) {
  if (error.response?.status === 401) {
    await refreshAccessToken();
    // Retry request
  }
}
```

### 3. Logout Securely

```typescript
async function logout(): Promise<void> {
  // Clear all tokens
  await SecureStore.deleteItemAsync('authToken');
  await SecureStore.deleteItemAsync('refreshToken');

  // Clear E2EE keys if desired
  // await SecureStore.deleteItemAsync('e2eeSecretKey');

  // Notify backend (optional)
  try {
    await apiService.post('/auth/logout');
  } catch (error) {
    // Ignore logout errors
  }

  // Navigate to login
  navigation.navigate('Login');
}
```

### 4. Rate Limiting

Backend enforces rate limiting:
- **Login**: 5 attempts per 15 minutes per IP
- **PIN Verification**: 3 attempts per 15 minutes per user
- **Token Refresh**: 10 attempts per 15 minutes per user

---

## 🔍 Troubleshooting

### "Invalid credentials"

**Causes:**
- Wrong email or password
- Account not approved
- Account disabled

**Solution:**
```typescript
try {
  await login(email, password);
} catch (error) {
  if (error.response?.status === 401) {
    Alert.alert('Login Failed', 'Invalid email or password');
  } else if (error.response?.status === 403) {
    Alert.alert('Account Pending', 'Your account is awaiting approval');
  }
}
```

### "Token expired"

**Cause:** Access token has expired (after 1 day)

**Solution:**
Automatic refresh is handled by interceptor, but you can also manually refresh:
```typescript
await refreshAccessToken();
```

### "Biometric not available"

**Causes:**
- Device doesn't have biometric hardware
- No biometric data enrolled

**Solution:**
```typescript
const hasHardware = await LocalAuthentication.hasHardwareAsync();
const isEnrolled = await LocalAuthentication.isEnrolledAsync();

if (!hasHardware) {
  Alert.alert('Not Supported', 'Your device doesn\'t support biometric authentication');
} else if (!isEnrolled) {
  Alert.alert('Not Set Up', 'Please enroll Face ID/Touch ID in your device settings');
}
```

---

## 📱 Complete Auth Flow Example

```typescript
import React, { useState, useEffect } from 'react';
import { useAuth } from '../services/AuthContext';
import * as LocalAuthentication from 'expo-local-authentication';

function AuthScreen() {
  const { login, loginWithBiometric } = useAuth();
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometric();
  }, []);

  async function checkBiometric() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const enabled = await SecureStore.getItemAsync('biometricEnabled');

    setBiometricAvailable(hasHardware && isEnrolled && enabled === 'true');
  }

  async function handleBiometricLogin() {
    try {
      await loginWithBiometric();
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Authentication Failed', error.message);
    }
  }

  async function handleEmailLogin() {
    try {
      await login(email, password);
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    }
  }

  return (
    <View>
      {biometricAvailable && (
        <Button
          title="Login with Biometric"
          onPress={handleBiometricLogin}
        />
      )}

      <Input label="Email" value={email} onChangeText={setEmail} />
      <Input
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button title="Login" onPress={handleEmailLogin} />
    </View>
  );
}
```

---

## 🔗 Related Documentation

- **[Security Guide](../../SECURITY_IMPLEMENTATION_GUIDE.md)** - Complete security overview
- **[API Documentation](../API.md)** - Auth endpoints reference
- **[Architecture](../ARCHITECTURE.md)** - System design

---

**Last Updated:** 2025-11-15
