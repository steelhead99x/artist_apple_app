/**
 * Professional MediaStream Service
 * Comprehensive audio and video stream management with advanced controls
 */

import { Platform } from 'react-native';
import {
  AudioConstraints,
  AudioDevice,
  VideoConstraints,
  VideoDevice,
  MediaCapabilities,
  MediaStreamConfig,
  StreamQuality,
  QUALITY_PRESETS,
} from '../types/mediaStream';

class MediaStreamService {
  private currentStream: MediaStream | null = null;
  private audioDevices: AudioDevice[] = [];
  private videoDevices: VideoDevice[] = [];

  /**
   * Initialize media devices and get permissions
   */
  async initialize(): Promise<void> {
    if (Platform.OS !== 'web') {
      console.warn('Advanced media controls are only available on web platform');
      return;
    }

    try {
      // Request initial permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      // Store initial stream
      this.currentStream = stream;

      // Enumerate devices
      await this.enumerateDevices();

      // Listen for device changes
      navigator.mediaDevices.addEventListener('devicechange', () => {
        this.enumerateDevices();
      });
    } catch (error) {
      console.error('Failed to initialize media stream:', error);
      throw error;
    }
  }

  /**
   * Enumerate available media devices
   */
  async enumerateDevices(): Promise<void> {
    if (Platform.OS !== 'web') return;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      this.audioDevices = devices
        .filter((device) => device.kind === 'audioinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${this.audioDevices.length + 1}`,
          kind: 'audioinput' as const,
          groupId: device.groupId,
        }));

      this.videoDevices = devices
        .filter((device) => device.kind === 'videoinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${this.videoDevices.length + 1}`,
          kind: 'videoinput' as const,
          groupId: device.groupId,
        }));
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
    }
  }

  /**
   * Get available audio input devices
   */
  getAudioDevices(): AudioDevice[] {
    return this.audioDevices;
  }

  /**
   * Get available video input devices
   */
  getVideoDevices(): VideoDevice[] {
    return this.videoDevices;
  }

  /**
   * Get capabilities of a specific video device
   */
  async getVideoDeviceCapabilities(deviceId: string): Promise<MediaCapabilities['video'] | null> {
    if (Platform.OS !== 'web' || !this.currentStream) return null;

    try {
      const videoTrack = this.currentStream.getVideoTracks()[0];
      if (!videoTrack) return null;

      const capabilities = videoTrack.getCapabilities();

      return {
        supportedResolutions: capabilities.width && capabilities.height
          ? this.generateSupportedResolutions(
              capabilities.width as any,
              capabilities.height as any
            )
          : [],
        supportedFrameRates: capabilities.frameRate
          ? this.extractRange(capabilities.frameRate as any)
          : [],
        supportsFocusMode: 'focusMode' in capabilities,
        supportsExposureMode: 'exposureMode' in capabilities,
        supportsWhiteBalance: 'whiteBalanceMode' in capabilities,
        supportsZoom: 'zoom' in capabilities,
        supportsTorch: 'torch' in capabilities,
        supportsPanTilt: 'pan' in capabilities && 'tilt' in capabilities,
        focusDistance: capabilities.focusDistance as any,
        exposureCompensation: capabilities.exposureCompensation as any,
        exposureTime: capabilities.exposureTime as any,
        colorTemperature: capabilities.colorTemperature as any,
        iso: capabilities.iso as any,
        zoom: capabilities.zoom as any,
      };
    } catch (error) {
      console.error('Failed to get video device capabilities:', error);
      return null;
    }
  }

  /**
   * Get capabilities of a specific audio device
   */
  async getAudioDeviceCapabilities(deviceId: string): Promise<MediaCapabilities['audio'] | null> {
    if (Platform.OS !== 'web' || !this.currentStream) return null;

    try {
      const audioTrack = this.currentStream.getAudioTracks()[0];
      if (!audioTrack) return null;

      const capabilities = audioTrack.getCapabilities();

      return {
        supportsEchoCancellation: 'echoCancellation' in capabilities,
        supportsNoiseSuppression: 'noiseSuppression' in capabilities,
        supportsAutoGainControl: 'autoGainControl' in capabilities,
        supportedSampleRates: capabilities.sampleRate
          ? this.extractRange(capabilities.sampleRate as any)
          : [],
        supportedChannelCounts: capabilities.channelCount
          ? this.extractRange(capabilities.channelCount as any)
          : [],
      };
    } catch (error) {
      console.error('Failed to get audio device capabilities:', error);
      return null;
    }
  }

  /**
   * Create a new media stream with specific constraints
   */
  async createStream(config: MediaStreamConfig): Promise<MediaStream> {
    if (Platform.OS !== 'web') {
      throw new Error('Advanced media controls are only available on web platform');
    }

    try {
      // Stop existing stream
      this.stopStream();

      // Build constraints from config
      const constraints = this.buildConstraints(config);

      // Create new stream
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentStream = stream;

      return stream;
    } catch (error) {
      console.error('Failed to create media stream:', error);
      throw error;
    }
  }

  /**
   * Update stream with new constraints
   */
  async updateStream(config: Partial<MediaStreamConfig>): Promise<MediaStream> {
    if (Platform.OS !== 'web' || !this.currentStream) {
      throw new Error('No active stream to update');
    }

    try {
      const videoTrack = this.currentStream.getVideoTracks()[0];
      const audioTrack = this.currentStream.getAudioTracks()[0];

      // Apply video constraints
      if (config.video && videoTrack) {
        await videoTrack.applyConstraints(config.video);
      }

      // Apply audio constraints
      if (config.audio && audioTrack) {
        await audioTrack.applyConstraints(config.audio);
      }

      return this.currentStream;
    } catch (error) {
      console.error('Failed to update stream constraints:', error);
      throw error;
    }
  }

  /**
   * Apply advanced video settings
   */
  async applyAdvancedVideoSettings(settings: Partial<VideoConstraints>): Promise<void> {
    if (Platform.OS !== 'web' || !this.currentStream) {
      throw new Error('No active stream');
    }

    try {
      const videoTrack = this.currentStream.getVideoTracks()[0];
      if (!videoTrack) throw new Error('No video track available');

      await videoTrack.applyConstraints(settings as MediaTrackConstraints);
    } catch (error) {
      console.error('Failed to apply advanced video settings:', error);
      throw error;
    }
  }

  /**
   * Apply audio settings
   */
  async applyAudioSettings(settings: Partial<AudioConstraints>): Promise<void> {
    if (Platform.OS !== 'web' || !this.currentStream) {
      throw new Error('No active stream');
    }

    try {
      const audioTrack = this.currentStream.getAudioTracks()[0];
      if (!audioTrack) throw new Error('No audio track available');

      await audioTrack.applyConstraints(settings as MediaTrackConstraints);
    } catch (error) {
      console.error('Failed to apply audio settings:', error);
      throw error;
    }
  }

  /**
   * Switch camera device
   */
  async switchCamera(deviceId: string, constraints?: VideoConstraints): Promise<MediaStream> {
    if (Platform.OS !== 'web') {
      throw new Error('Camera switching is only available on web platform');
    }

    try {
      const videoConstraints: VideoConstraints = {
        ...constraints,
        deviceId: { exact: deviceId } as any,
      };

      const stream = await this.createStream({
        audio: this.getDefaultAudioConstraints(),
        video: videoConstraints,
        quality: 'high',
      });

      return stream;
    } catch (error) {
      console.error('Failed to switch camera:', error);
      throw error;
    }
  }

  /**
   * Switch audio device
   */
  async switchAudioDevice(deviceId: string, constraints?: AudioConstraints): Promise<MediaStream> {
    if (Platform.OS !== 'web') {
      throw new Error('Audio device switching is only available on web platform');
    }

    try {
      const audioConstraints: AudioConstraints = {
        ...constraints,
        deviceId: { exact: deviceId } as any,
      };

      const stream = await this.createStream({
        audio: audioConstraints,
        video: this.getDefaultVideoConstraints(),
        quality: 'high',
      });

      return stream;
    } catch (error) {
      console.error('Failed to switch audio device:', error);
      throw error;
    }
  }

  /**
   * Get current stream settings
   */
  getCurrentSettings(): { audio: MediaTrackSettings; video: MediaTrackSettings } | null {
    if (Platform.OS !== 'web' || !this.currentStream) return null;

    const videoTrack = this.currentStream.getVideoTracks()[0];
    const audioTrack = this.currentStream.getAudioTracks()[0];

    return {
      video: videoTrack?.getSettings() || ({} as MediaTrackSettings),
      audio: audioTrack?.getSettings() || ({} as MediaTrackSettings),
    };
  }

  /**
   * Stop current stream and release resources
   */
  stopStream(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach((track) => track.stop());
      this.currentStream = null;
    }
  }

  /**
   * Get current stream
   */
  getCurrentStream(): MediaStream | null {
    return this.currentStream;
  }

  /**
   * Build constraints from config
   */
  private buildConstraints(config: MediaStreamConfig): MediaStreamConstraints {
    const preset = QUALITY_PRESETS[config.quality];

    const videoConstraints: any = {
      ...config.video,
    };

    // Apply quality preset if not custom
    if (config.quality !== 'custom') {
      videoConstraints.width = { ideal: preset.video.width };
      videoConstraints.height = { ideal: preset.video.height };
      videoConstraints.frameRate = { ideal: preset.video.frameRate };
    }

    const audioConstraints: any = {
      ...config.audio,
    };

    // Apply quality preset for audio
    if (config.quality !== 'custom') {
      audioConstraints.sampleRate = { ideal: preset.audio.sampleRate };
      audioConstraints.channelCount = { ideal: preset.audio.channelCount };
    }

    return {
      video: videoConstraints,
      audio: audioConstraints,
    };
  }

  /**
   * Generate supported resolutions from capabilities
   */
  private generateSupportedResolutions(
    widthCap: any,
    heightCap: any
  ): Array<{ width: number; height: number }> {
    const commonResolutions = [
      { width: 640, height: 360 },
      { width: 854, height: 480 },
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
      { width: 2560, height: 1440 },
      { width: 3840, height: 2160 },
    ];

    return commonResolutions.filter(
      (res) =>
        res.width >= (widthCap.min || 0) &&
        res.width <= (widthCap.max || Infinity) &&
        res.height >= (heightCap.min || 0) &&
        res.height <= (heightCap.max || Infinity)
    );
  }

  /**
   * Extract range from capability
   */
  private extractRange(cap: any): number[] {
    if (Array.isArray(cap)) return cap;
    if (typeof cap === 'object' && cap.min !== undefined && cap.max !== undefined) {
      // Return common values within range
      const values = [8000, 16000, 22050, 24000, 44100, 48000];
      return values.filter((v) => v >= cap.min && v <= cap.max);
    }
    return [];
  }

  /**
   * Get default audio constraints
   */
  private getDefaultAudioConstraints(): AudioConstraints {
    return {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 2,
    };
  }

  /**
   * Get default video constraints
   */
  private getDefaultVideoConstraints(): VideoConstraints {
    return {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
      facingMode: 'user',
    };
  }
}

export default new MediaStreamService();
