/**
 * Artist Space Design System
 * Modern, musician-friendly theme optimized for artists and bands
 *
 * Exports:
 * - theme: Core design tokens (colors, typography, spacing, etc.)
 * - responsive: Responsive design utilities
 * - layout: Common layout patterns and helpers
 */

import { Platform } from 'react-native';

// Helper to convert shadow properties to boxShadow for web
const createShadow = (offset: { width: number; height: number }, radius: number, opacity: number, color: string = '#000') => {
  if (Platform.OS === 'web') {
    return {
      boxShadow: `${offset.width}px ${offset.height}px ${radius}px rgba(0, 0, 0, ${opacity})`,
    };
  }
  return {
    shadowColor: color,
    shadowOffset: offset,
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: Math.max(offset.height, radius),
  };
};

export const theme = {
  // Color Palette - Inspired by music and creativity
  colors: {
    // Primary - Purple/Indigo (Creative, Musical)
    primary: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1', // Main brand color
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
    },

    // Secondary - Teal (Fresh, Modern)
    secondary: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    },

    // Accent Colors
    accent: {
      yellow: '#fbbf24',
      orange: '#f97316',
      pink: '#ec4899',
      purple: '#8b5cf6',
      green: '#10b981',
      red: '#ef4444',
    },

    // Grayscale
    gray: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },

    // Semantic Colors
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',

    // Background
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      dark: '#0f172a',
    },

    // Text
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#94a3b8',
      inverse: '#ffffff',
      link: '#6366f1',
    },

    // Status Colors for Musicians
    status: {
      booked: '#10b981',      // Green
      pending: '#f59e0b',     // Orange
      confirmed: '#3b82f6',   // Blue
      cancelled: '#ef4444',   // Red
      rehearsal: '#8b5cf6',   // Purple
      recording: '#ec4899',   // Pink
      available: '#14b8a6',   // Teal
    },
  },

  // Typography - Clear, readable fonts
  typography: {
    fonts: {
      regular: 'System',
      medium: 'System',
      semibold: 'System',
      bold: 'System',
    },
    sizes: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
      '5xl': 48,
    },
    lineHeights: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
    fontWeights: {
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      extrabold: '800' as const,
    },
  },

  // Spacing - 4px base unit
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
    '5xl': 64,
  },

  // Border Radius
  borderRadius: {
    none: 0,
    sm: 4,
    base: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    full: 9999,
  },

  // Shadows - Soft, elegant elevation
  shadows: {
    none: Platform.OS === 'web'
      ? { boxShadow: 'none' }
      : {
          shadowColor: 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0,
          shadowRadius: 0,
          elevation: 0,
        },
    sm: createShadow({ width: 0, height: 1 }, 2, 0.05),
    base: createShadow({ width: 0, height: 2 }, 4, 0.1),
    md: createShadow({ width: 0, height: 4 }, 8, 0.12),
    lg: createShadow({ width: 0, height: 8 }, 16, 0.15),
    xl: createShadow({ width: 0, height: 12 }, 24, 0.18),
  },

  // Animation Timings
  animation: {
    duration: {
      fast: 150,
      normal: 250,
      slow: 350,
    },
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
    },
  },

  // Icon Sizes
  iconSizes: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 32,
    '2xl': 40,
    '3xl': 48,
  },

  // Common Gradients
  gradients: {
    primary: ['#6366f1', '#8b5cf6'],
    secondary: ['#14b8a6', '#06b6d4'],
    sunset: ['#f97316', '#ec4899'],
    ocean: ['#3b82f6', '#14b8a6'],
    purple: ['#8b5cf6', '#ec4899'],
  },
};

// Helper functions for theme usage
export const getStatusColor = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    booked: theme.colors.status.booked,
    pending: theme.colors.status.pending,
    confirmed: theme.colors.status.confirmed,
    cancelled: theme.colors.status.cancelled,
    rehearsal: theme.colors.status.rehearsal,
    recording: theme.colors.status.recording,
    available: theme.colors.status.available,
    active: theme.colors.success,
    inactive: theme.colors.gray[400],
    approved: theme.colors.success,
    rejected: theme.colors.error,
  };

  return statusMap[status.toLowerCase()] || theme.colors.gray[400];
};

export const getGradient = (gradientName: keyof typeof theme.gradients) => {
  return theme.gradients[gradientName];
};

// Export responsive utilities
export { responsive } from './responsive';

// Export layout helpers
export { layout } from './layout';

export default theme;
