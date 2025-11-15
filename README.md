# Artist Space Mobile App

> A modern, feature-rich React Native mobile application for musicians, bands, studios, and venues to connect, collaborate, and manage bookings.

[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54.0-000020.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

## 📱 Overview

Artist Space is a comprehensive mobile platform that brings together the music community:

- **Artists & Bands**: Manage profiles, tours, bookings, and connect with venues
- **Recording Studios**: Showcase equipment, manage sessions, connect via LiveKit
- **Venues**: List events, manage bookings, handle payments
- **Booking Agents**: Manage multiple artists, track commissions
- **Managers**: Oversee artist careers and business operations

### 🌟 Key Features

- ✅ **Multi-Role Support** - 6 different user types with role-specific dashboards
- ✅ **End-to-End Encryption** - Secure messaging using TweetNaCl
- ✅ **Real-Time Communication** - LiveKit integration for video/audio/chat
- ✅ **Band Management** - Create, join, manage band members and media
- ✅ **Tour Booking** - Book venues, track payments, manage dates
- ✅ **Studio Sessions** - Remote recording with SonoBus/WebRTC/LiveKit
- ✅ **Payment Processing** - Stripe, PayPal, crypto wallet support
- ✅ **Subscription Management** - Tiered plans with feature gating
- ✅ **Secure Authentication** - JWT + biometric + PIN login

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Studio (for emulators)
- Backend API running (see `examples/backend/`)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd artist_apple_app

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
nano .env  # Set EXPO_PUBLIC_API_BASE_URL

# Start the development server
npm start
```

### Running on Different Platforms

```bash
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Web browser

# Start with cache clear
npm run start:clear

# Run proxy server (for CORS workaround)
npm run proxy

# Generate native projects (for LiveKit)
npm run prebuild
```

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical architecture, folder structure, patterns |
| [MAINTENANCE.md](./MAINTENANCE.md) | Ongoing maintenance, troubleshooting, updates |
| [BUG_FIXES.md](./BUG_FIXES.md) | Recent bug fixes and improvements |
| [TESTING.md](./TESTING.md) | Testing guide, best practices, and coverage |
| [BACKEND_REFERENCE_GUIDE.md](./BACKEND_REFERENCE_GUIDE.md) | Backend API reference |
| [LIVEKIT_INTEGRATION.md](./LIVEKIT_INTEGRATION.md) | LiveKit setup and usage |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Production deployment |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution guidelines |
| [CORS_FIX_GUIDE.md](./CORS_FIX_GUIDE.md) | CORS troubleshooting |

## 🏗️ Project Structure

```
artist_apple_app/
├── src/
│   ├── components/        # Reusable UI components
│   │   └── common/       # Common components (Button, Input, Card, ErrorBoundary)
│   ├── navigation/       # Navigation configuration
│   ├── screens/          # Screen components (18 screens)
│   ├── services/         # API services and business logic
│   ├── theme/            # Design system (theme, responsive, layout)
│   └── types/            # TypeScript type definitions
├── examples/backend/     # Backend reference implementation
├── assets/              # Images, icons, fonts
├── docs/archive/        # Archived old documentation
├── .env                 # Environment variables (not in git)
└── App.tsx              # Application entry point
```

## 🎨 Design System

### Theme System

Centralized design tokens for consistent UI:

```typescript
import theme from './src/theme';

// Colors
theme.colors.primary[500]      // Main brand color
theme.colors.text.primary      // Primary text color
theme.colors.status.booked     // Status-specific colors

// Typography
theme.typography.sizes.xl       // Font sizes
theme.typography.fontWeights.bold

// Spacing
theme.spacing.base             // 16px base unit
theme.spacing.xl               // 24px

// Shadows & Radius
theme.shadows.md               // Elevation shadow
theme.borderRadius.lg          // 16px radius
```

### Responsive Utilities

Build responsive layouts easily:

```typescript
import { responsive } from './src/theme/responsive';

// Get responsive values
const fontSize = responsive.responsiveFontSize(20);
const padding = responsive.screenPadding();

// Check breakpoints
if (responsive.isTablet()) {
  // Tablet-specific layout
}

// Responsive value selection
const columns = responsive.responsiveValue({
  xs: 1,
  md: 2,
  lg: 3,
});
```

### Layout Helpers

Pre-built layout patterns:

```typescript
import { layout } from './src/theme/layout';

const styles = StyleSheet.create({
  container: {
    ...layout.container.screen,
    ...layout.spacing.pBase,
  },
  title: {
    ...layout.text.h2,
  },
  row: {
    ...layout.flex.rowBetween,
  },
});
```

## 🔐 Security Features

- **E2EE Messaging**: TweetNaCl (X25519-XSalsa20-Poly1305)
- **Secure Storage**: Expo SecureStore (native) / localStorage (web)
- **JWT Authentication**: Secure token-based auth
- **Biometric Login**: Face ID / Touch ID support
- **PIN Code Login**: 6-digit PIN for quick access
- **Error Boundary**: Prevents app crashes from propagating
- **Rate Limiting**: Backend rate limiting on auth endpoints

## 🔌 API Integration

```typescript
// Configure in .env
EXPO_PUBLIC_API_BASE_URL=https://stage-www.artist-space.com/api

// Usage
import apiService from './src/services/api';

// Get data
const bands = await apiService.get<Band[]>('/bands');
const user = await apiService.getCurrentUser();

// Post data
const newBand = await apiService.post('/bands/create', bandData);

// Error handling
try {
  await apiService.login({ email, password });
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.message, error.status);
  }
}
```

## 📱 Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| iOS | ✅ Supported | Requires native build for LiveKit |
| Android | ✅ Supported | Requires native build for LiveKit |
| Web | ⚠️ Limited | No LiveKit, localStorage instead of SecureStore |

## 🐛 Troubleshooting

### CORS Errors (Web)

```bash
# Use the development proxy server
npm run proxy

# Update .env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001/api

# Restart Expo
npm start
```

### LiveKit Not Working

LiveKit requires a native build:

```bash
npm run prebuild
# Then use development builds or EAS
```

### Build Errors

```bash
# Clear cache
npm run start:clear
npx expo prebuild --clean

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Type Errors

```bash
# Check TypeScript compilation
npx tsc --noEmit

# Ensure types are installed
npm install --save-dev @types/react
```

See [MAINTENANCE.md](./MAINTENANCE.md) for detailed troubleshooting.

## 📦 Dependencies

### Core
- React 19.1.0 / React Native 0.81.5
- Expo SDK 54.0.0
- TypeScript 5.3.0

### Navigation
- @react-navigation/native 7.0.14
- @react-navigation/bottom-tabs 7.2.0
- @react-navigation/native-stack 7.2.0

### Real-Time & Media
- @livekit/react-native 2.5.0
- livekit-client 2.5.0
- expo-camera 17.0.9
- expo-image-picker 17.0.8

### Security & Auth
- axios 1.7.7
- tweetnacl 1.0.3
- expo-secure-store 15.0.7
- expo-local-authentication 17.0.7

See [package.json](./package.json) for complete list.

## 🚢 Deployment

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

## 📈 Recent Improvements (2025-11-15)

- ✅ Fixed 60+ bugs including critical E2EE messaging issue
- ✅ Improved TypeScript type safety (eliminated all 'any' types)
- ✅ Added React Error Boundary to prevent crashes
- ✅ Fixed memory leaks in multiple components
- ✅ Enhanced error handling across the app
- ✅ Added responsive design utilities and layout helpers
- ✅ Removed unused packages (expo-router, fbjs)
- ✅ Cleaned up and consolidated documentation
- ✅ Improved CORS configuration

See [BUG_FIXES.md](./BUG_FIXES.md) for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow TypeScript strict mode and use the design system
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is private and proprietary. All rights reserved.

## 🆘 Support

- **Issues**: Check [MAINTENANCE.md](./MAINTENANCE.md) for troubleshooting
- **Architecture**: Review [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API**: See [BACKEND_REFERENCE_GUIDE.md](./BACKEND_REFERENCE_GUIDE.md)

---

**Built with ❤️ for the music community**
