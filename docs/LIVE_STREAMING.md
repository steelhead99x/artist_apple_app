# Live Streaming with Advanced Media Controls

## Overview

The Artist Space app now features professional-grade live streaming capabilities with comprehensive audio and video controls powered by Mux. This document outlines all the features, configuration options, and how to use them.

## Features

### 📊 Real-Time Health Monitoring

The app now includes professional stream health monitoring powered by Mux's monitoring API:

#### Live Stream Health Stats
- **Connection Quality**: Real-time assessment (Excellent/Good/Fair/Poor)
- **Viewer Metrics**: Current viewers, peak viewers, total view time
- **Video Quality**: Bitrate, frame rate, resolution, codec information
- **Audio Quality**: Bitrate, sample rate, codec information
- **Network Performance**: Available bandwidth, packet loss, latency (RTT)
- **Frame Statistics**: Dropped frames percentage and total frames

#### Intelligent Alerts
- **Real-time Alerts**: Instant notifications for stream quality issues
- **Severity Levels**: Info, Warning, and Critical alerts
- **Smart Thresholds**: Automatically detects:
  - Low bitrate (< 500 kbps)
  - Low frame rate (< 20 fps)
  - High packet loss (> 2%)
  - Poor connection quality
- **Visual Indicators**: Color-coded alerts with icons

#### Health Stats Display
- **Compact View**: Minimal overlay during streaming showing key metrics
- **Detailed View**: Full analytics modal with expandable sections:
  - Overview (quality, viewers, duration, status)
  - Video Quality (resolution, frame rate, bitrate, codec, dropped frames)
  - Audio Quality (bitrate, sample rate, codec)
  - Network (bandwidth, packet loss, latency)
  - Alerts (recent issues with timestamps)

### 📹 Video Controls

#### Quality Presets
- **Low (360p)**: 640x360 @ 24fps, 800kbps bitrate
- **Medium (720p)**: 1280x720 @ 30fps, 2.5Mbps bitrate
- **High (1080p)**: 1920x1080 @ 30fps, 5Mbps bitrate
- **Ultra (1080p60)**: 1920x1080 @ 60fps, 8Mbps bitrate
- **Custom**: Fully customizable settings

#### Advanced Camera Features
- **Camera Selection**: Switch between multiple connected cameras
- **Resolution Control**: Choose from 360p, 720p, 1080p, 1440p
- **Frame Rate**: 24fps, 30fps, or 60fps
- **Focus Modes**:
  - Continuous autofocus
  - Manual focus
  - Single-shot focus
- **Exposure Control**:
  - Continuous auto-exposure
  - Manual exposure
  - Single-shot exposure
  - Exposure compensation
- **White Balance**:
  - Continuous auto white balance
  - Manual white balance
  - Color temperature control
- **Advanced Controls**:
  - Zoom (digital/optical if supported)
  - Brightness adjustment
  - Contrast adjustment
  - Saturation adjustment
  - Torch/flash light control
  - Pan/tilt (if hardware supports)

### 🎙️ Audio Controls

#### Audio Device Management
- Select from multiple microphone inputs
- Real-time device switching without interrupting stream

#### Audio Enhancements
- **Echo Cancellation**: Removes echo from speakers
- **Noise Suppression**: Reduces background noise
- **Auto Gain Control**: Automatically adjusts microphone volume
- **Manual Volume Control**: Fine-tune input levels (0-100%)

#### Audio Quality Settings
- Sample rate: 22.05kHz, 44.1kHz, or 48kHz
- Channel count: Mono or Stereo
- Bitrate: 64kbps to 256kbps depending on quality preset

## Setup Instructions

### Backend Configuration

1. **Obtain Mux Credentials**
   - Go to [Mux Dashboard](https://dashboard.mux.com/)
   - Create a new API access token
   - Copy your Token ID and Token Secret

2. **Configure Environment Variables**

   Edit `examples/backend/.env` (copy from `.env.example`):

   ```bash
   # Mux API Credentials
   MUX_TOKEN_ID=your-actual-mux-token-id
   MUX_TOKEN_SECRET=your-actual-mux-token-secret

   # Live Streaming Configuration
   MUX_MAX_RESOLUTION_TIER=1080p
   MUX_LATENCY_MODE=low
   MUX_RECONNECT_WINDOW=60

   # Optional: Custom slate images
   MUX_SLATE_URL=https://your-cdn.com/offline-slate.jpg
   MUX_RECONNECT_SLATE_URL=https://your-cdn.com/reconnecting-slate.jpg
   ```

### Frontend Configuration

Edit `.env` (copy from `.env.example`):

```bash
# Mux Configuration
EXPO_PUBLIC_MUX_ENV_KEY=your-mux-environment-key

# Stream Quality Defaults
EXPO_PUBLIC_STREAM_DEFAULT_QUALITY=high

# Feature Flags
EXPO_PUBLIC_STREAM_ENABLE_RECORDING=true
EXPO_PUBLIC_STREAM_ENABLE_CHAT=true
EXPO_PUBLIC_STREAM_MAX_DURATION=7200
```

### Installation

Install required dependencies:

```bash
npm install @react-native-community/slider
```

## Using Live Streaming

### Starting a Stream

1. **Navigate to Live Stream**
   - Open the app and navigate to the Live Stream screen
   - Grant camera and microphone permissions when prompted

2. **Configure Stream Settings**
   - Click the ⚙️ (Options) button on the camera preview
   - Select your preferred quality preset or choose "Custom"
   - Configure audio settings:
     - Choose microphone device
     - Enable/disable echo cancellation
     - Enable/disable noise suppression
     - Enable/disable auto gain control
     - Adjust input volume
   - Configure video settings:
     - Select camera device
     - Choose resolution (360p - 1440p)
     - Set frame rate (24fps, 30fps, 60fps)
   - Apply advanced settings:
     - Adjust focus mode
     - Set exposure mode
     - Configure white balance
     - Adjust zoom level
     - Fine-tune brightness, contrast, saturation
     - Enable torch/flash if needed

3. **Create the Stream**
   - Enter a title for your stream
   - Add an optional description
   - Click "Create Stream"
   - The app will connect to Mux and generate a stream key

4. **Start Broadcasting**
   - Click "Start Broadcasting"
   - Share the playback URL with your audience
   - Your stream is now live!

5. **Monitor Stream Quality**
   - View current quality preset in the top-right badge
   - Monitor viewer count (if enabled)
   - Adjust settings in real-time if needed

6. **End Stream**
   - Click "End Stream" when finished
   - Confirm to stop broadcasting

## Technical Architecture

### Components

#### `src/types/mediaStream.ts`
Comprehensive TypeScript interfaces for all media stream settings:
- `AudioConstraints`: Audio device and enhancement settings
- `VideoConstraints`: Video device and camera control settings
- `StreamQuality`: Quality preset definitions
- `MediaCapabilities`: Device capability detection

#### `src/services/mediaStream.ts`
Professional media stream management service:
- Device enumeration and management
- Stream creation with advanced constraints
- Real-time constraint updates
- Camera and audio device switching
- Capability detection and validation

#### `src/components/StreamSettings.tsx`
Comprehensive settings UI with tabs:
- **Audio Tab**: Device selection, enhancements, volume control
- **Video Tab**: Device selection, resolution, frame rate
- **Advanced Tab**: Focus, exposure, white balance, zoom, torch

#### `src/screens/LiveStream.tsx`
Enhanced live streaming screen with:
- Mux integration for RTMP streaming
- Real-time camera preview
- Advanced settings modal
- Quality indicator badge
- Stream status management

### Backend Routes

#### `POST /api/mux/live-streams/create`
Creates a new Mux live stream with specified settings.

**Request:**
```json
{
  "title": "Live from Studio",
  "description": "Concert performance",
  "max_viewers": 100
}
```

**Response:**
```json
{
  "success": true,
  "stream": {
    "id": "stream-id",
    "stream_key": "secret-key",
    "playback_id": "playback-id",
    "stream_url": "rtmps://...",
    "playback_url": "https://stream.mux.com/...",
    "status": "draft"
  }
}
```

#### `PUT /api/mux/live-streams/:id/start`
Starts an active live stream.

#### `PUT /api/mux/live-streams/:id/end`
Ends an active live stream.

#### `GET /api/mux/live-streams/:id/status`
Gets current stream status and metrics.

## Browser Compatibility

The advanced media controls are **web-only** features that use the MediaStream API. They are supported in:

- ✅ Chrome/Edge 87+
- ✅ Firefox 94+
- ✅ Safari 14.1+
- ✅ Opera 73+

For native iOS/Android, basic camera switching is available through Expo Camera.

## Platform-Specific Features

### Web
- Full audio and video control support
- Advanced camera features (focus, exposure, white balance, etc.)
- Real-time constraint updates
- Multiple device support

### iOS/Android
- Basic camera type switching (front/back)
- Standard audio/video capture
- Uses Expo Camera API

## Best Practices

### Stream Quality

1. **Network Considerations**
   - Test your upload bandwidth before streaming
   - Use "High" (1080p) for good connections (5+ Mbps upload)
   - Use "Medium" (720p) for moderate connections (3-5 Mbps upload)
   - Use "Low" (360p) for slower connections (1-3 Mbps upload)

2. **Audio Quality**
   - Always enable echo cancellation for best results
   - Enable noise suppression in noisy environments
   - Use auto gain control for consistent volume
   - Test audio levels before going live

3. **Video Quality**
   - Good lighting is essential for clear video
   - Use continuous autofocus for moving subjects
   - Lock focus for static scenes
   - Adjust exposure compensation for backlit scenes
   - Set white balance manually for color accuracy

### Performance

1. **Device Resources**
   - Close unnecessary apps before streaming
   - Ensure device isn't overheating
   - Use wired connection when possible
   - Keep device plugged in for power

2. **Stream Optimization**
   - Start with lower quality and increase if stable
   - Monitor CPU/GPU usage
   - Reduce frame rate if experiencing stuttering
   - Lower resolution before reducing frame rate

## Troubleshooting

### Camera Not Detected
- Ensure browser permissions are granted
- Refresh the page and try again
- Check if another app is using the camera
- Try a different browser

### Audio Issues
- Check microphone permissions
- Ensure correct device is selected
- Disable other apps using the microphone
- Test audio in system settings

### Stream Quality Issues
- Check network upload speed
- Reduce quality preset
- Lower frame rate or resolution
- Close bandwidth-heavy apps

### Advanced Features Not Available
- Verify you're using a supported browser
- Check if your camera supports the feature
- Update browser to latest version
- Try a different camera/device

## API Reference

### MediaStreamService Methods

#### `initialize(): Promise<void>`
Initializes the media stream service and requests permissions.

#### `enumerateDevices(): Promise<void>`
Enumerates available audio and video devices.

#### `getVideoDevices(): VideoDevice[]`
Returns list of available video input devices.

#### `getAudioDevices(): AudioDevice[]`
Returns list of available audio input devices.

#### `createStream(config: MediaStreamConfig): Promise<MediaStream>`
Creates a new media stream with specified constraints.

#### `updateStream(config: Partial<MediaStreamConfig>): Promise<MediaStream>`
Updates the current stream with new constraints.

#### `applyAdvancedVideoSettings(settings: VideoConstraints): Promise<void>`
Applies advanced video settings to the current stream.

#### `applyAudioSettings(settings: AudioConstraints): Promise<void>`
Applies audio settings to the current stream.

#### `switchCamera(deviceId: string, constraints?: VideoConstraints): Promise<MediaStream>`
Switches to a different camera device.

#### `switchAudioDevice(deviceId: string, constraints?: AudioConstraints): Promise<MediaStream>`
Switches to a different audio device.

#### `getCurrentSettings(): { audio: MediaTrackSettings; video: MediaTrackSettings } | null`
Returns current stream settings.

#### `stopStream(): void`
Stops the current stream and releases resources.

## Security Considerations

1. **API Keys**
   - Never commit Mux credentials to version control
   - Use environment variables for all secrets
   - Rotate API keys regularly
   - Restrict API key permissions

2. **Stream Access**
   - Use signed URLs for private streams
   - Implement viewer authentication if needed
   - Monitor concurrent viewers
   - Set appropriate stream duration limits

3. **Content Protection**
   - Enable DRM for sensitive content
   - Use geo-restrictions if needed
   - Implement content moderation
   - Monitor for abuse

## Future Enhancements

- [ ] Virtual backgrounds and filters
- [ ] Picture-in-picture support
- [ ] Multi-camera switching
- [ ] Screen sharing integration
- [ ] Live editing and effects
- [ ] Stream scheduling
- [ ] Analytics dashboard
- [ ] Viewer interaction (polls, Q&A)
- [ ] Recording management
- [ ] VOD conversion

## Support

For issues or questions:
- Check the troubleshooting section above
- Review Mux documentation: https://docs.mux.com/
- Contact support: support@artist-space.com

## License

Copyright © 2025 Artist Space. All rights reserved.
