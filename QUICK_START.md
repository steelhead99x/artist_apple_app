# Quick Start Guide

Get your Artist Space mobile app running in 5 minutes!

## Step 1: Install Dependencies (2 minutes)

bB%47hugIiPSGxBJ

```bash
npm install
```

This installs all required packages for React Native, Expo, and native features.

## Step 2: Start the Development Server (30 seconds)

```bash
npm start
```

You'll see a QR code and menu options in your terminal.

## Step 3: Run on Your Device (2 minutes)

### Option A: Physical Device (Easiest!)

1. Download **Expo Go** app:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Scan the QR code from step 2
3. App loads on your phone!

### Option B: Simulator/Emulator

**iOS (macOS only):**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

## Step 4: Test the App

1. The login screen should appear
2. Try entering any credentials
3. Check the console for API calls
4. Test biometric auth if available on your device

## Troubleshooting

**Can't scan QR code?**
- Make sure your phone and computer are on the same WiFi
- Try pressing `w` to open web version first

**Metro bundler errors?**
```bash
npm start -c  # Clear cache
```

**Still stuck?**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Restart: `npm start`

## Next Steps

1. **Update API endpoint** in `src/services/api.ts` to your backend
2. **Test authentication** with real credentials
3. **Customize screens** in `src/screens/`
4. **Add features** you need

## Common Development Tasks

**Clear cache:**
```bash
npm start -- --clear
```

**Update dependencies:**
```bash
npx expo install --fix
```

**Check for issues:**
```bash
npx expo-doctor
```

## Building for Production

When ready to deploy:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

See `README.md` for full deployment guide!

## Resources

- Full documentation: `README.md`
- API integration: `API_INTEGRATION.md`
- Expo docs: https://docs.expo.dev/
- React Native docs: https://reactnative.dev/

## Need Help?

1. Check the main README.md
2. Search [Expo forums](https://forums.expo.dev/)
3. Check [Stack Overflow](https://stackoverflow.com/questions/tagged/expo)
4. Review error messages carefully - they're usually helpful!
