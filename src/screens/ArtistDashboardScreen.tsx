import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import { bandService } from '../services';
import { Card, LoadingSpinner, ErrorMessage, EmptyState, StatusBadge } from '../components/common';
import { ArtistDashboardData, Band, TourDate } from '../types';
import { createShadow } from '../theme';

interface ArtistDashboardScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

export default function ArtistDashboardScreen({ navigation }: ArtistDashboardScreenProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<ArtistDashboardData | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setError(null);
      const data = await bandService.getArtistDashboard();
      setDashboardData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard();
  }, []);

  const handleCreateBand = () => {
    navigation.navigate('CreateBand');
  };

  const handleBandPress = (band: Band) => {
    navigation.navigate('BandDetails', { bandId: band.id });
  };

  const handleTourPress = (tour: TourDate) => {
    navigation.navigate('TourDetails', { tourId: tour.id });
  };

  const handleViewAllBands = () => {
    navigation.navigate('MyBands');
  };

  const handleViewPayments = () => {
    navigation.navigate('PaymentLedger');
  };

  if (loading && !refreshing) {
    return <LoadingSpinner message="Loading your dashboard..." fullScreen />;
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

  const bands = dashboardData?.bands || [];
  const upcomingTours = dashboardData?.tours.filter(t => t.is_upcoming) || [];
  const completedTours = dashboardData?.tours.filter(t => !t.is_upcoming).slice(0, 3) || [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name}! 👋</Text>
          <Text style={styles.subGreeting}>Welcome back to Artist Space</Text>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="musical-notes" size={24} color="#6366f1" />
          <Text style={styles.statValue}>{bands.length}</Text>
          <Text style={styles.statLabel}>
            {bands.length === 1 ? 'Band' : 'Bands'}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="calendar" size={24} color="#10b981" />
          <Text style={styles.statValue}>{upcomingTours.length}</Text>
          <Text style={styles.statLabel}>
            {upcomingTours.length === 1 ? 'Upcoming Gig' : 'Upcoming Gigs'}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="images" size={24} color="#f59e0b" />
          <Text style={styles.statValue}>{dashboardData?.media.length || 0}</Text>
          <Text style={styles.statLabel}>Media Files</Text>
        </View>
      </View>

      {/* No Bands - Show Onboarding */}
      {bands.length === 0 && (
        <Card style={styles.onboardingCard}>
          <EmptyState
            icon="musical-notes"
            title="Welcome to Artist Space!"
            message="Start by creating your first band or joining an existing one. Once you're set up, you can start booking gigs!"
            actionLabel="Create Your First Band"
            onAction={handleCreateBand}
          />
        </Card>
      )}

      {/* My Bands */}
      {bands.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Bands</Text>
            {bands.length > 2 && (
              <TouchableOpacity onPress={handleViewAllBands}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            )}
          </View>

          {bands.slice(0, 2).map((band) => (
            <Card
              key={band.id}
              onPress={() => handleBandPress(band)}
              variant="elevated"
              style={styles.bandCard}
            >
              <View style={styles.bandHeader}>
                <View style={styles.bandIcon}>
                  <Ionicons name="people" size={24} color="#6366f1" />
                </View>
                <View style={styles.bandInfo}>
                  <Text style={styles.bandName}>{band.band_name}</Text>
                  <Text style={styles.bandMeta}>
                    {band.role === 'owner' ? '👑 Band Owner' : '🎸 Member'}
                    {band.genre && ` • ${band.genre}`}
                  </Text>
                </View>
                <StatusBadge status={band.status} type="user" />
              </View>
              {band.description && (
                <Text style={styles.bandDescription} numberOfLines={2}>
                  {band.description}
                </Text>
              )}
              {band.booking_manager_name && (
                <View style={styles.managerInfo}>
                  <Ionicons name="briefcase-outline" size={16} color="#64748b" />
                  <Text style={styles.managerText}>
                    Manager: {band.booking_manager_name}
                  </Text>
                </View>
              )}
            </Card>
          ))}
        </View>
      )}

      {/* Upcoming Gigs */}
      {upcomingTours.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎤 Upcoming Gigs</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Calendar')}>
              <Text style={styles.seeAll}>Calendar</Text>
            </TouchableOpacity>
          </View>

          {upcomingTours.map((tour) => (
            <Card
              key={tour.id}
              onPress={() => handleTourPress(tour)}
              variant="outlined"
              style={styles.tourCard}
            >
              <View style={styles.tourHeader}>
                <View style={styles.tourDate}>
                  <Text style={styles.tourDay}>
                    {new Date(tour.date).getDate()}
                  </Text>
                  <Text style={styles.tourMonth}>
                    {new Date(tour.date).toLocaleDateString('en-US', { month: 'short' })}
                  </Text>
                </View>
                <View style={styles.tourInfo}>
                  <Text style={styles.tourVenue}>{tour.venue_name}</Text>
                  <Text style={styles.tourLocation}>
                    {tour.city}, {tour.state}
                  </Text>
                  <Text style={styles.tourTime}>
                    {tour.start_time}
                    {tour.payment_amount && (
                      <Text style={styles.tourPayment}>
                        {' '}• ${tour.payment_amount}
                      </Text>
                    )}
                  </Text>
                </View>
                <StatusBadge status={tour.status} type="tour" />
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Recent Activity */}
      {completedTours.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Recent Gigs</Text>

          {completedTours.map((tour) => (
            <Card
              key={tour.id}
              onPress={() => handleTourPress(tour)}
              style={styles.activityCard}
            >
              <View style={styles.activityRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>
                    {tour.venue_name} • {tour.band_name}
                  </Text>
                  <Text style={styles.activityDate}>
                    {new Date(tour.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCreateBand}
          >
            <Ionicons name="add-circle" size={32} color="#6366f1" />
            <Text style={styles.actionLabel}>Create Band</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('JoinBand')}
          >
            <Ionicons name="person-add" size={32} color="#10b981" />
            <Text style={styles.actionLabel}>Join Band</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleViewPayments}
          >
            <Ionicons name="cash" size={32} color="#f59e0b" />
            <Text style={styles.actionLabel}>My Payments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Messages')}
          >
            <Ionicons name="chatbubbles" size={32} color="#8b5cf6" />
            <Text style={styles.actionLabel}>Messages</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Booking Agents */}
      {dashboardData && dashboardData.bookingAgents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤝 My Booking Agents</Text>
          {dashboardData.bookingAgents.map((agent) => (
            <Card key={agent.id} style={styles.agentCard}>
              <View style={styles.agentRow}>
                <View style={styles.agentIcon}>
                  <Ionicons name="briefcase" size={20} color="#6366f1" />
                </View>
                <View style={styles.agentInfo}>
                  <Text style={styles.agentName}>{agent.name}</Text>
                  <Text style={styles.agentEmail}>{agent.email}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Chat', { userId: agent.id })}
                >
                  <Ionicons name="chatbubble-outline" size={24} color="#6366f1" />
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </View>
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
  },
  seeAll: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  onboardingCard: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  bandCard: {
    marginBottom: 12,
  },
  bandHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bandIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bandInfo: {
    flex: 1,
  },
  bandName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  bandMeta: {
    fontSize: 14,
    color: '#64748b',
  },
  bandDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  managerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  managerText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
  },
  tourCard: {
    marginBottom: 12,
  },
  tourHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tourDate: {
    width: 50,
    alignItems: 'center',
    marginRight: 12,
  },
  tourDay: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366f1',
  },
  tourMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  tourInfo: {
    flex: 1,
  },
  tourVenue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  tourLocation: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  tourTime: {
    fontSize: 14,
    color: '#64748b',
  },
  tourPayment: {
    color: '#10b981',
    fontWeight: '600',
  },
  activityCard: {
    marginBottom: 8,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: '#64748b',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
  agentCard: {
    marginBottom: 8,
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  agentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  agentEmail: {
    fontSize: 12,
    color: '#64748b',
  },
  bottomPadding: {
    height: 40,
  },
});
