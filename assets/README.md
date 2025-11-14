# Assets Directory

Place your app assets here:

## Required Assets

### App Icon
- **icon.png** - 1024x1024px PNG (no transparency)
- Used for iOS and Android app icons
- Should be your Artist Space logo

### Splash Screen
- **splash.png** - 2048x2048px PNG
- Shown when app launches
- Keep important content in center 1000x1000px area

### Android Adaptive Icon
- **adaptive-icon.png** - 1024x1024px PNG
- Android-specific adaptive icon
- Keep logo centered in middle 768x768px

### Notification Icon (Android)
- **notification-icon.png** - 96x96px PNG (white on transparent)
- Used for push notifications on Android

### Favicon
- **favicon.png** - 48x48px PNG
- Used for web version

## Creating Icons

Use these tools to generate icons:

1. **Figma** or **Adobe Illustrator** for design
2. **Expo Icon Generator**: https://icon.kitchen/
3. **App Icon Generator**: https://www.appicon.co/

## Temporary Solution

For now, you can use Expo's default icons while developing. The app will work fine without custom icons during development.

When you're ready for production, replace these files with your branded assets.

## Quick Icon Setup

If you have a square logo (PNG or SVG):

```bash
# Use Expo's icon generator
npx expo-icon --icon-path ./your-logo.png
```

This auto-generates all required icon sizes!
