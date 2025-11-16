import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import { GlassCard } from '../components/common/GlassCard';
import { QuickAction } from '../components/common/QuickAction';
import { AnimatedStat } from '../components/common/AnimatedStat';
import theme from '../theme';

const { width } = Dimensions.get('window');

interface EnhancedHomeScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

export default function EnhancedHomeScreen({ navigation }: EnhancedHomeScreenProps) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');

  const quickActions = [
    {
      key: 'create-band',
      icon: 'add-circle' as const,
      label: 'Create Band',
      gradient: theme.gradients.primary,
      onPress: () => navigation.navigate('CreateBand'),
    },
    {
      key: 'calendar',
      icon: 'calendar-outline' as const,
      label: 'View Calendar',
      gradient: theme.gradients.secondary,
      onPress: () => navigation.navigate('Calendar'),
    },
    {
      key: 'messages',
      icon: 'chatbubbles' as const,
      label: 'Messages',
      gradient: theme.gradients.purple,
      badge: 3,
      onPress: () => navigation.navigate('Messages'),
    },
    {
      key: 'payments',
      icon: 'cash-outline' as const,
      label: 'Payments',
      gradient: theme.gradients.sunset,
      onPress: () => navigation.navigate('PaymentLedger'),
    },
    {
      key: 'live-session',
      icon: 'videocam' as const,
      label: 'Live Session',
      gradient: theme.gradients.ocean,
      onPress: () => navigation.navigate('LiveStream'),
    },
  ];

  useEffect(() => {
    updateGreeting();
  }, []);

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate data refresh
    const timer = setTimeout(() => setRefreshing(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={theme.gradients.primary}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{greeting} 👋</Text>
              <Text style={styles.userName}>{user?.name || 'Artist'}</Text>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Messages')}
            >
              <Ionicons name="notifications-outline" size={24} color="white" />
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>3</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats */}
        <View style={[styles.statsSection, styles.contentBlock]}>
          <AnimatedStat
            icon="musical-notes"
            iconColor={theme.colors.primary[500]}
            value={3}
            label="Active Bands"
            trend="up"
            trendValue="+1"
          />
          <View style={styles.statsSpacer} />
          <AnimatedStat
            icon="calendar"
            iconColor={theme.colors.accent.green}
            value={12}
            label="Upcoming Gigs"
            trend="up"
            trendValue="+5"
          />
        </View>

        {/* Quick Actions */}
        <View style={[styles.section, styles.contentBlock, styles.sectionSpacious]}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          {Platform.OS === 'web' ? (
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action) => (
                <QuickAction
                  key={action.key}
                  icon={action.icon}
                  label={action.label}
                  onPress={action.onPress}
                  gradient={action.gradient}
                  badge={action.badge}
                  style={styles.quickActionWeb}
                />
              ))}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActionsScroll}
            >
              {quickActions.map((action) => (
                <QuickAction
                  key={action.key}
                  icon={action.icon}
                  label={action.label}
                  onPress={action.onPress}
                  gradient={action.gradient}
                  badge={action.badge}
                  style={styles.quickActionMobile}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Featured Content */}
        <View style={[styles.section, styles.contentBlock]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Bands</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MyBands')}>
              <Text style={styles.seeAll}>See All →</Text>
            </TouchableOpacity>
          </View>

          <GlassCard
            title="The Midnight Riders"
            subtitle="Rock • 5 members"
            icon="people"
            iconGradient={theme.gradients.primary}
            onPress={() => navigation.navigate('BandDetails')}
            variant="glass"
          >
            <View style={styles.bandStats}>
              <View style={styles.bandStat}>
                <Text style={styles.bandStatValue}>12</Text>
                <Text style={styles.bandStatLabel}>Gigs</Text>
              </View>
              <View style={styles.bandStatDivider} />
              <View style={styles.bandStat}>
                <Text style={styles.bandStatValue}>24</Text>
                <Text style={styles.bandStatLabel}>Songs</Text>
              </View>
              <View style={styles.bandStatDivider} />
              <View style={styles.bandStat}>
                <Text style={styles.bandStatValue}>$2.5k</Text>
                <Text style={styles.bandStatLabel}>Earned</Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard
            title="Jazz Collective"
            subtitle="Jazz • 7 members"
            icon="musical-note"
            iconGradient={theme.gradients.ocean}
            onPress={() => navigation.navigate('BandDetails')}
            variant="glass"
          >
            <View style={styles.bandStats}>
              <View style={styles.bandStat}>
                <Text style={styles.bandStatValue}>8</Text>
                <Text style={styles.bandStatLabel}>Gigs</Text>
              </View>
              <View style={styles.bandStatDivider} />
              <View style={styles.bandStat}>
                <Text style={styles.bandStatValue}>18</Text>
                <Text style={styles.bandStatLabel}>Songs</Text>
              </View>
              <View style={styles.bandStatDivider} />
              <View style={styles.bandStat}>
                <Text style={styles.bandStatValue}>$1.8k</Text>
                <Text style={styles.bandStatLabel}>Earned</Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Upcoming Events */}
        <View style={[styles.section, styles.contentBlock]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
              <Text style={styles.seeAll}>Calendar →</Text>
            </TouchableOpacity>
          </View>

          <GlassCard
            variant="gradient"
            gradientColors={theme.gradients.purple}
          >
            <View style={styles.eventCard}>
              <View style={styles.eventDate}>
                <Text style={styles.eventDay}>24</Text>
                <Text style={styles.eventMonth}>NOV</Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>Blues Bar Downtown</Text>
                <Text style={styles.eventSubtitle}>The Midnight Riders</Text>
                <View style={styles.eventMeta}>
                  <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.eventMetaText}>8:00 PM - 11:00 PM</Text>
                </View>
                <View style={styles.eventMeta}>
                  <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.eventMetaText}>Downtown, NYC</Text>
                </View>
              </View>
              <View style={styles.eventBadge}>
                <Text style={styles.eventBadgeText}>$350</Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard
            variant="gradient"
            gradientColors={theme.gradients.ocean}
          >
            <View style={styles.eventCard}>
              <View style={styles.eventDate}>
                <Text style={styles.eventDay}>28</Text>
                <Text style={styles.eventMonth}>NOV</Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>Jazz Night Special</Text>
                <Text style={styles.eventSubtitle}>Jazz Collective</Text>
                <View style={styles.eventMeta}>
                  <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.eventMetaText}>9:00 PM - 12:00 AM</Text>
                </View>
                <View style={styles.eventMeta}>
                  <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.eventMetaText}>Upper East Side, NYC</Text>
                </View>
              </View>
              <View style={styles.eventBadge}>
                <Text style={styles.eventBadgeText}>$450</Text>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Discover Section */}
        <View style={[styles.section, styles.contentBlock, styles.sectionSpacious]}>
          <Text style={styles.sectionTitle}>Discover</Text>
          <TouchableOpacity
            style={styles.discoverCard}
            onPress={() => navigation.navigate('Discover')}
          >
            <LinearGradient
              colors={theme.gradients.sunset}
              style={styles.discoverGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="compass" size={32} color="white" />
              <Text style={styles.discoverTitle}>Find New Opportunities</Text>
              <Text style={styles.discoverSubtitle}>
                Browse available venues and booking agents
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  gradientHeader: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: theme.spacing.base,
    borderBottomLeftRadius: theme.borderRadius['2xl'],
    borderBottomRightRadius: theme.borderRadius['2xl'],
    ...theme.shadows.lg,
  },
  headerContent: {
    flex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: theme.typography.sizes.base,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: theme.typography.fontWeights.medium,
  },
  userName: {
    fontSize: theme.typography.sizes['3xl'],
    color: 'white',
    fontWeight: theme.typography.fontWeights.bold,
    marginTop: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius.full,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: theme.typography.fontWeights.bold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: theme.spacing.base,
    paddingBottom: theme.spacing['5xl'],
    paddingHorizontal: theme.spacing.base,
    alignItems: 'center',
  },
  contentBlock: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
  },
  statsSection: {
    marginBottom: theme.spacing.base,
    paddingHorizontal: theme.spacing.base,
  },
  statsSpacer: {
    height: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.base,
  },
  sectionSpacious: {
    marginBottom: theme.spacing['2xl'],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
  },
  seeAll: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[600],
    fontWeight: theme.typography.fontWeights.semibold,
  },
  quickActionsScroll: {
    paddingHorizontal: theme.spacing.sm,
    paddingRight: theme.spacing.base,
    paddingBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  quickActionWeb: {
    width: '18%',
    minWidth: 120,
    maxWidth: 160,
    marginBottom: theme.spacing.base,
    alignItems: 'center',
  },
  quickActionMobile: {
    marginRight: theme.spacing.base,
    marginBottom: theme.spacing.sm,
  },
  bandStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  bandStat: {
    alignItems: 'center',
  },
  bandStatValue: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
  },
  bandStatLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  bandStatDivider: {
    width: 1,
    height: '100%',
    backgroundColor: theme.colors.gray[200],
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eventDate: {
    width: 50,
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  eventDay: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: 'white',
  },
  eventMonth: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: 'white',
    marginBottom: 2,
  },
  eventSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: theme.spacing.sm,
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventMetaText: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
  },
  eventBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  eventBadgeText: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.fontWeights.bold,
    color: 'white',
  },
  discoverCard: {
    marginHorizontal: 0,
    marginTop: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  discoverGradient: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  discoverTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: 'white',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  discoverSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  bottomPadding: {
    height: theme.spacing['4xl'],
  },
});
