# Quick UI Guide
## Start Using the New Design in 5 Minutes

---

## 🚀 Getting Started

### 1. Install New Dependencies

```bash
npm install
```

New packages:
- `expo-linear-gradient` - Beautiful gradients
- `expo-haptics` - Touch feedback

### 2. Import the Theme

```tsx
import theme from '../theme';
```

### 3. Use New Components

```tsx
import { GlassCard, QuickAction, AnimatedStat } from '../components/common';
```

---

## 📱 Using the Enhanced Home Screen

### Replace Your Current HomeScreen

**Option 1: Direct Replacement**
```tsx
// In your navigation file
import EnhancedHomeScreen from './screens/EnhancedHomeScreen';

// Use it in your stack
<Stack.Screen name="Home" component={EnhancedHomeScreen} />
```

**Option 2: Side-by-Side**
```tsx
// Keep both and test
import HomeScreen from './screens/HomeScreen';
import EnhancedHomeScreen from './screens/EnhancedHomeScreen';

// Switch between them
<Stack.Screen name="Home" component={EnhancedHomeScreen} />
```

---

## 🎨 Quick Component Examples

### 1. GlassCard - Modern Content Cards

**Basic Usage:**
```tsx
<GlassCard
  title="My Band"
  subtitle="Rock • 5 members"
  icon="people"
  variant="glass"
>
  <Text>Band details here</Text>
</GlassCard>
```

**With Gradient:**
```tsx
<GlassCard
  title="Upcoming Gig"
  variant="gradient"
  gradientColors={theme.gradients.purple}
>
  <Text style={{ color: 'white' }}>Event info</Text>
</GlassCard>
```

**With Icon Gradient:**
```tsx
<GlassCard
  icon="musical-notes"
  iconGradient={theme.gradients.primary}
  onPress={() => navigate('BandDetails')}
>
  <Content />
</GlassCard>
```

### 2. QuickAction - Action Buttons

**Basic Actions:**
```tsx
<ScrollView horizontal>
  <QuickAction
    icon="add-circle"
    label="Create Band"
    onPress={handleCreate}
    gradient={theme.gradients.primary}
  />

  <QuickAction
    icon="calendar-outline"
    label="Calendar"
    onPress={() => navigate('Calendar')}
    gradient={theme.gradients.secondary}
  />

  <QuickAction
    icon="chatbubbles"
    label="Messages"
    onPress={() => navigate('Messages')}
    gradient={theme.gradients.purple}
    badge={5} // Shows notification badge
  />
</ScrollView>
```

### 3. AnimatedStat - Statistics Display

**Show Stats:**
```tsx
<AnimatedStat
  icon="musical-notes"
  iconColor={theme.colors.primary[500]}
  value={bandCount}
  label="Active Bands"
  trend="up"
  trendValue="+2"
/>

<AnimatedStat
  icon="cash"
  iconColor={theme.colors.accent.green}
  value={`$${earnings}`}
  label="Total Earnings"
  trend="down"
  trendValue="-$200"
/>
```

---

## 🎨 Theme Usage

### Colors

```tsx
// Primary colors
backgroundColor: theme.colors.primary[500]
color: theme.colors.primary[700]

// Text colors
color: theme.colors.text.primary    // Dark text
color: theme.colors.text.secondary  // Gray text
color: theme.colors.text.tertiary   // Light gray

// Status colors
backgroundColor: theme.colors.status.booked     // Green
backgroundColor: theme.colors.status.pending    // Orange
backgroundColor: theme.colors.status.rehearsal  // Purple
```

### Gradients

```tsx
<LinearGradient
  colors={theme.gradients.primary}   // Purple gradient
  style={styles.container}
>
  <Content />
</LinearGradient>

// Available gradients:
theme.gradients.primary    // Purple/Indigo
theme.gradients.secondary  // Teal
theme.gradients.sunset     // Orange/Pink
theme.gradients.ocean      // Blue/Teal
theme.gradients.purple     // Purple/Pink
```

### Spacing

```tsx
padding: theme.spacing.base      // 16px
marginBottom: theme.spacing.xl   // 24px
gap: theme.spacing.md            // 12px

// Available sizes:
xs, sm, md, base, lg, xl, 2xl, 3xl, 4xl, 5xl
```

### Typography

```tsx
fontSize: theme.typography.sizes.lg
fontWeight: theme.typography.fontWeights.bold

// Sizes: xs, sm, base, lg, xl, 2xl, 3xl, 4xl, 5xl
// Weights: normal, medium, semibold, bold, extrabold
```

### Shadows

```tsx
// Add elevation to cards
...theme.shadows.sm    // Subtle
...theme.shadows.base  // Default
...theme.shadows.md    // Medium
...theme.shadows.lg    // Large
```

### Border Radius

```tsx
borderRadius: theme.borderRadius.base  // 8px
borderRadius: theme.borderRadius.lg    // 16px
borderRadius: theme.borderRadius.full  // Circle

// Sizes: sm, base, md, lg, xl, 2xl, full
```

---

## 💡 Common Patterns

### Dashboard Layout

```tsx
function DashboardScreen() {
  return (
    <ScrollView>
      {/* Header with gradient */}
      <LinearGradient colors={theme.gradients.primary}>
        <Text style={{ color: 'white' }}>Welcome Back!</Text>
      </LinearGradient>

      {/* Stats */}
      <AnimatedStat icon="..." value={10} label="..." />

      {/* Quick Actions */}
      <ScrollView horizontal>
        <QuickAction icon="..." label="..." onPress={...} />
      </ScrollView>

      {/* Content Cards */}
      <GlassCard variant="glass">
        <Content />
      </GlassCard>
    </ScrollView>
  );
}
```

### List of Items

```tsx
{items.map(item => (
  <GlassCard
    key={item.id}
    title={item.name}
    subtitle={item.description}
    icon="musical-notes"
    iconGradient={theme.gradients.primary}
    onPress={() => handleItemPress(item)}
    variant="glass"
  >
    <ItemDetails item={item} />
  </GlassCard>
))}
```

### Action Grid

```tsx
<View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
  <QuickAction icon="add" label="Create" gradient={theme.gradients.primary} />
  <QuickAction icon="search" label="Find" gradient={theme.gradients.secondary} />
  <QuickAction icon="star" label="Favorites" gradient={theme.gradients.sunset} />
  <QuickAction icon="settings" label="Settings" gradient={theme.gradients.ocean} />
</View>
```

---

## 🎯 Migration Examples

### Before (Old Button)

```tsx
<TouchableOpacity style={styles.button} onPress={handlePress}>
  <Ionicons name="add" size={20} />
  <Text style={styles.buttonText}>Create Band</Text>
</TouchableOpacity>
```

### After (QuickAction)

```tsx
<QuickAction
  icon="add-circle"
  label="Create Band"
  onPress={handlePress}
  gradient={theme.gradients.primary}
/>
```

---

### Before (Old Card)

```tsx
<View style={styles.card}>
  <View style={styles.cardHeader}>
    <Ionicons name="people" size={24} />
    <Text style={styles.title}>Band Name</Text>
  </View>
  <Text>Band details...</Text>
</View>
```

### After (GlassCard)

```tsx
<GlassCard
  title="Band Name"
  icon="people"
  iconGradient={theme.gradients.primary}
  variant="glass"
>
  <Text>Band details...</Text>
</GlassCard>
```

---

### Before (Old Stats)

```tsx
<View style={styles.stat}>
  <Text style={styles.value}>{bandCount}</Text>
  <Text style={styles.label}>Bands</Text>
</View>
```

### After (AnimatedStat)

```tsx
<AnimatedStat
  icon="musical-notes"
  iconColor={theme.colors.primary[500]}
  value={bandCount}
  label="Active Bands"
/>
```

---

## 🎨 Color Picker

Quick reference for common scenarios:

**Buttons & CTAs:**
```tsx
gradient={theme.gradients.primary}    // Purple
gradient={theme.gradients.secondary}  // Teal
gradient={theme.gradients.sunset}     // Orange/Pink
```

**Status Indicators:**
```tsx
// Gig statuses
booked: theme.colors.status.booked       // Green
pending: theme.colors.status.pending     // Orange
cancelled: theme.colors.status.cancelled // Red

// Activity types
rehearsal: theme.colors.status.rehearsal   // Purple
recording: theme.colors.status.recording   // Pink
available: theme.colors.status.available   // Teal
```

**Icons:**
```tsx
primary: theme.colors.primary[600]
success: theme.colors.success
warning: theme.colors.warning
error: theme.colors.error
```

---

## 🚀 Performance Tips

### Use Memoization

```tsx
const MemoizedCard = React.memo(({ data }) => (
  <GlassCard title={data.title}>
    <Content />
  </GlassCard>
));
```

### Lazy Load Images

```tsx
<Image
  source={{ uri: imageUrl }}
  style={styles.image}
  resizeMode="cover"
  // Add loading placeholder
/>
```

### Native Animations

```tsx
// Already optimized in components
// Uses useNativeDriver: true
```

---

## 📱 Testing Checklist

Before deploying:

- [ ] Test on small screen (iPhone SE)
- [ ] Test on large screen (iPhone 14 Pro Max)
- [ ] Test on Android device
- [ ] Check all touch targets (minimum 44x44pt)
- [ ] Test animations (should be smooth 60fps)
- [ ] Verify haptic feedback works
- [ ] Check gradient rendering on different devices
- [ ] Test pull-to-refresh
- [ ] Verify loading states
- [ ] Check error states

---

## 💡 Pro Tips

1. **Use the theme consistently**
   - Don't hardcode colors
   - Always use theme values

2. **Keep animations subtle**
   - Don't overdo it
   - Smooth > flashy

3. **Test on real devices**
   - Simulators don't show everything
   - Real feel matters

4. **Maintain visual hierarchy**
   - Important things bigger/bolder
   - Group related items

5. **User feedback is key**
   - Haptics confirm actions
   - Loading states show progress
   - Errors are clear

---

## 🎉 You're Ready!

You now have a beautiful, modern UI that's:
- ✅ Simple and intuitive
- ✅ Professional and polished
- ✅ Fast and responsive
- ✅ Perfect for musicians

**Need help?** Check `UI_IMPROVEMENTS.md` for comprehensive documentation.

**Happy coding!** 🎸
