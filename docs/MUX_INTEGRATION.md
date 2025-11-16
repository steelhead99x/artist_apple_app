# Mux Live Streaming Integration Guide

## Overview

This document provides comprehensive information about the Mux live streaming integration in the Artist Space app, including real-time health monitoring and advanced features.

## Mux Live Streaming Architecture

### Stream Ingestion
Mux supports two primary protocols for live stream ingestion:

1. **RTMP/RTMPS** (Real-Time Messaging Protocol over SSL)
   - Most common protocol for live streaming
   - Supported by most streaming software (OBS, Streamlabs, etc.)
   - Lower latency than HLS
   - URL Format: `rtmps://stream.mux.com/live/{STREAM_KEY}`

2. **SRT** (Secure Reliable Transport)
   - More reliable over unstable networks
   - Better for long-distance streaming
   - Built-in encryption
   - URL Format: `srt://live.mux.com:443?streamid={STREAM_KEY}`

### Stream Output
Mux automatically converts incoming streams to multiple formats:

- **HLS** (HTTP Live Streaming) - Primary playback protocol
- **DASH** - Alternative playback protocol
- **Low Latency HLS** - Sub-second latency streaming

## Real-Time Health Monitoring API

### Live Stream Health Stats (Beta)

Mux provides a real-time health monitoring API that returns health status for active live streams.

#### Endpoint
```
GET https://api.mux.com/video/v1/live-streams/{LIVE_STREAM_ID}
Authorization: Basic {BASE64(TOKEN_ID:TOKEN_SECRET)}
```

#### Update Frequency
- Health data updates every **5 seconds** for active streams
- Recommended polling interval: **5-10 seconds**

#### Key Metrics

**Stream Drift**
- Measures the difference between encoder connection duration and media received duration
- Lower values indicate better sync between encoder and Mux
- Formula: `encoder_duration - media_duration`

**Status Values**
- `excellent`: Stream drift deviation ≤ 500ms
- `good`: Stream drift deviation ≤ 1s but > 500ms
- `poor`: Stream drift deviation > 1s
- `unknown`: Not enough data to determine status

**Additional Metrics**
- Current viewer count
- Active asset ID
- Playback IDs
- Stream status (idle/active/disconnected)
- Reconnect window
- Latency mode
- Max resolution tier

### Response Structure

```json
{
  "data": {
    "id": "live-stream-id",
    "status": "active",
    "stream_key": "your-stream-key",
    "playback_ids": [
      {
        "id": "playback-id",
        "policy": "public"
      }
    ],
    "reconnect_window": 60,
    "latency_mode": "low",
    "max_resolution_tier": "1080p",
    "recent_asset_ids": ["asset-id-1", "asset-id-2"],
    "active_asset_id": "current-asset-id",
    "new_asset_settings": {
      "playback_policy": ["public"],
      "mp4_support": "standard"
    },
    "test": false
  }
}
```

## Implementation in Artist Space

### Backend Integration

#### Create Live Stream
```typescript
POST /api/mux/live-streams/create

Request:
{
  "title": "My Live Stream",
  "description": "Stream description",
  "max_viewers": 100
}

Response:
{
  "success": true,
  "stream": {
    "id": "stream-id",
    "stream_key": "secret-key",
    "playback_id": "playback-id",
    "stream_url": "rtmps://stream.mux.com/live/...",
    "playback_url": "https://stream.mux.com/...",
    "status": "draft"
  },
  "mux_data": {
    "stream_key": "...",
    "rtmp_url": "...",
    "playback_url": "...",
    "reconnect_url": "..."
  }
}
```

#### Get Health Monitoring Data
```typescript
GET /api/mux/live-streams/:id/monitoring

Response:
{
  "data": {
    "status": "active",
    "current_viewer_count": 42,
    "max_viewer_count": 150,
    "stream_metrics": {
      "video_bitrate": 5000000,
      "audio_bitrate": 128000,
      "frame_rate": 30,
      "width": 1920,
      "height": 1080,
      "keyframe_interval": 2
    },
    "health": {
      "status": "healthy",
      "issues": []
    },
    "recording": {
      "enabled": true,
      "duration": 1234
    }
  }
}
```

### Frontend Integration

#### Health Monitoring Service

The `streamHealthMonitor` service provides:

1. **Automatic Polling**
   - Polls Mux API every 5 seconds
   - Only when stream is active
   - Stops automatically when stream ends

2. **Smart Thresholds**
   ```typescript
   const DEFAULT_HEALTH_THRESHOLDS = {
     minBitrate: 500000,        // 500 kbps
     minFrameRate: 20,           // 20 fps
     maxDroppedFrameRate: 5,     // 5%
     maxPacketLoss: 2,           // 2%
     maxRoundTripTime: 300,      // 300ms
     minConnectionQuality: 'fair'
   };
   ```

3. **Alert Generation**
   - Info: Informational messages
   - Warning: Quality degradation (yellow)
   - Critical: Severe issues (red)

4. **Real-time Callbacks**
   ```typescript
   streamHealthMonitor.onStatsUpdate((streamId, stats) => {
     // Update UI with new stats
   });

   streamHealthMonitor.onAlert((streamId, alert) => {
     // Show alert to user
   });
   ```

#### UI Components

**StreamHealthStats Component**
- Compact mode: Overlay with key metrics
- Full mode: Detailed analytics modal
- Expandable sections:
  - Overview (quality, viewers, duration)
  - Video Quality (resolution, fps, bitrate)
  - Audio Quality (bitrate, sample rate)
  - Network (bandwidth, latency)
  - Alerts (with timestamps)

**Integration in LiveStream**
```typescript
// Start monitoring when stream goes live
useEffect(() => {
  if (stream && isStreaming) {
    streamHealthMonitor.startMonitoring(stream.id, 5000);
  }
}, [stream, isStreaming]);
```

## Best Practices

### For Optimal Stream Quality

1. **Use RTMPS over RTMP**
   - Encrypted connection
   - More reliable
   - Better for public networks

2. **Enable Low Latency Mode**
   ```typescript
   latency_mode: 'low'  // Sub-second latency
   ```

3. **Set Appropriate Resolution**
   - 1080p for high-quality streams
   - 720p for moderate bandwidth
   - Consider viewer's typical connection

4. **Configure Reconnect Window**
   ```typescript
   reconnect_window: 60  // 60 seconds to reconnect
   ```

5. **Monitor Health Stats**
   - Watch for status changes
   - React to critical alerts
   - Adjust encoder settings if needed

### For Reliability

1. **Handle Disconnections**
   - Implement auto-reconnect in encoder
   - Use reconnect window effectively
   - Show reconnecting state to viewers

2. **Test Before Going Live**
   - Use test mode for validation
   - Check encoder settings
   - Verify audio/video sync

3. **Monitor Metrics**
   - Stream drift (should be < 500ms)
   - Bitrate stability
   - Frame rate consistency
   - Viewer count trends

### For Cost Optimization

1. **Use Recording Wisely**
   - Only record when needed
   - Set mp4_support based on requirements
   - Delete old recordings

2. **Optimize Resolution**
   - Match content requirements
   - Don't over-stream (1080p vs 4K)
   - Consider viewer demographics

3. **Set Max Duration**
   ```typescript
   max_continuous_duration: 3600  // 1 hour
   ```

## Streaming from Mobile/Web

### Web Browser Streaming

For direct browser streaming to Mux:

1. **Capture Media**
   ```typescript
   const stream = await navigator.mediaDevices.getUserMedia({
     video: { width: 1920, height: 1080, frameRate: 30 },
     audio: { echoCancellation: true, noiseSuppression: true }
   });
   ```

2. **Encode and Stream**
   - Use a library that supports RTMP encoding
   - Consider using Mux Spaces for WebRTC
   - Fallback to OBS virtual camera

3. **Monitor Connection**
   - Track MediaStream stats
   - Integrate with health monitoring
   - Show alerts for issues

### Mobile Streaming

For iOS/Android:

1. **Use Native Encoder**
   - AVFoundation (iOS)
   - MediaCodec (Android)
   - Hardware acceleration

2. **RTMP Libraries**
   - iOS: HaishinKit, LFLiveKit
   - Android: rtmp-rtsp-stream-client

3. **Monitor Resources**
   - Battery usage
   - Thermal state
   - Network conditions

## Troubleshooting

### Common Issues

**Stream Won't Start**
- Check stream key is correct
- Verify RTMPS URL format
- Confirm encoder settings match Mux requirements
- Check firewall/network restrictions

**Poor Quality**
- Reduce bitrate in encoder
- Lower resolution
- Check network upload speed
- Monitor stream drift

**Frequent Disconnects**
- Increase reconnect window
- Check network stability
- Use SRT for unreliable networks
- Monitor health stats for patterns

**High Latency**
- Enable low latency mode
- Use reduced_latency_signaling
- Optimize encoder settings
- Check viewer playback settings

### Health Status Interpretation

- **Excellent**: Everything optimal, no action needed
- **Good**: Minor variations, monitor trends
- **Fair**: Quality degradation, consider adjustments
- **Poor**: Significant issues, take immediate action

### Alert Response Guide

**Low Bitrate Alert**
- Check encoder settings
- Verify network upload speed
- Reduce resolution if needed

**Low Frame Rate Alert**
- Check encoder CPU usage
- Reduce encoding preset
- Lower resolution/bitrate

**High Packet Loss**
- Network issue (ISP/WiFi)
- Consider SRT protocol
- Reduce bitrate temporarily

**Poor Connection Quality**
- Composite of multiple issues
- Check all individual metrics
- May need to end and restart stream

## Advanced Features

### Simulcast

Stream to multiple platforms simultaneously:

```typescript
POST /api/mux/live-streams/:id/simulcast-targets
{
  "url": "rtmps://live.youtube.com/...",
  "stream_key": "your-youtube-key"
}
```

### Recording

Automatic recording to VOD:

```typescript
new_asset_settings: {
  playback_policy: ['public'],
  mp4_support: 'standard'  // Creates downloadable MP4
}
```

### Live Clipping

Create clips from live streams in real-time:

```typescript
POST /api/video/v1/assets
{
  "input": "live_stream_id",
  "playback_policy": ["public"],
  "start_time": 30,
  "end_time": 60
}
```

## Security

### Secure Playback

1. **Signed URLs**
   ```typescript
   playback_policy: ['signed']
   ```

2. **JWT Tokens**
   - Create tokens with expiration
   - Include viewer ID
   - Restrict access

3. **DRM Protection**
   - Fairplay (iOS/Safari)
   - Widevine (Chrome/Android)
   - PlayReady (Edge/Windows)

### API Security

1. **Token Management**
   - Rotate tokens regularly
   - Use environment variables
   - Never commit to version control

2. **Rate Limiting**
   - Respect Mux API limits
   - Implement exponential backoff
   - Cache responses when appropriate

## Monitoring & Analytics

### Mux Data Integration

Mux automatically provides:
- Viewer experience metrics
- Playback quality scores
- Error tracking
- Audience insights
- Geographic distribution

### Custom Dashboards

Build custom dashboards using:
- Mux Data API
- Export to cloud storage
- Integration with analytics platforms

## Support & Resources

### Official Documentation
- Main Docs: https://docs.mux.com
- API Reference: https://docs.mux.com/api-reference
- Live Streaming Guide: https://docs.mux.com/guides/start-live-streaming

### Community
- Discord: https://discord.gg/mux
- GitHub: https://github.com/muxinc
- Status Page: https://status.mux.com

### Getting Help
1. Check documentation first
2. Search community forums
3. Contact Mux support
4. Check status page for incidents

## Conclusion

The Mux integration in Artist Space provides professional-grade live streaming with:
- ✅ Real-time health monitoring
- ✅ Intelligent alerts
- ✅ Professional UI
- ✅ Comprehensive metrics
- ✅ Robust error handling
- ✅ Production-ready infrastructure

All powered by Mux's enterprise video infrastructure with the simplicity of a modern API.
