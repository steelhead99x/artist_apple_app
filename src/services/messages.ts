import apiService from './api';
import { Message, Conversation, SendMessageData } from '../types';

/**
 * Message API Service
 * Handles all messaging-related API calls (E2EE messaging)
 */
class MessageService {
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
   * Get messages with a specific user
   */
  async getConversation(userId: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<Message[]> {
    return await apiService.get(`/messages/conversation/${userId}`, params);
  }

  // ============================================================================
  // MESSAGES
  // ============================================================================

  /**
   * Send a message
   */
  async sendMessage(data: SendMessageData): Promise<Message> {
    return await apiService.post('/messages/send', data);
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
   * Exchange public keys for E2EE
   */
  async exchangeKeys(data: {
    recipient_id: string;
    public_key: string;
  }): Promise<{
    recipient_public_key: string;
  }> {
    return await apiService.post('/messages/key-exchange', data);
  }

  // ============================================================================
  // ENCRYPTION HELPERS
  // ============================================================================

  /**
   * Generate encryption key pair
   * This would use crypto library on the client side
   */
  generateKeyPair(): { publicKey: string; privateKey: string } {
    // TODO: Implement using crypto library
    // For now, return placeholder
    return {
      publicKey: '',
      privateKey: '',
    };
  }

  /**
   * Encrypt message
   */
  encryptMessage(message: string, recipientPublicKey: string): string {
    // TODO: Implement using crypto library
    // For now, return the message as-is
    return message;
  }

  /**
   * Decrypt message
   */
  decryptMessage(encryptedMessage: string, senderPublicKey: string, privateKey: string): string {
    // TODO: Implement using crypto library
    // For now, return the encrypted message as-is
    return encryptedMessage;
  }
}

export default new MessageService();
