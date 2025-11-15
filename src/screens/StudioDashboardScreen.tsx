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
import { studioService } from '../services';
import {
  Card,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
  StatusBadge,
  Button,
} from '../components/common';
import { StudioDashboardData, RecordingSession, RecordingStudio } from '../types';

interface StudioDashboardScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

export default function StudioDashboardScreen({ navigation }: StudioDashboardScreenProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<StudioDashboardData | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setError(null);
      const data = await studioService.getStudioDashboard();
      setDashboardData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load studio dashboard';
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

  const handleSessionPress = (session: RecordingSession) => {
    navigation.navigate('SessionDetails', { sessionId: session.id });
  };

  const handleEditStudio = () => {
    navigation.navigate('EditStudio', { studioId: dashboardData?.studio.id });
  };

  const handleViewAllSessions = () => {
    navigation.navigate('StudioSessions');
  };

  const handleViewEarnings = () => {
    navigation.navigate('StudioEarnings');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const date = new Date(timeString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    }
    return timeString;
  };

  if (loading && !refreshing) {
    return <LoadingSpinner message="Loading studio dashboard..." fullScreen />;
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

  const { studio, upcomingSessions, recentSessions, stats, pendingRequests } = dashboardData;
  const upcomingCount = upcomingSessions?.length || 0;
  const pendingCount = pendingRequests?.length || 0;

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
            <Text style={styles.greeting}>Hello, {user?.name}! 🎙️</Text>
            <Text style={styles.subGreeting}>Welcome to your studio</Text>
          </View>
          <TouchableOpacity onPress={handleEditStudio}>
            <Ionicons name="settings-outline" size={24} color="#6366f1" />
          </TouchableOpacity>
        </View>

        {/* Studio Info */}
        {studio && (
          <Card style={styles.studioCard}>
            <View style={styles.studioHeader}>
              <View style={styles.studioIcon}>
                <Ionicons name="recording" size={32} color="#6366f1" />
              </View>
              <View style={styles.studioInfo}>
                <Text style={styles.studioName}>{studio.studio_name}</Text>
                {studio.location && (
                  <Text style={styles.studioLocation}>📍 {studio.location}</Text>
                )}
                <StatusBadge status={studio.status} type="user" />
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
            {upcomingCount === 1 ? 'Session' : 'Sessions'}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="time" size={24} color="#f59e0b" />
          <Text style={styles.statValue}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="cash" size={24} color="#10b981" />
          <Text style={styles.statValue}>
            ${stats?.totalRevenue?.toFixed(0) || '0'}
          </Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      {/* Pending Booking Requests */}
      {pendingRequests && pendingRequests.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⏳ Pending Requests ({pendingCount})</Text>
          </View>

          {pendingRequests.slice(0, 3).map((request) => (
            <Card
              key={request.id}
              onPress={() => handleSessionPress(request)}
              variant="outlined"
              style={styles.requestCard}
            >
              <View style={styles.requestHeader}>
                <View style={styles.requestIcon}>
                  <Ionicons name="person-outline" size={20} color="#f59e0b" />
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestArtist}>{request.artist_name}</Text>
                  <Text style={styles.requestDate}>
                    {formatDate(request.session_date)} at {formatTime(request.start_time)}
                  </Text>
                  {request.duration_hours && (
                    <Text style={styles.requestDuration}>
                      {request.duration_hours} hour{request.duration_hours > 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
                <StatusBadge status="pending" type="session" />
              </View>

              {request.notes && (
                <Text style={styles.requestNotes} numberOfLines={2}>
                  {request.notes}
                </Text>
              )}

              <View style={styles.requestActions}>
                <Button
                  title="Accept"
                  onPress={() => {
                    /* Handle accept */
                  }}
                  variant="success"
                  icon="checkmark-outline"
                  style={styles.requestButton}
                />
                <Button
                  title="Decline"
                  onPress={() => {
                    /* Handle decline */
                  }}
                  variant="danger"
                  icon="close-outline"
                  style={styles.requestButton}
                />
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Upcoming Sessions */}
      {upcomingSessions && upcomingSessions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📅 Upcoming Sessions</Text>
            {upcomingCount > 3 && (
              <TouchableOpacity onPress={handleViewAllSessions}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            )}
          </View>

          {upcomingSessions.slice(0, 3).map((session) => (
            <Card
              key={session.id}
              onPress={() => handleSessionPress(session)}
              variant="elevated"
              style={styles.sessionCard}
            >
              <View style={styles.sessionHeader}>
                <View style={styles.sessionDate}>
                  <Text style={styles.sessionDay}>
                    {new Date(session.session_date).getDate()}
                  </Text>
                  <Text style={styles.sessionMonth}>
                    {new Date(session.session_date).toLocaleDateString('en-US', {
                      month: 'short',
                    })}
                  </Text>
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionArtist}>{session.artist_name}</Text>
                  {session.band_name && (
                    <Text style={styles.sessionBand}>🎸 {session.band_name}</Text>
                  )}
                  <View style={styles.sessionMetaRow}>
                    <Ionicons name="time-outline" size={14} color="#64748b" />
                    <Text style={styles.sessionTime}>
                      {formatTime(session.start_time)}
                      {session.end_time && ` - ${formatTime(session.end_time)}`}
                    </Text>
                  </View>
                  {session.duration_hours && (
                    <View style={styles.sessionMetaRow}>
                      <Ionicons name="hourglass-outline" size={14} color="#64748b" />
                      <Text style={styles.sessionDuration}>
                        {session.duration_hours} hour{session.duration_hours > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </View>
                <StatusBadge status={session.status} type="session" />
              </View>

              {session.rate && (
                <View style={styles.sessionRate}>
                  <Ionicons name="cash-outline" size={16} color="#10b981" />
                  <Text style={styles.rateText}>${session.rate}/hour</Text>
                </View>
              )}
            </Card>
          ))}
        </View>
      )}

      {/* Recent Sessions */}
      {recentSessions && recentSessions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎵 Recent Sessions</Text>

          {recentSessions.map((session) => (
            <Card
              key={session.id}
              onPress={() => handleSessionPress(session)}
              style={styles.recentCard}
            >
              <View style={styles.recentRow}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <View style={styles.recentInfo}>
                  <Text style={styles.recentArtist}>{session.artist_name}</Text>
                  <Text style={styles.recentDate}>
                    {formatDate(session.session_date)}
                  </Text>
                </View>
                {session.rate && session.duration_hours && (
                  <Text style={styles.recentEarning}>
                    ${(session.rate * session.duration_hours).toFixed(0)}
                  </Text>
                )}
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
            onPress={() => navigation.navigate('CreateSession')}
          >
            <Ionicons name="add-circle" size={32} color="#6366f1" />
            <Text style={styles.actionLabel}>Book Session</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleViewAllSessions}
          >
            <Ionicons name="calendar" size={32} color="#10b981" />
            <Text style={styles.actionLabel}>All Sessions</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleViewEarnings}>
            <Ionicons name="stats-chart" size={32} color="#f59e0b" />
            <Text style={styles.actionLabel}>Earnings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleEditStudio}>
            <Ionicons name="settings" size={32} color="#8b5cf6" />
            <Text style={styles.actionLabel}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Empty State */}
      {!upcomingSessions?.length && !recentSessions?.length && !pendingRequests?.length && (
        <EmptyState
          icon="recording-outline"
          title="Welcome to Your Studio!"
          message="Start by setting up your studio profile and accepting booking requests from artists. Your sessions will appear here!"
          actionLabel="Edit Studio Profile"
          onAction={handleEditStudio}
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
  studioCard: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    borderWidth: 1,
  },
  studioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studioIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  studioInfo: {
    flex: 1,
  },
  studioName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  studioLocation: {
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  requestCard: {
    marginBottom: 12,
    borderColor: '#fef3c7',
    backgroundColor: '#fffbeb',
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestArtist: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  requestDuration: {
    fontSize: 13,
    color: '#64748b',
  },
  requestNotes: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  requestButton: {
    flex: 1,
  },
  sessionCard: {
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sessionDate: {
    width: 50,
    alignItems: 'center',
    marginRight: 12,
  },
  sessionDay: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366f1',
  },
  sessionMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionArtist: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  sessionBand: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 6,
  },
  sessionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 6,
  },
  sessionDuration: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 6,
  },
  sessionRate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  rateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
    marginLeft: 8,
  },
  recentCard: {
    marginBottom: 8,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recentArtist: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  recentDate: {
    fontSize: 12,
    color: '#64748b',
  },
  recentEarning: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10b981',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 8,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
  },
});
