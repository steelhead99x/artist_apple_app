# End-to-End Encrypted Messaging
## Secure Communication with TweetNaCl and LiveKit

Complete guide to the hybrid E2EE messaging system in Artist Space using TweetNaCl for persistent messages and LiveKit for real-time communications.

---

## 🔒 Overview

Artist Space uses a **hybrid encryption approach**:

1. **TweetNaCl (NaCl.box)** - For persistent async messages stored in database
2. **LiveKit E2EE** - For real-time video/audio/chat (ephemeral)

**Why Hybrid?**
- **TweetNaCl**: Perfect for async messages that need to be stored and retrieved later
- **LiveKit**: Optimized for real-time, low-latency communications

---

## 📦 TweetNaCl Encryption

### How It Works

**Algorithm:** X25519-XSalsa20-Poly1305 (NaCl.box)
- **X25519**: Elliptic Curve Diffie-Hellman key exchange
- **XSalsa20**: Stream cipher for encryption
- **Poly1305**: Message authentication code

**Flow:**
```
Alice wants to send message to Bob
    ↓
1. Alice gets Bob's public key from server
2. Alice encrypts message with:
   - Her secret key
   - Bob's public key
   - Random nonce
3. Server stores encrypted message
   (Server CANNOT decrypt - zero knowledge)
4. Bob retrieves encrypted message
5. Bob decrypts with:
   - His secret key
   - Alice's public key
   - Nonce from message
```

### Key Generation

**On Registration/Login:**
```typescript
import { encryptionService } from '../services/encryption';

// Generate key pair
const keyPair = await encryptionService.generateKeyPair();

console.log({
  publicKey: keyPair.publicKey,   // Base64, share with server
  secretKey: keyPair.secretKey,   // Base64, NEVER share
});

// Store secret key securely
await encryptionService.storeSecretKey(keyPair.secretKey);

// Upload public key to server
await apiService.put(`/users/${userId}/public-key`, {
  publicKey: keyPair.publicKey,
});
```

**Key Pair Structure:**
```typescript
interface KeyPair {
  publicKey: string;    // 32 bytes, Base64 encoded, shareable
  secretKey: string;    // 32 bytes, Base64 encoded, KEEP SECRET
}
```

---

### Encryption

**Encrypt a Message:**
```typescript
import { encryptionService } from '../services/encryption';
import apiService from '../services/api';

async function sendEncryptedMessage(
  recipientId: string,
  message: string
): Promise<void> {
  // 1. Get recipient's public key
  const response = await apiService.get(`/users/${recipientId}/public-key`);
  const recipientPublicKey = response.data.publicKey;

  // 2. Get my secret key
  const mySecretKey = await encryptionService.getSecretKey();

  // 3. Encrypt message
  const encrypted = await encryptionService.encryptMessage(
    message,
    recipientPublicKey,
    mySecretKey
  );

  // 4. Send to server
  await apiService.post('/messages', {
    recipientId,
    encryptedContent: encrypted.ciphertext,
    nonce: encrypted.nonce,
  });

  console.log('Encrypted message sent!');
}
```

**What Gets Encrypted:**
```typescript
// Original message
const message = "Hey! Are we rehearsing at 7pm?";

// After encryption
const encrypted = {
  ciphertext: "aGVsbG8gd29ybGQgZW5jcnlwdGVkCg==",  // Base64
  nonce: "cmFuZG9tIG5vbmNlIGZvciBzZWN1cml0eQ==",  // Base64
};
```

---

### Decryption

**Decrypt a Message:**
```typescript
import { encryptionService } from '../services/encryption';

async function decryptMessage(
  encryptedMessage: {
    senderId: string;
    encryptedContent: string;
    nonce: string;
  }
): Promise<string> {
  // 1. Get sender's public key
  const response = await apiService.get(`/users/${encryptedMessage.senderId}/public-key`);
  const senderPublicKey = response.data.publicKey;

  // 2. Get my secret key
  const mySecretKey = await encryptionService.getSecretKey();

  // 3. Decrypt message
  const decrypted = await encryptionService.decryptMessage(
    {
      ciphertext: encryptedMessage.encryptedContent,
      nonce: encryptedMessage.nonce,
    },
    senderPublicKey,
    mySecretKey
  );

  return decrypted;
}
```

**Complete Message Flow:**
```typescript
// Fetch messages from server
const response = await apiService.get(`/messages/${conversationId}`);
const messages = response.data.messages;

// Decrypt each message
const decryptedMessages = await Promise.all(
  messages.map(async (msg) => {
    const decrypted = await decryptMessage(msg);
    return {
      ...msg,
      content: decrypted,  // Now readable
    };
  })
);
```

---

### Complete Messaging Example

```typescript
import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text } from 'react-native';
import { encryptionService } from '../services/encryption';
import apiService from '../services/api';
import { Button } from '../components/common/Button';

function ChatScreen({ route }: any) {
  const { recipientId } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [recipientPublicKey, setRecipientPublicKey] = useState('');

  useEffect(() => {
    loadMessages();
    loadRecipientPublicKey();
  }, []);

  async function loadRecipientPublicKey() {
    const response = await apiService.get(`/users/${recipientId}/public-key`);
    setRecipientPublicKey(response.data.publicKey);
  }

  async function loadMessages() {
    const response = await apiService.get(`/messages?recipientId=${recipientId}`);
    const encrypted = response.data.messages;

    // Decrypt all messages
    const decrypted = await Promise.all(
      encrypted.map(async (msg) => {
        try {
          const content = await decryptMessage(msg);
          return { ...msg, content };
        } catch (error) {
          console.error('Failed to decrypt message:', error);
          return { ...msg, content: '[Encrypted]' };
        }
      })
    );

    setMessages(decrypted);
  }

  async function sendMessage() {
    if (!inputText.trim()) return;

    try {
      // Get my secret key
      const mySecretKey = await encryptionService.getSecretKey();

      // Encrypt message
      const encrypted = await encryptionService.encryptMessage(
        inputText,
        recipientPublicKey,
        mySecretKey
      );

      // Send to server
      await apiService.post('/messages', {
        recipientId,
        encryptedContent: encrypted.ciphertext,
        nonce: encrypted.nonce,
      });

      // Add to local messages
      setMessages([
        ...messages,
        {
          id: Date.now().toString(),
          content: inputText,
          senderId: 'me',
          createdAt: new Date().toISOString(),
        },
      ]);

      setInputText('');
    } catch (error) {
      Alert.alert('Failed to send message');
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View>
            <Text>{item.content}</Text>
            <Text>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        )}
      />

      <View style={{ flexDirection: 'row' }}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
        />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </View>
  );
}
```

---

## 🎥 LiveKit E2EE

### How It Works

LiveKit provides built-in E2EE for real-time communications.

**Features:**
- End-to-end encryption for audio, video, and data
- AES-GCM encryption
- Key rotation support
- Zero-knowledge server (SFU can't decrypt)

### Setup

**Initialize LiveKit with E2EE:**
```typescript
import { liveKitService, LiveKitInstance } from '../services/livekit';

async function joinEncryptedCall(roomName: string) {
  // Connect with E2EE enabled
  const room = await liveKitService.connect(
    LiveKitInstance.MEET,  // or MAIN, CHAT
    roomName,
    {
      participantName: 'John Doe',
      e2eeEnabled: true,
      e2eeKey: 'shared-secret-key',  // All participants need same key
    }
  );

  console.log('Connected to encrypted room!');
}
```

### Key Distribution

**Option 1: Pre-shared Key**
```typescript
// All band members know the key beforehand
const bandE2EEKey = 'band-secret-key-12345';

await liveKitService.connect(LiveKitInstance.MEET, 'band-rehearsal', {
  e2eeEnabled: true,
  e2eeKey: bandE2EEKey,
});
```

**Option 2: Dynamic Key Distribution**
```typescript
// Generate key and share via encrypted message
import { nanoid } from 'nanoid';

const roomKey = nanoid(32);  // Generate random key

// Share key with participants via TweetNaCl encrypted messages
await sendEncryptedMessage(participant1Id, roomKey);
await sendEncryptedMessage(participant2Id, roomKey);

// Then join room
await liveKitService.connect(LiveKitInstance.MEET, roomName, {
  e2eeEnabled: true,
  e2eeKey: roomKey,
});
```

---

## 🔄 Key Management

### Key Storage

**Where Keys Are Stored:**
```typescript
// Secret key (NEVER share, NEVER upload)
SecureStore: 'e2eeSecretKey' → User's private key

// Public key (shareable, uploaded to server)
Database: users.public_key → User's public key
```

### Key Rotation

**When to Rotate:**
- Every 90 days (recommended)
- When member leaves band
- Security breach suspected

**How to Rotate:**
```typescript
async function rotateE2EEKeys() {
  // 1. Generate new key pair
  const newKeyPair = await encryptionService.generateKeyPair();

  // 2. Store new secret key
  await encryptionService.storeSecretKey(newKeyPair.secretKey);

  // 3. Upload new public key
  await apiService.put(`/users/${userId}/public-key`, {
    publicKey: newKeyPair.publicKey,
  });

  // 4. Notify contacts (optional)
  Alert.alert('Security Update', 'Your encryption keys have been updated');
}
```

**Important:** Old messages encrypted with old keys can still be decrypted if you keep your old secret key. Consider:
```typescript
// Store old keys with timestamp
await SecureStore.setItemAsync(
  `e2eeSecretKey_${Date.now()}`,
  oldSecretKey
);
```

---

## 🛡️ Security Best Practices

### 1. Never Log Secret Keys

```typescript
// ❌ NEVER do this
console.log('My secret key:', secretKey);

// ✅ Safe logging
console.log('Secret key exists:', !!secretKey);
```

### 2. Verify Public Keys

```typescript
// Verify you have the right public key
async function verifyPublicKey(userId: string, expectedFingerprint: string) {
  const response = await apiService.get(`/users/${userId}/public-key`);
  const publicKey = response.data.publicKey;

  const fingerprint = await encryptionService.getKeyFingerprint(publicKey);

  if (fingerprint !== expectedFingerprint) {
    Alert.alert('Security Warning', 'Public key mismatch detected!');
    return false;
  }

  return true;
}
```

### 3. Handle Decryption Failures

```typescript
try {
  const decrypted = await decryptMessage(encryptedMsg);
  return decrypted;
} catch (error) {
  // Don't show error details to user
  console.error('Decryption failed:', error);
  return '[Unable to decrypt message]';
}
```

### 4. Secure Key Backup

```typescript
// Offer users to backup their secret key
async function backupSecretKey(): Promise<string> {
  const secretKey = await encryptionService.getSecretKey();

  // Encrypt with user's password
  const password = await promptPassword();
  const encrypted = await encryptWithPassword(secretKey, password);

  // User can save this encrypted backup
  return encrypted;
}
```

---

## 🔍 Debugging

### Enable Debug Mode

```typescript
// In encryption service
const DEBUG = __DEV__;

class EncryptionService {
  async encryptMessage(...args) {
    if (DEBUG) {
      console.log('Encrypting message length:', args[0].length);
      console.log('Using recipient public key fingerprint:',
        await this.getKeyFingerprint(args[1]));
    }

    // ... encryption logic
  }
}
```

### Verify Encryption

```typescript
// Test encryption/decryption roundtrip
async function testEncryption() {
  const keyPair = await encryptionService.generateKeyPair();
  const message = "Test message";

  const encrypted = await encryptionService.encryptMessage(
    message,
    keyPair.publicKey,
    keyPair.secretKey
  );

  const decrypted = await encryptionService.decryptMessage(
    encrypted,
    keyPair.publicKey,
    keyPair.secretKey
  );

  console.assert(decrypted === message, 'Encryption roundtrip failed!');
}
```

---

## ⚠️ Common Issues

### "Unable to decrypt message"

**Causes:**
- Wrong sender public key
- Corrupted ciphertext or nonce
- Keys have been rotated

**Solution:**
```typescript
async function handleDecryptionError(error: Error, messageId: string) {
  console.error('Decryption error:', error);

  // Try to refresh sender's public key
  const senderId = getSenderIdForMessage(messageId);
  await refreshPublicKey(senderId);

  // Retry decryption
  try {
    return await decryptMessage(message);
  } catch (retryError) {
    // Still failed, show placeholder
    return '[Unable to decrypt - key may have changed]';
  }
}
```

### "Public key not found"

**Cause:** Recipient hasn't set up E2EE yet

**Solution:**
```typescript
async function checkRecipientE2EE(recipientId: string): Promise<boolean> {
  try {
    const response = await apiService.get(`/users/${recipientId}/public-key`);
    return !!response.data.publicKey;
  } catch (error) {
    if (error.response?.status === 404) {
      Alert.alert(
        'E2EE Not Available',
        'This user hasn\'t set up encrypted messaging yet'
      );
      return false;
    }
    throw error;
  }
}
```

---

## 📱 UI Indicators

### Show Encryption Status

```tsx
import { Ionicons } from '@expo/vector-icons';

function MessageBubble({ message }: { message: Message }) {
  return (
    <View style={styles.bubble}>
      <Text>{message.content}</Text>

      {message.encrypted && (
        <View style={styles.encryptionBadge}>
          <Ionicons name="lock-closed" size={12} color="green" />
          <Text style={styles.badgeText}>Encrypted</Text>
        </View>
      )}
    </View>
  );
}
```

### Encryption Setup Prompt

```tsx
function ChatScreen() {
  const [recipientHasE2EE, setRecipientHasE2EE] = useState(false);

  useEffect(() => {
    checkE2EE();
  }, []);

  async function checkE2EE() {
    const hasE2EE = await checkRecipientE2EE(recipientId);
    setRecipientHasE2EE(hasE2EE);
  }

  if (!recipientHasE2EE) {
    return (
      <View style={styles.warningContainer}>
        <Ionicons name="lock-open" size={48} color="orange" />
        <Text style={styles.warningText}>
          This conversation is not encrypted
        </Text>
        <Text style={styles.warningSubtext}>
          Recipient hasn't enabled encryption yet
        </Text>
      </View>
    );
  }

  return <EncryptedChat />;
}
```

---

## 🔗 Related Documentation

- **[Security Guide](../../SECURITY_IMPLEMENTATION_GUIDE.md)** - Complete security overview
- **[LiveKit Integration](../../LIVEKIT_INTEGRATION.md)** - Real-time communications
- **[API Documentation](../API.md)** - Messages endpoints
- **[Architecture](../ARCHITECTURE.md)** - System design

---

**Last Updated:** 2025-11-15
**Encryption:** TweetNaCl 1.0.3 + LiveKit E2EE
