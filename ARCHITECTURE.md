# Architecture Documentation

This document describes the technical architecture, design patterns, and structure of the Artist Space mobile application.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Design Patterns](#design-patterns)
- [State Management](#state-management)
- [Navigation Architecture](#navigation-architecture)
- [API Layer](#api-layer)
- [Security Architecture](#security-architecture)
- [Theme System](#theme-system)
- [Component Architecture](#component-architecture)

---

## Overview

Artist Space is a React Native mobile application built with Expo, using TypeScript for type safety and following modern React patterns and best practices.

**Architecture Principles:**
- **Component-Based**: Modular, reusable components
- **Type-Safe**: Full TypeScript with strict mode
- **Service Layer Pattern**: Business logic separated from UI
- **Design System**: Centralized theme and styling
- **Error Handling**: Error boundaries and proper error propagation
- **Security-First**: E2EE, secure storage, proper authentication

---

## Technology Stack

### Core Framework
- **React Native** 0.81.5 - Cross-platform mobile framework
- **Expo** SDK 54.0.0 - Development and build tooling
- **TypeScript** 5.3.0 - Static typing
- **React** 19.1.0 - UI library

### Navigation
- **React Navigation** 7.x - Stack and tab navigation
- Bottom Tabs for main navigation
- Native Stack for screen transitions

### State Management
- **React Context API** - Authentication state
- **Component State** (useState, useReducer) - Local state
- **Service Layer** - Business logic and API calls

### Network & API
- **Axios** 1.7.7 - HTTP client with interceptors
- **Custom API Service** - Centralized API calls

###Real-Time Features
- **LiveKit** 2.5.0 - Video/audio/chat with E2EE
- **TweetNaCl** 1.0.3 - End-to-end encryption for messaging

### Storage
- **Expo SecureStore** - Native secure storage
- **localStorage** - Web fallback

### UI/UX
- **Expo Linear Gradient** - Gradient effects
- **@expo/vector-icons** - Icon library
- **Custom Design System** - Theme, responsive, layout utilities

---

## Project Structure

```
artist_apple_app/
├── App.tsx                    # Application entry point with ErrorBoundary
├── app.json                   # Expo configuration
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── .env                       # Environment variables
│
├── src/
│   ├── components/            # Reusable UI components
│   │   └── common/
│   │       ├── AnimatedStat.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── EmptyState.tsx
│   │       ├── ErrorBoundary.tsx    # React Error Boundary
│   │       ├── ErrorMessage.tsx
│   │       ├── GlassCard.tsx
│   │       ├── Input.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── QuickAction.tsx
│   │       ├── StatusBadge.tsx
│   │       └── index.ts             # Component exports
│   │
│   ├── navigation/
│   │   └── TabNavigator.tsx         # Bottom tab navigation
│   │
│   ├── screens/                     # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── ForgotPasswordScreen.tsx
│   │   ├── EnhancedHomeScreen.tsx
│   │   ├── DiscoverScreen.tsx
│   │   ├── MessagesScreen.tsx
│   │   ├── CalendarScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── MyBandsScreen.tsx
│   │   ├── CreateBandScreen.tsx
│   │   ├── JoinBandScreen.tsx
│   │   ├── BandDetailsScreen.tsx
│   │   ├── ManageMembersScreen.tsx
│   │   ├── ArtistDashboardScreen.tsx
│   │   ├── StudioDashboardScreen.tsx
│   │   ├── VenueDashboardScreen.tsx
│   │   └── PaymentLedgerScreen.tsx
│   │
│   ├── services/                    # Business logic layer
│   │   ├── api.ts                   # Core API service with Axios
│   │   ├── AuthContext.tsx          # Authentication context
│   │   ├── storage.ts               # Cross-platform storage
│   │   ├── encryption.ts            # TweetNaCl E2EE
│   │   ├── messages.ts              # E2EE messaging service
│   │   ├── livekit.ts               # LiveKit integration
│   │   ├── bands.ts                 # Band API operations
│   │   ├── tours.ts                 # Tour management
│   │   ├── studios.ts               # Studio operations
│   │   ├── venues.ts                # Venue operations
│   │   ├── payments.ts              # Payment processing
│   │   ├── subscriptions.ts         # Subscription management
│   │   ├── admin.ts                 # Admin operations
│   │   └── index.ts                 # Service exports
│   │
│   ├── theme/                       # Design system
│   │   ├── index.ts                 # Theme tokens
│   │   ├── responsive.ts            # Responsive utilities
│   │   └── layout.ts                # Layout helpers
│   │
│   └── types/
│       └── index.ts                 # TypeScript type definitions (700+ lines)
│
├── examples/backend/                # Backend reference implementation
│   ├── src/
│   │   ├── routes/                  # API route handlers
│   │   ├── services/                # Payment services
│   │   ├── utils/                   # Utilities
│   │   └── index.ts                 # Server entry point
│   └── database/                    # SQL schema and migrations
│
├── assets/                          # Static assets
│   ├── images/
│   ├── icons/
│   └── splash.png
│
└── docs/                            # Documentation
    └── archive/                     # Archived old docs
```

---

## Design Patterns

### 1. Service Layer Pattern

Business logic is separated from UI components:

```typescript
// Service layer handles all API communication
class BandService {
  async getAllBands(): Promise<Band[]> {
    return await apiService.get('/bands');
  }

  async createBand(data: CreateBandData): Promise<Band> {
    return await apiService.post('/bands/create', data);
  }
}

// Component uses the service
const MyBandsScreen = () => {
  const [bands, setBands] = useState<Band[]>([]);

  useEffect(() => {
    const loadBands = async () => {
      const data = await bandService.getAllBands();
      setBands(data);
    };
    loadBands();
  }, []);

  return <View>...</View>;
};
```

### 2. Composition Pattern

Components are composed from smaller, reusable pieces:

```typescript
// Small, focused components
<Card>
  <Card.Header>
    <StatusBadge status="active" />
  </Card.Header>
  <Card.Content>
    <Text>Band Name</Text>
  </Card.Content>
</Card>
```

### 3. Container/Presentational Pattern

Screens (containers) fetch data and pass to presentational components:

```typescript
// Container
const MyBandsScreen = () => {
  const [bands, setBands] = useState([]);
  // ... data fetching logic

  return <BandList bands={bands} onBandPress={handlePress} />;
};

// Presentational
const BandList = ({ bands, onBandPress }) => (
  <FlatList data={bands} renderItem={({item}) => (
    <BandCard band={item} onPress={() => onBandPress(item)} />
  )} />
);
```

### 4. HOC/Wrapper Pattern

Error boundary wraps the entire app:

```typescript
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ErrorBoundary>
  );
}
```

---

## State Management

### Authentication State

Managed via React Context:

```typescript
// AuthContext.tsx
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ... authentication logic

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

### Component State

Local state for UI-specific data:

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState<Band[]>([]);
```

### Service Layer State

API calls return data directly, no global state store:

```typescript
const bands = await bandService.getAllBands();
```

---

## Navigation Architecture

### Stack Navigator

Top-level navigation between authenticated and unauthenticated flows:

```typescript
<NavigationContainer>
  <Stack.Navigator>
    {!isAuthenticated ? (
      <>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </>
    ) : (
      <Stack.Screen name="Main" component={TabNavigator} />
    )}
  </Stack.Navigator>
</NavigationContainer>
```

### Tab Navigator

Bottom tabs for main app sections:

```typescript
<Tab.Navigator>
  <Tab.Screen name="Home" component={EnhancedHomeScreen} />
  <Tab.Screen name="Discover" component={DiscoverScreen} />
  <Tab.Screen name="Messages" component={MessagesScreen} />
  <Tab.Screen name="Calendar" component={CalendarScreen} />
  <Tab.Screen name="Profile" component={ProfileScreen} />
</Tab.Navigator>
```

---

## API Layer

### API Service Architecture

Centralized HTTP client with interceptors:

```typescript
class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
    });

    // Add auth token to all requests
    this.client.interceptors.request.use(async (config) => {
      const token = await getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors globally
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await deleteItemAsync('authToken');
        }
        throw new ApiError(error.message, error.response?.status);
      }
    );
  }
}
```

### Service Methods

Domain-specific services wrap API calls:

```typescript
// bands.ts
async createBand(data: CreateBandData): Promise<Band> {
  return await apiService.post('/bands/create', data);
}

// messages.ts
async sendMessage(data: SendMessageData): Promise<Message> {
  const encrypted = await encryptMessage(data.content);
  return await apiService.post('/messages', encrypted);
}
```

---

## Security Architecture

### End-to-End Encryption (E2EE)

Messages are encrypted client-side using TweetNaCl:

```typescript
// Generate key pair
const keyPair = nacl.box.keyPair();

// Encrypt message
const encrypted = nacl.box(
  messageUint8,
  nonceUint8,
  recipientPublicKey,
  senderSecretKey
);

// Decrypt message
const decrypted = nacl.box.open(
  ciphertext,
  nonce,
  senderPublicKey,
  recipientSecretKey
);
```

### Secure Storage

Platform-specific secure storage:

```typescript
// Native: Uses iOS Keychain / Android Keystore
await SecureStore.setItemAsync('authToken', token);

// Web: Uses localStorage (less secure)
localStorage.setItem('authToken', token);
```

### Authentication Flow

1. User logs in with email/password or PIN
2. Backend validates credentials
3. Backend returns JWT token
4. Token stored in SecureStore
5. Token added to all API requests via interceptor
6. Token validated on backend for protected routes

---

## Theme System

### Theme Tokens

Centralized design tokens:

```typescript
export const theme = {
  colors: {
    primary: { 500: '#6366f1', ... },
    text: { primary: '#0f172a', ... },
  },
  typography: {
    sizes: { base: 16, xl: 20, ... },
    fontWeights: { bold: '700', ... },
  },
  spacing: { base: 16, xl: 24, ... },
  borderRadius: { lg: 16, ... },
  shadows: { md: { /* shadow props */ }, ... },
};
```

### Responsive Utilities

Screen-size aware helpers:

```typescript
// Get current breakpoint
const breakpoint = responsive.getCurrentBreakpoint();

// Responsive values
const columns = responsive.responsiveValue({
  xs: 1,
  md: 2,
  lg: 3,
});

// Platform-specific values
const padding = responsive.platformValue({
  ios: 20,
  android: 16,
  web: 24,
});
```

### Layout Helpers

Pre-built style patterns:

```typescript
const styles = StyleSheet.create({
  container: {
    ...layout.flex.flex1,
    ...layout.spacing.pBase,
  },
  title: {
    ...layout.text.h2,
  },
});
```

---

## Component Architecture

### Common Components

Reusable UI building blocks in `src/components/common/`:

- **Button**: Primary, secondary, outline variants
- **Input**: Text input with validation
- **Card**: Container with elevation
- **LoadingSpinner**: Loading indicator
- **ErrorMessage**: Error display
- **StatusBadge**: Colored status indicator
- **EmptyState**: Empty list placeholder
- **GlassCard**: Glassmorphism card effect
- **ErrorBoundary**: React error boundary

### Screen Components

Full-screen views in `src/screens/`:

- Follow consistent structure: hooks → handlers → render
- Use service layer for data fetching
- Implement error handling and loading states
- Use common components for UI

### Component Lifecycle

```typescript
const MyScreen = () => {
  // 1. State
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 2. Effects
  useEffect(() => {
    loadData();
    return () => cleanup(); // Cleanup function
  }, [dependency]);

  // 3. Handlers
  const handlePress = () => {
    // Handle user action
  };

  // 4. Render
  if (loading) return <LoadingSpinner />;
  return <View>...</View>;
};
```

---

## Best Practices

### TypeScript
- Use strict mode
- Avoid `any` types
- Define interfaces for all data structures
- Use proper typing for API responses

### Error Handling
- Always use try-catch for async operations
- Use Error Boundary for component errors
- Provide meaningful error messages to users
- Log errors for debugging

### Performance
- Use `useCallback` and `useMemo` appropriately
- Implement list virtualization for long lists
- Clean up timers and listeners in useEffect cleanup
- Avoid unnecessary re-renders

### Security
- Never store sensitive data in plain text
- Validate all user inputs
- Use HTTPS for all API calls
- Implement proper authentication and authorization

### Code Organization
- One component per file
- Group related files in folders
- Use index.ts for clean exports
- Follow consistent naming conventions

---

## Further Reading

- [MAINTENANCE.md](./MAINTENANCE.md) - Troubleshooting and updates
- [BUG_FIXES.md](./BUG_FIXES.md) - Recent improvements
- [BACKEND_REFERENCE_GUIDE.md](./BACKEND_REFERENCE_GUIDE.md) - API documentation
- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [React Navigation Docs](https://reactnavigation.org/)
