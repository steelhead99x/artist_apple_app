# Developer Onboarding Guide
## Welcome to Artist Space Development

This guide will help you become productive with the Artist Space codebase quickly.

---

## 📋 Day 1: Environment & Orientation

### Set Up Your Development Environment

**1. Install Required Tools:**
```bash
# Node.js 18+ (check version)
node --version  # Should be 18.x or higher

# Install global tools
npm install -g expo-cli
npm install -g typescript

# Clone and setup project
git clone <repository-url>
cd artist_apple_app
npm install
cp .env.example .env
```

**2. Configure Your IDE:**

**VS Code (Recommended):**
```bash
# Install recommended extensions
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension bradlc.vscode-tailwindcss
```

**3. Run the App:**
```bash
npm start
# Press 'i' for iOS, 'a' for Android
```

### Orientation Checklist

- [ ] Read [README.md](../README.md)
- [ ] Review [Project Structure](./PROJECT_STRUCTURE.md)
- [ ] Skim [Architecture Overview](./ARCHITECTURE.md)
- [ ] Browse [Component Library](./COMPONENTS.md)
- [ ] Check [Security Guide](../SECURITY_IMPLEMENTATION_GUIDE.md)
- [ ] Review [Contributing Guidelines](../CONTRIBUTING.md)

---

## 📚 Day 2-3: Understanding the Codebase

### Architecture Overview

**Tech Stack:**
- **Frontend**: React Native 0.76.5 + Expo SDK 52.0
- **Language**: TypeScript 5.3
- **State**: React Context API
- **Navigation**: React Navigation
- **Styling**: StyleSheet API + Theme System
- **Real-time**: LiveKit (3 instances)
- **Encryption**: TweetNaCl + LiveKit E2EE

**Backend:**
- **Runtime**: Node.js 18+ on Digital Ocean
- **Framework**: Express 4.21
- **Database**: PostgreSQL (Digital Ocean Managed)
- **Auth**: JWT (1-day access, 30-day refresh)
- **Security**: Bcrypt, rate limiting, input sanitization

### Project Structure Deep Dive

```
src/
├── components/          # Reusable UI components
│   └── common/         # Shared components (Button, Card, etc.)
├── screens/            # App screens (one per route)
├── services/           # Business logic & API calls
│   ├── api.ts         # HTTP client
│   ├── AuthContext.tsx # Auth state management
│   ├── encryption.ts   # TweetNaCl E2EE
│   └── livekit.ts     # LiveKit integration
├── theme/              # Design system
│   └── index.ts       # Colors, typography, spacing
├── types/              # TypeScript definitions
└── navigation/         # Navigation configuration
```

**Key Files to Understand:**
1. `App.tsx` - Application entry point
2. `src/services/AuthContext.tsx` - Authentication state
3. `src/services/api.ts` - HTTP client with interceptors
4. `src/theme/index.ts` - Design system
5. `src/services/encryption.ts` - E2EE implementation

### Code Patterns

**1. Component Structure:**
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../theme';

interface MyComponentProps {
  title: string;
  onPress?: () => void;
}

/**
 * My Component description
 *
 * @component
 * @example
 * <MyComponent title="Hello" onPress={handlePress} />
 */
export function MyComponent({ title, onPress }: MyComponentProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.base,
    backgroundColor: theme.colors.background.primary,
  },
  title: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.text.primary,
  },
});
```

**2. API Calls:**
```typescript
import apiService from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
}

async function fetchUser(userId: string): Promise<User> {
  try {
    const response = await apiService.get<User>(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}
```

**3. Auth Context Usage:**
```typescript
import { useAuth } from '../services/AuthContext';

function MyScreen() {
  const { user, login, logout } = useAuth();

  if (!user) {
    return <LoginPrompt />;
  }

  return <Dashboard user={user} />;
}
```

---

## 🎯 Day 4-5: First Contribution

### Choose a Good First Issue

**Beginner-Friendly Tasks:**
- Add JSDoc comments to undocumented functions
- Fix TypeScript strict mode issues
- Add unit tests for utilities
- Improve accessibility labels
- Update documentation

### Development Workflow

**1. Create Feature Branch:**
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**2. Make Changes:**
```typescript
// Follow TypeScript best practices
// Use theme system for styling
// Add JSDoc comments
// Handle errors gracefully
```

**3. Test Your Changes:**
```bash
# Run the app
npm start

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Fix linting issues
npm run lint -- --fix
```

**4. Commit & Push:**
```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat(auth): add biometric login support"

# Push to remote
git push origin feature/your-feature-name
```

**5. Create Pull Request:**
- Use the PR template
- Add screenshots for UI changes
- Link related issues
- Request review from team

---

## 🔒 Security Best Practices

### Must-Know Security Rules

**1. Never Commit Secrets:**
```bash
# ❌ NEVER do this
const API_KEY = 'sk_live_12345';

# ✅ Use environment variables
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;
```

**2. Always Sanitize Input:**
```typescript
import { validateText } from '../services/validation';

function saveUserInput(input: string) {
  const sanitized = validateText(input);
  // Now safe to use
}
```

**3. Use Secure Storage:**
```typescript
import * as SecureStore from 'expo-secure-store';

// ❌ Don't use AsyncStorage for sensitive data
await AsyncStorage.setItem('token', token);

// ✅ Use SecureStore
await SecureStore.setItemAsync('token', token);
```

**4. Implement Proper Auth Checks:**
```typescript
// ❌ Client-side only checks
if (user.role === 'admin') {
  // Show admin panel
}

// ✅ Server-side validation
const response = await api.get('/admin/data'); // Backend checks auth
```

---

## 🎨 UI/UX Guidelines

### Design System Usage

**Always use the theme system:**
```typescript
import theme from '../theme';

const styles = StyleSheet.create({
  // ✅ Use theme values
  container: {
    padding: theme.spacing.base,
    backgroundColor: theme.colors.primary[500],
  },

  // ❌ Avoid hardcoded values
  badContainer: {
    padding: 16,
    backgroundColor: '#6366f1',
  },
});
```

**Component Variants:**
```typescript
// Use existing components
import { GlassCard, QuickAction, AnimatedStat } from '../components/common';

// Glass-morphism card
<GlassCard variant="glass" title="Band Name">
  <Content />
</GlassCard>

// Gradient action button
<QuickAction
  icon="add-circle"
  label="Create"
  gradient={theme.gradients.primary}
  onPress={handleCreate}
/>
```

### Accessibility

**1. Add accessibility labels:**
```tsx
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Create new band"
  accessibilityHint="Opens form to create a new band"
>
  <Text>Create Band</Text>
</TouchableOpacity>
```

**2. Ensure touch targets:**
```typescript
// Minimum 44x44pt touch target
const styles = StyleSheet.create({
  button: {
    minWidth: 44,
    minHeight: 44,
  },
});
```

---

## 🧪 Testing Strategy

### Manual Testing

**Before Each Commit:**
- [ ] App launches without errors
- [ ] No console warnings
- [ ] Feature works as expected
- [ ] Works on both iOS and Android
- [ ] No performance issues

**Test on Real Devices:**
```bash
# Use Expo Go app
# Scan QR code from terminal
# Test on actual iOS/Android device
```

### Code Quality Checks

```bash
# TypeScript validation
npx tsc --noEmit

# Linting
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

---

## 📖 Learning Resources

### Essential Reading

**Internal Docs:**
1. [Architecture Guide](./ARCHITECTURE.md) - System design
2. [API Documentation](./API.md) - Backend endpoints
3. [Security Guide](../SECURITY_IMPLEMENTATION_GUIDE.md) - Security patterns
4. [UI Guide](../UI_IMPROVEMENTS.md) - Design system

**External Resources:**
- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [LiveKit Docs](https://docs.livekit.io/)

### Code Examples

**Find inspiration in:**
- `src/screens/EnhancedHomeScreen.tsx` - Modern UI patterns
- `src/components/common/GlassCard.tsx` - Component structure
- `src/services/encryption.ts` - Security implementation
- `src/services/livekit.ts` - Real-time communications

---

## 🤝 Getting Help

### When You're Stuck

**1. Check Documentation:**
- Search `/docs/` directory
- Read inline JSDoc comments
- Check README.md

**2. Search Codebase:**
```bash
# Find similar code
grep -r "pattern" src/

# Find component usage
grep -r "GlassCard" src/
```

**3. Ask the Team:**
- Team chat for quick questions
- GitHub discussions for longer topics
- Code review for feedback

### Common Questions

**Q: How do I add a new screen?**
```typescript
// 1. Create screen file
src/screens/MyNewScreen.tsx

// 2. Add to navigation
// 3. Import and use
```

**Q: How do I make API calls?**
```typescript
import apiService from '../services/api';
const data = await apiService.get('/endpoint');
```

**Q: How do I access user data?**
```typescript
import { useAuth } from '../services/AuthContext';
const { user } = useAuth();
```

**Q: How do I use E2EE?**
```typescript
import { encryptionService } from '../services/encryption';
// For persistent messages: use TweetNaCl
// For real-time: use LiveKit E2EE
```

---

## 🎯 30-Day Roadmap

### Week 1: Foundation
- [ ] Environment setup complete
- [ ] First successful app run
- [ ] Code review of 5 key files
- [ ] First documentation contribution

### Week 2: Understanding
- [ ] Built a simple feature
- [ ] Made first PR
- [ ] Reviewed 3 other PRs
- [ ] Asked good questions

### Week 3: Contribution
- [ ] Closed 2-3 issues
- [ ] Added tests
- [ ] Improved documentation
- [ ] Helped another developer

### Week 4: Ownership
- [ ] Own a small feature area
- [ ] Participate in architecture discussions
- [ ] Mentor new contributor
- [ ] Identify improvement opportunities

---

## ✅ Onboarding Checklist

### Technical Setup
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] Environment configured
- [ ] App running on simulator/device
- [ ] IDE configured with extensions
- [ ] Git hooks working

### Knowledge
- [ ] Read all core documentation
- [ ] Understand project structure
- [ ] Know security best practices
- [ ] Familiar with design system
- [ ] Understand development workflow

### First Contributions
- [ ] First PR merged
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Tests added
- [ ] Issue closed

### Team Integration
- [ ] Introduced to team
- [ ] Added to communication channels
- [ ] Attended team meeting
- [ ] Paired with mentor
- [ ] Asked questions

---

## 🚀 You're Ready!

You now have everything you need to be a productive Artist Space developer.

**Next Steps:**
1. Pick a good first issue
2. Make your first contribution
3. Get code reviewed
4. Iterate and improve
5. Help the next person onboard!

**Remember:**
- Ask questions early and often
- Write clean, documented code
- Test thoroughly
- Be patient with yourself
- Have fun building! 🎸

---

**Questions?** Reach out to your team lead or check [Contributing Guide](../CONTRIBUTING.md).

**Last Updated:** 2025-11-15
