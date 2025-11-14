import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import { UserType } from '../types';

// Mock data - will be replaced with real API calls
const getMockDashboardData = (userType: UserType) => {
  const common = {
    upcomingBookings: 3,
    unreadMessages: 5,
    connections: 24,
  };

  switch (userType) {
    case 'booking_agent':
      return {
        ...common,
        rosterCount: 12,
        pendingRequests: 7,
        thisMonthBookings: 15,
        revenue: 8450,
      };
    case 'artist':
    case 'band':
      return {
        ...common,
        upcomingGigs: 4,
        profileViews: 156,
        mediaUploads: 8,
      };
    case 'studio':
      return {
        ...common,
        bookingsThisWeek: 6,
        availableSlots: 12,
        totalHours: 45,
      };
    case 'venue':
      return {
        ...common,
        eventsThisMonth: 18,
        inquiries: 9,
        capacity: 500,
      };
    default:
      return common;
  }
};

export default function HomeScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      if (user?.userType) {
        setDashboardData(getMockDashboardData(user.userType));
      }
      setLoading(false);
    }, 500);
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'booking_agent':
        return 'briefcase';
      case 'artist':
        return 'mic';
      case 'band':
        return 'people';
      case 'studio':
        return 'recording';
      case 'venue':
        return 'location';
      default:
        return 'person';
    }
  };

  const renderStats = () => {
    if (!dashboardData) return null;

    if (user?.userType === 'booking_agent') {
      return (
        <>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people-outline" size={24} color="#007AFF" />
              <Text style={styles.statValue}>{dashboardData.rosterCount}</Text>
              <Text style={styles.statLabel}>Artists in Roster</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>{dashboardData.thisMonthBookings}</Text>
              <Text style={styles.statLabel}>Bookings This Month</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="hourglass-outline" size={24} color="#FFA500" />
              <Text style={styles.statValue}>{dashboardData.pendingRequests}</Text>
              <Text style={styles.statLabel}>Pending Requests</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cash-outline" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>${dashboardData.revenue.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Revenue</Text>
            </View>
          </View>
        </>
      );
    }

    if (user?.userType === 'artist' || user?.userType === 'band') {
      return (
        <>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="musical-notes-outline" size={24} color="#007AFF" />
              <Text style={styles.statValue}>{dashboardData.upcomingGigs}</Text>
              <Text style={styles.statLabel}>Upcoming Gigs</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="eye-outline" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>{dashboardData.profileViews}</Text>
              <Text style={styles.statLabel}>Profile Views</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="images-outline" size={24} color="#FFA500" />
              <Text style={styles.statValue}>{dashboardData.mediaUploads}</Text>
              <Text style={styles.statLabel}>Media Files</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="people-outline" size={24} color="#9C27B0" />
              <Text style={styles.statValue}>{dashboardData.connections}</Text>
              <Text style={styles.statLabel}>Connections</Text>
            </View>
          </View>
        </>
      );
    }

    if (user?.userType === 'studio') {
      return (
        <>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={24} color="#007AFF" />
              <Text style={styles.statValue}>{dashboardData.bookingsThisWeek}</Text>
              <Text style={styles.statLabel}>Bookings This Week</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>{dashboardData.availableSlots}</Text>
              <Text style={styles.statLabel}>Available Slots</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="hourglass-outline" size={24} color="#FFA500" />
              <Text style={styles.statValue}>{dashboardData.totalHours}h</Text>
              <Text style={styles.statLabel}>Booked Hours</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="chatbubbles-outline" size={24} color="#9C27B0" />
              <Text style={styles.statValue}>{dashboardData.unreadMessages}</Text>
              <Text style={styles.statLabel}>Messages</Text>
            </View>
          </View>
        </>
      );
    }

    if (user?.userType === 'venue') {
      return (
        <>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={24} color="#007AFF" />
              <Text style={styles.statValue}>{dashboardData.eventsThisMonth}</Text>
              <Text style={styles.statLabel}>Events This Month</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="mail-outline" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>{dashboardData.inquiries}</Text>
              <Text style={styles.statLabel}>New Inquiries</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people-outline" size={24} color="#FFA500" />
              <Text style={styles.statValue}>{dashboardData.capacity}</Text>
              <Text style={styles.statLabel}>Capacity</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="star-outline" size={24} color="#9C27B0" />
              <Text style={styles.statValue}>4.8</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>
        </>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>
              Welcome back, {user?.username || 'User'}!
            </Text>
            <View style={styles.userTypeBadge}>
              <Ionicons
                name={getUserTypeIcon(user?.userType || '')}
                size={14}
                color="#fff"
              />
              <Text style={styles.userTypeText}>
                {user?.userType?.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        {renderStats()}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="search-outline" size={24} color="#007AFF" />
            </View>
            <Text style={styles.actionText}>Find {user?.userType === 'booking_agent' ? 'Artists' : 'Collaborators'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="calendar-outline" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.actionText}>View Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="chatbubbles-outline" size={24} color="#FFA500" />
            </View>
            <Text style={styles.actionText}>Messages</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIconContainer}>
              <Ionicons name="add-circle-outline" size={24} color="#9C27B0" />
            </View>
            <Text style={styles.actionText}>Create Booking</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityCard}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text style={styles.activityText}>
            New booking confirmed for Nov 25th
          </Text>
        </View>
        <View style={styles.activityCard}>
          <Ionicons name="mail" size={20} color="#007AFF" />
          <Text style={styles.activityText}>
            3 new messages from connections
          </Text>
        </View>
        <View style={styles.activityCard}>
          <Ionicons name="person-add" size={20} color="#9C27B0" />
          <Text style={styles.activityText}>
            5 new profile views this week
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#6366f1',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  userTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  userTypeText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
    fontWeight: '600',
  },
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F44336',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
});
