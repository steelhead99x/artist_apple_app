# Maintenance Guide

This guide covers ongoing maintenance tasks, troubleshooting, updates, and best practices for maintaining the Artist Space mobile application.

## Table of Contents

- [Daily/Weekly Tasks](#dailyweekly-tasks)
- [Updating Dependencies](#updating-dependencies)
- [Troubleshooting](#troubleshooting)
- [Common Issues](#common-issues)
- [Performance Monitoring](#performance-monitoring)
- [Security Updates](#security-updates)
- [Database Maintenance](#database-maintenance)
- [Backup Procedures](#backup-procedures)

---

## Daily/Weekly Tasks

### Daily Checks
- Monitor error logs (check Error Boundary triggers)
- Review API error rates
- Check authentication success rates
- Monitor LiveKit connection success

### Weekly Tasks
- Update npm dependencies (patch versions)
- Review and address security advisories
- Check for Expo SDK updates
- Review and merge dependabot PRs
- Clean up old branches
- Review analytics/crash reports

### Monthly Tasks
- Major dependency updates (minor/major versions)
- Performance review
- Security audit
- Database cleanup
- Review and update documentation

---

## Updating Dependencies

### Update Expo SDK

```bash
# Check for Expo updates
expo upgrade

# Or manually update
npm install expo@latest

# Update all Expo packages
expo install --fix
```

### Update React Native

⚠️ **IMPORTANT**: React Native updates can be breaking. Always test thoroughly.

```bash
# Check compatibility with Expo
# Expo SDK 54 → React Native 0.81

# Update package.json, then:
npm install
npx expo prebuild --clean
```

### Update Other Dependencies

```bash
# Check for outdated packages
npm outdated

# Update all patch and minor versions
npm update

# Update specific package
npm install package-name@latest

# Update dev dependencies
npm install --save-dev @types/react@latest

# Remove unused dependencies
npm prune
```

### Testing After Updates

```bash
# Type check
npx tsc --noEmit

# Clear cache
npm run start:clear

# Test on all platforms
npm run ios
npm run android
npm run web

# Build test
npm run prebuild
```

---

## Troubleshooting

### Metro Bundler Issues

```bash
# Clear Metro cache
npx expo start --clear

# Reset everything
watchman watch-del-all
rm -rf node_modules
rm -rf .expo
rm -rf ios/Pods
rm -rf ios/build
rm -rf android/build
npm install
npx expo prebuild --clean
```

### Build Errors

**iOS Build Fails:**
```bash
# Clear derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Reinstall pods
cd ios && pod deintegrate && pod install && cd ..

# Clean build
xcodebuild clean -workspace ios/YourApp.xcworkspace -scheme YourApp
```

**Android Build Fails:**
```bash
# Clean gradle
cd android && ./gradlew clean && cd ..

# Clear gradle cache
rm -rf ~/.gradle/caches
```

### TypeScript Errors

```bash
# Regenerate types
npm install --save-dev @types/react@latest @types/react-native@latest

# Check configuration
npx tsc --showConfig

# Type check only
npx tsc --noEmit

# If types are outdated
rm -rf node_modules
npm install
```

### CORS Errors (Web Platform)

**Solution 1: Use Proxy Server**
```bash
# Terminal 1: Run proxy
npm run proxy

# Terminal 2: Run app
npm start

# Update .env
EXPO_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

**Solution 2: Update Backend CORS**
```bash
# In backend/.env
CORS_ORIGIN=http://localhost:5173,http://localhost:19006,http://localhost:3001
```

**Solution 3: Use Native Platforms**
```bash
# CORS doesn't affect native platforms
npm run ios
npm run android
```

### LiveKit Issues

**LiveKit Not Connecting:**
1. Check LIVEKIT_URL in .env
2. Verify LiveKit credentials are correct
3. Ensure you're using a native build (not Expo Go)
4. Check network connectivity
5. Review LiveKit dashboard for errors

**E2EE Not Working:**
```typescript
// Check encryption is enabled
EXPO_PUBLIC_LIVEKIT_E2EE_ENABLED=true

// Verify key pair exists
const keyPair = await encryptionService.getStoredKeyPair();
console.log(keyPair ? 'Keys found' : 'No keys');
```

### Authentication Issues

**Token Expired:**
```typescript
// Tokens expire after 1 day
// User needs to log in again
await apiService.logout();
navigation.navigate('Login');
```

**SecureStore Not Working:**
```bash
# On iOS Simulator, SecureStore might fail
# Use real device or enable keychain sharing in Xcode
```

**Biometric Auth Failing:**
```bash
# Check permissions in app.json
"ios": {
  "infoPlist": {
    "NSFaceIDUsageDescription": "Use Face ID to login"
  }
}
```

---

## Common Issues

### Issue: "Cannot find module 'expo-router'"

**Solution:**
```bash
# expo-router was removed as it's not used
npm install
# If persists, clear cache
rm -rf node_modules
npm install
```

### Issue: "Network request failed"

**Causes:**
1. API server not running
2. Wrong API_BASE_URL in .env
3. CORS issues (web only)
4. Network connectivity

**Debug:**
```typescript
// Check API URL
console.log(process.env.EXPO_PUBLIC_API_BASE_URL);

// Test API directly
curl https://your-api-url.com/api/health

// Check network
import NetInfo from '@react-native-community/netinfo';
const state = await NetInfo.fetch();
console.log(state.isConnected);
```

### Issue: "Cannot read property 'nonce' of undefined"

**Solution:**
This was fixed in BUG_FIXES.md. Ensure Message type has `nonce` field:

```typescript
export interface Message {
  encrypted_content: string;
  nonce?: string; // Added
  // ...
}
```

### Issue: Memory Warnings / App Crashes

**Solutions:**
1. Check for memory leaks in useEffect
2. Verify cleanup functions exist
3. Remove circular references
4. Optimize images (compress, use appropriate sizes)
5. Implement list virtualization for long lists

```typescript
// Always cleanup
useEffect(() => {
  const timer = setTimeout(() => {}, 1000);
  return () => clearTimeout(timer); // Cleanup
}, []);
```

### Issue: Slow Performance

**Optimization Checklist:**
- [ ] Use React.memo for expensive components
- [ ] Implement useCallback for functions passed as props
- [ ] Use useMemo for expensive calculations
- [ ] Virtualize long lists (FlatList with windowSize)
- [ ] Optimize images (use appropriate formats and sizes)
- [ ] Debounce search inputs
- [ ] Lazy load components
- [ ] Profile with React DevTools

---

## Performance Monitoring

### Enable Performance Monitoring

```typescript
// Add to App.tsx
import {enablePerformanceMonitoring} from './src/utils/performance';

if (__DEV__) {
  enablePerformanceMonitoring();
}
```

### Monitor Render Performance

```typescript
import { Profiler } from 'react';

<Profiler id="MyComponent" onRender={(id, phase, actualDuration) => {
  if (actualDuration > 16) {
    console.warn(`${id} took ${actualDuration}ms to render`);
  }
}}>
  <MyComponent />
</Profiler>
```

### Network Performance

```typescript
// Monitor API response times
const start = Date.now();
const result = await apiService.get('/bands');
console.log(`API call took ${Date.now() - start}ms`);
```

---

## Security Updates

### Security Checklist

**Monthly:**
- [ ] Run npm audit
- [ ] Check for security advisories
- [ ] Update dependencies with security patches
- [ ] Review authentication logs
- [ ] Check for unauthorized API access attempts

**After Each Release:**
- [ ] Run security scan
- [ ] Review error logs for security issues
- [ ] Check SSL/TLS certificates
- [ ] Verify API rate limiting is working

### Running Security Audit

```bash
# Check for vulnerabilities
npm audit

# Auto-fix (only patch and minor)
npm audit fix

# Show detailed report
npm audit --json

# Check specific package
npm audit package-name
```

### Updating Security Dependencies

```bash
# Critical updates
npm update tweetnacl tweetnacl-util axios

# Check Expo security updates
expo install --fix
```

---

## Database Maintenance

### Backend Database Tasks

```bash
# Run migrations
cd examples/backend
node src/scripts/run-migrations.js

# Backup database
pg_dump -U user -d streaming_portfolio > backup_$(date +%Y%m%d).sql

# Vacuum database (monthly)
psql -U user -d streaming_portfolio -c "VACUUM ANALYZE;"

# Check database size
psql -U user -d streaming_portfolio -c "SELECT pg_database_size(current_database());"
```

### Clean Up Old Data

```sql
-- Delete old login PINs (older than 1 hour)
DELETE FROM login_pins WHERE created_at < NOW() - INTERVAL '1 hour';

-- Delete old password reset tokens (older than 24 hours)
DELETE FROM password_resets WHERE created_at < NOW() - INTERVAL '24 hours';

-- Archive old messages (older than 1 year)
INSERT INTO messages_archive SELECT * FROM messages WHERE created_at < NOW() - INTERVAL '1 year';
DELETE FROM messages WHERE created_at < NOW() - INTERVAL '1 year';
```

---

## Backup Procedures

### Code Backup

```bash
# Git is your backup
git push origin main

# Tag releases
git tag -a v1.0.0 -m "Release 1.0.0"
git push --tags

# Create archive
git archive --format=zip HEAD > backup_$(date +%Y%m%d).zip
```

### Database Backup

```bash
# Daily backup (automate with cron)
pg_dump -U user -d streaming_portfolio | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore from backup
gunzip < backup_20250115.sql.gz | psql -U user -d streaming_portfolio
```

### Environment Variables Backup

```bash
# Backup .env files (NEVER commit to git)
cp .env .env.backup_$(date +%Y%m%d)
cp examples/backend/.env examples/backend/.env.backup_$(date +%Y%m%d)

# Store securely (use password manager or encrypted storage)
```

---

## Development Best Practices

### Before Pushing Code

```bash
# 1. Type check
npx tsc --noEmit

# 2. Test on all platforms
npm run ios
npm run android
npm run web

# 3. Check for console logs
grep -r "console.log" src/

# 4. Review changes
git diff

# 5. Commit with meaningful message
git commit -m "feat: Add responsive layout utilities"
```

### Code Review Checklist

- [ ] TypeScript types are correct
- [ ] No `any` types used
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] useEffect cleanup functions exist
- [ ] Components are responsive
- [ ] Following design system
- [ ] No console.log in production code
- [ ] Tests added (when test suite exists)
- [ ] Documentation updated

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: Add my feature"

# Push and create PR
git push origin feature/my-feature

# After merge, clean up
git checkout main
git pull
git branch -d feature/my-feature
```

---

## Monitoring Tools

### Recommended Tools

**Error Tracking:**
- Sentry - Real-time error tracking
- Bugsnag - Error monitoring

**Analytics:**
- Google Analytics for Firebase
- Mixpanel - User analytics

**Performance:**
- React Native Performance Monitor
- Flipper - Debugging tool

**Backend Monitoring:**
- PM2 - Process manager with monitoring
- New Relic - APM
- Datadog - Infrastructure monitoring

---

## Emergency Procedures

### App is Crashing

1. Check Error Boundary logs
2. Rollback to previous version
3. Hotfix and deploy

### API is Down

1. Check backend server status
2. Check database connection
3. Review error logs
4. Restart backend services
5. If critical, enable maintenance mode

### Security Breach

1. Immediately revoke compromised tokens
2. Reset JWT secret
3. Force all users to re-authenticate
4. Review audit logs
5. Patch vulnerability
6. Deploy hotfix
7. Notify users if necessary

---

## Getting Help

### Resources

- **React Native Docs**: https://reactnative.dev/
- **Expo Docs**: https://docs.expo.dev/
- **React Navigation**: https://reactnavigation.org/
- **LiveKit Docs**: https://docs.livekit.io/

### Internal Documentation

- [README.md](./README.md) - Getting started
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture
- [BUG_FIXES.md](./BUG_FIXES.md) - Recent fixes
- [CONTRIBUTING.md](./CONTRIBUTING.md) - How to contribute

### Support Channels

- GitHub Issues - For bugs and feature requests
- Development Team - For urgent issues
- Documentation - Check relevant docs first

---

**Last Updated:** 2025-11-15

**Maintained by:** Development Team

For questions or improvements to this guide, please submit a PR.
