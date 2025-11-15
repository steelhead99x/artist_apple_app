import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';

interface GlassCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconGradient?: string[];
  onPress?: () => void;
  variant?: 'glass' | 'gradient' | 'solid';
  gradientColors?: string[];
  style?: ViewStyle;
}

/**
 * Modern Glass-morphism Card
 * Perfect for showcasing music content with a premium feel
 */
export function GlassCard({
  children,
  title,
  subtitle,
  icon,
  iconColor,
  iconGradient,
  onPress,
  variant = 'glass',
  gradientColors,
  style,
}: GlassCardProps) {
  const Container = onPress ? TouchableOpacity : View;

  const renderIcon = () => {
    if (!icon) return null;

    if (iconGradient) {
      return (
        <LinearGradient
          colors={iconGradient}
          style={styles.iconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={icon} size={24} color="white" />
        </LinearGradient>
      );
    }

    return (
      <View style={[styles.iconContainer, { backgroundColor: iconColor || theme.colors.primary[100] }]}>
        <Ionicons name={icon} size={24} color={iconColor || theme.colors.primary[600]} />
      </View>
    );
  };

  if (variant === 'gradient' && gradientColors) {
    return (
      <Container onPress={onPress} activeOpacity={0.8}>
        <LinearGradient
          colors={gradientColors}
          style={[styles.card, styles.gradientCard, style]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {(title || subtitle || icon) && (
            <View style={styles.header}>
              {renderIcon()}
              <View style={styles.headerText}>
                {title && <Text style={[styles.title, styles.whiteText]}>{title}</Text>}
                {subtitle && <Text style={[styles.subtitle, styles.whiteTextSubtle]}>{subtitle}</Text>}
              </View>
            </View>
          )}
          {children}
        </LinearGradient>
      </Container>
    );
  }

  return (
    <Container
      style={[
        styles.card,
        variant === 'glass' ? styles.glassCard : styles.solidCard,
        style
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      {(title || subtitle || icon) && (
        <View style={styles.header}>
          {renderIcon()}
          <View style={styles.headerText}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
      )}
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.md,
    overflow: 'hidden',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    ...Platform.select({
      ios: {
        backdropFilter: 'blur(20px)',
      },
      android: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
      },
    }),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...theme.shadows.md,
  },
  solidCard: {
    backgroundColor: theme.colors.background.primary,
    ...theme.shadows.base,
  },
  gradientCard: {
    borderWidth: 0,
    ...theme.shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
  },
  whiteText: {
    color: theme.colors.text.inverse,
  },
  whiteTextSubtle: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
