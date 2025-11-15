import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  containerStyle?: ViewStyle;
  required?: boolean;
  secureTextEntry?: boolean;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  icon,
  iconPosition = 'left',
  containerStyle,
  required = false,
  secureTextEntry,
  rightIcon,
  ...textInputProps
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          Platform.OS === 'web' && styles.webInputContainer,
        ]}
        // @ts-ignore - web-specific prop
        {...(Platform.OS === 'web' && {
          onMouseEnter: (e: any) => {
            if (!error && !isFocused && e.target) {
              e.target.style.borderColor = '#a5b4fc';
            }
          },
          onMouseLeave: (e: any) => {
            if (!error && !isFocused && e.target) {
              e.target.style.borderColor = '#cbd5e1';
            }
          },
        })}
      >
        {icon && iconPosition === 'left' && (
          <Ionicons
            name={icon}
            size={20}
            color={error ? '#ef4444' : isFocused ? '#6366f1' : '#94a3b8'}
            style={styles.iconLeft}
          />
        )}

        <TextInput
          style={[
            styles.input,
            icon && iconPosition === 'left' && styles.inputWithLeftIcon,
            (icon && iconPosition === 'right') || secureTextEntry || rightIcon
              ? styles.inputWithRightIcon
              : {},
          ]}
          placeholderTextColor="#94a3b8"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          {...textInputProps}
        />

        {rightIcon ? (
          <View style={styles.iconRight}>{rightIcon}</View>
        ) : secureTextEntry ? (
          <TouchableOpacity
            onPress={togglePasswordVisibility}
            style={styles.iconRight}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={isFocused ? '#6366f1' : '#94a3b8'}
            />
          </TouchableOpacity>
        ) : icon && iconPosition === 'right' ? (
          <Ionicons
            name={icon}
            size={20}
            color={error ? '#ef4444' : isFocused ? '#6366f1' : '#94a3b8'}
            style={styles.iconRight}
          />
        ) : null}
      </View>

      {error && (
        <View style={styles.messageContainer}>
          <Ionicons name="alert-circle" size={14} color="#ef4444" />
          <Text style={styles.error}>{error}</Text>
        </View>
      )}

      {hint && !error && (
        <Text style={styles.hint}>{hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    ...(Platform.OS === 'web' && {
      transition: 'all 0.2s ease-in-out',
    }),
  },
  webInputContainer: {
    ...(Platform.OS === 'web' && {
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    }),
  },
  inputContainerFocused: {
    borderColor: '#6366f1',
    borderWidth: 2,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
    }),
  },
  inputContainerError: {
    borderColor: '#ef4444',
    ...(Platform.OS === 'web' && {
      boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)',
    }),
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
      WebkitAppearance: 'none' as any,
    }),
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  error: {
    fontSize: 12,
    color: '#ef4444',
    marginLeft: 4,
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
  },
});
