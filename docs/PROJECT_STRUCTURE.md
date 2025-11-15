# Project Structure
## Artist Space Codebase Organization

Understanding where things live and why they're organized this way.

---

## 📁 Root Directory

```
artist_apple_app/
├── .env.example              # Environment variable template
├── .gitignore               # Git ignore rules
├── App.tsx                  # Application entry point
├── app.json                 # Expo configuration
├── package.json             # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── babel.config.js          # Babel configuration
├── metro.config.js          # Metro bundler config
├── README.md                # Main documentation hub
├── CHANGELOG.md             # Version history
├── CONTRIBUTING.md          # Contribution guidelines
├── CODE_OF_CONDUCT.md       # Community guidelines
├── SECURITY_IMPLEMENTATION_GUIDE.md  # Security reference
├── LIVEKIT_INTEGRATION.md   # LiveKit setup
├── UI_IMPROVEMENTS.md       # Design system docs
├── QUICK_UI_GUIDE.md        # UI component usage
├── DEPLOYMENT_GUIDE.md      # Production deployment
├── docs/                    # Additional documentation
├── examples/                # Example code & backend
├── src/                     # Application source code
├── assets/                  # Images, fonts, media
└── node_modules/            # Dependencies (git-ignored)
```

---

## 📱 src/ Directory (Frontend)

### Overview

```
src/
├── components/              # Reusable UI components
├── screens/                 # App screens/pages
├── services/                # Business logic & integrations
├── theme/                   # Design system
├── types/                   # TypeScript definitions
├── utils/                   # Utility functions
└── navigation/              # Navigation configuration
```

### Detailed Breakdown

#### `src/components/`

**Reusable UI components organized by domain:**

```
components/
├── common/                  # Shared across app
│   ├── Button.tsx          # Buttons
│   ├── Card.tsx            # Cards
│   ├── GlassCard.tsx       # Glass-morphism cards
│   ├── QuickAction.tsx     # Action buttons
│   ├── AnimatedStat.tsx    # Animated statistics
│   ├── LoadingSpinner.tsx  # Loading states
│   ├── ErrorBoundary.tsx   # Error handling
│   └── index.ts            # Barrel export
├── auth/                    # Authentication components
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── BiometricPrompt.tsx
├── band/                    # Band-related components
│   ├── BandCard.tsx
│   ├── BandMemberList.tsx
│   └── BandStats.tsx
├── payment/                 # Payment components
│   ├── PaymentForm.tsx
│   ├── StripeWrapper.tsx
│   └── PaymentHistory.tsx
└── messaging/               # Messaging components
    ├── MessageList.tsx
    ├── MessageInput.tsx
    └── EncryptedBadge.tsx
```

**Naming Convention:**
- PascalCase for components: `GlassCard.tsx`
- One component per file
- Export as named export: `export function GlassCard() { }`
- Barrel exports in `index.ts`: `export * from './GlassCard'`

**Component Template:**
```typescript
// src/components/common/MyComponent.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import theme from '../../theme';

interface MyComponentProps {
  title: string;
  optional?: boolean;
}

/**
 * Component description
 * @component
 */
export function MyComponent({ title, optional = false }: MyComponentProps) {
  return <View style={styles.container}>...</View>;
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.base,
  },
});
```

#### `src/screens/`

**One screen per route:**

```
screens/
├── auth/
│   ├── LoginScreen.tsx
│   ├── RegisterScreen.tsx
│   └── BiometricSetupScreen.tsx
├── home/
│   ├── HomeScreen.tsx
│   └── EnhancedHomeScreen.tsx
├── band/
│   ├── BandListScreen.tsx
│   ├── BandDetailsScreen.tsx
│   ├── CreateBandScreen.tsx
│   └── EditBandScreen.tsx
├── gig/
│   ├── GigListScreen.tsx
│   ├── GigDetailsScreen.tsx
│   └── CreateGigScreen.tsx
├── payment/
│   ├── PaymentLedgerScreen.tsx
│   ├── PaymentMethodsScreen.tsx
│   └── AddPaymentScreen.tsx
├── messaging/
│   ├── MessagesScreen.tsx
│   ├── ChatScreen.tsx
│   └── EncryptedChatScreen.tsx
├── profile/
│   ├── ProfileScreen.tsx
│   ├── EditProfileScreen.tsx
│   └── SettingsScreen.tsx
└── livekit/
    ├── VideoCallScreen.tsx
    ├── MeetRoomScreen.tsx
    └── ChatRoomScreen.tsx
```

**Screen Naming:**
- Suffix with `Screen`: `BandDetailsScreen.tsx`
- Export default: `export default function BandDetailsScreen() { }`
- Accept navigation props: `({ navigation, route }: any)`

**Screen Template:**
```typescript
// src/screens/band/BandDetailsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import theme from '../../theme';

export default function BandDetailsScreen({ navigation, route }: any) {
  const { bandId } = route.params;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Band Details</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  title: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
  },
});
```

#### `src/services/`

**Business logic, API calls, and integrations:**

```
services/
├── api.ts                   # HTTP client (axios)
├── AuthContext.tsx          # Authentication state
├── encryption.ts            # TweetNaCl E2EE
├── livekit.ts              # LiveKit integration
├── storage.ts              # SecureStore wrapper
├── validation.ts           # Input validation
├── notifications.ts        # Push notifications
├── payments.ts             # Payment processing
└── analytics.ts            # Analytics tracking
```

**Key Files:**

**`api.ts`** - HTTP Client
```typescript
import axios from 'axios';

const apiService = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 10000,
});

// Request interceptor (add auth token)
apiService.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiService;
```

**`AuthContext.tsx`** - Auth State
```typescript
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

**`encryption.ts`** - E2EE Service
```typescript
import nacl from 'tweetnacl';

class EncryptionService {
  generateKeyPair(): KeyPair { }
  encryptMessage(message: string, recipientPublicKey: string): EncryptedMessage { }
  decryptMessage(encrypted: EncryptedMessage, senderPublicKey: string): string { }
}

export const encryptionService = new EncryptionService();
```

**`livekit.ts`** - LiveKit Integration
```typescript
enum LiveKitInstance {
  MAIN = 'main',
  MEET = 'meet',
  CHAT = 'chat',
}

class LiveKitService {
  async connect(instance: LiveKitInstance, roomName: string): Promise<Room> { }
  async disconnect(): Promise<void> { }
}

export const liveKitService = new LiveKitService();
```

#### `src/theme/`

**Design system configuration:**

```
theme/
└── index.ts                 # Complete theme export
```

**Theme Structure:**
```typescript
export const theme = {
  colors: {
    primary: { 50: '...', 100: '...', ... 900: '...' },
    secondary: { ... },
    accent: { yellow: '...', orange: '...', ... },
    text: { primary: '...', secondary: '...', ... },
    background: { primary: '...', secondary: '...' },
    status: { booked: '...', pending: '...', ... },
  },
  gradients: {
    primary: ['#6366f1', '#8b5cf6'],
    secondary: ['#14b8a6', '#06b6d4'],
    ...
  },
  typography: {
    sizes: { xs: 12, sm: 14, base: 16, ... },
    fontWeights: { normal: '400', medium: '500', ... },
    lineHeights: { tight: 1.2, normal: 1.5, ... },
  },
  spacing: {
    xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, ...
  },
  borderRadius: {
    sm: 4, base: 8, md: 12, lg: 16, xl: 20, full: 9999,
  },
  shadows: {
    sm: { ... }, md: { ... }, lg: { ... },
  },
};

export default theme;
```

**Usage:**
```typescript
import theme from '../theme';

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.base,
    backgroundColor: theme.colors.primary[500],
    borderRadius: theme.borderRadius.lg,
  },
});
```

#### `src/types/`

**TypeScript type definitions:**

```
types/
├── index.ts                 # Main type exports
├── api.ts                   # API response types
├── models.ts                # Data models
└── navigation.ts            # Navigation types
```

**Example:**
```typescript
// types/models.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'artist' | 'venue' | 'studio' | 'admin';
  publicKey?: string;
  createdAt: string;
}

export interface Band {
  id: string;
  name: string;
  genre: string;
  memberIds: string[];
  ownerId: string;
  stats: {
    totalGigs: number;
    totalEarnings: number;
    activeSongs: number;
  };
}

export interface Gig {
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
  };
}
```

#### `src/utils/`

**Utility functions:**

```
utils/
├── date.ts                  # Date formatting
├── currency.ts              # Money formatting
├── validation.ts            # Input validation
└── helpers.ts               # Misc helpers
```

---

## 🔧 examples/backend/

**Example backend implementation (deployed to Digital Ocean):**

```
examples/backend/
├── src/
│   ├── index.ts            # Server entry point
│   ├── routes/             # API routes
│   │   ├── auth.ts        # /api/auth/*
│   │   ├── users.ts       # /api/users/*
│   │   ├── bands.ts       # /api/bands/*
│   │   ├── gigs.ts        # /api/gigs/*
│   │   ├── messages.ts    # /api/messages/*
│   │   ├── payments.ts    # /api/payments/*
│   │   └── livekit.ts     # /api/livekit/*
│   ├── middleware/         # Express middleware
│   │   ├── auth.ts        # JWT verification
│   │   ├── rateLimiter.ts # Rate limiting
│   │   └── errorHandler.ts
│   ├── utils/              # Utilities
│   │   ├── auth.ts        # JWT generation
│   │   ├── validation.ts  # Input sanitization
│   │   └── db.ts          # Database connection
│   └── types/              # TypeScript types
├── migrations/             # Database migrations
│   ├── migration_e2ee_public_keys.sql
│   └── migration_message_encryption_at_rest.sql
├── package.json
├── tsconfig.json
└── .env.example
```

**Key Backend Files:**

**`index.ts`** - Server Setup
```typescript
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import bandRoutes from './routes/bands';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/bands', bandRoutes);

app.listen(8787, () => console.log('Server running on 8787'));
```

**`routes/auth.ts`** - Authentication
```typescript
router.post('/register', async (req, res) => {
  // Hash password, create user, return token
});

router.post('/login', async (req, res) => {
  // Verify credentials, return token
});

router.post('/refresh', async (req, res) => {
  // Refresh access token
});
```

---

## 📚 docs/

**Comprehensive documentation:**

```
docs/
├── QUICK_START.md           # 5-minute setup
├── DEVELOPER_ONBOARDING.md  # New dev guide
├── PROJECT_STRUCTURE.md     # This file
├── ARCHITECTURE.md          # System design
├── API.md                   # API reference
├── COMPONENTS.md            # Component library
├── DOCUMENTATION_GUIDE.md   # Doc maintenance
├── features/                # Feature-specific docs
│   ├── AUTHENTICATION.md
│   ├── E2EE_MESSAGING.md
│   ├── PAYMENTS.md
│   └── FILE_UPLOADS.md
└── api/                     # API details
    ├── ROUTES.md
    ├── DATABASE.md
    └── TYPES.md
```

---

## 🎨 assets/

**Static assets:**

```
assets/
├── images/                  # App images
│   ├── logo.png
│   ├── icon.png
│   └── splash.png
├── fonts/                   # Custom fonts (if any)
└── audio/                   # Sound effects
```

---

## ⚙️ Configuration Files

### `package.json`

**Dependencies and scripts:**
```json
{
  "scripts": {
    "start": "expo start",
    "ios": "expo start --ios",
    "android": "expo start --android",
    "lint": "eslint src/",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react-native": "0.76.5",
    "expo": "^52.0.0",
    "@livekit/react-native": "^2.5.0",
    "tweetnacl": "^1.0.3"
  }
}
```

### `tsconfig.json`

**TypeScript configuration:**
```json
{
  "compilerOptions": {
    "strict": true,
    "target": "esnext",
    "module": "esnext",
    "jsx": "react-native",
    "moduleResolution": "node",
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"]
    }
  }
}
```

### `app.json`

**Expo configuration:**
```json
{
  "expo": {
    "name": "Artist Space",
    "slug": "artist-space",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": { "image": "./assets/splash.png" },
    "ios": { "bundleIdentifier": "com.artistspace.app" },
    "android": { "package": "com.artistspace.app" }
  }
}
```

---

## 🔍 Finding What You Need

### By Feature

| Feature | Components | Screens | Services |
|---------|-----------|---------|----------|
| **Auth** | `components/auth/` | `screens/auth/` | `services/AuthContext.tsx` |
| **Bands** | `components/band/` | `screens/band/` | `services/api.ts` |
| **Messaging** | `components/messaging/` | `screens/messaging/` | `services/encryption.ts` |
| **Payments** | `components/payment/` | `screens/payment/` | `services/payments.ts` |
| **Video** | - | `screens/livekit/` | `services/livekit.ts` |

### By Concern

| Concern | Location |
|---------|----------|
| **Styling** | `src/theme/index.ts` |
| **API Calls** | `src/services/api.ts` |
| **Navigation** | `src/navigation/` |
| **Types** | `src/types/` |
| **Utils** | `src/utils/` |
| **Constants** | Throughout files (consider centralizing) |

---

## 📏 File Naming Conventions

### Components
```
✅ GlassCard.tsx
✅ QuickAction.tsx
✅ AnimatedStat.tsx
❌ glassCard.tsx
❌ glass-card.tsx
```

### Screens
```
✅ BandDetailsScreen.tsx
✅ CreateGigScreen.tsx
❌ BandDetails.tsx
❌ bandDetailsScreen.tsx
```

### Services
```
✅ encryption.ts
✅ livekit.ts
✅ api.ts
❌ EncryptionService.ts
```

### Types
```
✅ models.ts
✅ api.ts
✅ navigation.ts
```

---

## 🎯 Best Practices

### File Organization

**1. Keep files focused:**
- One component per file
- Group related code
- Max ~300 lines per file

**2. Use barrel exports:**
```typescript
// components/common/index.ts
export * from './Button';
export * from './Card';
export * from './GlassCard';

// Usage:
import { Button, Card, GlassCard } from '../components/common';
```

**3. Co-locate related files:**
```
features/band/
├── BandCard.tsx
├── BandCard.test.tsx
├── BandCard.styles.ts
└── useBandData.ts
```

### Import Order

```typescript
// 1. External dependencies
import React from 'react';
import { View, Text } from 'react-native';

// 2. Internal modules
import { useAuth } from '../services/AuthContext';
import apiService from '../services/api';

// 3. Components
import { GlassCard } from '../components/common';

// 4. Utilities
import { formatDate } from '../utils/date';

// 5. Types
import type { Band } from '../types/models';

// 6. Styles
import theme from '../theme';
```

---

## 🚀 Next Steps

Now that you understand the structure:

1. **[Architecture Guide](./ARCHITECTURE.md)** - Understand system design
2. **[API Documentation](./API.md)** - Learn API endpoints
3. **[Component Guide](./COMPONENTS.md)** - Use existing components
4. **[Contributing](../CONTRIBUTING.md)** - Make your first change

---

**Questions?** See [Developer Onboarding](./DEVELOPER_ONBOARDING.md) or ask the team!

**Last Updated:** 2025-11-15
