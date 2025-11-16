import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import { venueService } from '../services';
import {
  Card,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
  StatusBadge,
  Button,
} from '../components/common';
import { VenueDashboardData, TourDate, Venue, PremiumContent } from '../types';
import { formatDate, formatTime } from '../utils/dateFormatters';
import { createShadow } from '../theme';

interface VenueDashboardScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

export default function VenueDashboardScreen({ navigation }: VenueDashboardScreenProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<VenueDashboardData | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setError(null);
      const data = await venueService.getVenueDashboard();
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load venue dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard();
  }, []);

  const handleEventPress = (event: TourDate) => {
    navigation.navigate('EventDetails', { eventId: event.id });
  };

  const handleEditVenue = () => {
    navigation.navigate('EditVenue', { venueId: dashboardData?.venue.id });
  };

  const handleViewAllEvents = () => {
    navigation.navigate('VenueEvents');
  };

  const handleViewPremiumContent = () => {
    navigation.navigate('PremiumContent');
  };

  const handleViewEarnings = () => {
    navigation.navigate('VenueEarnings');
  };

  if (loading && !refreshing) {
    return <LoadingSpinner message="Loading venue dashboard..." fullScreen />;
  }

  if (error && !dashboardData) {
    return (
      <ErrorMessage
        title="Couldn't Load Dashboard"
        message={error}
        onRetry={loadDashboard}
        fullScreen
      />
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { venue, upcomingEvents, pastEvents, stats, premiumContent } = dashboardData;
  const upcomingCount = upcomingEvents?.length || 0;
  const premiumCount = premiumContent?.length || 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name}! 🎭</Text>
            <Text style={styles.subGreeting}>Welcome to your venue</Text>
          </View>
          <TouchableOpacity onPress={handleEditVenue}>
            <Ionicons name="settings-outline" size={24} color="#6366f1" />
          </TouchableOpacity>
        </View>

        {/* Venue Info */}
        {venue && (
          <Card style={styles.venueCard}>
            <View style={styles.venueHeader}>
              <View style={styles.venueIcon}>
                <Ionicons name="business" size={32} color="#6366f1" />
              </View>
              <View style={styles.venueInfo}>
                <Text style={styles.venueName}>{venue.venue_name}</Text>
                {venue.city && venue.state && (
                  <Text style={styles.venueLocation}>
                    📍 {venue.city}, {venue.state}
                  </Text>
                )}
                <StatusBadge status={venue.status} type="user" />
              </View>
            </View>
          </Card>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="calendar" size={24} color="#6366f1" />
          <Text style={styles.statValue}>{upcomingCount}</Text>
          <Text style={styles.statLabel}>
            {upcomingCount === 1 ? 'Event' : 'Events'}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="videocam" size={24} color="#8b5cf6" />
          <Text style={styles.statValue}>{premiumCount}</Text>
          <Text style={styles.statLabel}>Premium</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#10b981" />
          <Text style={styles.statValue}>{stats?.totalAttendees || 0}</Text>
          <Text style={styles.statLabel}>Attendees</Text>
        </View>
      </View>

      {/* Premium Content Highlight */}
      {premiumContent && premiumContent.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎬 Premium Content</Text>
            {premiumCount > 2 && (
              <TouchableOpacity onPress={handleViewPremiumContent}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            )}
          </View>

          {premiumContent.slice(0, 2).map((content) => (
            <Card
              key={content.id}
              onPress={() => navigation.navigate('PremiumContentDetails', { contentId: content.id })}
              variant="elevated"
              style={styles.premiumCard}
            >
              <View style={styles.premiumHeader}>
                <View style={styles.premiumIcon}>
                  <Ionicons name="play-circle" size={32} color="#8b5cf6" />
                </View>
                <View style={styles.premiumInfo}>
                  <Text style={styles.premiumTitle}>{content.title}</Text>
                  {content.artist_name && (
                    <Text style={styles.premiumArtist}>🎵 {content.artist_name}</Text>
                  )}
                  <View style={styles.premiumMeta}>
                    <Ionicons name="eye-outline" size={14} color="#64748b" />
                    <Text style={styles.premiumViews}>
                      {content.view_count || 0} views
                    </Text>
                  </View>
                </View>
                <StatusBadge
                  status={content.is_published ? 'active' : 'pending'}
                  type="subscription"
                />
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Upcoming Events */}
      {upcomingEvents && upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📅 Upcoming Events</Text>
            {upcomingCount > 3 && (
              <TouchableOpacity onPress={handleViewAllEvents}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            )}
          </View>

          {upcomingEvents.slice(0, 3).map((event) => (
            <Card
              key={event.id}
              onPress={() => handleEventPress(event)}
              variant="elevated"
              style={styles.eventCard}
            >
              <View style={styles.eventHeader}>
                <View style={styles.eventDate}>
                  <Text style={styles.eventDay}>
                    {new Date(event.date).getDate()}
                  </Text>
                  <Text style={styles.eventMonth}>
                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short' })}
                  </Text>
                </View>
                <View style={styles.eventInfo}>
                  <Text style={styles.eventBand}>{event.band_name}</Text>
                  {event.start_time && (
                    <View style={styles.eventMetaRow}>
                      <Ionicons name="time-outline" size={14} color="#64748b" />
                      <Text style={styles.eventTime}>
                        {formatTime(event.start_time)}
                        {event.end_time && ` - ${formatTime(event.end_time)}`}
                      </Text>
                    </View>
                  )}
                  {event.expected_attendance && (
                    <View style={styles.eventMetaRow}>
                      <Ionicons name="people-outline" size={14} color="#64748b" />
                      <Text style={styles.eventAttendance}>
                        {event.expected_attendance} expected
                      </Text>
                    </View>
                  )}
                </View>
                <StatusBadge status={event.status} type="tour" />
              </View>

              {event.payment_amount && (
                <View style={styles.eventPayment}>
                  <Ionicons name="cash-outline" size={16} color="#10b981" />
                  <Text style={styles.paymentText}>
                    ${event.payment_amount} payout
                  </Text>
                </View>
              )}
            </Card>
          ))}
        </View>
      )}

      {/* Past Events */}
      {pastEvents && pastEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.sectionTitleStandalone]}>🎵 Recent Events</Text>

          {pastEvents.slice(0, 3).map((event) => (
            <Card
              key={event.id}
              onPress={() => handleEventPress(event)}
              style={styles.pastCard}
            >
              <View style={styles.pastRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <View style={styles.pastInfo}>
                  <Text style={styles.pastBand}>{event.band_name}</Text>
                  <Text style={styles.pastDate}>{formatDate(event.date)}</Text>
                </View>
                {event.actual_attendance && (
                  <View style={styles.pastAttendance}>
                    <Ionicons name="people" size={16} color="#64748b" />
                    <Text style={styles.attendanceText}>{event.actual_attendance}</Text>
                  </View>
                )}
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, styles.sectionTitleStandalone]}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('CreateEvent')}
          >
            <Ionicons name="add-circle" size={32} color="#6366f1" />
            <Text style={styles.actionLabel}>Book Band</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleViewAllEvents}
          >
            <Ionicons name="calendar" size={32} color="#10b981" />
            <Text style={styles.actionLabel}>All Events</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleViewPremiumContent}
          >
            <Ionicons name="videocam" size={32} color="#8b5cf6" />
            <Text style={styles.actionLabel}>Premium</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleViewEarnings}>
            <Ionicons name="stats-chart" size={32} color="#f59e0b" />
            <Text style={styles.actionLabel}>Analytics</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Venue Subscription Info */}
      {venue?.subscription_tier && (
        <Card style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <Ionicons name="trophy" size={24} color="#f59e0b" />
            <Text style={styles.subscriptionTitle}>
              {venue.subscription_tier.replace('_', ' ')} Plan
            </Text>
          </View>
          <Text style={styles.subscriptionText}>
            Enjoy premium features for streaming live performances and building your audience!
          </Text>
          {venue.subscription_tier === 'free' && (
            <Button
              title="Upgrade Plan"
              onPress={() => navigation.navigate('Subscriptions')}
              variant="primary"
              icon="arrow-up-circle-outline"
              style={styles.upgradeButton}
            />
          )}
        </Card>
      )}

      {/* Empty State */}
      {!upcomingEvents?.length && !pastEvents?.length && (
        <EmptyState
          icon="business-outline"
          title="Welcome to Your Venue!"
          message="Start booking bands and hosting amazing live music events. Your events will appear here!"
          actionLabel="Book Your First Band"
          onAction={() => navigation.navigate('CreateEvent')}
        />
      )}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 14,
    color: '#64748b',
  },
  venueCard: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    borderWidth: 1,
  },
  venueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  venueIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  venueLocation: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...createShadow({ width: 0, height: 1 }, 2, 0.05),
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    padding: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  sectionTitleStandalone: {
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  premiumCard: {
    marginBottom: 12,
    backgroundColor: '#faf5ff',
    borderColor: '#e9d5ff',
    borderWidth: 1,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  premiumIcon: {
    marginRight: 12,
  },
  premiumInfo: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  premiumArtist: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 6,
  },
  premiumMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumViews: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
  },
  eventCard: {
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  eventDate: {
    width: 50,
    alignItems: 'center',
    marginRight: 12,
  },
  eventDay: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366f1',
  },
  eventMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  eventInfo: {
    flex: 1,
  },
  eventBand: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 6,
  },
  eventAttendance: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 6,
  },
  eventPayment: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginLeft: 8,
  },
  pastCard: {
    marginBottom: 8,
  },
  pastRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pastInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pastBand: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  pastDate: {
    fontSize: 12,
    color: '#64748b',
  },
  pastAttendance: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendanceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    ...createShadow({ width: 0, height: 1 }, 2, 0.05),
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 8,
    textAlign: 'center',
  },
  subscriptionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 12,
    textTransform: 'capitalize',
  },
  subscriptionText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 12,
  },
  upgradeButton: {
    marginTop: 4,
  },
  bottomPadding: {
    height: 40,
  },
});
