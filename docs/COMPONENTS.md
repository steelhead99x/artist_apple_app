# Component Library
## Artist Space React Native Components

Complete reference for all reusable components in the Artist Space mobile app.

---

## 📋 Table of Contents

1. [Common Components](#common-components)
2. [Layout Components](#layout-components)
3. [Form Components](#form-components)
4. [Card Components](#card-components)
5. [Navigation Components](#navigation-components)
6. [Usage Guidelines](#usage-guidelines)

---

## 🎨 Design System

All components use the centralized theme system:

```typescript
import theme from '../theme';

// Available theme values:
theme.colors        // Color palette
theme.gradients     // Gradient combinations
theme.typography    // Font sizes, weights, line heights
theme.spacing       // Consistent spacing scale
theme.borderRadius  // Border radius values
theme.shadows       // Shadow definitions
```

---

## 🧱 Common Components

### GlassCard

Modern glass-morphism card component with three visual variants.

**Import:**
```typescript
import { GlassCard } from '../components/common/GlassCard';
```

**Props:**
```typescript
interface GlassCardProps {
  title?: string;
  subtitle?: string;
  icon?: string;                    // Ionicons name
  iconColor?: string;
  iconGradient?: string[];          // Gradient colors for icon
  variant?: 'glass' | 'gradient' | 'solid';
  gradientColors?: string[];        // For gradient variant
  onPress?: () => void;
  children?: React.ReactNode;
  style?: ViewStyle;
}
```

**Variants:**

**1. Glass (Frosted Glass Effect):**
```tsx
<GlassCard
  title="The Midnight Riders"
  subtitle="Rock • 5 members"
  icon="people"
  iconGradient={theme.gradients.primary}
  variant="glass"
  onPress={() => navigate('BandDetails')}
>
  <BandStats />
</GlassCard>
```

**2. Gradient (Colorful Background):**
```tsx
<GlassCard
  variant="gradient"
  gradientColors={theme.gradients.purple}
>
  <EventContent />
</GlassCard>
```

**3. Solid (Classic Card):**
```tsx
<GlassCard
  title="Studio Session"
  variant="solid"
>
  <SessionDetails />
</GlassCard>
```

**Features:**
- Haptic feedback on press
- Smooth animations
- Consistent elevation
- Responsive touch targets

---

### QuickAction

Gradient action button with icon, label, and optional badge.

**Import:**
```typescript
import { QuickAction } from '../components/common/QuickAction';
```

**Props:**
```typescript
interface QuickActionProps {
  icon: string;                     // Ionicons name
  label: string;
  onPress: () => void;
  gradient: string[];               // Two-color gradient
  badge?: number;                   // Notification count
}
```

**Example:**
```tsx
<ScrollView horizontal>
  <QuickAction
    icon="add-circle"
    label="Create Band"
    gradient={theme.gradients.primary}
    onPress={() => navigate('CreateBand')}
  />

  <QuickAction
    icon="chatbubbles"
    label="Messages"
    gradient={theme.gradients.purple}
    badge={3}
    onPress={() => navigate('Messages')}
  />

  <QuickAction
    icon="cash-outline"
    label="Payments"
    gradient={theme.gradients.sunset}
    onPress={() => navigate('Payments')}
  />
</ScrollView>
```

**Features:**
- Medium haptic feedback on press
- Gradient background
- Badge indicator for notifications
- Compact size (80x100)
- Icon + label design

---

### AnimatedStat

Animated statistic card with trend indicator.

**Import:**
```typescript
import { AnimatedStat } from '../components/common/AnimatedStat';
```

**Props:**
```typescript
interface AnimatedStatProps {
  icon: string;                     // Ionicons name
  iconColor: string;
  value: number | string;
  label: string;
  trend?: 'up' | 'down';
  trendValue?: string;              // e.g., "+5", "-2"
}
```

**Example:**
```tsx
<View style={styles.statsSection}>
  <AnimatedStat
    icon="musical-notes"
    iconColor={theme.colors.primary[500]}
    value={3}
    label="Active Bands"
    trend="up"
    trendValue="+1"
  />

  <AnimatedStat
    icon="calendar"
    iconColor={theme.colors.accent.green}
    value={12}
    label="Upcoming Gigs"
    trend="up"
    trendValue="+5"
  />
</View>
```

**Features:**
- Smooth entrance animation
- Trend indicators (up/down arrows)
- Large, readable numbers
- Color-coded icons
- Spring animation on mount

---

### Button

Primary button component with variants.

**Import:**
```typescript
import { Button } from '../components/common/Button';
```

**Props:**
```typescript
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  fullWidth?: boolean;
}
```

**Variants:**

**Primary (Default):**
```tsx
<Button
  title="Create Band"
  onPress={handleCreate}
  variant="primary"
/>
```

**Secondary:**
```tsx
<Button
  title="Cancel"
  onPress={handleCancel}
  variant="secondary"
/>
```

**Outline:**
```tsx
<Button
  title="Learn More"
  onPress={handleLearnMore}
  variant="outline"
/>
```

**With Icon:**
```tsx
<Button
  title="Add Member"
  icon="add-circle"
  onPress={handleAdd}
/>
```

**Loading State:**
```tsx
<Button
  title="Saving..."
  loading={isSaving}
  disabled={isSaving}
  onPress={handleSave}
/>
```

---

### LoadingSpinner

Loading indicator with optional text.

**Import:**
```typescript
import { LoadingSpinner } from '../components/common/LoadingSpinner';
```

**Props:**
```typescript
interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
}
```

**Example:**
```tsx
{isLoading && (
  <LoadingSpinner
    size="large"
    color={theme.colors.primary[500]}
    text="Loading bands..."
  />
)}
```

---

### ErrorBoundary

Error boundary component for graceful error handling.

**Import:**
```typescript
import { ErrorBoundary } from '../components/common/ErrorBoundary';
```

**Usage:**
```tsx
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

**Features:**
- Catches React errors
- Shows friendly error message
- Provides reset button
- Logs errors to console

---

## 📐 Layout Components

### Screen Container

Standard screen wrapper with safe area.

**Import:**
```typescript
import { ScreenContainer } from '../components/layout/ScreenContainer';
```

**Props:**
```typescript
interface ScreenContainerProps {
  children: React.ReactNode;
  backgroundColor?: string;
  safeArea?: boolean;
  scrollable?: boolean;
}
```

**Example:**
```tsx
<ScreenContainer>
  <Text style={styles.title}>My Screen</Text>
  {/* Screen content */}
</ScreenContainer>
```

---

### Section

Content section with optional header.

**Import:**
```typescript
import { Section } from '../components/layout/Section';
```

**Props:**
```typescript
interface SectionProps {
  title?: string;
  subtitle?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  children: React.ReactNode;
}
```

**Example:**
```tsx
<Section
  title="Your Bands"
  action={{
    label: "See All →",
    onPress: () => navigate('AllBands')
  }}
>
  <BandList />
</Section>
```

---

## 📝 Form Components

### Input

Text input with label and validation.

**Import:**
```typescript
import { Input } from '../components/form/Input';
```

**Props:**
```typescript
interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  icon?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}
```

**Example:**
```tsx
<Input
  label="Band Name"
  value={bandName}
  onChangeText={setBandName}
  placeholder="Enter band name"
  error={errors.bandName}
  icon="musical-notes"
/>

<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="artist@example.com"
  keyboardType="email-address"
  autoCapitalize="none"
  icon="mail"
/>

<Input
  label="Password"
  value={password}
  onChangeText={setPassword}
  secureTextEntry
  icon="lock-closed"
/>
```

---

### Dropdown

Select component with options.

**Import:**
```typescript
import { Dropdown } from '../components/form/Dropdown';
```

**Props:**
```typescript
interface DropdownProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{
    label: string;
    value: string;
  }>;
  placeholder?: string;
}
```

**Example:**
```tsx
<Dropdown
  label="Genre"
  value={genre}
  onValueChange={setGenre}
  options={[
    { label: 'Rock', value: 'rock' },
    { label: 'Jazz', value: 'jazz' },
    { label: 'Blues', value: 'blues' },
    { label: 'Country', value: 'country' },
  ]}
  placeholder="Select genre"
/>
```

---

### Checkbox

Checkbox with label.

**Import:**
```typescript
import { Checkbox } from '../components/form/Checkbox';
```

**Props:**
```typescript
interface CheckboxProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
}
```

**Example:**
```tsx
<Checkbox
  label="I agree to the terms and conditions"
  checked={agreedToTerms}
  onToggle={() => setAgreedToTerms(!agreedToTerms)}
/>
```

---

## 🃏 Card Components

### BandCard

Card displaying band information.

**Import:**
```typescript
import { BandCard } from '../components/band/BandCard';
```

**Props:**
```typescript
interface BandCardProps {
  band: {
    id: string;
    bandName: string;
    genre: string;
    memberCount: number;
    stats: {
      gigs: number;
      songs: number;
      earnings: number;
    };
  };
  onPress?: () => void;
}
```

**Example:**
```tsx
<BandCard
  band={band}
  onPress={() => navigate('BandDetails', { bandId: band.id })}
/>
```

---

### GigCard

Card displaying gig/event information.

**Import:**
```typescript
import { GigCard } from '../components/gig/GigCard';
```

**Props:**
```typescript
interface GigCardProps {
  gig: {
    id: string;
    venueName: string;
    date: string;
    time: string;
    location: string;
    payment: number;
    status: 'booked' | 'confirmed' | 'cancelled';
  };
  onPress?: () => void;
}
```

**Example:**
```tsx
<GigCard
  gig={gig}
  onPress={() => navigate('GigDetails', { gigId: gig.id })}
/>
```

---

### MessageCard

Card displaying encrypted message preview.

**Import:**
```typescript
import { MessageCard } from '../components/messaging/MessageCard';
```

**Props:**
```typescript
interface MessageCardProps {
  message: {
    id: string;
    senderName: string;
    preview: string;
    timestamp: string;
    unread: boolean;
    encrypted: boolean;
  };
  onPress?: () => void;
}
```

**Example:**
```tsx
<MessageCard
  message={message}
  onPress={() => navigate('Chat', { messageId: message.id })}
/>
```

---

## 🧭 Navigation Components

### TabBar

Bottom tab navigation bar.

**Features:**
- Smooth tab switching
- Active state indicators
- Icon + label design
- Haptic feedback

**Tabs:**
- Home
- Bands
- Calendar
- Messages
- Profile

---

### Header

Screen header with title and actions.

**Props:**
```typescript
interface HeaderProps {
  title: string;
  leftAction?: {
    icon: string;
    onPress: () => void;
  };
  rightAction?: {
    icon: string;
    onPress: () => void;
  };
}
```

**Example:**
```tsx
<Header
  title="Band Details"
  leftAction={{
    icon: "arrow-back",
    onPress: () => navigation.goBack()
  }}
  rightAction={{
    icon: "create",
    onPress: () => navigate('EditBand')
  }}
/>
```

---

## 📏 Usage Guidelines

### Component Hierarchy

```
┌─────────────────────────────┐
│        Screen               │  ← Full screen component
│  ┌───────────────────────┐  │
│  │      Section          │  │  ← Content section
│  │  ┌─────────────────┐  │  │
│  │  │    GlassCard    │  │  │  ← Card component
│  │  │  ┌───────────┐  │  │  │
│  │  │  │  Button   │  │  │  │  ← Action component
│  │  │  └───────────┘  │  │  │
│  │  └─────────────────┘  │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

### Best Practices

**1. Always use theme values:**
```typescript
// ✅ Good
backgroundColor: theme.colors.primary[500]
padding: theme.spacing.base

// ❌ Bad
backgroundColor: '#6366f1'
padding: 16
```

**2. Provide accessibility labels:**
```tsx
<TouchableOpacity
  accessible={true}
  accessibilityLabel="Create new band"
  accessibilityHint="Opens form to create a band"
>
  <QuickAction icon="add" label="Create" />
</TouchableOpacity>
```

**3. Handle loading and error states:**
```tsx
{isLoading && <LoadingSpinner />}
{error && <ErrorMessage message={error} />}
{data && <BandList bands={data} />}
```

**4. Use consistent spacing:**
```tsx
const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.base,
    gap: theme.spacing.md,
  },
});
```

**5. Optimize performance:**
```tsx
// Memoize expensive components
const BandCard = React.memo(({ band, onPress }) => {
  // Component implementation
});

// Use useCallback for handlers
const handlePress = useCallback(() => {
  navigate('BandDetails', { bandId });
}, [bandId, navigate]);
```

---

## 🎨 Styling Patterns

### Component Styles

**Standard pattern:**
```typescript
const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.base,
    backgroundColor: theme.colors.background.primary,
  },
  title: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
  },
  subtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
});
```

### Responsive Sizing

```typescript
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  card: {
    width: width - (theme.spacing.base * 2),
    marginHorizontal: theme.spacing.base,
  },
});
```

### Platform-Specific Styles

```typescript
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
```

---

## 🔗 Component Composition

### Example: Band List Screen

```tsx
import React from 'react';
import { ScrollView } from 'react-native';
import { ScreenContainer } from '../components/layout/ScreenContainer';
import { Section } from '../components/layout/Section';
import { GlassCard } from '../components/common/GlassCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useBands } from '../hooks/useBands';
import theme from '../theme';

export default function BandListScreen({ navigation }: any) {
  const { bands, isLoading, error } = useBands();

  if (isLoading) {
    return <LoadingSpinner text="Loading bands..." />;
  }

  return (
    <ScreenContainer>
      <ScrollView>
        <Section
          title="Your Bands"
          action={{
            label: "Create New",
            onPress: () => navigation.navigate('CreateBand')
          }}
        >
          {bands.map((band) => (
            <GlassCard
              key={band.id}
              title={band.bandName}
              subtitle={`${band.genre} • ${band.memberCount} members`}
              icon="people"
              iconGradient={theme.gradients.primary}
              variant="glass"
              onPress={() => navigation.navigate('BandDetails', { bandId: band.id })}
            >
              <BandStats stats={band.stats} />
            </GlassCard>
          ))}
        </Section>
      </ScrollView>
    </ScreenContainer>
  );
}
```

---

## 📚 Further Reading

- **[UI Improvements Guide](../UI_IMPROVEMENTS.md)** - Design system details
- **[Quick UI Guide](../QUICK_UI_GUIDE.md)** - Component usage examples
- **[Theme System](./PROJECT_STRUCTURE.md#srctheme)** - Theme configuration
- **[Project Structure](./PROJECT_STRUCTURE.md)** - File organization

---

**Last Updated:** 2025-11-15
