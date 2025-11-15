# LiveKit Integration Guide
## Real-Time Communications with End-to-End Encryption

This guide explains how LiveKit is integrated into Artist Space for secure real-time communications.

---

## Overview

Artist Space uses **LiveKit** for all real-time communications:
- **Video calls** (meet.artist-space.com)
- **Audio calls** (meet.artist-space.com)
- **Real-time chat** (chat.artist-space.com)
- **Screen sharing**
- **Live streaming**

**Key Features:**
- ✅ Built-in End-to-End Encryption (E2EE)
- ✅ Multi-party video/audio
- ✅ Real-time messaging via data channels
- ✅ Screen sharing
- ✅ Adaptive bitrate streaming
- ✅ Network resilience and auto-reconnect

---

## Architecture

### Multiple LiveKit Instances

Artist Space connects to three LiveKit instances:

1. **Main Backend Instance**
   - URL: Configured in backend `LIVEKIT_URL`
   - Use: General real-time features
   - Authentication: Backend-generated JWT

2. **meet.artist-space.com**
   - URL: `wss://meet.artist-space.com`
   - Use: Video/audio calls
   - Features: HD video, screen sharing, recording
   - Requires: Premium/Pro subscription

3. **chat.artist-space.com**
   - URL: `wss://chat.artist-space.com`
   - Use: Real-time messaging
   - Features: Group chat, file sharing
   - Requires: No premium subscription

### Hybrid Messaging System

Artist Space uses a **hybrid messaging approach**:

**LiveKit (Real-Time):**
- Synchronous communications
- Active conversations
- Video/audio calls
- Screen sharing
- Ephemeral (not stored in database)
- E2EE via LiveKit's built-in encryption

**TweetNaCl (Async/Persistent):**
- Asynchronous messages
- Database-stored messages
- Message history
- Offline message delivery
- E2EE via TweetNaCl (X25519-XSalsa20-Poly1305)

---

## Installation

### Frontend (React Native)

```bash
npm install @livekit/react-native@^2.5.0
npm install @livekit/react-native-webrtc@^125.0.3
npm install livekit-client@^2.5.0
```

### Backend (Node.js)

Already installed:
```bash
livekit-server-sdk@^2.0.0
```

---

## Configuration

### Frontend (.env)

```bash
# LiveKit URLs
EXPO_PUBLIC_LIVEKIT_URL=wss://your-livekit-instance.livekit.cloud
EXPO_PUBLIC_LIVEKIT_MEET_URL=wss://meet.artist-space.com
EXPO_PUBLIC_LIVEKIT_CHAT_URL=wss://chat.artist-space.com

# Enable E2EE
EXPO_PUBLIC_LIVEKIT_E2EE_ENABLED=true
```

### Backend (.env)

```bash
# LiveKit Credentials
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# Main instance
LIVEKIT_URL=wss://your-instance.livekit.cloud
LIVEKIT_WS_URL=wss://your-instance.livekit.cloud

# Dedicated instances
LIVEKIT_MEET_URL=wss://meet.artist-space.com
LIVEKIT_CHAT_URL=wss://chat.artist-space.com
```

---

## Usage

### 1. Connecting to a Room

```typescript
import livekitService, { LiveKitInstance } from './services/livekit';

// Connect to video call on meet.artist-space.com
const room = await livekitService.connect(
  LiveKitInstance.MEET,
  'my-room-name',
  {
    participantName: 'John Doe',
    e2eeEnabled: true,
    video: true,
    audio: true,
  }
);
```

### 2. Sending Real-Time Messages

```typescript
// Send message through LiveKit data channel
await livekitService.sendMessage(LiveKitInstance.CHAT, {
  type: 'chat',
  from: 'user-id',
  content: 'Hello world!',
});
```

### 3. Receiving Messages

```typescript
// Subscribe to messages
const unsubscribe = livekitService.onMessage(
  LiveKitInstance.CHAT,
  (message) => {
    console.log('Received message:', message);
    // Display message in UI
  }
);

// Later: unsubscribe
unsubscribe();
```

### 4. Toggle Camera/Microphone

```typescript
// Toggle camera
await livekitService.toggleCamera(LiveKitInstance.MEET, true);

// Toggle microphone
await livekitService.toggleMicrophone(LiveKitInstance.MEET, false);

// Switch camera (front/back)
await livekitService.switchCamera(LiveKitInstance.MEET);
```

### 5. Screen Sharing

```typescript
// Start screen sharing
await livekitService.toggleScreenShare(LiveKitInstance.MEET, true);

// Stop screen sharing
await livekitService.toggleScreenShare(LiveKitInstance.MEET, false);
```

### 6. Disconnect

```typescript
// Disconnect from specific instance
await livekitService.disconnect(LiveKitInstance.MEET);

// Disconnect from all instances
await livekitService.disconnectAll();
```

---

## Backend API

### Generate Access Token

**POST /api/livekit/token**

```bash
curl -X POST https://your-api.com/api/livekit/token \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "instance": "meet",
    "roomName": "my-video-call",
    "participantName": "John Doe",
    "e2eeEnabled": true
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1...",
  "url": "wss://meet.artist-space.com",
  "roomName": "my-video-call",
  "participantName": "John Doe",
  "e2eeSupported": true,
  "e2eeEnabled": true,
  "instance": "meet"
}
```

### Create Room

**POST /api/livekit/create-room**

```bash
curl -X POST https://your-api.com/api/livekit/create-room \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "instance": "meet",
    "roomName": "my-meeting",
    "maxParticipants": 10,
    "emptyTimeout": 300,
    "e2eeEnabled": true
  }'
```

---

## End-to-End Encryption (E2EE)

### How It Works

LiveKit provides **built-in E2EE** using:
- **Key Exchange:** Diffie-Hellman key exchange
- **Encryption:** AES-GCM
- **Forward Secrecy:** New keys per packet
- **Browser/Native:** Works in React Native

**Flow:**
```
1. User joins room with E2EE enabled
2. LiveKit generates encryption keys locally
3. Keys exchanged between participants (never sent to server)
4. All media encrypted before leaving device
5. Server relays encrypted packets (cannot decrypt)
6. Recipients decrypt locally with shared keys
```

### Enabling E2EE

**Frontend:**
```typescript
const room = await livekitService.connect(
  LiveKitInstance.MEET,
  'secure-room',
  {
    e2eeEnabled: true,
    // Optional: provide custom key
    e2eeKey: 'your-custom-key',
  }
);
```

**Backend:**
```bash
# Enable E2EE in environment
EXPO_PUBLIC_LIVEKIT_E2EE_ENABLED=true
```

### Security Guarantees

✅ **Zero-Knowledge:** Server cannot decrypt content
✅ **Perfect Forward Secrecy:** Compromised key doesn't expose past communications
✅ **Authentication:** Participants verified via JWT
✅ **Integrity:** Tampering detected via GCM authentication

---

## Subscription Tiers

### Video Calls (meet.artist-space.com)

**Requires Premium/Pro:**
- Artists: `artist_premium`, `artist_streaming`
- Venues: `venue_premium`, `venue_streaming`
- Studios: Always have access
- Booking Agents: Always have access

**Free Tier:**
- No video calls
- Text chat only

### Real-Time Chat (chat.artist-space.com)

**All Tiers:**
- Real-time messaging
- File sharing
- Group chat

---

## Best Practices

### 1. Room Management

```typescript
// Use unique room names
const roomName = `user-${userId}-call-${Date.now()}`;

// Disconnect when done
useEffect(() => {
  return () => {
    livekitService.disconnect(LiveKitInstance.MEET);
  };
}, []);
```

### 2. Connection Handling

```typescript
// Monitor connection state
const room = livekitService.getRoom(LiveKitInstance.MEET);

if (room) {
  room.on(RoomEvent.Reconnecting, () => {
    console.log('Reconnecting...');
    // Show reconnecting UI
  });

  room.on(RoomEvent.Reconnected, () => {
    console.log('Reconnected!');
    // Hide reconnecting UI
  });

  room.on(RoomEvent.Disconnected, () => {
    console.log('Disconnected');
    // Navigate away or show error
  });
}
```

### 3. Error Handling

```typescript
try {
  await livekitService.connect(LiveKitInstance.MEET, roomName);
} catch (error) {
  if (error.message.includes('Premium')) {
    // Show upgrade prompt
    showUpgradeDialog();
  } else {
    // Show generic error
    showError(error.message);
  }
}
```

### 4. Bandwidth Optimization

```typescript
// Use lower quality for mobile data
const isOnWifi = await NetInfo.fetch().then(state => state.type === 'wifi');

const room = await livekitService.connect(
  LiveKitInstance.MEET,
  roomName,
  {
    video: isOnWifi, // Disable video on cellular
    audio: true,
  }
);
```

---

## Troubleshooting

### Issue: "LiveKit not configured"

**Solution:**
```bash
# Backend .env
LIVEKIT_API_KEY=your_key
LIVEKIT_API_SECRET=your_secret
LIVEKIT_URL=wss://your-instance.livekit.cloud
```

### Issue: "Premium subscription required"

**Cause:** User doesn't have Premium/Pro subscription

**Solution:**
- Upgrade user to Premium tier
- Or use chat.artist-space.com (no premium required)

### Issue: Connection fails

**Check:**
1. LiveKit credentials are correct
2. Firewall allows WebSocket connections
3. URL is correct (wss:// not ws://)
4. Token is not expired (6-hour TTL)

### Issue: E2EE not working

**Check:**
1. `EXPO_PUBLIC_LIVEKIT_E2EE_ENABLED=true`
2. All participants have E2EE enabled
3. Browser/React Native supports WebRTC encryption

---

## Performance Tips

### 1. Simulcast

Enables adaptive quality:
```typescript
const room = await livekitService.connect(
  LiveKitInstance.MEET,
  roomName,
  {
    adaptiveStream: true, // Auto-enabled
    dynacast: true,      // Auto-enabled
  }
);
```

### 2. Audio Settings

Optimize for voice:
```typescript
const room = new Room({
  audioCaptureDefaults: {
    autoGainControl: true,
    echoCancellation: true,
    noiseSuppression: true,
  },
});
```

### 3. Video Quality

Adjust based on network:
```typescript
import { VideoPresets } from 'livekit-client';

// HD quality
videoCaptureDefaults: {
  resolution: VideoPresets.h720.resolution,
}

// Lower quality for slow networks
videoCaptureDefaults: {
  resolution: VideoPresets.h360.resolution,
}
```

---

## Security Checklist

Before production:

- [ ] Enable E2EE (`EXPO_PUBLIC_LIVEKIT_E2EE_ENABLED=true`)
- [ ] Use secure WebSocket (wss:// not ws://)
- [ ] Validate JWT tokens on backend
- [ ] Set appropriate token TTL (default: 6 hours)
- [ ] Implement permission checks (subscription tiers)
- [ ] Use unique room names
- [ ] Disconnect on unmount
- [ ] Clear sensitive data on logout
- [ ] Monitor for unauthorized access
- [ ] Enable logging for security events

---

## Monitoring

### Connection Quality

```typescript
room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
  console.log(`${participant.identity}: ${quality}`);
  // 'excellent', 'good', 'poor', 'lost'
});
```

### Participant Events

```typescript
room.on(RoomEvent.ParticipantConnected, (participant) => {
  console.log(`${participant.identity} joined`);
});

room.on(RoomEvent.ParticipantDisconnected, (participant) => {
  console.log(`${participant.identity} left`);
});
```

---

## Resources

- **LiveKit Docs:** https://docs.livekit.io/
- **React Native SDK:** https://docs.livekit.io/client-sdk-js/react-native/
- **E2EE Guide:** https://docs.livekit.io/guides/end-to-end-encryption/
- **API Reference:** https://docs.livekit.io/server-sdk-js/

---

## Support

**Need Help?**
- Check LiveKit status: https://status.livekit.io/
- LiveKit community: https://livekit.io/community
- Artist Space docs: See `SECURITY_IMPLEMENTATION_GUIDE.md`

**Emergency:**
- Backend issues: Check backend logs
- Connection issues: Verify WebSocket connectivity
- E2EE issues: Ensure all clients support encryption

---

**LiveKit Integration Complete! 🎥**

Your app now has:
- ✅ Real-time video/audio calls with E2EE
- ✅ Multi-instance support (meet, chat)
- ✅ Subscription-based access control
- ✅ Adaptive quality and network resilience
- ✅ Screen sharing and recording capabilities
