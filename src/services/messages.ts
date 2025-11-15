import apiService from './api';
import encryptionService, { EncryptedMessage } from './encryption';
import { Message, Conversation, SendMessageData } from '../types';

/**
 * Message API Service
 * Handles all messaging-related API calls with End-to-End Encryption
 *
 * Security Features:
 * - E2EE using TweetNaCl (X25519-XSalsa20-Poly1305)
 * - Public key exchange via secure API
 * - Messages encrypted client-side before sending
 * - Messages decrypted client-side after receiving
 */
class MessageService {
  // Cache for recipient public keys (reduces API calls)
  private publicKeyCache: Map<string, string> = new Map();

  // ============================================================================
  // CONVERSATIONS
  // ============================================================================

  /**
   * Get all conversations for current user
   */
  async getConversations(): Promise<Conversation[]> {
    return await apiService.get('/messages/conversations');
  }

  /**
   * Get messages with a specific user (decrypts messages automatically)
   */
  async getConversation(userId: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<Message[]> {
    const messages = await apiService.get<Message[]>(`/messages/conversation/${userId}`, params);

    // Decrypt messages
    const keyPair = await encryptionService.getStoredKeyPair();
    if (!keyPair) {
      // No encryption keys found - messages may not decrypt
      return messages;
    }

    // Decrypt each message
    return Promise.all(
      messages.map(async (message) => {
        if (message.encrypted_content && message.nonce) {
          try {
            // Determine if we're the sender or recipient
            const isSender = message.sender_id === (await this.getCurrentUserId());
            const otherUserId = isSender ? message.recipient_id : message.sender_id;

            // Get the other user's public key
            const otherUserPublicKey = await this.getPublicKey(otherUserId);

            // Decrypt the message
            const decryptedContent = encryptionService.decryptMessage(
              {
                ciphertext: message.encrypted_content,
                nonce: message.nonce,
              },
              otherUserPublicKey,
              keyPair.secretKey
            );

            return {
              ...message,
              content: decryptedContent,
            };
          } catch (error) {
            // Failed to decrypt message
            return {
              ...message,
              content: '[Unable to decrypt message]',
            };
          }
        }
        return message;
      })
    );
  }

  // ============================================================================
  // MESSAGES
  // ============================================================================

  /**
   * Send a message (encrypts automatically before sending)
   */
  async sendMessage(data: SendMessageData): Promise<Message> {
    // Get or initialize encryption keys
    const keyPair = await encryptionService.initializeKeys();

    // Get recipient's public key
    const recipientPublicKey = await this.getPublicKey(data.recipient_id);

    // Encrypt the message
    const encrypted = encryptionService.encryptMessage(
      data.content,
      recipientPublicKey,
      keyPair.secretKey
    );

    // Send encrypted message to server
    const encryptedData = {
      recipient_id: data.recipient_id,
      encrypted_content: encrypted.ciphertext,
      iv: encrypted.nonce,
      // Optionally include plaintext content for server-side search/moderation
      // (only if your security model allows it)
      content: undefined,
    };

    const sentMessage = await apiService.post<Message>('/messages/send', encryptedData);

    // Return message with decrypted content for local display
    return {
      ...sentMessage,
      content: data.content,
    };
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    return await apiService.put(`/messages/${messageId}/read`, {});
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: string): Promise<void> {
    return await apiService.delete(`/messages/${messageId}`);
  }

  // ============================================================================
  // E2EE KEY EXCHANGE
  // ============================================================================

  /**
   * Upload public key to server for other users to retrieve
   */
  async uploadPublicKey(): Promise<void> {
    const keyPair = await encryptionService.initializeKeys();
    await apiService.post('/messages/upload-public-key', {
      public_key: keyPair.publicKey,
    });
  }

  /**
   * Get a user's public key (cached for performance)
   */
  async getPublicKey(userId: string): Promise<string> {
    // Check cache first
    if (this.publicKeyCache.has(userId)) {
      return this.publicKeyCache.get(userId)!;
    }

    // Fetch from server
    const response = await apiService.get<{ public_key: string }>(
      `/messages/public-key/${userId}`
    );

    // Cache the key
    this.publicKeyCache.set(userId, response.public_key);

    return response.public_key;
  }

  /**
   * Clear public key cache (call on logout)
   */
  clearPublicKeyCache(): void {
    this.publicKeyCache.clear();
  }

  /**
   * Initialize E2EE for the current user
   */
  async initializeE2EE(): Promise<void> {
    await encryptionService.initializeKeys();
    await this.uploadPublicKey();
  }

  /**
   * Rotate encryption keys (recommended every 90 days)
   */
  async rotateKeys(): Promise<void> {
    const shouldRotate = await encryptionService.shouldRotateKeys();
    if (shouldRotate) {
      await encryptionService.rotateKeys();
      await this.uploadPublicKey();
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get current user ID from stored user data
   */
  private async getCurrentUserId(): Promise<string> {
    const user = await apiService.getStoredUser();
    return user?.id || '';
  }
}

export default new MessageService();
