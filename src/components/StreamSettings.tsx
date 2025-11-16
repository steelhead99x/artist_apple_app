/**
 * Professional Stream Settings Component
 * Comprehensive audio and video controls for live streaming
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import theme from '../theme';
import mediaStreamService from '../services/mediaStream';
import {
  AudioDevice,
  VideoDevice,
  AudioConstraints,
  VideoConstraints,
  StreamQuality,
  QUALITY_PRESETS,
  MediaCapabilities,
} from '../types/mediaStream';

interface StreamSettingsProps {
  onClose: () => void;
  onApply: (config: {
    audio: AudioConstraints;
    video: VideoConstraints;
    quality: StreamQuality;
  }) => void;
  currentAudioDevice?: string | null;
  currentVideoDevice?: string | null;
}

export default function StreamSettings({
  onClose,
  onApply,
  currentAudioDevice,
  currentVideoDevice,
}: StreamSettingsProps) {
  // Device lists
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [videoDevices, setVideoDevices] = useState<VideoDevice[]>([]);
  const [capabilities, setCapabilities] = useState<MediaCapabilities | null>(null);

  // Selected devices
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string | null>(
    currentAudioDevice || null
  );
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string | null>(
    currentVideoDevice || null
  );

  // Quality preset
  const [quality, setQuality] = useState<StreamQuality>('high');

  // Audio settings
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [autoGainControl, setAutoGainControl] = useState(true);
  const [audioVolume, setAudioVolume] = useState(1.0);

  // Video settings
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [videoResolution, setVideoResolution] = useState({ width: 1920, height: 1080 });
  const [frameRate, setFrameRate] = useState(30);

  // Advanced video settings
  const [focusMode, setFocusMode] = useState<'manual' | 'continuous' | 'single-shot'>('continuous');
  const [exposureMode, setExposureMode] = useState<'manual' | 'continuous' | 'single-shot'>(
    'continuous'
  );
  const [whiteBalanceMode, setWhiteBalanceMode] = useState<
    'manual' | 'continuous' | 'single-shot'
  >('continuous');
  const [zoom, setZoom] = useState(1.0);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [torch, setTorch] = useState(false);

  // UI State
  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'advanced'>('audio');
  const [showAdvancedVideo, setShowAdvancedVideo] = useState(false);

  useEffect(() => {
    loadDevices();
    loadCapabilities();
  }, []);

  const loadDevices = async () => {
    if (Platform.OS !== 'web') return;

    try {
      await mediaStreamService.initialize();
      setAudioDevices(mediaStreamService.getAudioDevices());
      setVideoDevices(mediaStreamService.getVideoDevices());

      // Set default devices if not already set
      if (!selectedAudioDevice && audioDevices.length > 0) {
        setSelectedAudioDevice(audioDevices[0].deviceId);
      }
      if (!selectedVideoDevice && videoDevices.length > 0) {
        setSelectedVideoDevice(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const loadCapabilities = async () => {
    if (Platform.OS !== 'web' || !selectedVideoDevice) return;

    try {
      const videoCaps = await mediaStreamService.getVideoDeviceCapabilities(selectedVideoDevice);
      const audioCaps = await mediaStreamService.getAudioDeviceCapabilities(
        selectedAudioDevice || ''
      );

      if (videoCaps && audioCaps) {
        setCapabilities({
          video: videoCaps,
          audio: audioCaps,
        });
      }
    } catch (error) {
      console.error('Failed to load capabilities:', error);
    }
  };

  const handleApply = () => {
    const audioConstraints: AudioConstraints = audioEnabled
      ? {
          deviceId: selectedAudioDevice || undefined,
          echoCancellation,
          noiseSuppression,
          autoGainControl,
          sampleRate: QUALITY_PRESETS[quality].audio.sampleRate,
          channelCount: QUALITY_PRESETS[quality].audio.channelCount,
          volume: audioVolume,
        }
      : ({} as AudioConstraints);

    const videoConstraints: VideoConstraints = videoEnabled
      ? {
          deviceId: selectedVideoDevice || undefined,
          width: { ideal: videoResolution.width },
          height: { ideal: videoResolution.height },
          frameRate: { ideal: frameRate },
          focusMode,
          exposureMode,
          whiteBalanceMode,
          zoom: { ideal: zoom },
          brightness,
          contrast,
          saturation,
          torch,
        }
      : ({} as VideoConstraints);

    onApply({
      audio: audioConstraints,
      video: videoConstraints,
      quality,
    });
  };

  const renderQualityPresets = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quality Preset</Text>
      <View style={styles.presetGrid}>
        {(Object.keys(QUALITY_PRESETS) as StreamQuality[]).map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[styles.presetButton, quality === preset && styles.presetButtonActive]}
            onPress={() => setQuality(preset)}
          >
            <Text
              style={[styles.presetText, quality === preset && styles.presetTextActive]}
            >
              {QUALITY_PRESETS[preset].name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAudioSettings = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Audio Device Selection */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="mic" size={20} color={theme.colors.primary[600]} />
          <Text style={styles.sectionTitle}>Microphone</Text>
        </View>
        {audioDevices.map((device) => (
          <TouchableOpacity
            key={device.deviceId}
            style={[
              styles.deviceOption,
              selectedAudioDevice === device.deviceId && styles.deviceOptionSelected,
            ]}
            onPress={() => setSelectedAudioDevice(device.deviceId)}
          >
            <Ionicons
              name={
                selectedAudioDevice === device.deviceId
                  ? 'radio-button-on'
                  : 'radio-button-off'
              }
              size={20}
              color={
                selectedAudioDevice === device.deviceId
                  ? theme.colors.primary[600]
                  : theme.colors.text.secondary
              }
            />
            <Text
              style={[
                styles.deviceOptionText,
                selectedAudioDevice === device.deviceId && styles.deviceOptionTextSelected,
              ]}
            >
              {device.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Audio Enhancements */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Audio Enhancements</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Echo Cancellation</Text>
            <Text style={styles.settingHint}>Reduce echo from speakers</Text>
          </View>
          <Switch
            value={echoCancellation}
            onValueChange={setEchoCancellation}
            trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary[400] }}
            thumbColor={echoCancellation ? theme.colors.primary[600] : theme.colors.gray[400]}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Noise Suppression</Text>
            <Text style={styles.settingHint}>Reduce background noise</Text>
          </View>
          <Switch
            value={noiseSuppression}
            onValueChange={setNoiseSuppression}
            trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary[400] }}
            thumbColor={noiseSuppression ? theme.colors.primary[600] : theme.colors.gray[400]}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto Gain Control</Text>
            <Text style={styles.settingHint}>Automatically adjust volume</Text>
          </View>
          <Switch
            value={autoGainControl}
            onValueChange={setAutoGainControl}
            trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary[400] }}
            thumbColor={autoGainControl ? theme.colors.primary[600] : theme.colors.gray[400]}
          />
        </View>
      </View>

      {/* Volume Control */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Input Volume</Text>
        <View style={styles.sliderContainer}>
          <Ionicons name="volume-low" size={20} color={theme.colors.text.secondary} />
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            value={audioVolume}
            onValueChange={setAudioVolume}
            minimumTrackTintColor={theme.colors.primary[600]}
            maximumTrackTintColor={theme.colors.gray[300]}
            thumbTintColor={theme.colors.primary[600]}
          />
          <Ionicons name="volume-high" size={20} color={theme.colors.text.secondary} />
          <Text style={styles.sliderValue}>{Math.round(audioVolume * 100)}%</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderVideoSettings = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Video Device Selection */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="videocam" size={20} color={theme.colors.primary[600]} />
          <Text style={styles.sectionTitle}>Camera</Text>
        </View>
        {videoDevices.map((device) => (
          <TouchableOpacity
            key={device.deviceId}
            style={[
              styles.deviceOption,
              selectedVideoDevice === device.deviceId && styles.deviceOptionSelected,
            ]}
            onPress={() => setSelectedVideoDevice(device.deviceId)}
          >
            <Ionicons
              name={
                selectedVideoDevice === device.deviceId
                  ? 'radio-button-on'
                  : 'radio-button-off'
              }
              size={20}
              color={
                selectedVideoDevice === device.deviceId
                  ? theme.colors.primary[600]
                  : theme.colors.text.secondary
              }
            />
            <Text
              style={[
                styles.deviceOptionText,
                selectedVideoDevice === device.deviceId && styles.deviceOptionTextSelected,
              ]}
            >
              {device.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Resolution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resolution</Text>
        <View style={styles.resolutionGrid}>
          {[
            { width: 640, height: 360, label: '360p' },
            { width: 1280, height: 720, label: '720p' },
            { width: 1920, height: 1080, label: '1080p' },
            { width: 2560, height: 1440, label: '1440p' },
          ].map((res) => (
            <TouchableOpacity
              key={res.label}
              style={[
                styles.resolutionButton,
                videoResolution.width === res.width && styles.resolutionButtonActive,
              ]}
              onPress={() => setVideoResolution({ width: res.width, height: res.height })}
            >
              <Text
                style={[
                  styles.resolutionText,
                  videoResolution.width === res.width && styles.resolutionTextActive,
                ]}
              >
                {res.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Frame Rate */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Frame Rate</Text>
        <View style={styles.resolutionGrid}>
          {[24, 30, 60].map((fps) => (
            <TouchableOpacity
              key={fps}
              style={[styles.resolutionButton, frameRate === fps && styles.resolutionButtonActive]}
              onPress={() => setFrameRate(fps)}
            >
              <Text
                style={[
                  styles.resolutionText,
                  frameRate === fps && styles.resolutionTextActive,
                ]}
              >
                {fps} FPS
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderAdvancedSettings = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Focus Control */}
      {capabilities?.video.supportsFocusMode && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Focus Mode</Text>
          <View style={styles.buttonGroup}>
            {['continuous', 'manual', 'single-shot'].map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeButton, focusMode === mode && styles.modeButtonActive]}
                onPress={() => setFocusMode(mode as any)}
              >
                <Text style={[styles.modeText, focusMode === mode && styles.modeTextActive]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Exposure Control */}
      {capabilities?.video.supportsExposureMode && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exposure Mode</Text>
          <View style={styles.buttonGroup}>
            {['continuous', 'manual', 'single-shot'].map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.modeButton, exposureMode === mode && styles.modeButtonActive]}
                onPress={() => setExposureMode(mode as any)}
              >
                <Text style={[styles.modeText, exposureMode === mode && styles.modeTextActive]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* White Balance */}
      {capabilities?.video.supportsWhiteBalance && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>White Balance</Text>
          <View style={styles.buttonGroup}>
            {['continuous', 'manual', 'single-shot'].map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeButton,
                  whiteBalanceMode === mode && styles.modeButtonActive,
                ]}
                onPress={() => setWhiteBalanceMode(mode as any)}
              >
                <Text
                  style={[styles.modeText, whiteBalanceMode === mode && styles.modeTextActive]}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Zoom */}
      {capabilities?.video.supportsZoom && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Zoom</Text>
          <View style={styles.sliderContainer}>
            <Ionicons name="remove" size={20} color={theme.colors.text.secondary} />
            <Slider
              style={styles.slider}
              minimumValue={capabilities.video.zoom?.min || 1}
              maximumValue={capabilities.video.zoom?.max || 3}
              value={zoom}
              onValueChange={setZoom}
              minimumTrackTintColor={theme.colors.primary[600]}
              maximumTrackTintColor={theme.colors.gray[300]}
              thumbTintColor={theme.colors.primary[600]}
            />
            <Ionicons name="add" size={20} color={theme.colors.text.secondary} />
            <Text style={styles.sliderValue}>{zoom.toFixed(1)}x</Text>
          </View>
        </View>
      )}

      {/* Brightness */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Brightness</Text>
        <View style={styles.sliderContainer}>
          <Ionicons name="moon" size={20} color={theme.colors.text.secondary} />
          <Slider
            style={styles.slider}
            minimumValue={-100}
            maximumValue={100}
            value={brightness}
            onValueChange={setBrightness}
            minimumTrackTintColor={theme.colors.primary[600]}
            maximumTrackTintColor={theme.colors.gray[300]}
            thumbTintColor={theme.colors.primary[600]}
          />
          <Ionicons name="sunny" size={20} color={theme.colors.text.secondary} />
          <Text style={styles.sliderValue}>{Math.round(brightness)}</Text>
        </View>
      </View>

      {/* Contrast */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contrast</Text>
        <View style={styles.sliderContainer}>
          <Ionicons name="contrast" size={20} color={theme.colors.text.secondary} />
          <Slider
            style={styles.slider}
            minimumValue={-100}
            maximumValue={100}
            value={contrast}
            onValueChange={setContrast}
            minimumTrackTintColor={theme.colors.primary[600]}
            maximumTrackTintColor={theme.colors.gray[300]}
            thumbTintColor={theme.colors.primary[600]}
          />
          <Text style={styles.sliderValue}>{Math.round(contrast)}</Text>
        </View>
      </View>

      {/* Saturation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saturation</Text>
        <View style={styles.sliderContainer}>
          <Ionicons name="color-palette" size={20} color={theme.colors.text.secondary} />
          <Slider
            style={styles.slider}
            minimumValue={-100}
            maximumValue={100}
            value={saturation}
            onValueChange={setSaturation}
            minimumTrackTintColor={theme.colors.primary[600]}
            maximumTrackTintColor={theme.colors.gray[300]}
            thumbTintColor={theme.colors.primary[600]}
          />
          <Text style={styles.sliderValue}>{Math.round(saturation)}</Text>
        </View>
      </View>

      {/* Torch */}
      {capabilities?.video.supportsTorch && (
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Torch / Flash</Text>
              <Text style={styles.settingHint}>Enable camera flash light</Text>
            </View>
            <Switch
              value={torch}
              onValueChange={setTorch}
              trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary[400] }}
              thumbColor={torch ? theme.colors.primary[600] : theme.colors.gray[400]}
            />
          </View>
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Stream Settings</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Quality Presets */}
      {renderQualityPresets()}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'audio' && styles.tabActive]}
          onPress={() => setActiveTab('audio')}
        >
          <Ionicons
            name="mic"
            size={20}
            color={activeTab === 'audio' ? theme.colors.primary[600] : theme.colors.text.secondary}
          />
          <Text style={[styles.tabText, activeTab === 'audio' && styles.tabTextActive]}>
            Audio
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'video' && styles.tabActive]}
          onPress={() => setActiveTab('video')}
        >
          <Ionicons
            name="videocam"
            size={20}
            color={activeTab === 'video' ? theme.colors.primary[600] : theme.colors.text.secondary}
          />
          <Text style={[styles.tabText, activeTab === 'video' && styles.tabTextActive]}>
            Video
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'advanced' && styles.tabActive]}
          onPress={() => setActiveTab('advanced')}
        >
          <Ionicons
            name="options"
            size={20}
            color={
              activeTab === 'advanced' ? theme.colors.primary[600] : theme.colors.text.secondary
            }
          />
          <Text style={[styles.tabText, activeTab === 'advanced' && styles.tabTextActive]}>
            Advanced
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'audio' && renderAudioSettings()}
      {activeTab === 'video' && renderVideoSettings()}
      {activeTab === 'advanced' && renderAdvancedSettings()}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
          <Ionicons name="checkmark" size={20} color="white" />
          <Text style={styles.applyButtonText}>Apply Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  section: {
    padding: theme.spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  presetButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.gray[300],
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
  },
  presetButtonActive: {
    borderColor: theme.colors.primary[600],
    backgroundColor: theme.colors.primary[50],
  },
  presetText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeights.medium,
  },
  presetTextActive: {
    color: theme.colors.primary[700],
    fontWeight: theme.typography.fontWeights.bold,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
    backgroundColor: theme.colors.background.secondary,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary[600],
  },
  tabText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeights.medium,
  },
  tabTextActive: {
    color: theme.colors.primary[600],
    fontWeight: theme.typography.fontWeights.bold,
  },
  tabContent: {
    flex: 1,
  },
  deviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xs,
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background.secondary,
  },
  deviceOptionSelected: {
    backgroundColor: theme.colors.primary[50],
  },
  deviceOptionText: {
    flex: 1,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text.primary,
  },
  deviceOptionTextSelected: {
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.primary[700],
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  settingHint: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text.tertiary,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderValue: {
    minWidth: 50,
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
    textAlign: 'right',
  },
  resolutionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  resolutionButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.gray[300],
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
  },
  resolutionButtonActive: {
    borderColor: theme.colors.primary[600],
    backgroundColor: theme.colors.primary[50],
  },
  resolutionText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeights.medium,
  },
  resolutionTextActive: {
    color: theme.colors.primary[700],
    fontWeight: theme.typography.fontWeights.bold,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  modeButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.gray[300],
    backgroundColor: theme.colors.background.secondary,
    alignItems: 'center',
  },
  modeButtonActive: {
    borderColor: theme.colors.primary[600],
    backgroundColor: theme.colors.primary[50],
  },
  modeText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeights.medium,
  },
  modeTextActive: {
    color: theme.colors.primary[700],
    fontWeight: theme.typography.fontWeights.bold,
  },
  actions: {
    flexDirection: 'row',
    padding: theme.spacing.base,
    gap: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    backgroundColor: theme.colors.background.secondary,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.gray[300],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.secondary,
  },
  applyButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary[600],
    gap: theme.spacing.sm,
  },
  applyButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.fontWeights.bold,
    color: 'white',
  },
});
