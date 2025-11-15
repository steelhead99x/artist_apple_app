import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import { Button, Input } from '../components/common';
import apiService from '../services/api';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [usePinLogin, setUsePinLogin] = useState(true); // PIN is default
  const [pinRequested, setPinRequested] = useState(false);
  const [isRequestingPin, setIsRequestingPin] = useState(false);
  const { login, authenticateWithBiometric, biometricAvailable, biometricEnabled, error, clearError } = useAuth();

  const handleRequestPin = async () => {
    clearError();

    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    try {
      setIsRequestingPin(true);
      await apiService.requestLoginPin(email.trim().toLowerCase());
      setPinRequested(true);
      Alert.alert(
        'PIN Sent',
        'A 9-digit PIN code has been sent to your email. Please check your inbox and enter the code below. The PIN will expire in 15 minutes.'
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send PIN code. Please try again.');
    } finally {
      setIsRequestingPin(false);
    }
  };

  const handlePinLogin = async () => {
    clearError();

    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    if (!pinCode.trim()) {
      Alert.alert('PIN Required', 'Please enter the 9-digit PIN code sent to your email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    try {
      await apiService.loginWithPin(email.trim().toLowerCase(), pinCode.trim());
      // Navigation is handled by the auth state change
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid or expired PIN code. Please try again.');
      console.error('PIN login error:', err);
    }
  };

  const handlePasswordLogin = async () => {
    clearError();

    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    if (!password) {
      Alert.alert('Password Required', 'Please enter your password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    try {
      await login({ email: email.trim().toLowerCase(), password }, rememberMe);
      // Navigation is handled by the auth state change
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const success = await authenticateWithBiometric();
      if (!success) {
        Alert.alert(
          'Biometric Login',
          'Biometric authentication is not set up. Please log in with your email and password first.'
        );
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to authenticate with biometrics.');
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleCreateAccount = () => {
    navigation.navigate('Register');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Logo/Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="musical-notes" size={48} color="#6366f1" />
            </View>
            <Text style={styles.title}>Artist Space</Text>
            <Text style={styles.subtitle}>Connect. Create. Collaborate.</Text>
          </View>

          {/* Login Method Toggle */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>
              {usePinLogin ? 'Login with PIN' : 'Login with Password'}
            </Text>
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleText, !usePinLogin && styles.toggleTextActive]}>
                Password
              </Text>
              <Switch
                value={usePinLogin}
                onValueChange={(value) => {
                  setUsePinLogin(value);
                  setPinRequested(false);
                  setPinCode('');
                  setPassword('');
                  clearError();
                }}
                trackColor={{ false: '#cbd5e1', true: '#a5b4fc' }}
                thumbColor={usePinLogin ? '#6366f1' : '#f1f5f9'}
                ios_backgroundColor="#cbd5e1"
              />
              <Text style={[styles.toggleText, usePinLogin && styles.toggleTextActive]}>
                PIN
              </Text>
            </View>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setPinRequested(false);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              icon="mail-outline"
              error={error?.toLowerCase().includes('email') ? error : undefined}
            />

            {usePinLogin ? (
              <>
                {!pinRequested ? (
                  <Button
                    title="Send PIN to Email"
                    onPress={handleRequestPin}
                    variant="primary"
                    size="large"
                    fullWidth
                    icon="mail-outline"
                    style={styles.requestPinButton}
                    disabled={isRequestingPin}
                  />
                ) : (
                  <>
                    <Input
                      label="PIN Code"
                      placeholder="Enter 9-digit PIN"
                      value={pinCode}
                      onChangeText={setPinCode}
                      keyboardType="number-pad"
                      autoCapitalize="none"
                      maxLength={9}
                      icon="key-outline"
                      error={error?.toLowerCase().includes('pin') ? error : undefined}
                    />

                    <Button
                      title="Log In with PIN"
                      onPress={handlePinLogin}
                      variant="primary"
                      size="large"
                      fullWidth
                      icon="log-in-outline"
                      style={styles.loginButton}
                    />

                    <TouchableOpacity
                      style={styles.linkButton}
                      onPress={() => {
                        setPinRequested(false);
                        setPinCode('');
                      }}
                    >
                      <Text style={styles.linkText}>Request a new PIN</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            ) : (
              <>
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  icon="lock-closed-outline"
                  error={error?.toLowerCase().includes('password') ? error : undefined}
                />

                {/* Remember Me */}
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={rememberMe ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={rememberMe ? '#6366f1' : '#94a3b8'}
                  />
                  <Text style={styles.checkboxLabel}>Remember me (for biometric login)</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <Button
                  title="Log In"
                  onPress={handlePasswordLogin}
                  variant="primary"
                  size="large"
                  fullWidth
                  icon="log-in-outline"
                  style={styles.loginButton}
                />

                {/* Forgot Password */}
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={handleForgotPassword}
                >
                  <Text style={styles.linkText}>Forgot your password?</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Biometric Login */}
            {biometricAvailable && biometricEnabled && (
              <Button
                title={`Use ${Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Fingerprint'}`}
                onPress={handleBiometricLogin}
                variant="outline"
                size="medium"
                fullWidth
                icon={Platform.OS === 'ios' ? 'finger-print' : 'fingerprint'}
                style={styles.biometricButton}
              />
            )}
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          {/* Create Account */}
          <Button
            title="Create New Account"
            onPress={handleCreateAccount}
            variant="outline"
            size="large"
            fullWidth
            icon="person-add-outline"
          />

          {/* Footer */}
          <Text style={styles.footer}>
            For Artists • Bands • Studios • Venues • Booking Agents
          </Text>

          {/* Help */}
          <TouchableOpacity style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={20} color="#6366f1" />
            <Text style={styles.helpText}>Need help signing in?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  toggleContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  form: {
    marginBottom: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748b',
  },
  requestPinButton: {
    marginTop: 8,
  },
  loginButton: {
    marginBottom: 12,
  },
  biometricButton: {
    marginTop: 8,
  },
  linkButton: {
    padding: 12,
    alignItems: 'center',
  },
  linkText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 32,
    fontSize: 12,
    lineHeight: 18,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 8,
  },
  helpText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
});
