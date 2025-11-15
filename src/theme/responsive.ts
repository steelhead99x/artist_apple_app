/**
 * Responsive Design Utilities
 * Helper functions for building responsive layouts across different screen sizes
 */

import { Dimensions, Platform, PixelRatio } from 'react-native';

// Get screen dimensions
export const getScreenDimensions = () => {
  const { width, height } = Dimensions.get('window');
  return { width, height };
};

// Breakpoints for responsive design
export const breakpoints = {
  xs: 0,      // Extra small devices (phones in portrait)
  sm: 360,    // Small devices (phones)
  md: 768,    // Medium devices (tablets in portrait)
  lg: 1024,   // Large devices (tablets in landscape, small desktops)
  xl: 1280,   // Extra large devices (desktops)
  '2xl': 1536, // 2x Extra large (large desktops)
};

// Get current breakpoint
export const getCurrentBreakpoint = (): keyof typeof breakpoints => {
  const { width } = getScreenDimensions();

  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'xs';
};

// Check if screen is at least a certain size
export const isScreenAtLeast = (size: keyof typeof breakpoints): boolean => {
  const { width } = getScreenDimensions();
  return width >= breakpoints[size];
};

// Responsive value selector
export const responsiveValue = <T,>(values: {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}): T | undefined => {
  const breakpoint = getCurrentBreakpoint();

  // Return the value for current breakpoint or the closest smaller one
  const orderedBreakpoints: Array<keyof typeof breakpoints> = ['2xl', 'xl', 'lg', 'md', 'sm', 'xs'];
  const currentIndex = orderedBreakpoints.indexOf(breakpoint);

  for (let i = currentIndex; i < orderedBreakpoints.length; i++) {
    const bp = orderedBreakpoints[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }

  return undefined;
};

// Scale size based on screen width (useful for typography and spacing)
export const scaleSize = (size: number, baseWidth: number = 375): number => {
  const { width } = getScreenDimensions();
  const scale = width / baseWidth;
  return Math.round(size * scale);
};

// Normalize font size based on pixel ratio and platform
export const normalizeFontSize = (size: number): number => {
  const scale = Platform.OS === 'ios' ? PixelRatio.getFontScale() : 1;
  return Math.round(size / scale);
};

// Check device orientation
export const isLandscape = (): boolean => {
  const { width, height } = getScreenDimensions();
  return width > height;
};

export const isPortrait = (): boolean => {
  return !isLandscape();
};

// Platform-specific values
export const platformValue = <T,>(values: {
  ios?: T;
  android?: T;
  web?: T;
  native?: T;
  default?: T;
}): T | undefined => {
  if (Platform.OS === 'ios' && values.ios !== undefined) return values.ios;
  if (Platform.OS === 'android' && values.android !== undefined) return values.android;
  if (Platform.OS === 'web' && values.web !== undefined) return values.web;
  if (Platform.OS !== 'web' && values.native !== undefined) return values.native;
  return values.default;
};

// Responsive spacing (multiplier of base spacing unit)
export const spacing = (multiplier: number): number => {
  const baseUnit = responsiveValue({
    xs: 4,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 8,
  }) || 4;

  return baseUnit * multiplier;
};

// Container widths for different breakpoints
export const containerWidth = (): number => {
  return responsiveValue({
    xs: getScreenDimensions().width,
    sm: getScreenDimensions().width,
    md: 720,
    lg: 960,
    xl: 1140,
    '2xl': 1320,
  }) || getScreenDimensions().width;
};

// Responsive padding for screen containers
export const screenPadding = (): number => {
  return responsiveValue({
    xs: 16,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 40,
    '2xl': 48,
  }) || 16;
};

// Grid columns for different breakpoints
export const gridColumns = (): number => {
  return responsiveValue({
    xs: 1,
    sm: 2,
    md: 2,
    lg: 3,
    xl: 4,
    '2xl': 4,
  }) || 1;
};

// Responsive typography sizes
export const responsiveFontSize = (baseSize: number): number => {
  const scaleFactor = responsiveValue({
    xs: 0.9,
    sm: 1,
    md: 1,
    lg: 1.05,
    xl: 1.1,
    '2xl': 1.1,
  }) || 1;

  return Math.round(baseSize * scaleFactor);
};

// Calculate responsive width percentage
export const widthPercentageToDP = (percentage: number): number => {
  const { width } = getScreenDimensions();
  return (percentage * width) / 100;
};

// Calculate responsive height percentage
export const heightPercentageToDP = (percentage: number): number => {
  const { height } = getScreenDimensions();
  return (percentage * height) / 100;
};

// Device type detection
export const isSmallDevice = (): boolean => {
  const { width, height } = getScreenDimensions();
  return width < 375 || height < 667;
};

export const isTablet = (): boolean => {
  const { width } = getScreenDimensions();
  return width >= breakpoints.md;
};

export const isDesktop = (): boolean => {
  const { width } = getScreenDimensions();
  return Platform.OS === 'web' && width >= breakpoints.lg;
};

// Export all utilities
export const responsive = {
  breakpoints,
  getCurrentBreakpoint,
  isScreenAtLeast,
  responsiveValue,
  scaleSize,
  normalizeFontSize,
  isLandscape,
  isPortrait,
  platformValue,
  spacing,
  containerWidth,
  screenPadding,
  gridColumns,
  responsiveFontSize,
  widthPercentageToDP,
  heightPercentageToDP,
  isSmallDevice,
  isTablet,
  isDesktop,
  getScreenDimensions,
};

export default responsive;
