/**
 * Stream Health Monitoring Service
 * Real-time monitoring of stream quality and performance
 */

import apiService from './api';
import {
  StreamHealthStats,
  StreamHealthAlert,
  HealthThresholds,
  DEFAULT_HEALTH_THRESHOLDS,
  MuxMonitoringData,
} from '../types/muxStreaming';

class StreamHealthMonitor {
  private monitoring: Map<
    string,
    {
      interval: NodeJS.Timeout;
      stats: StreamHealthStats | null;
      alerts: StreamHealthAlert[];
    }
  > = new Map();

  private thresholds: HealthThresholds = DEFAULT_HEALTH_THRESHOLDS;
  private onStatsUpdateCallback?: (streamId: string, stats: StreamHealthStats) => void;
  private onAlertCallback?: (streamId: string, alert: StreamHealthAlert) => void;

  /**
   * Start monitoring a stream
   */
  startMonitoring(
    streamId: string,
    intervalMs: number = 5000,
    customThresholds?: Partial<HealthThresholds>
  ): void {
    if (this.monitoring.has(streamId)) {
      console.warn(`Already monitoring stream: ${streamId}`);
      return;
    }

    // Merge custom thresholds
    if (customThresholds) {
      this.thresholds = { ...this.thresholds, ...customThresholds };
    }

    // Start periodic monitoring
    const interval = setInterval(() => {
      this.fetchAndAnalyzeStats(streamId);
    }, intervalMs);

    this.monitoring.set(streamId, {
      interval,
      stats: null,
      alerts: [],
    });

    // Fetch initial stats
    this.fetchAndAnalyzeStats(streamId);

    console.log(`[Health Monitor] Started monitoring stream: ${streamId}`);
  }

  /**
   * Stop monitoring a stream
   */
  stopMonitoring(streamId: string): void {
    const monitor = this.monitoring.get(streamId);
    if (!monitor) return;

    clearInterval(monitor.interval);
    this.monitoring.delete(streamId);

    console.log(`[Health Monitor] Stopped monitoring stream: ${streamId}`);
  }

  /**
   * Fetch and analyze stream stats
   */
  private async fetchAndAnalyzeStats(streamId: string): Promise<void> {
    try {
      // Fetch stats from backend (which calls Mux monitoring API)
      const response = await apiService.get<MuxMonitoringData>(
        `/mux/live-streams/${streamId}/monitoring`
      );

      const monitor = this.monitoring.get(streamId);
      if (!monitor) return;

      // Convert Mux data to health stats
      const stats = this.convertToHealthStats(response, monitor.stats);

      // Store stats
      monitor.stats = stats;

      // Analyze for issues
      const alerts = this.analyzeHealthStats(streamId, stats);

      // Store new alerts
      if (alerts.length > 0) {
        monitor.alerts.push(...alerts);

        // Notify alerts
        if (this.onAlertCallback) {
          alerts.forEach((alert) => this.onAlertCallback!(streamId, alert));
        }
      }

      // Notify stats update
      if (this.onStatsUpdateCallback) {
        this.onStatsUpdateCallback(streamId, stats);
      }
    } catch (error) {
      console.error(`Failed to fetch health stats for ${streamId}:`, error);

      // Create error alert
      const alert: StreamHealthAlert = {
        id: `${streamId}-error-${Date.now()}`,
        timestamp: new Date(),
        severity: 'critical',
        type: 'error',
        message: 'Failed to fetch stream health stats',
      };

      const monitor = this.monitoring.get(streamId);
      if (monitor) {
        monitor.alerts.push(alert);
        if (this.onAlertCallback) {
          this.onAlertCallback(streamId, alert);
        }
      }
    }
  }

  /**
   * Convert Mux monitoring data to health stats
   */
  private convertToHealthStats(
    muxData: MuxMonitoringData,
    previousStats: StreamHealthStats | null
  ): StreamHealthStats {
    const { data } = muxData;

    return {
      timestamp: new Date().toISOString(),

      // Viewer metrics
      currentViewers: data.current_viewer_count || 0,
      peakViewers: Math.max(
        data.max_viewer_count || 0,
        previousStats?.peakViewers || 0
      ),
      totalViewTime: (previousStats?.totalViewTime || 0) + 5, // Increment by monitoring interval

      // Video quality metrics
      videoBitrate: data.stream_metrics?.video_bitrate || 0,
      videoFrameRate: data.stream_metrics?.frame_rate || 0,
      videoWidth: data.stream_metrics?.width || 0,
      videoHeight: data.stream_metrics?.height || 0,
      videoCodec: 'h264', // Default, would need to be detected

      // Audio quality metrics
      audioBitrate: data.stream_metrics?.audio_bitrate || 0,
      audioSampleRate: 48000, // Default, would need to be detected
      audioCodec: 'opus', // Default

      // Performance metrics (estimated from available data)
      droppedFrames: 0, // Would need WebRTC stats
      totalFrames: (previousStats?.totalFrames || 0) + (data.stream_metrics?.frame_rate || 0) * 5,
      encoderCpu: 0, // Would need WebRTC stats
      networkJitter: 0, // Would need WebRTC stats
      roundTripTime: 0, // Would need WebRTC stats

      // Connection health
      connectionQuality: this.calculateConnectionQuality(data),
      packetLoss: 0, // Would need WebRTC stats
      availableBandwidth:
        (data.stream_metrics?.video_bitrate || 0) + (data.stream_metrics?.audio_bitrate || 0),

      // Stream state
      isLive: data.status === 'active',
      duration: data.recording?.duration || 0,
      errorCount: previousStats?.errorCount || 0,
      warnings: data.health?.issues?.map((issue) => issue.message) || [],
    };
  }

  /**
   * Calculate connection quality from Mux data
   */
  private calculateConnectionQuality(
    data: MuxMonitoringData['data']
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    if (!data.stream_metrics) return 'poor';

    const { video_bitrate, frame_rate } = data.stream_metrics;

    // Check health status if available
    if (data.health) {
      if (data.health.status === 'healthy') return 'excellent';
      if (data.health.status === 'warning') return 'good';
      return 'fair';
    }

    // Estimate based on bitrate and frame rate
    if (video_bitrate > 3000000 && frame_rate >= 30) return 'excellent';
    if (video_bitrate > 1500000 && frame_rate >= 24) return 'good';
    if (video_bitrate > 500000 && frame_rate >= 15) return 'fair';
    return 'poor';
  }

  /**
   * Analyze health stats and generate alerts
   */
  private analyzeHealthStats(
    streamId: string,
    stats: StreamHealthStats
  ): StreamHealthAlert[] {
    const alerts: StreamHealthAlert[] = [];

    // Check bitrate
    if (stats.videoBitrate < this.thresholds.minBitrate && stats.isLive) {
      alerts.push({
        id: `${streamId}-bitrate-${Date.now()}`,
        timestamp: new Date(),
        severity: 'warning',
        type: 'bitrate',
        message: `Video bitrate is low: ${(stats.videoBitrate / 1000).toFixed(0)} kbps`,
        metric: {
          name: 'Video Bitrate',
          current: stats.videoBitrate,
          threshold: this.thresholds.minBitrate,
        },
      });
    }

    // Check frame rate
    if (stats.videoFrameRate < this.thresholds.minFrameRate && stats.isLive) {
      alerts.push({
        id: `${streamId}-framerate-${Date.now()}`,
        timestamp: new Date(),
        severity: 'warning',
        type: 'framerate',
        message: `Frame rate is low: ${stats.videoFrameRate.toFixed(1)} fps`,
        metric: {
          name: 'Frame Rate',
          current: stats.videoFrameRate,
          threshold: this.thresholds.minFrameRate,
        },
      });
    }

    // Check connection quality
    const qualityLevels = ['poor', 'fair', 'good', 'excellent'];
    const currentQualityIndex = qualityLevels.indexOf(stats.connectionQuality);
    const minQualityIndex = qualityLevels.indexOf(this.thresholds.minConnectionQuality);

    if (currentQualityIndex < minQualityIndex && stats.isLive) {
      alerts.push({
        id: `${streamId}-quality-${Date.now()}`,
        timestamp: new Date(),
        severity: currentQualityIndex === 0 ? 'critical' : 'warning',
        type: 'quality',
        message: `Connection quality is ${stats.connectionQuality}`,
      });
    }

    // Check packet loss
    if (stats.packetLoss > this.thresholds.maxPacketLoss && stats.isLive) {
      alerts.push({
        id: `${streamId}-packet-loss-${Date.now()}`,
        timestamp: new Date(),
        severity: stats.packetLoss > 5 ? 'critical' : 'warning',
        type: 'connection',
        message: `High packet loss: ${stats.packetLoss.toFixed(1)}%`,
        metric: {
          name: 'Packet Loss',
          current: stats.packetLoss,
          threshold: this.thresholds.maxPacketLoss,
        },
      });
    }

    // Check warnings from Mux
    if (stats.warnings.length > 0) {
      stats.warnings.forEach((warning, index) => {
        alerts.push({
          id: `${streamId}-warning-${Date.now()}-${index}`,
          timestamp: new Date(),
          severity: 'info',
          type: 'error',
          message: warning,
        });
      });
    }

    return alerts;
  }

  /**
   * Process WebRTC stats and merge with health stats
   */
  processWebRTCStats(streamId: string, rtcStats: RTCStatsReport): void {
    const monitor = this.monitoring.get(streamId);
    if (!monitor || !monitor.stats) return;

    let outboundVideoStats: any = null;
    let outboundAudioStats: any = null;
    let candidatePairStats: any = null;

    rtcStats.forEach((stat) => {
      if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
        outboundVideoStats = stat;
      } else if (stat.type === 'outbound-rtp' && stat.kind === 'audio') {
        outboundAudioStats = stat;
      } else if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
        candidatePairStats = stat;
      }
    });

    // Update stats with WebRTC data
    if (outboundVideoStats) {
      monitor.stats.droppedFrames = outboundVideoStats.framesDropped || 0;
      monitor.stats.totalFrames = outboundVideoStats.framesSent || 0;

      if (outboundVideoStats.bytesSent && outboundVideoStats.timestamp) {
        // Calculate bitrate (simplified)
        monitor.stats.videoBitrate = outboundVideoStats.bytesSent * 8; // Convert bytes to bits
      }
    }

    if (candidatePairStats) {
      monitor.stats.roundTripTime = (candidatePairStats.currentRoundTripTime || 0) * 1000; // Convert to ms
      monitor.stats.availableBandwidth = candidatePairStats.availableOutgoingBitrate || 0;
    }

    // Notify update
    if (this.onStatsUpdateCallback) {
      this.onStatsUpdateCallback(streamId, monitor.stats);
    }
  }

  /**
   * Get current stats for a stream
   */
  getCurrentStats(streamId: string): StreamHealthStats | null {
    const monitor = this.monitoring.get(streamId);
    return monitor?.stats || null;
  }

  /**
   * Get alerts for a stream
   */
  getAlerts(streamId: string, limit: number = 10): StreamHealthAlert[] {
    const monitor = this.monitoring.get(streamId);
    if (!monitor) return [];

    return monitor.alerts.slice(-limit).reverse();
  }

  /**
   * Clear alerts for a stream
   */
  clearAlerts(streamId: string): void {
    const monitor = this.monitoring.get(streamId);
    if (monitor) {
      monitor.alerts = [];
    }
  }

  /**
   * Register callback for stats updates
   */
  onStatsUpdate(callback: (streamId: string, stats: StreamHealthStats) => void): void {
    this.onStatsUpdateCallback = callback;
  }

  /**
   * Register callback for alerts
   */
  onAlert(callback: (streamId: string, alert: StreamHealthAlert) => void): void {
    this.onAlertCallback = callback;
  }

  /**
   * Update health thresholds
   */
  setThresholds(thresholds: Partial<HealthThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Stop all monitoring
   */
  stopAll(): void {
    for (const streamId of this.monitoring.keys()) {
      this.stopMonitoring(streamId);
    }
  }
}

export default new StreamHealthMonitor();
