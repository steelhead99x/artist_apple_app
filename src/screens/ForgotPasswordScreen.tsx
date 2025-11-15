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
import { Button, Input } from '../components/common';
import apiService from '../services/api';

type Step = 'request' | 'verify' | 'reset';

interface ForgotPasswordScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string) => void;
  };
}

export default function ForgotPasswordScreen({ navigation }: ForgotPasswordScreenProps) {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRequestPin = async () => {
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
      setIsLoading(true);
      await apiService.requestPasswordReset(email.trim().toLowerCase());
      setStep('verify');
      Alert.alert(
        'PIN Sent',
        'A PIN code has been sent to your email. Please check your inbox and enter the code below.'
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send PIN code. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPin = async () => {
    if (!pinCode.trim()) {
      Alert.alert('PIN Required', 'Please enter the PIN code sent to your email.');
      return;
    }

    try {
      setIsLoading(true);
      await apiService.verifyPasswordResetPin(email.trim().toLowerCase(), pinCode.trim());
      setStep('reset');
      Alert.alert('PIN Verified', 'Please enter your new password.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid or expired PIN code. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      Alert.alert('Password Required', 'Please enter a new password.');
      return;
    }

    if (newPassword.length < 12) {
      Alert.alert('Weak Password', 'Password must be at least 12 characters long.');
      return;
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial) {
      Alert.alert(
        'Weak Password',
        'Password must contain uppercase, lowercase, number, and special character.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'Please make sure your passwords match.');
      return;
    }

    try {
      setIsLoading(true);
      await apiService.resetPassword(
        email.trim().toLowerCase(),
        pinCode.trim(),
        newPassword
      );
      Alert.alert(
        'Password Reset',
        'Your password has been reset successfully. You can now log in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'request') {
      navigation.goBack();
    } else if (step === 'verify') {
      setStep('request');
      setPinCode('');
    } else {
      setStep('verify');
      setNewPassword('');
      setConfirmPassword('');
    }
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="#6366f1" />
            </TouchableOpacity>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed-outline" size={40} color="#6366f1" />
            </View>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              {step === 'request' && "We'll send you a PIN code to reset your password"}
              {step === 'verify' && 'Enter the PIN code sent to your email'}
              {step === 'reset' && 'Create a new password for your account'}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {step === 'request' && (
              <>
                <Input
                  label="Email"
                  placeholder="your@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  icon="mail-outline"
                />

                <Button
                  title="Send PIN Code"
                  onPress={handleRequestPin}
                  variant="primary"
                  size="large"
                  fullWidth
                  icon="mail-outline"
                  style={styles.button}
                  disabled={isLoading}
                />
              </>
            )}

            {step === 'verify' && (
              <>
                <Input
                  label="Email"
                  placeholder="your@email.com"
                  value={email}
                  editable={false}
                  icon="mail-outline"
                />

                <Input
                  label="PIN Code"
                  placeholder="Enter PIN code"
                  value={pinCode}
                  onChangeText={setPinCode}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  icon="key-outline"
                />

                <Button
                  title="Verify PIN"
                  onPress={handleVerifyPin}
                  variant="primary"
                  size="large"
                  fullWidth
                  icon="checkmark-circle-outline"
                  style={styles.button}
                  disabled={isLoading}
                />
              </>
            )}

            {step === 'reset' && (
              <>
                <Input
                  label="New Password"
                  placeholder="Enter new password (min. 12 characters)"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  icon="lock-closed-outline"
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                  }
                />

                <View style={styles.passwordRequirements}>
                  <Text style={styles.requirementsTitle}>Password must contain:</Text>
                  <View style={styles.requirement}>
                    <Ionicons
                      name={newPassword.length >= 12 ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={newPassword.length >= 12 ? '#10b981' : '#94a3b8'}
                    />
                    <Text style={styles.requirementText}>At least 12 characters</Text>
                  </View>
                  <View style={styles.requirement}>
                    <Ionicons
                      name={
                        /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)
                          ? 'checkmark-circle'
                          : 'ellipse-outline'
                      }
                      size={16}
                      color={
                        /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)
                          ? '#10b981'
                          : '#94a3b8'
                      }
                    />
                    <Text style={styles.requirementText}>Uppercase and lowercase letters</Text>
                  </View>
                  <View style={styles.requirement}>
                    <Ionicons
                      name={/[0-9]/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={/[0-9]/.test(newPassword) ? '#10b981' : '#94a3b8'}
                    />
                    <Text style={styles.requirementText}>At least one number</Text>
                  </View>
                  <View style={styles.requirement}>
                    <Ionicons
                      name={
                        /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
                          ? 'checkmark-circle'
                          : 'ellipse-outline'
                      }
                      size={16}
                      color={
                        /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '#10b981' : '#94a3b8'
                      }
                    />
                    <Text style={styles.requirementText}>At least one special character</Text>
                  </View>
                </View>

                <Input
                  label="Confirm New Password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  icon="lock-closed-outline"
                  rightIcon={
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                  }
                />

                <Button
                  title="Reset Password"
                  onPress={handleResetPassword}
                  variant="primary"
                  size="large"
                  fullWidth
                  icon="checkmark-circle-outline"
                  style={styles.button}
                  disabled={isLoading}
                />
              </>
            )}
          </View>

          {/* Back to Login */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Remember your password? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
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
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 8,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    marginBottom: 24,
  },
  button: {
    marginTop: 16,
  },
  passwordRequirements: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  requirementText: {
    fontSize: 12,
    color: '#64748b',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginText: {
    fontSize: 14,
    color: '#64748b',
  },
  loginLink: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
});
