import React, { memo } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * Button Component
 *
 * A highly customizable button component with multiple variants, sizes, and states.
 * Supports loading state, icons, and accessibility features.
 *
 * @param title - Button text
 * @param onPress - Press handler function
 * @param variant - Button style variant
 * @param size - Button size
 * @param loading - Show loading indicator
 * @param disabled - Disable button
 * @param icon - Optional icon name
 * @param iconPosition - Icon position (left or right)
 * @param fullWidth - Make button full width
 * @param accessibilityLabel - Custom accessibility label
 * @param accessibilityHint - Accessibility hint for screen readers
 *
 * @example
 * ```tsx
 * <Button
 *   title="Save Changes"
 *   onPress={handleSave}
 *   variant="primary"
 *   icon="checkmark"
 *   loading={isSaving}
 * />
 * ```
 */
const ButtonComponent = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: '#6366f1',
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: '#64748b',
      borderWidth: 0,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: '#6366f1',
    },
    danger: {
      backgroundColor: '#ef4444',
      borderWidth: 0,
    },
    success: {
      backgroundColor: '#10b981',
      borderWidth: 0,
    },
  };

  const textColorStyles: Record<string, TextStyle> = {
    primary: { color: '#ffffff' },
    secondary: { color: '#ffffff' },
    outline: { color: '#6366f1' },
    danger: { color: '#ffffff' },
    success: { color: '#ffffff' },
  };

  const sizeStyles: Record<string, ViewStyle & TextStyle> = {
    small: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      fontSize: 14,
    },
    medium: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      fontSize: 16,
    },
    large: {
      paddingVertical: 16,
      paddingHorizontal: 32,
      fontSize: 18,
    },
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={textColorStyles[variant].color} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={sizeStyles[size].fontSize}
              color={textColorStyles[variant].color}
              style={styles.iconLeft}
            />
          )}
          <Text
            style={[
              styles.text,
              textColorStyles[variant],
              { fontSize: sizeStyles[size].fontSize },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={sizeStyles[size].fontSize}
              color={textColorStyles[variant].color}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// Memoize component to prevent unnecessary re-renders
export const Button = memo(ButtonComponent);

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
