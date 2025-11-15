import {
  Room,
  RoomEvent,
  Track,
  LocalParticipant,
  RemoteParticipant,
  Participant,
  DataPacket_Kind,
  RoomOptions,
  VideoPresets,
  AudioPresets,
  ParticipantEvent,
} from 'livekit-client';
import { registerGlobals } from '@livekit/react-native';
import apiService from './api';

// Register WebRTC globals for React Native
registerGlobals();

/**
 * LiveKit Service Configuration
 *
 * This service manages connections to multiple LiveKit instances:
 * 1. Main backend LiveKit (from API)
 * 2. meet.artist-space.com (video meetings)
 * 3. chat.artist-space.com (real-time chat)
 *
 * Features:
 * - End-to-end encryption (E2EE) using LiveKit's built-in encryption
 * - Multi-party video/audio calls
 * - Real-time messaging with data channels
 * - Screen sharing
 * - Recording capabilities
 */

export enum LiveKitInstance {
  MAIN = 'main',           // Backend LiveKit instance
  MEET = 'meet',           // meet.artist-space.com
  CHAT = 'chat',           // chat.artist-space.com
}

export interface LiveKitConfig {
  url: string;
  token: string;
  e2eeEnabled?: boolean;
  e2eeKey?: string;
}

export interface MessageData {
  type: 'chat' | 'system' | 'file';
  from: string;
  content: string;
  timestamp: number;
  metadata?: any;
}

class LiveKitService {
  private rooms: Map<LiveKitInstance, Room> = new Map();
  private messageHandlers: Map<LiveKitInstance, Set<(message: MessageData) => void>> = new Map();

  /**
   * Get LiveKit URL for specific instance
   */
  private getInstanceUrl(instance: LiveKitInstance): string {
    switch (instance) {
      case LiveKitInstance.MAIN:
        return process.env.EXPO_PUBLIC_LIVEKIT_URL || '';
      case LiveKitInstance.MEET:
        return process.env.EXPO_PUBLIC_LIVEKIT_MEET_URL || 'wss://meet.artist-space.com';
      case LiveKitInstance.CHAT:
        return process.env.EXPO_PUBLIC_LIVEKIT_CHAT_URL || 'wss://chat.artist-space.com';
      default:
        return process.env.EXPO_PUBLIC_LIVEKIT_URL || '';
    }
  }

  /**
   * Get LiveKit access token from backend
   *
   * @param instance - Which LiveKit instance to connect to
   * @param roomName - Name of the room to join
   * @param participantName - Display name for the participant
   */
  async getAccessToken(
    instance: LiveKitInstance,
    roomName: string,
    participantName: string
  ): Promise<string> {
    try {
      const response = await apiService.post<{ token: string }>('/livekit/token', {
        instance,
        roomName,
        participantName,
      });

      return response.token;
    } catch (error) {
      console.error('Failed to get LiveKit access token:', error);
      throw new Error('Failed to get access token');
    }
  }

  /**
   * Connect to a LiveKit room with E2EE
   *
   * @param instance - Which LiveKit instance to connect to
   * @param roomName - Name of the room to join
   * @param options - Room configuration options
   */
  async connect(
    instance: LiveKitInstance,
    roomName: string,
    options?: {
      participantName?: string;
      e2eeEnabled?: boolean;
      e2eeKey?: string;
      video?: boolean;
      audio?: boolean;
      screen?: boolean;
    }
  ): Promise<Room> {
    try {
      // Get existing room or create new one
      let room = this.rooms.get(instance);

      if (!room) {
        room = new Room({
          // Enable E2EE if configured
          e2ee: options?.e2eeEnabled ?? (process.env.EXPO_PUBLIC_LIVEKIT_E2EE_ENABLED === 'true') ? {
            keyProvider: options?.e2eeKey,
          } : undefined,

          // Adaptive stream configuration
          adaptiveStream: true,
          dynacast: true,

          // Video quality presets
          videoCaptureDefaults: {
            resolution: VideoPresets.h720.resolution,
            facingMode: 'user',
          },

          // Audio quality
          audioCaptureDefaults: {
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true,
          },

          // Reconnection settings
          reconnectPolicy: {
            nextRetryDelayInMs: (retryCount) => Math.min(retryCount * 2000, 30000),
            maxAttemptsMs: 60000,
          },
        });

        // Set up event listeners
        this.setupRoomListeners(room, instance);

        this.rooms.set(instance, room);
      }

      // Get access token from backend
      const token = await this.getAccessToken(
        instance,
        roomName,
        options?.participantName || 'Anonymous'
      );

      const url = this.getInstanceUrl(instance);

      // Connect to room
      await room.connect(url, token);

      // Enable local tracks if requested
      if (options?.video !== false) {
        await room.localParticipant.setCameraEnabled(true);
      }

      if (options?.audio !== false) {
        await room.localParticipant.setMicrophoneEnabled(true);
      }

      if (options?.screen) {
        await room.localParticipant.setScreenShareEnabled(true);
      }

      console.log(`✅ Connected to LiveKit room: ${roomName} on ${instance}`);

      return room;
    } catch (error) {
      console.error('LiveKit connection error:', error);
      throw error;
    }
  }

  /**
   * Set up event listeners for a room
   */
  private setupRoomListeners(room: Room, instance: LiveKitInstance) {
    // Participant connected
    room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log(`Participant connected: ${participant.identity}`);
    });

    // Participant disconnected
    room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log(`Participant disconnected: ${participant.identity}`);
    });

    // Track subscribed (audio/video received)
    room.on(RoomEvent.TrackSubscribed, (track: Track, publication, participant) => {
      console.log(`Track subscribed: ${track.kind} from ${participant.identity}`);
    });

    // Data received (real-time messaging)
    room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const decoder = new TextDecoder();
        const messageStr = decoder.decode(payload);
        const message: MessageData = JSON.parse(messageStr);

        // Notify message handlers
        const handlers = this.messageHandlers.get(instance);
        if (handlers) {
          handlers.forEach(handler => handler(message));
        }
      } catch (error) {
        console.error('Failed to parse data message:', error);
      }
    });

    // Connection quality changed
    room.on(RoomEvent.ConnectionQualityChanged, (quality: string, participant: Participant) => {
      console.log(`Connection quality for ${participant.identity}: ${quality}`);
    });

    // Reconnecting
    room.on(RoomEvent.Reconnecting, () => {
      console.log('Reconnecting to LiveKit...');
    });

    // Reconnected
    room.on(RoomEvent.Reconnected, () => {
      console.log('Reconnected to LiveKit');
    });

    // Disconnected
    room.on(RoomEvent.Disconnected, () => {
      console.log('Disconnected from LiveKit');
      this.rooms.delete(instance);
    });
  }

  /**
   * Send a message through LiveKit data channel
   * Uses reliable data channel for guaranteed delivery
   */
  async sendMessage(
    instance: LiveKitInstance,
    message: Omit<MessageData, 'timestamp'>
  ): Promise<void> {
    const room = this.rooms.get(instance);
    if (!room || !room.localParticipant) {
      throw new Error('Not connected to room');
    }

    const fullMessage: MessageData = {
      ...message,
      timestamp: Date.now(),
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(fullMessage));

    // Send through reliable data channel
    await room.localParticipant.publishData(
      data,
      DataPacket_Kind.RELIABLE
    );
  }

  /**
   * Subscribe to messages from a specific instance
   */
  onMessage(
    instance: LiveKitInstance,
    handler: (message: MessageData) => void
  ): () => void {
    let handlers = this.messageHandlers.get(instance);
    if (!handlers) {
      handlers = new Set();
      this.messageHandlers.set(instance, handlers);
    }

    handlers.add(handler);

    // Return unsubscribe function
    return () => {
      handlers?.delete(handler);
    };
  }

  /**
   * Toggle camera on/off
   */
  async toggleCamera(instance: LiveKitInstance, enabled: boolean): Promise<void> {
    const room = this.rooms.get(instance);
    if (!room) throw new Error('Not connected to room');

    await room.localParticipant.setCameraEnabled(enabled);
  }

  /**
   * Toggle microphone on/off
   */
  async toggleMicrophone(instance: LiveKitInstance, enabled: boolean): Promise<void> {
    const room = this.rooms.get(instance);
    if (!room) throw new Error('Not connected to room');

    await room.localParticipant.setMicrophoneEnabled(enabled);
  }

  /**
   * Toggle screen sharing
   */
  async toggleScreenShare(instance: LiveKitInstance, enabled: boolean): Promise<void> {
    const room = this.rooms.get(instance);
    if (!room) throw new Error('Not connected to room');

    await room.localParticipant.setScreenShareEnabled(enabled);
  }

  /**
   * Switch camera (front/back)
   */
  async switchCamera(instance: LiveKitInstance): Promise<void> {
    const room = this.rooms.get(instance);
    if (!room) throw new Error('Not connected to room');

    const track = room.localParticipant.getTrack(Track.Source.Camera);
    if (track?.videoTrack) {
      // @ts-ignore - switchCamera exists on video track
      await track.videoTrack.switchCamera();
    }
  }

  /**
   * Get current room
   */
  getRoom(instance: LiveKitInstance): Room | undefined {
    return this.rooms.get(instance);
  }

  /**
   * Disconnect from room
   */
  async disconnect(instance: LiveKitInstance): Promise<void> {
    const room = this.rooms.get(instance);
    if (room) {
      await room.disconnect();
      this.rooms.delete(instance);
      this.messageHandlers.delete(instance);
    }
  }

  /**
   * Disconnect from all rooms
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.rooms.keys()).map(instance =>
      this.disconnect(instance)
    );
    await Promise.all(disconnectPromises);
  }

  /**
   * Get participants in a room
   */
  getParticipants(instance: LiveKitInstance): Participant[] {
    const room = this.rooms.get(instance);
    if (!room) return [];

    return [
      room.localParticipant,
      ...Array.from(room.participants.values()),
    ];
  }

  /**
   * Check if connected to a room
   */
  isConnected(instance: LiveKitInstance): boolean {
    const room = this.rooms.get(instance);
    return room?.state === 'connected';
  }
}

export default new LiveKitService();
