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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import { Button, Input } from '../components/common';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login, authenticateWithBiometric, biometricAvailable, biometricEnabled, error, clearError } = useAuth();

  const handleLogin = async () => {
    // Clear any previous errors
    clearError();

    // Validation
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    if (!password) {
      Alert.alert('Password Required', 'Please enter your password.');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    try {
      await login({ email: email.trim().toLowerCase(), password }, rememberMe);
      // Navigation is handled by the auth state change
    } catch (err) {
      // Error is displayed via the AuthContext
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

          {/* Login Form */}
          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              icon="mail-outline"
              error={error?.toLowerCase().includes('email') ? error : undefined}
            />

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
              onPress={handleLogin}
              variant="primary"
              size="large"
              fullWidth
              icon="log-in-outline"
              style={styles.loginButton}
            />

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

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleForgotPassword}
            >
              <Text style={styles.linkText}>Forgot your password?</Text>
            </TouchableOpacity>
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
    marginBottom: 40,
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
  loginButton: {
    marginBottom: 12,
  },
  biometricButton: {
    marginBottom: 16,
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
