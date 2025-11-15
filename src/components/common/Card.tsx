import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
const CardComponent = ({
  children,
  title,
  subtitle,
  icon,
  onPress,
  variant = 'default',
  style,
}: CardProps) {
  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    elevated: {
      backgroundColor: '#ffffff',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    outlined: {
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e2e8f0',
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
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
});
