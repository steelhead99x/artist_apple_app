/**
 * Mux Live Streaming Types
 * WebRTC streaming and health monitoring
 */

// Mux Live Stream
export interface MuxLiveStream {
  id: string;
  streamKey: string;
  playbackIds: Array<{
    id: string;
    policy: 'public' | 'signed';
  }>;
  status: 'idle' | 'active' | 'disconnected';
  reconnectWindow: number;
  newAssetSettings?: {
    playbackPolicy: ('public' | 'signed')[];
    mp4Support?: 'none' | 'standard' | 'audio-only';
  };
  createdAt?: string;
  streamUrl?: string;
  playbackUrl?: string;
}

// WebRTC Connection
export interface WebRTCConnection {
  id: string;
  pc: RTCPeerConnection;
  stream: MediaStream;
  state: RTCPeerConnectionState;
  iceState: RTCIceConnectionState;
}

// Stream Health Stats (Mux Monitoring API)
export interface StreamHealthStats {
  timestamp: string;

  // Viewer metrics
  currentViewers: number;
  peakViewers: number;
  totalViewTime: number;

  // Video quality metrics
  videoBitrate: number; // bits per second
  videoFrameRate: number; // frames per second
  videoWidth: number;
  videoHeight: number;
  videoCodec: string;

  // Audio quality metrics
  audioBitrate: number; // bits per second
  audioSampleRate: number;
  audioCodec: string;

  // Performance metrics
  droppedFrames: number;
  totalFrames: number;
  encoderCpu: number; // percentage
  networkJitter: number; // milliseconds
  roundTripTime: number; // milliseconds

  // Connection health
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  packetLoss: number; // percentage
  availableBandwidth: number; // bits per second

  // Stream state
  isLive: boolean;
  duration: number; // seconds
  errorCount: number;
  warnings: string[];
}

// Real-time monitoring data from Mux
export interface MuxMonitoringData {
  data: {
    // Current state
    status: 'idle' | 'active' | 'disconnected';
    active_asset_id?: string;

    // Viewer stats
    current_viewer_count: number;
    max_viewer_count: number;

    // Stream metrics
    stream_metrics?: {
      video_bitrate: number;
      audio_bitrate: number;
      frame_rate: number;
      width: number;
      height: number;
      keyframe_interval: number;
    };

    // Health indicators
    health?: {
      status: 'healthy' | 'warning' | 'critical';
      issues: Array<{
        type: string;
        message: string;
        severity: 'low' | 'medium' | 'high';
      }>;
    };

    // Recording status
    recording?: {
      enabled: boolean;
      duration: number;
    };
  };
}

// Stream configuration for WebRTC
export interface MuxWebRTCConfig {
  streamId: string;
  streamKey: string;
  maxBitrate?: number;
  preferredCodec?: 'vp8' | 'vp9' | 'h264';
  simulcast?: boolean;
  stereo?: boolean;
}

// Streaming session
export interface StreamingSession {
  streamId: string;
  startTime: Date;
  connection: WebRTCConnection | null;
  healthStats: StreamHealthStats | null;
  monitoring: {
    enabled: boolean;
    interval: number; // milliseconds
    lastUpdate: Date | null;
  };
}

// Health threshold configuration
export interface HealthThresholds {
  minBitrate: number; // bits per second
  minFrameRate: number; // fps
  maxDroppedFrameRate: number; // percentage
  maxPacketLoss: number; // percentage
  maxRoundTripTime: number; // milliseconds
  minConnectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

// Alert for stream health issues
export interface StreamHealthAlert {
  id: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical';
  type: 'bitrate' | 'framerate' | 'connection' | 'quality' | 'error';
  message: string;
  metric?: {
    name: string;
    current: number;
    threshold: number;
  };
}

// Default health thresholds
export const DEFAULT_HEALTH_THRESHOLDS: HealthThresholds = {
  minBitrate: 500000, // 500 kbps
  minFrameRate: 20, // fps
  maxDroppedFrameRate: 5, // 5%
  maxPacketLoss: 2, // 2%
  maxRoundTripTime: 300, // 300ms
  minConnectionQuality: 'fair',
};
