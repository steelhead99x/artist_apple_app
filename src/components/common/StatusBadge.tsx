import React, { memo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatusBadgeProps {
  status: string;
  type?: 'tour' | 'payment' | 'user' | 'session' | 'subscription';
  showIcon?: boolean;
  style?: ViewStyle;
}

/**
 * StatusBadge Component
 *
 * Displays a colored status badge with an icon and label.
 * Supports multiple types with different status configurations.
 *
 * @param status - Status value (e.g., 'pending', 'confirmed', 'paid')
 * @param type - Badge type: 'tour', 'payment', 'user', 'session', or 'subscription'
 * @param showIcon - Whether to show the status icon
 * @param style - Additional custom styles
 *
 * @example
 * ```tsx
 * <StatusBadge status="confirmed" type="tour" />
 * <StatusBadge status="paid" type="payment" showIcon={false} />
 * ```
 */
const StatusBadgeComponent = ({ status, type = 'tour', showIcon = true, style }: StatusBadgeProps) => {
  const getStatusConfig = () => {
    const normalizedStatus = status.toLowerCase();

    // Tour statuses
    if (type === 'tour') {
      const tourConfigs: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
        pending: { color: '#f59e0b', bg: '#fef3c7', icon: 'time-outline', label: 'Pending' },
        confirmed: { color: '#10b981', bg: '#d1fae5', icon: 'checkmark-circle-outline', label: 'Confirmed' },
        cancelled: { color: '#ef4444', bg: '#fee2e2', icon: 'close-circle-outline', label: 'Cancelled' },
        completed: { color: '#6366f1', bg: '#e0e7ff', icon: 'checkmark-done-outline', label: 'Completed' },
      };
      return tourConfigs[normalizedStatus] || tourConfigs.pending;
    }

    // Payment statuses
    if (type === 'payment') {
      const paymentConfigs: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
        pending: { color: '#f59e0b', bg: '#fef3c7', icon: 'hourglass-outline', label: 'Pending' },
        succeeded: { color: '#10b981', bg: '#d1fae5', icon: 'checkmark-circle-outline', label: 'Paid' },
        paid: { color: '#10b981', bg: '#d1fae5', icon: 'checkmark-circle-outline', label: 'Paid' },
        failed: { color: '#ef4444', bg: '#fee2e2', icon: 'close-circle-outline', label: 'Failed' },
        cancelled: { color: '#64748b', bg: '#f1f5f9', icon: 'ban-outline', label: 'Cancelled' },
      };
      return paymentConfigs[normalizedStatus] || paymentConfigs.pending;
    }

    // User statuses
    if (type === 'user') {
      const userConfigs: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
        pending: { color: '#f59e0b', bg: '#fef3c7', icon: 'time-outline', label: 'Pending Approval' },
        approved: { color: '#10b981', bg: '#d1fae5', icon: 'checkmark-circle-outline', label: 'Approved' },
        rejected: { color: '#ef4444', bg: '#fee2e2', icon: 'close-circle-outline', label: 'Rejected' },
        active: { color: '#10b981', bg: '#d1fae5', icon: 'checkmark-circle-outline', label: 'Active' },
        suspended: { color: '#f59e0b', bg: '#fef3c7', icon: 'ban-outline', label: 'Suspended' },
        deleted: { color: '#64748b', bg: '#f1f5f9', icon: 'trash-outline', label: 'Deleted' },
      };
      return userConfigs[normalizedStatus] || userConfigs.pending;
    }

    // Session statuses
    if (type === 'session') {
      const sessionConfigs: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
        active: { color: '#10b981', bg: '#d1fae5', icon: 'radio-outline', label: 'Active' },
        completed: { color: '#6366f1', bg: '#e0e7ff', icon: 'checkmark-done-outline', label: 'Completed' },
        cancelled: { color: '#ef4444', bg: '#fee2e2', icon: 'close-circle-outline', label: 'Cancelled' },
      };
      return sessionConfigs[normalizedStatus] || sessionConfigs.active;
    }

    // Subscription statuses
    if (type === 'subscription') {
      const subscriptionConfigs: Record<string, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
        active: { color: '#10b981', bg: '#d1fae5', icon: 'checkmark-circle-outline', label: 'Active' },
        cancelled: { color: '#f59e0b', bg: '#fef3c7', icon: 'close-circle-outline', label: 'Cancelled' },
        expired: { color: '#ef4444', bg: '#fee2e2', icon: 'time-outline', label: 'Expired' },
        past_due: { color: '#f59e0b', bg: '#fef3c7', icon: 'alert-circle-outline', label: 'Past Due' },
      };
      return subscriptionConfigs[normalizedStatus] || subscriptionConfigs.active;
    }

    // Default
    return { color: '#64748b', bg: '#f1f5f9', icon: 'information-circle-outline' as keyof typeof Ionicons.glyphMap, label: status };
  };

  const config = getStatusConfig();

  return (
    <View
      style={[styles.badge, { backgroundColor: config.bg }, style]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${config.label}`}
    >
      {showIcon && (
        <Ionicons name={config.icon} size={14} color={config.color} style={styles.icon} />
      )}
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

// Memoize component to prevent unnecessary re-renders
export const StatusBadge = memo(StatusBadgeComponent);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
