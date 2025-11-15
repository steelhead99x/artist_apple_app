# API Documentation
## Artist Space Backend API Reference

Complete reference for all REST API endpoints in the Artist Space application.

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Bands](#bands)
4. [Gigs & Events](#gigs--events)
5. [Messages](#messages)
6. [Payments](#payments)
7. [LiveKit](#livekit)
8. [Venues & Studios](#venues--studios)
9. [Tours](#tours)
10. [W-2 & Tax Documents](#w-2--tax-documents)

---

## 🔧 Base Configuration

**Base URL:**
```
Production: https://api.artist-space.com/api
Development: http://localhost:8787/api
```

**Authentication:**
All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

**Content Type:**
```
Content-Type: application/json
```

---

## 🔐 Authentication

### POST /api/auth/register

Create a new user account.

**Request Body:**
```typescript
{
  email: string;              // Required (or walletAddress)
  password: string;           // Required if using email
  walletAddress?: string;     // Required if not using email
  userType: 'user' | 'venue' | 'studio' | 'booking_agent';
  name: string;               // Full name
  artistType?: 'solo' | 'band';  // For musicians
  bandName?: string;          // For band registration
}
```

**Response:**
```typescript
{
  token: string;              // JWT access token (1-day)
  refreshToken: string;       // Refresh token (30-day)
  user: {
    id: string;
    email: string;
    name: string;
    userType: string;
    status: 'pending' | 'approved';
    publicKey?: string;       // E2EE public key
  }
}
```

**Example:**
```bash
curl -X POST https://api.artist-space.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "artist@example.com",
    "password": "SecurePass123!",
    "userType": "user",
    "name": "John Doe",
    "artistType": "solo"
  }'
```

**Notes:**
- Solo artists automatically get a solo band created
- Booking agents are auto-approved
- Other user types require admin approval
- Password must be 8+ characters with uppercase, lowercase, number, special char

---

### POST /api/auth/login

Authenticate existing user.

**Request Body:**
```typescript
{
  email: string;              // Required (or walletAddress)
  password?: string;          // Required for email auth
  walletAddress?: string;     // For wallet auth
  pin?: string;               // For PIN auth
}
```

**Response:**
```typescript
{
  token: string;              // JWT access token
  refreshToken: string;       // Refresh token
  user: {
    id: string;
    email: string;
    name: string;
    userType: string;
    publicKey?: string;
  }
}
```

**Example:**
```bash
curl -X POST https://api.artist-space.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "artist@example.com",
    "password": "SecurePass123!"
  }'
```

---

### POST /api/auth/refresh

Refresh access token using refresh token.

**Request Body:**
```typescript
{
  refreshToken: string;
}
```

**Response:**
```typescript
{
  token: string;              // New JWT access token
  refreshToken: string;       // New refresh token
}
```

---

### POST /api/auth/biometric

Authenticate with biometric + PIN.

**Request Body:**
```typescript
{
  userId: string;
  pin: string;                // 4-6 digit PIN
  biometricToken: string;     // Biometric verification token
}
```

**Response:**
```typescript
{
  token: string;
  refreshToken: string;
  user: User;
}
```

---

## 👤 Users

### GET /api/users/:id

Get user profile by ID.

**Authentication:** Required

**Response:**
```typescript
{
  id: string;
  email: string;
  name: string;
  userType: string;
  status: string;
  walletAddress?: string;
  publicKey?: string;         // E2EE public key (Base64)
  createdAt: string;
}
```

**Example:**
```bash
curl https://api.artist-space.com/api/users/123 \
  -H "Authorization: Bearer <token>"
```

---

### PUT /api/users/:id

Update user profile.

**Authentication:** Required (must be own profile or admin)

**Request Body:**
```typescript
{
  name?: string;
  email?: string;
  walletAddress?: string;
  // Other profile fields
}
```

**Response:**
```typescript
{
  id: string;
  // Updated user fields
}
```

---

### GET /api/users/:id/public-key

Get user's E2EE public key.

**Authentication:** Required

**Response:**
```typescript
{
  userId: string;
  publicKey: string;          // Base64 encoded X25519 public key
}
```

**Note:** Used for encrypting messages to this user.

---

### PUT /api/users/:id/public-key

Update user's E2EE public key.

**Authentication:** Required (must be own profile)

**Request Body:**
```typescript
{
  publicKey: string;          // Base64 encoded public key
}
```

**Response:**
```typescript
{
  userId: string;
  publicKey: string;
}
```

---

## 🎸 Bands

### GET /api/bands

List all approved bands.

**Authentication:** Optional

**Query Parameters:**
```typescript
{
  booking_manager_id?: string;  // Filter by booking manager
}
```

**Response:**
```typescript
{
  bands: Array<{
    id: string;
    bandName: string;
    description: string;
    genre: string;
    userId: string;
    ownerName: string;
    bookingManagerId?: string;
    bookingManagerName?: string;
    ethWallet?: string;
    website?: string;
    socialLinks?: object;
    createdAt: string;
  }>
}
```

**Example:**
```bash
curl https://api.artist-space.com/api/bands
```

---

### GET /api/bands/:id

Get band details.

**Authentication:** Optional

**Response:**
```typescript
{
  id: string;
  bandName: string;
  description: string;
  genre: string;
  userId: string;
  ownerName: string;
  members: Array<{
    id: string;
    userId: string;
    name: string;
    role: string;
    instrument?: string;
  }>;
  stats: {
    totalGigs: number;
    totalEarnings: number;
    activeSongs: number;
  };
  // Other band details
}
```

---

### POST /api/bands

Create new band.

**Authentication:** Required

**Request Body:**
```typescript
{
  bandName: string;
  description?: string;
  genre?: string;
  ethWallet?: string;
  website?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    spotify?: string;
  };
}
```

**Response:**
```typescript
{
  id: string;
  bandName: string;
  userId: string;
  status: 'pending' | 'approved';
  // Other band fields
}
```

---

### PUT /api/bands/:id

Update band details.

**Authentication:** Required (must be band owner or admin)

**Request Body:**
```typescript
{
  bandName?: string;
  description?: string;
  genre?: string;
  // Other updatable fields
}
```

**Response:**
```typescript
{
  id: string;
  // Updated band fields
}
```

---

### DELETE /api/bands/:id

Delete band.

**Authentication:** Required (must be band owner or admin)

**Response:**
```typescript
{
  message: "Band deleted successfully"
}
```

---

### POST /api/bands/:id/members

Add member to band.

**Authentication:** Required (must be band owner)

**Request Body:**
```typescript
{
  userId: string;
  role: string;
  instrument?: string;
  permissions?: string[];
}
```

**Response:**
```typescript
{
  id: string;
  bandId: string;
  userId: string;
  role: string;
  status: 'pending' | 'active';
}
```

---

## 📅 Gigs & Events

### GET /api/tours

List all tours/gigs.

**Authentication:** Required

**Query Parameters:**
```typescript
{
  bandId?: string;
  status?: 'upcoming' | 'past' | 'cancelled';
  startDate?: string;         // ISO date
  endDate?: string;           // ISO date
}
```

**Response:**
```typescript
{
  gigs: Array<{
    id: string;
    bandId: string;
    venueName: string;
    date: string;
    startTime: string;
    endTime: string;
    payment: number;
    status: 'booked' | 'pending' | 'confirmed' | 'cancelled';
    location: {
      address: string;
      city: string;
      state: string;
      zipCode: string;
    };
  }>
}
```

---

### POST /api/tours

Create new gig/event.

**Authentication:** Required

**Request Body:**
```typescript
{
  bandId: string;
  venueName: string;
  date: string;               // ISO date
  startTime: string;          // HH:MM format
  endTime: string;
  payment: number;
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  description?: string;
  notes?: string;
}
```

**Response:**
```typescript
{
  id: string;
  // Gig details
}
```

---

### PUT /api/tours/:id/status

Update gig status.

**Authentication:** Required

**Request Body:**
```typescript
{
  status: 'booked' | 'confirmed' | 'cancelled';
  reason?: string;            // For cancellations
}
```

---

## 💬 Messages

### GET /api/messages

List conversations.

**Authentication:** Required

**Response:**
```typescript
{
  conversations: Array<{
    id: string;
    participants: Array<{
      id: string;
      name: string;
      publicKey: string;
    }>;
    lastMessage: {
      encryptedContent: string;
      nonce: string;
      createdAt: string;
    };
    unreadCount: number;
  }>
}
```

---

### GET /api/messages/:conversationId

Get messages in conversation.

**Authentication:** Required

**Response:**
```typescript
{
  messages: Array<{
    id: string;
    senderId: string;
    recipientId: string;
    encryptedContent: string;  // Base64 ciphertext
    nonce: string;             // Base64 nonce
    createdAt: string;
    readAt?: string;
  }>
}
```

**Note:** Messages are end-to-end encrypted. Client must decrypt using TweetNaCl.

---

### POST /api/messages

Send encrypted message.

**Authentication:** Required

**Request Body:**
```typescript
{
  recipientId: string;
  encryptedContent: string;   // Base64 encrypted message
  nonce: string;              // Base64 encryption nonce
}
```

**Response:**
```typescript
{
  id: string;
  senderId: string;
  recipientId: string;
  encryptedContent: string;
  nonce: string;
  createdAt: string;
}
```

**Example Encryption:**
```typescript
import { encryptionService } from '../services/encryption';

// Get recipient's public key
const recipientPublicKey = await getRecipientPublicKey(recipientId);

// Encrypt message
const encrypted = await encryptionService.encryptMessage(
  "Hello, this is a secret message",
  recipientPublicKey,
  mySecretKey
);

// Send to API
await api.post('/messages', {
  recipientId,
  encryptedContent: encrypted.ciphertext,
  nonce: encrypted.nonce,
});
```

---

### PUT /api/messages/:id/read

Mark message as read.

**Authentication:** Required

**Response:**
```typescript
{
  id: string;
  readAt: string;
}
```

---

## 💳 Payments

### GET /api/payments/ledger

Get payment history.

**Authentication:** Required

**Query Parameters:**
```typescript
{
  startDate?: string;
  endDate?: string;
  status?: 'pending' | 'completed' | 'failed';
}
```

**Response:**
```typescript
{
  payments: Array<{
    id: string;
    gigId?: string;
    amount: number;
    method: 'stripe' | 'paypal' | 'crypto' | 'braintree';
    status: string;
    transactionId: string;
    createdAt: string;
  }>;
  total: number;
  pending: number;
  completed: number;
}
```

---

### POST /api/payments/stripe

Process Stripe payment.

**Authentication:** Required

**Request Body:**
```typescript
{
  amount: number;
  paymentMethodId: string;    // Stripe payment method ID
  gigId?: string;
  description?: string;
}
```

**Response:**
```typescript
{
  id: string;
  status: 'succeeded' | 'pending' | 'failed';
  transactionId: string;
  amount: number;
}
```

---

### POST /api/payments/paypal

Process PayPal payment.

**Authentication:** Required

**Request Body:**
```typescript
{
  amount: number;
  orderId: string;            // PayPal order ID
  gigId?: string;
}
```

**Response:**
```typescript
{
  id: string;
  status: string;
  transactionId: string;
}
```

---

### GET /api/payments/methods

Get saved payment methods.

**Authentication:** Required

**Response:**
```typescript
{
  methods: Array<{
    id: string;
    type: 'card' | 'bank' | 'paypal' | 'crypto';
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
    isDefault: boolean;
  }>
}
```

---

## 🎥 LiveKit

### POST /api/livekit/token

Get LiveKit access token for joining room.

**Authentication:** Required

**Request Body:**
```typescript
{
  roomName: string;
  participantName: string;
  instance?: 'main' | 'meet' | 'chat';  // Default: 'main'
  e2eeEnabled?: boolean;      // Default: true
}
```

**Response:**
```typescript
{
  token: string;              // LiveKit JWT token
  url: string;                // WebSocket URL
  roomName: string;
  participantName: string;
}
```

**Example:**
```bash
curl -X POST https://api.artist-space.com/api/livekit/token \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "roomName": "band-rehearsal-123",
    "participantName": "John Doe",
    "instance": "meet"
  }'
```

**LiveKit Instances:**
- **main**: General purpose (default LiveKit instance)
- **meet**: High-quality meetings (meet.artist-space.com)
- **chat**: Real-time chat with video (chat.artist-space.com)

---

### POST /api/livekit/room

Create LiveKit room.

**Authentication:** Required

**Request Body:**
```typescript
{
  name: string;
  emptyTimeout?: number;      // Seconds before empty room closes
  maxParticipants?: number;
}
```

**Response:**
```typescript
{
  name: string;
  sid: string;
  createdAt: number;
}
```

---

## 🏛️ Venues & Studios

### GET /api/venues

List all approved venues.

**Authentication:** Optional

**Response:**
```typescript
{
  venues: Array<{
    id: string;
    name: string;
    description: string;
    address: string;
    city: string;
    state: string;
    capacity: number;
    amenities: string[];
    contactEmail: string;
    contactPhone: string;
    website?: string;
  }>
}
```

---

### GET /api/studios

List recording studios.

**Authentication:** Optional

**Response:**
```typescript
{
  studios: Array<{
    id: string;
    name: string;
    description: string;
    hourlyRate: number;
    equipment: string[];
    location: object;
  }>
}
```

---

## 🗺️ Tours

### GET /api/tours

List tours.

**Authentication:** Required

**Query Parameters:**
```typescript
{
  bandId?: string;
  status?: string;
}
```

**Response:**
```typescript
{
  tours: Array<{
    id: string;
    bandId: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    events: Array<Event>;
  }>
}
```

---

### POST /api/tours

Create tour.

**Authentication:** Required

**Request Body:**
```typescript
{
  bandId: string;
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
}
```

---

## 📄 W-2 & Tax Documents

### GET /api/w2

Get W-2 tax documents.

**Authentication:** Required

**Query Parameters:**
```typescript
{
  year?: number;
}
```

**Response:**
```typescript
{
  documents: Array<{
    id: string;
    year: number;
    totalEarnings: number;
    taxWithheld: number;
    documentUrl: string;
    createdAt: string;
  }>
}
```

---

### POST /api/w2

Generate W-2 document.

**Authentication:** Required (admin or self)

**Request Body:**
```typescript
{
  userId: string;
  year: number;
  earnings: number;
  taxWithheld: number;
}
```

**Response:**
```typescript
{
  id: string;
  documentUrl: string;
}
```

---

## ⚠️ Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```typescript
{
  error: string;              // Error description
  field?: string;             // Invalid field name
}
```

### 401 Unauthorized
```typescript
{
  error: "Unauthorized",
  message: "Invalid or missing authentication token"
}
```

### 403 Forbidden
```typescript
{
  error: "Forbidden",
  message: "You don't have permission to access this resource"
}
```

### 404 Not Found
```typescript
{
  error: "Not Found",
  message: "Resource not found"
}
```

### 429 Too Many Requests
```typescript
{
  error: "Too Many Requests",
  message: "Rate limit exceeded. Try again later.",
  retryAfter: number          // Seconds to wait
}
```

### 500 Internal Server Error
```typescript
{
  error: "Internal Server Error",
  message: "An unexpected error occurred"
}
```

---

## 🔒 Security Notes

### Rate Limiting

**Limits:**
- General API: 100 requests per 15 minutes per IP
- Auth endpoints: 5 login attempts per 15 minutes per IP
- PIN verification: 3 attempts per 15 minutes per user

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699999999
```

### Input Validation

All input is sanitized to prevent:
- XSS attacks
- SQL injection
- Command injection
- Path traversal

**Example:**
```typescript
// Input: "<script>alert('xss')</script>"
// Sanitized: "&lt;script&gt;alert('xss')&lt;/script&gt;"
```

### Token Expiration

- **Access Token**: 1 day
- **Refresh Token**: 30 days
- **LiveKit Token**: Variable (per room session)

Always handle token expiration:
```typescript
try {
  const response = await api.get('/users/me');
} catch (error) {
  if (error.response?.status === 401) {
    // Token expired, refresh it
    await refreshToken();
    // Retry request
  }
}
```

---

## 📝 API Versioning

Current version: **v1**

**Future versions will be prefixed:**
```
/api/v2/users
/api/v2/bands
```

**Version headers:**
```
API-Version: 1.0.0
```

---

## 🚀 Usage Examples

### Complete Flow: Create Band and Schedule Gig

```typescript
import apiService from './services/api';

async function createBandAndGig() {
  // 1. Create band
  const band = await apiService.post('/bands', {
    bandName: 'The Rockers',
    genre: 'Rock',
    description: 'High-energy rock band',
  });

  // 2. Add band member
  await apiService.post(`/bands/${band.data.id}/members`, {
    userId: 'user-123',
    role: 'Lead Guitar',
    instrument: 'Guitar',
  });

  // 3. Schedule gig
  const gig = await apiService.post('/tours', {
    bandId: band.data.id,
    venueName: 'Blues Bar Downtown',
    date: '2025-12-01',
    startTime: '20:00',
    endTime: '23:00',
    payment: 500,
    location: {
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
    },
  });

  console.log('Band created:', band.data.id);
  console.log('Gig scheduled:', gig.data.id);
}
```

### Send Encrypted Message

```typescript
import { encryptionService } from './services/encryption';
import apiService from './services/api';

async function sendEncryptedMessage(recipientId: string, message: string) {
  // 1. Get recipient's public key
  const response = await apiService.get(`/users/${recipientId}/public-key`);
  const recipientPublicKey = response.data.publicKey;

  // 2. Get my secret key from secure storage
  const mySecretKey = await encryptionService.getSecretKey();

  // 3. Encrypt message
  const encrypted = await encryptionService.encryptMessage(
    message,
    recipientPublicKey,
    mySecretKey
  );

  // 4. Send encrypted message
  await apiService.post('/messages', {
    recipientId,
    encryptedContent: encrypted.ciphertext,
    nonce: encrypted.nonce,
  });

  console.log('Encrypted message sent!');
}
```

### Join LiveKit Video Call

```typescript
import { liveKitService, LiveKitInstance } from './services/livekit';
import apiService from './services/api';

async function joinVideoCall(roomName: string) {
  // 1. Get LiveKit token from backend
  const response = await apiService.post('/livekit/token', {
    roomName,
    participantName: 'John Doe',
    instance: 'meet',
    e2eeEnabled: true,
  });

  // 2. Connect to LiveKit room
  const room = await liveKitService.connect(
    LiveKitInstance.MEET,
    roomName,
    {
      participantName: 'John Doe',
      e2eeEnabled: true,
    }
  );

  console.log('Connected to room:', room.name);
}
```

---

## 🔗 Related Documentation

- **[Architecture](./ARCHITECTURE.md)** - System design
- **[Security Guide](../SECURITY_IMPLEMENTATION_GUIDE.md)** - Security implementation
- **[LiveKit Integration](../LIVEKIT_INTEGRATION.md)** - Real-time features
- **[Database Schema](./api/DATABASE.md)** - Database structure

---

**Last Updated:** 2025-11-15
**API Version:** 1.0.0
