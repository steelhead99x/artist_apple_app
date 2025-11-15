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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../services/AuthContext';
import { Button, Input } from '../components/common';
import apiService from '../services/api';
import theme from '../theme';

interface LoginScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [usePinLogin, setUsePinLogin] = useState(true); // PIN is default
  const [pinRequested, setPinRequested] = useState(false);
  const [isRequestingPin, setIsRequestingPin] = useState(false);
  const { login, loginWithPin, authenticateWithBiometric, biometricAvailable, biometricEnabled, error, clearError } = useAuth();
  const [fadeAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send PIN code. Please try again.';
      Alert.alert('Error', errorMessage);
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
      await loginWithPin(email.trim().toLowerCase(), pinCode.trim());
      // Navigation is handled by the auth state change
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid or expired PIN code. Please try again.';
      Alert.alert('Login Failed', errorMessage);
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
      const errorMessage = err instanceof Error ? err.message : 'Invalid email or password. Please try again.';
      Alert.alert('Login Failed', errorMessage);
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
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Gradient Header */}
          <LinearGradient
            colors={theme.gradients.primary}
            style={styles.gradientHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Ionicons name="musical-notes" size={56} color="white" />
              </View>
              <Text style={styles.title}>Artist Space</Text>
              <Text style={styles.subtitle}>Connect. Create. Collaborate.</Text>
            </View>
          </LinearGradient>

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
          <TouchableOpacity 
            style={styles.helpButton}
            activeOpacity={0.7}
          >
            <Ionicons name="help-circle-outline" size={20} color={theme.colors.primary[500]} />
            <Text style={styles.helpText}>Need help signing in?</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 0,
    paddingTop: 0,
  },
  gradientHeader: {
    paddingTop: Platform.OS === 'web' ? 40 : 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: theme.borderRadius['2xl'],
    borderBottomRightRadius: theme.borderRadius['2xl'],
    marginBottom: 32,
    ...theme.shadows.lg,
  },
  header: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...theme.shadows.md,
  },
  title: {
    fontSize: theme.typography.sizes['4xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: 'white',
    marginBottom: 8,
    ...(Platform.OS === 'web' 
      ? { textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' }
      : {
          textShadowColor: 'rgba(0, 0, 0, 0.1)',
          textShadowOffset: { width: 0, height: 2 },
          textShadowRadius: 4,
        }
    ),
  },
  subtitle: {
    fontSize: theme.typography.sizes.base,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: theme.typography.fontWeights.medium,
  },
  toggleContainer: {
    marginBottom: 32,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  toggleLabel: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  toggleText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[400],
    fontWeight: theme.typography.fontWeights.medium,
  },
  toggleTextActive: {
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeights.semibold,
  },
  form: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 8,
  },
  checkboxLabel: {
    marginLeft: 12,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeights.medium,
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
    marginTop: 8,
  },
  linkText: {
    color: theme.colors.primary[500],
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
    paddingHorizontal: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.gray[200],
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.gray[400],
    fontWeight: theme.typography.fontWeights.semibold,
  },
  footer: {
    textAlign: 'center',
    color: theme.colors.gray[400],
    marginTop: 40,
    marginBottom: 24,
    fontSize: theme.typography.sizes.xs,
    lineHeight: 18,
    paddingHorizontal: 24,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  helpText: {
    marginLeft: 8,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeights.semibold,
  },
});
