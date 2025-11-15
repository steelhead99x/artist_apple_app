# Quick Start Guide
## Get Artist Space Running in 5 Minutes

This guide will get you up and running with the Artist Space mobile app as quickly as possible.

---

## Prerequisites

- **Node.js** 18+ installed ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **Expo CLI** (will be installed automatically)
- **iOS Simulator** (Mac only) or **Android Emulator**
- **Git** for version control

---

## Step 1: Clone & Install (2 minutes)

```bash
# Clone the repository
git clone https://github.com/your-org/artist_apple_app.git
cd artist_apple_app

# Install dependencies
npm install

# This installs all frontend dependencies including:
# - React Native 0.76.5
# - Expo SDK 52.0
# - LiveKit Client SDK
# - TweetNaCl for encryption
```

---

## Step 2: Configure Environment (1 minute)

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your values
# Minimum required:
# - EXPO_PUBLIC_API_BASE_URL (your backend URL)
# - EXPO_PUBLIC_LIVEKIT_URL (main LiveKit instance)
```

**Quick .env setup:**
```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:8787/api
EXPO_PUBLIC_LIVEKIT_URL=wss://your-livekit.livekit.cloud
EXPO_PUBLIC_LIVEKIT_MEET_URL=wss://meet.artist-space.com
EXPO_PUBLIC_LIVEKIT_CHAT_URL=wss://chat.artist-space.com
EXPO_PUBLIC_LIVEKIT_E2EE_ENABLED=true
```

---

## Step 3: Start the App (1 minute)

```bash
# Start the Expo development server
npm start

# Or use specific platform:
npm run ios      # iOS Simulator (Mac only)
npm run android  # Android Emulator
npm run web      # Web browser (limited functionality)
```

**What happens:**
1. Expo bundler starts
2. QR code appears in terminal
3. Scan QR with Expo Go app (iOS/Android)
4. App loads on your device

---

## Step 4: Set Up Backend (Optional, 1 minute)

If you need the backend running locally:

```bash
cd examples/backend

# Install backend dependencies
npm install

# Configure backend environment
cp .env.example .env
# Edit .env with your database URL and LiveKit credentials

# Start backend server
npm run dev

# Backend runs on http://localhost:8787
```

---

## Step 5: Test Basic Features

### Create Account
1. Open app
2. Tap "Register"
3. Enter email and password
4. Tap "Create Account"

### Explore Features
1. **Home Screen** - View dashboard with bands and gigs
2. **Quick Actions** - Tap "Create Band" to start
3. **Messages** - Access encrypted messaging
4. **Payments** - View payment ledger
5. **Live Session** - Start video call with LiveKit

---

## Troubleshooting

### App won't start
```bash
# Clear cache and restart
npm start -- --clear
```

### "Network request failed"
- Check your `.env` file has correct `EXPO_PUBLIC_API_BASE_URL`
- Ensure backend is running if testing locally
- Try `http://10.0.2.2:8787/api` for Android emulator

### Dependencies issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### iOS build errors
```bash
# Clean iOS build
cd ios
pod install
cd ..
npm run ios
```

### Android build errors
```bash
# Clean Android build
cd android
./gradlew clean
cd ..
npm run android
```

---

## Next Steps

Now that you're running:

1. **[Developer Onboarding](./DEVELOPER_ONBOARDING.md)** - Learn the codebase
2. **[Project Structure](./PROJECT_STRUCTURE.md)** - Understand organization
3. **[Architecture](./ARCHITECTURE.md)** - System design overview
4. **[Contributing](../CONTRIBUTING.md)** - Make your first contribution

---

## Quick Reference

### Common Commands
```bash
npm start              # Start development server
npm run ios            # Run on iOS
npm run android        # Run on Android
npm run lint           # Check code quality
npm run type-check     # TypeScript validation
```

### Important Files
- `.env` - Environment configuration
- `App.tsx` - Main application entry
- `src/screens/` - App screens
- `src/components/` - Reusable components
- `src/services/` - Business logic

### Key URLs
- **App**: `http://localhost:8081`
- **Backend**: `http://localhost:8787`
- **Docs**: `/docs/` directory

---

## Getting Help

- **Documentation**: Start with [README.md](../README.md)
- **Issues**: Check existing issues on GitHub
- **Team**: Ask in team chat
- **Stuck?**: See [Troubleshooting Guide](./TROUBLESHOOTING.md)

---

**You're ready to build!** 🚀

Check out the [Developer Onboarding Guide](./DEVELOPER_ONBOARDING.md) to learn how to build your first feature.

---

**Last Updated:** 2025-11-15
