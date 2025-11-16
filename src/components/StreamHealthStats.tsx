/**
 * Stream Health Stats Component
 * Real-time display of stream quality and performance metrics
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../theme';
import { StreamHealthStats, StreamHealthAlert } from '../types/muxStreaming';

interface StreamHealthStatsProps {
  stats: StreamHealthStats | null;
  alerts: StreamHealthAlert[];
  onClose?: () => void;
  compact?: boolean;
}

export default function StreamHealthStatsComponent({
  stats,
  alerts,
  onClose,
  compact = false,
}: StreamHealthStatsProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['overview'])
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const formatBitrate = (bps: number): string => {
    if (bps >= 1000000) return `${(bps / 1000000).toFixed(2)} Mbps`;
    if (bps >= 1000) return `${(bps / 1000).toFixed(0)} kbps`;
    return `${bps} bps`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getQualityColor = (
    quality: 'excellent' | 'good' | 'fair' | 'poor'
  ): string => {
    switch (quality) {
      case 'excellent':
        return theme.colors.accent.green;
      case 'good':
        return '#10B981';
      case 'fair':
        return '#F59E0B';
      case 'poor':
        return theme.colors.error;
    }
  };

  const getSeverityColor = (severity: 'info' | 'warning' | 'critical'): string => {
    switch (severity) {
      case 'info':
        return theme.colors.primary[600];
      case 'warning':
        return '#F59E0B';
      case 'critical':
        return theme.colors.error;
    }
  };

  const getSeverityIcon = (
    severity: 'info' | 'warning' | 'critical'
  ): keyof typeof Ionicons.glyphMap => {
    switch (severity) {
      case 'info':
        return 'information-circle';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'alert-circle';
    }
  };

  if (!stats) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="analytics-outline" size={48} color={theme.colors.text.tertiary} />
        <Text style={styles.emptyText}>No stream data available</Text>
      </View>
    );
  }

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactRow}>
          <View
            style={[
              styles.qualityIndicator,
              { backgroundColor: getQualityColor(stats.connectionQuality) },
            ]}
          />
          <Text style={styles.compactLabel}>Quality: {stats.connectionQuality}</Text>
        </View>

        <View style={styles.compactRow}>
          <Ionicons name="people" size={16} color={theme.colors.text.secondary} />
          <Text style={styles.compactLabel}>{stats.currentViewers} viewers</Text>
        </View>

        <View style={styles.compactRow}>
          <Ionicons name="videocam" size={16} color={theme.colors.text.secondary} />
          <Text style={styles.compactLabel}>
            {stats.videoWidth}x{stats.videoHeight} @ {stats.videoFrameRate.toFixed(0)}fps
          </Text>
        </View>

        <View style={styles.compactRow}>
          <Ionicons name="speedometer" size={16} color={theme.colors.text.secondary} />
          <Text style={styles.compactLabel}>{formatBitrate(stats.videoBitrate)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="analytics" size={24} color={theme.colors.primary[600]} />
          <Text style={styles.headerTitle}>Stream Health</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overview Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('overview')}
          >
            <Text style={styles.sectionTitle}>Overview</Text>
            <Ionicons
              name={expandedSections.has('overview') ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.text.secondary}
            />
          </TouchableOpacity>

          {expandedSections.has('overview') && (
            <View style={styles.sectionContent}>
              {/* Connection Quality */}
              <View style={styles.metricCard}>
                <View style={styles.metricHeader}>
                  <Text style={styles.metricLabel}>Connection Quality</Text>
                  <View
                    style={[
                      styles.qualityBadge,
                      { backgroundColor: getQualityColor(stats.connectionQuality) },
                    ]}
                  >
                    <Text style={styles.qualityBadgeText}>
                      {stats.connectionQuality.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Viewers */}
              <View style={styles.metricRow}>
                <View style={styles.metricIcon}>
                  <Ionicons name="people" size={20} color={theme.colors.primary[600]} />
                </View>
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>Current Viewers</Text>
                  <Text style={styles.metricValue}>{stats.currentViewers}</Text>
                </View>
                <View style={styles.metricExtra}>
                  <Text style={styles.metricExtraLabel}>Peak</Text>
                  <Text style={styles.metricExtraValue}>{stats.peakViewers}</Text>
                </View>
              </View>

              {/* Duration */}
              <View style={styles.metricRow}>
                <View style={styles.metricIcon}>
                  <Ionicons name="time" size={20} color={theme.colors.primary[600]} />
                </View>
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>Stream Duration</Text>
                  <Text style={styles.metricValue}>{formatDuration(stats.duration)}</Text>
                </View>
              </View>

              {/* Status */}
              <View style={styles.metricRow}>
                <View style={styles.metricIcon}>
                  <Ionicons
                    name={stats.isLive ? 'radio' : 'radio-outline'}
                    size={20}
                    color={stats.isLive ? theme.colors.error : theme.colors.text.secondary}
                  />
                </View>
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>Status</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      { color: stats.isLive ? theme.colors.error : theme.colors.text.secondary },
                    ]}
                  >
                    {stats.isLive ? 'LIVE' : 'Offline'}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Video Quality Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('video')}
          >
            <Text style={styles.sectionTitle}>Video Quality</Text>
            <Ionicons
              name={expandedSections.has('video') ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.text.secondary}
            />
          </TouchableOpacity>

          {expandedSections.has('video') && (
            <View style={styles.sectionContent}>
              {/* Resolution */}
              <View style={styles.metricRow}>
                <View style={styles.metricIcon}>
                  <Ionicons name="resize" size={20} color={theme.colors.primary[600]} />
                </View>
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>Resolution</Text>
                  <Text style={styles.metricValue}>
                    {stats.videoWidth}x{stats.videoHeight}
                  </Text>
                </View>
              </View>

              {/* Frame Rate */}
              <View style={styles.metricRow}>
                <View style={styles.metricIcon}>
                  <Ionicons name="film" size={20} color={theme.colors.primary[600]} />
                </View>
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>Frame Rate</Text>
                  <Text style={styles.metricValue}>
                    {stats.videoFrameRate.toFixed(1)} fps
                  </Text>
                </View>
              </View>

              {/* Bitrate */}
              <View style={styles.metricRow}>
                <View style={styles.metricIcon}>
                  <Ionicons name="speedometer" size={20} color={theme.colors.primary[600]} />
                </View>
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>Video Bitrate</Text>
                  <Text style={styles.metricValue}>{formatBitrate(stats.videoBitrate)}</Text>
                </View>
              </View>

              {/* Codec */}
              <View style={styles.metricRow}>
                <View style={styles.metricIcon}>
                  <Ionicons name="code-slash" size={20} color={theme.colors.primary[600]} />
                </View>
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>Video Codec</Text>
                  <Text style={styles.metricValue}>{stats.videoCodec.toUpperCase()}</Text>
                </View>
              </View>

              {/* Dropped Frames */}
              {stats.totalFrames > 0 && (
                <View style={styles.metricRow}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="warning" size={20} color={theme.colors.primary[600]} />
                  </View>
                  <View style={styles.metricInfo}>
                    <Text style={styles.metricLabel}>Dropped Frames</Text>
                    <Text style={styles.metricValue}>
                      {stats.droppedFrames} (
                      {((stats.droppedFrames / stats.totalFrames) * 100).toFixed(2)}%)
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Audio Quality Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('audio')}
          >
            <Text style={styles.sectionTitle}>Audio Quality</Text>
            <Ionicons
              name={expandedSections.has('audio') ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.text.secondary}
            />
          </TouchableOpacity>

          {expandedSections.has('audio') && (
            <View style={styles.sectionContent}>
              {/* Audio Bitrate */}
              <View style={styles.metricRow}>
                <View style={styles.metricIcon}>
                  <Ionicons name="speedometer" size={20} color={theme.colors.primary[600]} />
                </View>
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>Audio Bitrate</Text>
                  <Text style={styles.metricValue}>{formatBitrate(stats.audioBitrate)}</Text>
                </View>
              </View>

              {/* Sample Rate */}
              <View style={styles.metricRow}>
                <View style={styles.metricIcon}>
                  <Ionicons name="pulse" size={20} color={theme.colors.primary[600]} />
                </View>
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>Sample Rate</Text>
                  <Text style={styles.metricValue}>
                    {(stats.audioSampleRate / 1000).toFixed(1)} kHz
                  </Text>
                </View>
              </View>

              {/* Audio Codec */}
              <View style={styles.metricRow}>
                <View style={styles.metricIcon}>
                  <Ionicons name="code-slash" size={20} color={theme.colors.primary[600]} />
                </View>
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>Audio Codec</Text>
                  <Text style={styles.metricValue}>{stats.audioCodec.toUpperCase()}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Network Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('network')}
          >
            <Text style={styles.sectionTitle}>Network</Text>
            <Ionicons
              name={expandedSections.has('network') ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.text.secondary}
            />
          </TouchableOpacity>

          {expandedSections.has('network') && (
            <View style={styles.sectionContent}>
              {/* Available Bandwidth */}
              <View style={styles.metricRow}>
                <View style={styles.metricIcon}>
                  <Ionicons name="cellular" size={20} color={theme.colors.primary[600]} />
                </View>
                <View style={styles.metricInfo}>
                  <Text style={styles.metricLabel}>Available Bandwidth</Text>
                  <Text style={styles.metricValue}>
                    {formatBitrate(stats.availableBandwidth)}
                  </Text>
                </View>
              </View>

              {/* Packet Loss */}
              {stats.packetLoss > 0 && (
                <View style={styles.metricRow}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="analytics" size={20} color={theme.colors.primary[600]} />
                  </View>
                  <View style={styles.metricInfo}>
                    <Text style={styles.metricLabel}>Packet Loss</Text>
                    <Text
                      style={[
                        styles.metricValue,
                        { color: stats.packetLoss > 2 ? theme.colors.error : undefined },
                      ]}
                    >
                      {stats.packetLoss.toFixed(2)}%
                    </Text>
                  </View>
                </View>
              )}

              {/* Round Trip Time */}
              {stats.roundTripTime > 0 && (
                <View style={styles.metricRow}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="swap-horizontal" size={20} color={theme.colors.primary[600]} />
                  </View>
                  <View style={styles.metricInfo}>
                    <Text style={styles.metricLabel}>Latency (RTT)</Text>
                    <Text style={styles.metricValue}>{stats.roundTripTime.toFixed(0)} ms</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.sectionHeader}
              onPress={() => toggleSection('alerts')}
            >
              <View style={styles.sectionHeaderLeft}>
                <Text style={styles.sectionTitle}>Alerts</Text>
                <View style={styles.alertBadge}>
                  <Text style={styles.alertBadgeText}>{alerts.length}</Text>
                </View>
              </View>
              <Ionicons
                name={expandedSections.has('alerts') ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.text.secondary}
              />
            </TouchableOpacity>

            {expandedSections.has('alerts') && (
              <View style={styles.sectionContent}>
                {alerts.map((alert) => (
                  <View
                    key={alert.id}
                    style={[
                      styles.alertItem,
                      { borderLeftColor: getSeverityColor(alert.severity) },
                    ]}
                  >
                    <Ionicons
                      name={getSeverityIcon(alert.severity)}
                      size={20}
                      color={getSeverityColor(alert.severity)}
                    />
                    <View style={styles.alertContent}>
                      <Text style={styles.alertMessage}>{alert.message}</Text>
                      <Text style={styles.alertTime}>
                        {alert.timestamp.toLocaleTimeString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.md,
  },
  compactContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: theme.borderRadius.lg,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactLabel: {
    fontSize: theme.typography.sizes.xs,
    color: 'white',
    fontWeight: theme.typography.fontWeights.medium,
  },
  qualityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  content: {
    flex: 1,
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.base,
    backgroundColor: theme.colors.background.secondary,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
  },
  sectionContent: {
    padding: theme.spacing.base,
  },
  metricCard: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  metricIcon: {
    width: 40,
    alignItems: 'center',
  },
  metricInfo: {
    flex: 1,
  },
  metricLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
  },
  metricExtra: {
    alignItems: 'flex-end',
  },
  metricExtraLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text.tertiary,
  },
  metricExtraValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.secondary,
  },
  qualityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  qualityBadgeText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.fontWeights.bold,
    color: 'white',
  },
  alertBadge: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  alertBadgeText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.fontWeights.bold,
    color: 'white',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    borderLeftWidth: 4,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  alertContent: {
    flex: 1,
  },
  alertMessage: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  alertTime: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text.tertiary,
  },
});
