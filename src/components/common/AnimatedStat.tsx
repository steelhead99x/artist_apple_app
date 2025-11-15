import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../../theme';

interface AnimatedStatProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: number | string;
  label: string;
  suffix?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
}

/**
 * Animated Statistics Card
 * Shows key metrics with smooth animations
 */
export function AnimatedStat({
  icon,
  iconColor,
  value,
  label,
  suffix = '',
  trend,
  trendValue,
}: AnimatedStatProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>

      <View style={styles.content}>
        <View style={styles.valueRow}>
          <Text style={styles.value}>
            {value}{suffix}
          </Text>
          {trend && trendValue && (
            <View style={[styles.trend, trend === 'up' ? styles.trendUp : styles.trendDown]}>
              <Ionicons
                name={trend === 'up' ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={trend === 'up' ? theme.colors.success : theme.colors.error}
              />
              <Text
                style={[
                  styles.trendText,
                  { color: trend === 'up' ? theme.colors.success : theme.colors.error }
                ]}
              >
                {trendValue}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.base,
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  value: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginRight: theme.spacing.sm,
  },
  label: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeights.medium,
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  trendUp: {
    backgroundColor: theme.colors.success + '15',
  },
  trendDown: {
    backgroundColor: theme.colors.error + '15',
  },
  trendText: {
    fontSize: 11,
    fontWeight: theme.typography.fontWeights.semibold,
    marginLeft: 2,
  },
});
