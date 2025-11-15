import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Clipboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import { useAuth } from '../services/AuthContext';
import apiService from '../services/api';
import theme from '../theme';

interface LiveStreamProps {
  navigation: {
    goBack: () => void;
  };
}

interface MuxStream {
  id: string;
  stream_key: string;
  playback_id: string;
  stream_url: string;
  playback_url: string;
  status: 'idle' | 'active' | 'disconnected';
}

export default function LiveStream({ navigation }: LiveStreamProps) {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MuxStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Form data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(true);

  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera access in your device settings to use live streaming.'
        );
      }
    } catch (error) {
      console.error('Camera permission error:', error);
      setHasPermission(false);
      Alert.alert('Error', 'Failed to request camera permissions');
    }
  };

  const createMuxStream = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for your stream');
      return;
    }

    if (title.trim().length < 3) {
      Alert.alert('Error', 'Stream title must be at least 3 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.post('/mux/live-streams/create', {
        title: title.trim(),
        description: description.trim() || undefined,
      });

      if (!response || !response.playback_url) {
        throw new Error('Invalid response from server');
      }

      setStream(response);
      setShowForm(false);
      Alert.alert(
        'Stream Created!',
        'Your live stream has been created. You can now start broadcasting.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Failed to create stream:', error);
      let errorMessage = 'Failed to create live stream. Please try again.';

      if (error.message?.includes('subscription') || error.upgrade_required) {
        errorMessage = 'Live streaming requires a streaming subscription. Please upgrade to Artist Streaming Pro tier.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const startStreaming = async () => {
    if (!stream) {
      Alert.alert('Error', 'Please create a stream first');
      return;
    }

    try {
      // Check camera permission before starting
      const { status } = await Camera.getCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Camera permission is required to start streaming');
        return;
      }

      setIsStreaming(true);
      // In a real implementation, you would start the camera and begin streaming to Mux
      // This would typically involve using expo-av or a native streaming library
      // For now, we just mark the stream as started

      await apiService.put(`/mux/live-streams/${stream.id}/start`, {});

      Alert.alert('Streaming', 'Your live stream is now active! Share the playback URL with your audience.');
    } catch (error) {
      console.error('Failed to start stream:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start streaming';
      Alert.alert('Error', errorMessage);
      setIsStreaming(false);
    }
  };

  const stopStreaming = async () => {
    if (!stream) return;

    Alert.alert(
      'End Stream',
      'Are you sure you want to end this live stream?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Stream',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.put(`/mux/live-streams/${stream.id}/end`, {});
              setIsStreaming(false);
              Alert.alert('Stream Ended', 'Your live stream has ended successfully.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (error) {
              console.error('Failed to end stream:', error);
              Alert.alert('Error', 'Failed to end stream');
            }
          },
        },
      ]
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  const sharePlaybackUrl = () => {
    if (stream?.playback_url) {
      copyToClipboard(stream.playback_url, 'Playback URL');
    } else {
      Alert.alert('Error', 'Playback URL not available yet');
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary[600]} />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-off" size={64} color={theme.colors.text.secondary} />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            Please enable camera access in your device settings to use live streaming.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Stream</Text>
        {stream && (
          <View style={[styles.statusBadge, isStreaming && styles.statusBadgeLive]}>
            <View style={[styles.statusDot, isStreaming && styles.statusDotLive]} />
            <Text style={styles.statusText}>{isStreaming ? 'LIVE' : 'READY'}</Text>
          </View>
        )}
        {!stream && <View style={styles.headerSpacer} />}
      </View>

      {showForm ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.formCard}>
            <View style={styles.iconContainer}>
              <Ionicons name="videocam" size={48} color={theme.colors.primary[600]} />
            </View>

            <Text style={styles.formTitle}>Create Live Stream</Text>
            <Text style={styles.formSubtitle}>
              Start a live stream to your artist space with Mux
            </Text>

            <View style={styles.formSection}>
              <Text style={styles.label}>Stream Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Live from the Studio"
                placeholderTextColor={theme.colors.text.tertiary}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Tell your audience what this stream is about..."
                placeholderTextColor={theme.colors.text.tertiary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
            </View>

            <TouchableOpacity
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={createMuxStream}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="white" />
                  <Text style={styles.createButtonText}>Create Stream</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={theme.colors.primary[600]} />
              <Text style={styles.infoText}>
                Your stream will be public and accessible via a shareable URL
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Camera Preview */}
          <View style={styles.cameraContainer}>
            <Camera
              ref={cameraRef}
              style={styles.camera}
              type={Camera.Constants.Type.front}
            >
              <View style={styles.cameraOverlay}>
                {isStreaming && (
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                )}
              </View>
            </Camera>
          </View>

          {/* Stream Info */}
          <View style={styles.streamCard}>
            <Text style={styles.streamTitle}>{stream?.id && title}</Text>
            {description && <Text style={styles.streamDescription}>{description}</Text>}

            <View style={styles.divider} />

            {/* Playback URL */}
            <View style={styles.urlSection}>
              <View style={styles.urlHeader}>
                <Ionicons name="link" size={20} color={theme.colors.primary[600]} />
                <Text style={styles.urlLabel}>Public Playback URL</Text>
              </View>
              <View style={styles.urlBox}>
                <Text style={styles.urlText} numberOfLines={1}>
                  {stream?.playback_url || 'Generating...'}
                </Text>
                <TouchableOpacity onPress={sharePlaybackUrl} style={styles.copyButton}>
                  <Ionicons name="copy" size={18} color={theme.colors.primary[600]} />
                </TouchableOpacity>
              </View>
              <Text style={styles.urlHint}>
                Share this URL with your audience to watch the stream
              </Text>
            </View>

            {/* Stream Details (Collapsible) */}
            <View style={styles.detailsSection}>
              <Text style={styles.detailsTitle}>Stream Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Stream ID:</Text>
                <Text style={styles.detailValue}>{stream?.id}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Playback ID:</Text>
                <Text style={styles.detailValue}>{stream?.playback_id}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.detailValue, styles.detailValueStatus]}>
                  {stream?.status || 'Idle'}
                </Text>
              </View>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {!isStreaming ? (
              <TouchableOpacity style={styles.startButton} onPress={startStreaming}>
                <Ionicons name="play-circle" size={24} color="white" />
                <Text style={styles.startButtonText}>Start Broadcasting</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.stopButton} onPress={stopStreaming}>
                <Ionicons name="stop-circle" size={24} color="white" />
                <Text style={styles.stopButtonText}>End Stream</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingTop: 60,
    paddingBottom: theme.spacing.base,
    backgroundColor: theme.colors.primary[600],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: 'white',
  },
  headerSpacer: {
    width: 40,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  statusBadgeLive: {
    backgroundColor: theme.colors.error,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginRight: 6,
  },
  statusDotLive: {
    backgroundColor: 'white',
  },
  statusText: {
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold,
    color: 'white',
  },
  content: {
    flex: 1,
    padding: theme.spacing.base,
  },
  formCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    ...theme.shadows.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: theme.spacing.lg,
  },
  formTitle: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  formSubtitle: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  formSection: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text.primary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[600],
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.fontWeights.semibold,
    color: 'white',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[700],
    lineHeight: 20,
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
    marginBottom: theme.spacing.base,
    backgroundColor: theme.colors.gray[900],
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  liveIndicator: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.bold,
    color: 'white',
  },
  streamCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.base,
    ...theme.shadows.md,
  },
  streamTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  streamDescription: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.gray[200],
    marginVertical: theme.spacing.lg,
  },
  urlSection: {
    marginBottom: theme.spacing.lg,
  },
  urlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  urlLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
  },
  urlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.gray[300],
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  urlText: {
    flex: 1,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[600],
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    padding: theme.spacing.sm,
  },
  urlHint: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  detailsSection: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  detailsTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  detailLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
  },
  detailValue: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  detailValueStatus: {
    textTransform: 'capitalize',
    fontWeight: theme.typography.fontWeights.semibold,
  },
  controls: {
    marginBottom: theme.spacing.base,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent.green,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    gap: theme.spacing.sm,
    ...theme.shadows.lg,
  },
  startButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: 'white',
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.xl,
    gap: theme.spacing.sm,
    ...theme.shadows.lg,
  },
  stopButtonText: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: 'white',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  permissionTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  permissionText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomPadding: {
    height: 20,
  },
});
