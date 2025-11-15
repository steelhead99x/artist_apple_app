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
import { UserType } from '../types';
import apiService from '../services/api';

interface UserTypeOption {
  type: UserType;
  label: string;
  icon: string;
  description: string;
}

const USER_TYPE_OPTIONS: UserTypeOption[] = [
  {
    type: 'user',
    label: 'Artist',
    icon: 'person',
    description: 'Individual artists and musicians',
  },
  {
    type: 'band',
    label: 'Band',
    icon: 'people',
    description: 'Music bands and groups',
  },
  {
    type: 'studio',
    label: 'Recording Studio',
    icon: 'radio',
    description: 'Recording and production studios',
  },
  {
    type: 'bar',
    label: 'Venue',
    icon: 'business',
    description: 'Bars, clubs, and performance venues',
  },
  {
    type: 'booking_agent',
    label: 'Booking Agent',
    icon: 'briefcase',
    description: 'Professional booking agents',
  },
];

export default function RegisterScreen({ navigation }: any) {
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateForm = (): boolean => {
    if (!selectedType) {
      Alert.alert('Account Type Required', 'Please select an account type.');
      return false;
    }

    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name or business name.');
      return false;
    }

    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return false;
    }

    if (recoveryEmail && !emailRegex.test(recoveryEmail)) {
      Alert.alert('Invalid Recovery Email', 'Please enter a valid recovery email address.');
      return false;
    }

    if (!password) {
      Alert.alert('Password Required', 'Please enter a password.');
      return false;
    }

    if (password.length < 12) {
      Alert.alert(
        'Weak Password',
        'Password must be at least 12 characters long.'
      );
      return false;
    }

    // Check password requirements
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial) {
      Alert.alert(
        'Weak Password',
        'Password must contain uppercase, lowercase, number, and special character.'
      );
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords Do Not Match', 'Please make sure your passwords match.');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      await apiService.register({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
        user_type: selectedType!,
        recovery_email: recoveryEmail.trim() || undefined,
      });

      Alert.alert(
        'Account Created',
        'Your account has been created successfully! You can now log in.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Failed to create account. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={24} color="#6366f1" />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Ionicons name="musical-notes" size={40} color="#6366f1" />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Artist Space today</Text>
          </View>

          {/* Account Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Account Type</Text>
            <View style={styles.typeGrid}>
              {USER_TYPE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.type}
                  style={[
                    styles.typeCard,
                    selectedType === option.type && styles.typeCardSelected,
                  ]}
                  onPress={() => setSelectedType(option.type)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={32}
                    color={selectedType === option.type ? '#6366f1' : '#64748b'}
                  />
                  <Text
                    style={[
                      styles.typeLabel,
                      selectedType === option.type && styles.typeLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.typeDescription}>{option.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Registration Form */}
          {selectedType && (
            <View style={styles.form}>
              <Input
                label="Name / Business Name"
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                icon="person-outline"
              />

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

              <Input
                label="Recovery Email (Optional)"
                placeholder="recovery@email.com"
                value={recoveryEmail}
                onChangeText={setRecoveryEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                icon="mail-outline"
              />

              <Input
                label="Password"
                placeholder="Enter password (min. 12 characters)"
                value={password}
                onChangeText={setPassword}
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
                    name={password.length >= 12 ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={password.length >= 12 ? '#10b981' : '#94a3b8'}
                  />
                  <Text style={styles.requirementText}>At least 12 characters</Text>
                </View>
                <View style={styles.requirement}>
                  <Ionicons
                    name={
                      /[A-Z]/.test(password) && /[a-z]/.test(password)
                        ? 'checkmark-circle'
                        : 'ellipse-outline'
                    }
                    size={16}
                    color={
                      /[A-Z]/.test(password) && /[a-z]/.test(password) ? '#10b981' : '#94a3b8'
                    }
                  />
                  <Text style={styles.requirementText}>Uppercase and lowercase letters</Text>
                </View>
                <View style={styles.requirement}>
                  <Ionicons
                    name={/[0-9]/.test(password) ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={/[0-9]/.test(password) ? '#10b981' : '#94a3b8'}
                  />
                  <Text style={styles.requirementText}>At least one number</Text>
                </View>
                <View style={styles.requirement}>
                  <Ionicons
                    name={
                      /[!@#$%^&*(),.?":{}|<>]/.test(password)
                        ? 'checkmark-circle'
                        : 'ellipse-outline'
                    }
                    size={16}
                    color={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '#10b981' : '#94a3b8'}
                  />
                  <Text style={styles.requirementText}>At least one special character</Text>
                </View>
              </View>

              <Input
                label="Confirm Password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                icon="lock-closed-outline"
                rightIcon={
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                }
              />

              <Button
                title="Create Account"
                onPress={handleRegister}
                variant="primary"
                size="large"
                fullWidth
                icon="person-add-outline"
                style={styles.registerButton}
                disabled={isLoading}
              />

              <View style={styles.termsContainer}>
                <Text style={styles.termsText}>
                  By creating an account, you agree to our Terms of Service and Privacy Policy
                </Text>
              </View>
            </View>
          )}

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleBack}>
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
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 8,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  typeGrid: {
    gap: 12,
  },
  typeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  typeCardSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 8,
    marginBottom: 4,
  },
  typeLabelSelected: {
    color: '#6366f1',
  },
  typeDescription: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
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
  registerButton: {
    marginTop: 16,
  },
  termsContainer: {
    marginTop: 16,
    paddingHorizontal: 8,
  },
  termsText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
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
