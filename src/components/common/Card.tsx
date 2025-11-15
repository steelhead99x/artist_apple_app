import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
  style?: ViewStyle;
}

/**
 * Card Component
 *
 * A reusable card component with optional title, subtitle, icon, and variants.
 * Supports both pressable and non-pressable modes.
 *
 * @param children - Content to display inside the card
 * @param title - Optional card title
 * @param subtitle - Optional card subtitle
 * @param icon - Optional Ionicons icon name
 * @param onPress - Optional press handler (makes card touchable)
 * @param variant - Card style variant: 'default', 'elevated', or 'outlined'
 * @param style - Additional custom styles
 *
 * @example
 * ```tsx
 * <Card title="Band Name" subtitle="Rock Band" icon="musical-notes" onPress={handlePress}>
 *   <Text>Card content</Text>
 * </Card>
 * ```
 */
const CardComponent = (props: CardProps) => {
  const {
    children,
    title,
    subtitle,
    icon,
    onPress,
    variant = 'default',
    style,
  } = props;

  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: theme.colors.background.primary,
      ...theme.shadows.sm,
    },
    elevated: {
      backgroundColor: theme.colors.background.primary,
      ...theme.shadows.md,
    },
    outlined: {
      backgroundColor: theme.colors.background.primary,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
  };

  const CardContainer = onPress ? TouchableOpacity : View;

  return (
    <CardContainer
      style={[styles.card, variantStyles[variant], style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      accessible={!!onPress}
      accessibilityRole={onPress ? 'button' : 'none'}
      accessibilityLabel={title || 'Card'}
    >
      {(title || subtitle || icon) && (
        <View style={styles.header}>
          {icon && (
            <View style={styles.iconContainer}>
              <Ionicons name={icon} size={24} color="#6366f1" />
            </View>
          )}
          <View style={styles.headerText}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
      )}
      {children}
    </CardContainer>
  );
}

// Memoize component to prevent unnecessary re-renders
export const Card = memo(CardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
  },
});
