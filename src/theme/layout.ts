/**
 * Common Layout Styles
 * Reusable layout patterns and utilities
 */

import { StyleSheet } from 'react-native';
import theme from './index';
import { responsive } from './responsive';

/**
 * Flex Layout Utilities
 */
export const flexStyles = StyleSheet.create({
  // Flex containers
  flex1: {
    flex: 1,
  },
  flexRow: {
    flexDirection: 'row',
  },
  flexColumn: {
    flexDirection: 'column',
  },
  flexWrap: {
    flexWrap: 'wrap',
  },

  // Alignment
  alignCenter: {
    alignItems: 'center',
  },
  alignStart: {
    alignItems: 'flex-start',
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  alignStretch: {
    alignItems: 'stretch',
  },

  // Justify
  justifyCenter: {
    justifyContent: 'center',
  },
  justifyStart: {
    justifyContent: 'flex-start',
  },
  justifyEnd: {
    justifyContent: 'flex-end',
  },
  justifyBetween: {
    justifyContent: 'space-between',
  },
  justifyAround: {
    justifyContent: 'space-around',
  },
  justifyEvenly: {
    justifyContent: 'space-evenly',
  },

  // Common combinations
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

/**
 * Container Styles
 */
export const containerStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  screenDark: {
    flex: 1,
    backgroundColor: theme.colors.background.dark,
  },
  container: {
    flex: 1,
    padding: theme.spacing.base,
  },
  containerCentered: {
    flex: 1,
    padding: theme.spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
});

/**
 * Spacing Utilities
 */
export const spacingStyles = StyleSheet.create({
  // Margins
  m0: { margin: 0 },
  mXs: { margin: theme.spacing.xs },
  mSm: { margin: theme.spacing.sm },
  mMd: { margin: theme.spacing.md },
  mBase: { margin: theme.spacing.base },
  mLg: { margin: theme.spacing.lg },
  mXl: { margin: theme.spacing.xl },

  // Margin horizontal
  mxXs: { marginHorizontal: theme.spacing.xs },
  mxSm: { marginHorizontal: theme.spacing.sm },
  mxMd: { marginHorizontal: theme.spacing.md },
  mxBase: { marginHorizontal: theme.spacing.base },
  mxLg: { marginHorizontal: theme.spacing.lg },
  mxXl: { marginHorizontal: theme.spacing.xl },

  // Margin vertical
  myXs: { marginVertical: theme.spacing.xs },
  mySm: { marginVertical: theme.spacing.sm },
  myMd: { marginVertical: theme.spacing.md },
  myBase: { marginVertical: theme.spacing.base },
  myLg: { marginVertical: theme.spacing.lg },
  myXl: { marginVertical: theme.spacing.xl },

  // Margin top
  mtXs: { marginTop: theme.spacing.xs },
  mtSm: { marginTop: theme.spacing.sm },
  mtMd: { marginTop: theme.spacing.md },
  mtBase: { marginTop: theme.spacing.base },
  mtLg: { marginTop: theme.spacing.lg },
  mtXl: { marginTop: theme.spacing.xl },

  // Margin bottom
  mbXs: { marginBottom: theme.spacing.xs },
  mbSm: { marginBottom: theme.spacing.sm },
  mbMd: { marginBottom: theme.spacing.md },
  mbBase: { marginBottom: theme.spacing.base },
  mbLg: { marginBottom: theme.spacing.lg },
  mbXl: { marginBottom: theme.spacing.xl },

  // Padding
  p0: { padding: 0 },
  pXs: { padding: theme.spacing.xs },
  pSm: { padding: theme.spacing.sm },
  pMd: { padding: theme.spacing.md },
  pBase: { padding: theme.spacing.base },
  pLg: { padding: theme.spacing.lg },
  pXl: { padding: theme.spacing.xl },

  // Padding horizontal
  pxXs: { paddingHorizontal: theme.spacing.xs },
  pxSm: { paddingHorizontal: theme.spacing.sm },
  pxMd: { paddingHorizontal: theme.spacing.md },
  pxBase: { paddingHorizontal: theme.spacing.base },
  pxLg: { paddingHorizontal: theme.spacing.lg },
  pxXl: { paddingHorizontal: theme.spacing.xl },

  // Padding vertical
  pyXs: { paddingVertical: theme.spacing.xs },
  pySm: { paddingVertical: theme.spacing.sm },
  pyMd: { paddingVertical: theme.spacing.md },
  pyBase: { paddingVertical: theme.spacing.base },
  pyLg: { paddingVertical: theme.spacing.lg },
  pyXl: { paddingVertical: theme.spacing.xl },
});

/**
 * Text Styles
 */
export const textStyles = StyleSheet.create({
  // Headings
  h1: {
    fontSize: theme.typography.sizes['4xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    lineHeight: theme.typography.sizes['4xl'] * theme.typography.lineHeights.tight,
  },
  h2: {
    fontSize: theme.typography.sizes['3xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    lineHeight: theme.typography.sizes['3xl'] * theme.typography.lineHeights.tight,
  },
  h3: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
    lineHeight: theme.typography.sizes['2xl'] * theme.typography.lineHeights.normal,
  },
  h4: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
    lineHeight: theme.typography.sizes.xl * theme.typography.lineHeights.normal,
  },

  // Body text
  body: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.fontWeights.normal,
    color: theme.colors.text.primary,
    lineHeight: theme.typography.sizes.base * theme.typography.lineHeights.normal,
  },
  bodyLarge: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.normal,
    color: theme.colors.text.primary,
    lineHeight: theme.typography.sizes.lg * theme.typography.lineHeights.normal,
  },
  bodySmall: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.fontWeights.normal,
    color: theme.colors.text.secondary,
    lineHeight: theme.typography.sizes.sm * theme.typography.lineHeights.normal,
  },

  // Special text
  caption: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.fontWeights.normal,
    color: theme.colors.text.tertiary,
    lineHeight: theme.typography.sizes.xs * theme.typography.lineHeights.normal,
  },
  link: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text.link,
  },
  bold: {
    fontWeight: theme.typography.fontWeights.bold,
  },
  semibold: {
    fontWeight: theme.typography.fontWeights.semibold,
  },
  medium: {
    fontWeight: theme.typography.fontWeights.medium,
  },

  // Text alignment
  textCenter: {
    textAlign: 'center',
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
});

/**
 * Card Styles
 */
export const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    ...theme.shadows.base,
  },
  cardElevated: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.base,
    ...theme.shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
  },
  cardContent: {
    flex: 1,
  },
  cardFooter: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
});

/**
 * Button Styles
 */
export const buttonStyles = StyleSheet.create({
  buttonBase: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: theme.colors.primary[500],
  },
  buttonSecondary: {
    backgroundColor: theme.colors.secondary[500],
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
  },
  buttonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.fontWeights.semibold,
    color: '#FFFFFF',
  },
  buttonTextOutline: {
    color: theme.colors.primary[500],
  },
});

/**
 * Divider Styles
 */
export const dividerStyles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: theme.colors.gray[200],
  },
  dividerVertical: {
    width: 1,
    backgroundColor: theme.colors.gray[200],
  },
  dividerBold: {
    height: 2,
    backgroundColor: theme.colors.gray[300],
  },
});

/**
 * Export all layout styles
 */
export const layout = {
  flex: flexStyles,
  container: containerStyles,
  spacing: spacingStyles,
  text: textStyles,
  card: cardStyles,
  button: buttonStyles,
  divider: dividerStyles,
};

export default layout;
