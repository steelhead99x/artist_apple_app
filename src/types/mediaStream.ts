/**
 * Comprehensive Media Stream Types and Interfaces
 * Professional audio and video streaming configuration
 */

// Audio Settings
export interface AudioConstraints {
  deviceId?: string;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  sampleRate?: number;
  sampleSize?: number;
  channelCount?: number;
  latency?: number;
  volume?: number;
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  groupId?: string;
}

// Video Settings
export interface VideoConstraints {
  deviceId?: string;
  width?: number | { min?: number; max?: number; ideal?: number };
  height?: number | { min?: number; max?: number; ideal?: number };
  aspectRatio?: number | { min?: number; max?: number; ideal?: number };
  frameRate?: number | { min?: number; max?: number; ideal?: number };
  facingMode?: 'user' | 'environment';
  resizeMode?: 'none' | 'crop-and-scale';

  // Advanced camera controls
  focusMode?: 'manual' | 'continuous' | 'single-shot';
  focusDistance?: number | { min?: number; max?: number; ideal?: number };
  exposureMode?: 'manual' | 'continuous' | 'single-shot';
  exposureCompensation?: number;
  exposureTime?: number;
  colorTemperature?: number;
  iso?: number | { min?: number; max?: number; ideal?: number };
  brightness?: number;
  contrast?: number;
  saturation?: number;
  sharpness?: number;
  whiteBalanceMode?: 'manual' | 'continuous' | 'single-shot';
  zoom?: number | { min?: number; max?: number; ideal?: number };
  torch?: boolean;
  pan?: number;
  tilt?: number;
}

export interface VideoDevice {
  deviceId: string;
  label: string;
  kind: 'videoinput';
  groupId?: string;
  capabilities?: MediaTrackCapabilities;
}

// Streaming Quality Presets
export type StreamQuality = 'low' | 'medium' | 'high' | 'ultra' | 'custom';

export interface QualityPreset {
  name: string;
  video: {
    width: number;
    height: number;
    frameRate: number;
    bitrate: number;
  };
  audio: {
    sampleRate: number;
    bitrate: number;
    channelCount: number;
  };
}

export const QUALITY_PRESETS: Record<StreamQuality, QualityPreset> = {
  low: {
    name: 'Low (360p)',
    video: { width: 640, height: 360, frameRate: 24, bitrate: 800000 },
    audio: { sampleRate: 22050, bitrate: 64000, channelCount: 1 },
  },
  medium: {
    name: 'Medium (720p)',
    video: { width: 1280, height: 720, frameRate: 30, bitrate: 2500000 },
    audio: { sampleRate: 44100, bitrate: 128000, channelCount: 2 },
  },
  high: {
    name: 'High (1080p)',
    video: { width: 1920, height: 1080, frameRate: 30, bitrate: 5000000 },
    audio: { sampleRate: 48000, bitrate: 192000, channelCount: 2 },
  },
  ultra: {
    name: 'Ultra (1080p60)',
    video: { width: 1920, height: 1080, frameRate: 60, bitrate: 8000000 },
    audio: { sampleRate: 48000, bitrate: 256000, channelCount: 2 },
  },
  custom: {
    name: 'Custom',
    video: { width: 1920, height: 1080, frameRate: 30, bitrate: 5000000 },
    audio: { sampleRate: 48000, bitrate: 192000, channelCount: 2 },
  },
};

// Media Stream Configuration
export interface MediaStreamConfig {
  audio: AudioConstraints;
  video: VideoConstraints;
  quality: StreamQuality;
}

// Capabilities and Supported Features
export interface MediaCapabilities {
  video: {
    supportedResolutions: Array<{ width: number; height: number }>;
    supportedFrameRates: number[];
    supportsFocusMode: boolean;
    supportsExposureMode: boolean;
    supportsWhiteBalance: boolean;
    supportsZoom: boolean;
    supportsTorch: boolean;
    supportsPanTilt: boolean;
    focusDistance?: { min: number; max: number };
    exposureCompensation?: { min: number; max: number };
    exposureTime?: { min: number; max: number };
    colorTemperature?: { min: number; max: number };
    iso?: { min: number; max: number };
    zoom?: { min: number; max: number };
  };
  audio: {
    supportsEchoCancellation: boolean;
    supportsNoiseSuppression: boolean;
    supportsAutoGainControl: boolean;
    supportedSampleRates: number[];
    supportedChannelCounts: number[];
  };
}

// Stream Settings State
export interface StreamSettings {
  selectedVideoDevice: string | null;
  selectedAudioDevice: string | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  audioConstraints: AudioConstraints;
  videoConstraints: VideoConstraints;
  quality: StreamQuality;
}

// Mux Live Stream Configuration
export interface MuxStreamConfig {
  playbackPolicy: ('public' | 'signed')[];
  newAssetSettings: {
    playbackPolicy: ('public' | 'signed')[];
    mp4Support: 'none' | 'standard' | 'audio-only';
  };
  maxContinuousDuration: number;
  reconnectWindow: number;
  reducedLatencySignaling: boolean;
  latencyMode: 'low' | 'standard';
  maxResolutionTier: '1080p' | '1440p' | '2160p';
  testMode?: boolean;
}

export interface MuxLiveStream {
  id: string;
  streamKey: string;
  playbackId: string;
  streamUrl: string;
  playbackUrl: string;
  status: 'idle' | 'active' | 'disconnected';
}
