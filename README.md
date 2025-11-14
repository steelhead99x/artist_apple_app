# Artist Space Mobile App

A cross-platform mobile application for **artist-space.com** built with React Native and Expo. Deploy to both iOS (App Store) and Android (Google Play Store) from a single codebase.

## Features

- Username/password authentication
- Biometric authentication (Face ID, Touch ID, Fingerprint)
- Camera & photo library access
- Push notifications support
- Secure credential storage
- Clean, native UI/UX

## Tech Stack

- **React Native** with **Expo**
- **TypeScript** for type safety
- **Expo Router** for navigation
- **Axios** for API calls
- **Expo SecureStore** for encrypted credential storage
- **React Navigation** for screen management

## Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- **For iOS development:**
  - macOS with Xcode installed
  - iOS Simulator or physical iPhone
- **For Android development:**
  - Android Studio with emulator
  - Or physical Android device

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm start
```

This opens Expo DevTools. From here you can:
- Press `i` to open iOS simulator
- Press `a` to open Android emulator
- Scan QR code with Expo Go app on your physical device

### 3. Run on Specific Platform

```bash
# iOS
npm run ios

# Android
npm run android

# Web (for testing)
npm run web
```

## Project Structure

```
artist_apple_app/
├── src/
│   ├── screens/          # App screens
│   │   ├── LoginScreen.tsx
│   │   └── HomeScreen.tsx
│   ├── services/         # API & Auth logic
│   │   ├── api.ts
│   │   └── AuthContext.tsx
│   ├── components/       # Reusable components
│   ├── types/           # TypeScript types
│   └── utils/           # Helper functions
├── assets/              # Images, fonts, etc.
├── App.tsx              # Main app entry
├── app.json             # Expo configuration
└── package.json
```

## Configuration

### API Endpoint

Edit `src/services/api.ts` to change the API endpoint:

```typescript
const API_BASE_URL = 'https://stage-www.artist-space.com/api';
// Change to: 'https://www.artist-space.com/api' for production
```

### App Branding

Edit `app.json` to customize:
- App name
- Bundle identifier (iOS: `ios.bundleIdentifier`, Android: `android.package`)
- Icons and splash screens
- Permissions

## Building for Production

### Option 1: Expo Application Services (EAS) - RECOMMENDED

EAS Build handles iOS and Android builds in the cloud (no need for Xcode/Android Studio).

#### Setup EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure project
eas build:configure
```

#### Build for iOS

```bash
# Build for App Store submission
eas build --platform ios

# Build for TestFlight (internal testing)
eas build --platform ios --profile preview
```

#### Build for Android

```bash
# Build AAB for Google Play Store
eas build --platform android

# Build APK for testing
eas build --platform android --profile preview
```

### Option 2: Local Builds

If you prefer building locally:

```bash
# iOS (requires macOS + Xcode)
expo prebuild
cd ios && pod install && cd ..
npx react-native run-ios --configuration Release

# Android
expo prebuild
cd android && ./gradlew assembleRelease
```

## Deployment

### iOS App Store

1. Build with EAS: `eas build --platform ios`
2. Download `.ipa` file from EAS dashboard
3. Upload to App Store Connect via Transporter app
4. Submit for App Store review

**Requirements:**
- Apple Developer Account ($99/year)
- App Store Connect setup
- App icons (1024x1024)
- Screenshots for various device sizes
- Privacy policy URL

### Android Google Play Store

1. Build with EAS: `eas build --platform android`
2. Download `.aab` file
3. Upload to Google Play Console
4. Complete store listing
5. Submit for review

**Requirements:**
- Google Play Developer Account ($25 one-time)
- Google Play Console setup
- App icons (512x512)
- Screenshots
- Privacy policy URL

## Environment Variables

Create a `.env` file for environment-specific config:

```bash
API_URL=https://stage-www.artist-space.com/api
APP_ENV=development
```

## Testing on Physical Devices

### During Development (Easiest)

1. Install **Expo Go** app on your phone (iOS/Android)
2. Run `npm start`
3. Scan QR code with your phone
4. App loads instantly - changes update in real-time!

### Production Builds

**iOS:**
- TestFlight: Upload build to App Store Connect → TestFlight
- Direct install: Use EAS development builds

**Android:**
- Internal testing: Upload to Play Console → Internal Testing
- Direct install: Share `.apk` file

## Native Features Included

- **Camera**: `expo-camera`
- **Image Picker**: `expo-image-picker`
- **Biometric Auth**: `expo-local-authentication`
- **Push Notifications**: `expo-notifications`
- **Secure Storage**: `expo-secure-store`

## Customization Guide

### Adding New Screens

1. Create screen in `src/screens/YourScreen.tsx`
2. Add to navigator in `App.tsx`

### Adding New API Endpoints

Add methods to `src/services/api.ts`:

```typescript
async getArtists() {
  return await this.get('/artists');
}
```

### Styling

- Uses React Native StyleSheet
- Consider adding a theme system in `src/utils/theme.ts`

## Troubleshooting

### iOS Build Issues
- Clear cache: `expo start -c`
- Reset CocoaPods: `cd ios && pod deintegrate && pod install`
- Ensure Xcode is up to date

### Android Build Issues
- Clear Gradle cache: `cd android && ./gradlew clean`
- Check Android Studio SDK is installed
- Verify ANDROID_HOME environment variable

### Metro Bundler Issues
```bash
# Clear all caches
expo start -c
rm -rf node_modules
npm install
```

## Maintenance Tips

Since you're new to mobile development:

1. **Keep it simple**: Avoid adding too many native modules
2. **Test on real devices**: Simulators don't catch everything
3. **Use EAS Build**: Avoids local build complexity
4. **Update regularly**: `expo upgrade` keeps dependencies current
5. **Monitor bundle size**: Keep app size under 50MB if possible

## Useful Commands

```bash
# Check Expo version
expo --version

# Update Expo SDK
expo upgrade

# Doctor (check for issues)
expo-doctor

# Clear cache
expo start -c

# View build logs
eas build:list
```

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [EAS Build Guide](https://docs.expo.dev/build/introduction/)
- [App Store Submission](https://developer.apple.com/app-store/submissions/)
- [Google Play Submission](https://support.google.com/googleplay/android-developer/answer/9859152)

## Next Steps

1. **Customize the API endpoints** in `src/services/api.ts` to match your backend
2. **Add your app icons** to `assets/` folder
3. **Test authentication** against stage-www.artist-space.com
4. **Add more screens** for your app features
5. **Set up EAS account** for building
6. **Create App Store/Play Store accounts** when ready to deploy

## Support

For issues:
- Check Expo documentation
- Search Stack Overflow
- Visit Expo Discord community
- Review React Native docs

## License

Private project for artist-space.com
