import nacl from 'tweetnacl';
import {
  encodeUTF8,
  decodeUTF8,
  encodeBase64,
  decodeBase64
} from 'tweetnacl-util';
import { getItemAsync, setItemAsync, deleteItemAsync } from './storage';

/**
 * End-to-End Encryption Service
 * Uses TweetNaCl (NaCl: Networking and Cryptography Library)
 * Implements X25519-XSalsa20-Poly1305 for encryption
 */

export interface KeyPair {
  publicKey: string;  // Base64 encoded
  secretKey: string;  // Base64 encoded (NEVER share this)
}

export interface EncryptedMessage {
  ciphertext: string;  // Base64 encoded encrypted message
  nonce: string;       // Base64 encoded nonce (public, unique per message)
  ephemeralPublicKey?: string; // Optional: for one-time key exchange
}

class EncryptionService {
  private static readonly STORAGE_KEYS = {
    PUBLIC_KEY: 'e2ee_public_key',
    SECRET_KEY: 'e2ee_secret_key',
    KEY_TIMESTAMP: 'e2ee_key_timestamp',
  };

  /**
   * Generate a new encryption key pair
   * Uses X25519 (Curve25519) for key exchange
   */
  generateKeyPair(): KeyPair {
    const keyPair = nacl.box.keyPair();

    return {
      publicKey: encodeBase64(keyPair.publicKey),
      secretKey: encodeBase64(keyPair.secretKey),
    };
  }

  /**
   * Store key pair securely on device
   */
  async storeKeyPair(keyPair: KeyPair): Promise<void> {
    try {
      await setItemAsync(
        EncryptionService.STORAGE_KEYS.PUBLIC_KEY,
        keyPair.publicKey
      );
      await setItemAsync(
        EncryptionService.STORAGE_KEYS.SECRET_KEY,
        keyPair.secretKey
      );
      await setItemAsync(
        EncryptionService.STORAGE_KEYS.KEY_TIMESTAMP,
        Date.now().toString()
      );
    } catch (error) {
      console.error('Failed to store key pair:', error);
      throw new Error('Failed to store encryption keys securely');
    }
  }

  /**
   * Retrieve stored key pair
   */
  async getStoredKeyPair(): Promise<KeyPair | null> {
    try {
      const publicKey = await getItemAsync(
        EncryptionService.STORAGE_KEYS.PUBLIC_KEY
      );
      const secretKey = await getItemAsync(
        EncryptionService.STORAGE_KEYS.SECRET_KEY
      );

      if (!publicKey || !secretKey) {
        return null;
      }

      return { publicKey, secretKey };
    } catch (error) {
      console.error('Failed to retrieve key pair:', error);
      return null;
    }
  }

  /**
   * Initialize user's key pair (create if doesn't exist)
   */
  async initializeKeys(): Promise<KeyPair> {
    let keyPair = await this.getStoredKeyPair();

    if (!keyPair) {
      keyPair = this.generateKeyPair();
      await this.storeKeyPair(keyPair);
    }

    return keyPair;
  }

  /**
   * Rotate keys (for security best practice - should be done periodically)
   */
  async rotateKeys(): Promise<KeyPair> {
    const newKeyPair = this.generateKeyPair();
    await this.storeKeyPair(newKeyPair);
    return newKeyPair;
  }

  /**
   * Encrypt a message for a specific recipient
   * Uses the recipient's public key and sender's secret key
   *
   * @param message - Plain text message
   * @param recipientPublicKey - Base64 encoded recipient's public key
   * @param senderSecretKey - Base64 encoded sender's secret key
   */
  encryptMessage(
    message: string,
    recipientPublicKey: string,
    senderSecretKey: string
  ): EncryptedMessage {
    try {
      // Convert message to Uint8Array
      const messageUint8 = encodeUTF8(message);

      // Generate a unique nonce (24 bytes for nacl.box)
      const nonce = nacl.randomBytes(nacl.box.nonceLength);

      // Decode keys from Base64
      const recipientPublicKeyUint8 = decodeBase64(recipientPublicKey);
      const senderSecretKeyUint8 = decodeBase64(senderSecretKey);

      // Encrypt the message
      const ciphertext = nacl.box(
        messageUint8,
        nonce,
        recipientPublicKeyUint8,
        senderSecretKeyUint8
      );

      if (!ciphertext) {
        throw new Error('Encryption failed');
      }

      return {
        ciphertext: encodeBase64(ciphertext),
        nonce: encodeBase64(nonce),
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Decrypt a message
   * Uses the sender's public key and recipient's secret key
   *
   * @param encryptedMessage - Encrypted message object
   * @param senderPublicKey - Base64 encoded sender's public key
   * @param recipientSecretKey - Base64 encoded recipient's secret key
   */
  decryptMessage(
    encryptedMessage: EncryptedMessage,
    senderPublicKey: string,
    recipientSecretKey: string
  ): string {
    try {
      // Decode from Base64
      const ciphertextUint8 = decodeBase64(encryptedMessage.ciphertext);
      const nonceUint8 = decodeBase64(encryptedMessage.nonce);
      const senderPublicKeyUint8 = decodeBase64(senderPublicKey);
      const recipientSecretKeyUint8 = decodeBase64(recipientSecretKey);

      // Decrypt the message
      const decrypted = nacl.box.open(
        ciphertextUint8,
        nonceUint8,
        senderPublicKeyUint8,
        recipientSecretKeyUint8
      );

      if (!decrypted) {
        throw new Error('Decryption failed - message may be corrupted or tampered with');
      }

      // Convert back to string
      return decodeUTF8(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Verify message integrity
   * Returns true if message can be decrypted without errors
   */
  async verifyMessage(
    encryptedMessage: EncryptedMessage,
    senderPublicKey: string
  ): Promise<boolean> {
    try {
      const keyPair = await this.getStoredKeyPair();
      if (!keyPair) return false;

      this.decryptMessage(encryptedMessage, senderPublicKey, keyPair.secretKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all stored keys (use on logout or account deletion)
   */
  async clearKeys(): Promise<void> {
    try {
      await deleteItemAsync(EncryptionService.STORAGE_KEYS.PUBLIC_KEY);
      await deleteItemAsync(EncryptionService.STORAGE_KEYS.SECRET_KEY);
      await deleteItemAsync(EncryptionService.STORAGE_KEYS.KEY_TIMESTAMP);
    } catch (error) {
      console.error('Failed to clear keys:', error);
    }
  }

  /**
   * Get key age in days
   */
  async getKeyAge(): Promise<number | null> {
    try {
      const timestamp = await getItemAsync(
        EncryptionService.STORAGE_KEYS.KEY_TIMESTAMP
      );
      if (!timestamp) return null;

      const ageMs = Date.now() - parseInt(timestamp, 10);
      return Math.floor(ageMs / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  }

  /**
   * Check if keys should be rotated (recommendation: every 90 days)
   */
  async shouldRotateKeys(maxAgeDays: number = 90): Promise<boolean> {
    const age = await this.getKeyAge();
    return age !== null && age > maxAgeDays;
  }
}

export default new EncryptionService();
