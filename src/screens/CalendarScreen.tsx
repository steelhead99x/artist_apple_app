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
import { tourService } from '../services';
import {
  Card,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
  StatusBadge,
  Button,
} from '../components/common';
import { TourDate } from '../types';
import { formatDate, formatLongDate, formatTime } from '../utils/dateFormatters';

type ViewType = 'upcoming' | 'past';

interface CalendarScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

export default function CalendarScreen({ navigation }: CalendarScreenProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewType, setViewType] = useState<ViewType>('upcoming');
  const [upcomingTours, setUpcomingTours] = useState<TourDate[]>([]);
  const [pastTours, setPastTours] = useState<TourDate[]>([]);

  useEffect(() => {
    loadTours();
  }, []);

  const loadTours = async () => {
    try {
      setError(null);
      const tours = await tourService.getMyTours();

      const now = new Date();
      const upcoming = tours.filter((t: TourDate) => {
        const tourDate = new Date(t.date);
        return tourDate >= now && t.status !== 'cancelled';
      });
      const past = tours.filter((t: TourDate) => {
        const tourDate = new Date(t.date);
        return tourDate < now || t.status === 'completed';
      });

      setUpcomingTours(upcoming.sort((a: TourDate, b: TourDate) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ));
      setPastTours(past.sort((a: TourDate, b: TourDate) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load calendar';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTours();
  }, []);

  const handleTourPress = (tour: TourDate) => {
    navigation.navigate('TourDetails', { tourId: tour.id });
  };

  const handleAddGig = () => {
    navigation.navigate('CreateTour');
  };

  const renderTourCard = (tour: TourDate) => (
    <Card
      key={tour.id}
      onPress={() => handleTourPress(tour)}
      variant="elevated"
      style={styles.tourCard}
    >
      <View style={styles.tourHeader}>
        {/* Date Badge */}
        <View style={styles.dateContainer}>
          <Text style={styles.dateDay}>
            {new Date(tour.date).getDate()}
          </Text>
          <Text style={styles.dateMonth}>
            {new Date(tour.date).toLocaleDateString('en-US', { month: 'short' })}
          </Text>
          <Text style={styles.dateYear}>
            {new Date(tour.date).getFullYear()}
          </Text>
        </View>

        {/* Tour Info */}
        <View style={styles.tourInfo}>
          <View style={styles.tourTitleRow}>
            <Text style={styles.venueName}>{tour.venue_name}</Text>
            <StatusBadge status={tour.status} type="tour" />
          </View>

          <View style={styles.tourMetaRow}>
            <Ionicons name="location" size={14} color="#64748b" />
            <Text style={styles.tourLocation}>
              {tour.city}, {tour.state}
            </Text>
          </View>

          {tour.start_time && (
            <View style={styles.tourMetaRow}>
              <Ionicons name="time" size={14} color="#64748b" />
              <Text style={styles.tourTime}>
                {formatTime(tour.start_time)}
                {tour.end_time && ` - ${formatTime(tour.end_time)}`}
              </Text>
            </View>
          )}

          {tour.band_name && (
            <View style={styles.tourMetaRow}>
              <Ionicons name="musical-notes" size={14} color="#64748b" />
              <Text style={styles.bandName}>{tour.band_name}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Payment Info */}
      {tour.payment_amount && (
        <View style={styles.paymentContainer}>
          <Ionicons name="cash" size={16} color="#10b981" />
          <Text style={styles.paymentAmount}>
            ${tour.payment_amount}
          </Text>
          {tour.payment_status && (
            <StatusBadge
              status={tour.payment_status}
              type="payment"
              style={styles.paymentBadge}
            />
          )}
        </View>
      )}

      {/* Notes */}
      {tour.notes && (
        <Text style={styles.tourNotes} numberOfLines={2}>
          {tour.notes}
        </Text>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {tour.venue_contact_email && (
          <TouchableOpacity style={styles.quickAction}>
            <Ionicons name="mail-outline" size={16} color="#6366f1" />
            <Text style={styles.quickActionText}>Contact</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.quickAction}>
          <Ionicons name="information-circle-outline" size={16} color="#6366f1" />
          <Text style={styles.quickActionText}>Details</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading && !refreshing) {
    return <LoadingSpinner message="Loading your calendar..." fullScreen />;
  }

  if (error && !upcomingTours.length && !pastTours.length) {
    return (
      <ErrorMessage
        title="Couldn't Load Calendar"
        message={error}
        onRetry={loadTours}
        fullScreen
      />
    );
  }

  const displayTours = viewType === 'upcoming' ? upcomingTours : pastTours;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
        <Text style={styles.headerSubtitle}>
          {upcomingTours.length} upcoming {upcomingTours.length === 1 ? 'gig' : 'gigs'}
        </Text>
      </View>

      {/* View Type Selector */}
      <View style={styles.selectorContainer}>
        <TouchableOpacity
          style={[
            styles.selectorButton,
            viewType === 'upcoming' && styles.selectorButtonActive,
          ]}
          onPress={() => setViewType('upcoming')}
        >
          <Ionicons
            name="calendar"
            size={18}
            color={viewType === 'upcoming' ? '#ffffff' : '#64748b'}
          />
          <Text
            style={[
              styles.selectorText,
              viewType === 'upcoming' && styles.selectorTextActive,
            ]}
          >
            Upcoming ({upcomingTours.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.selectorButton,
            viewType === 'past' && styles.selectorButtonActive,
          ]}
          onPress={() => setViewType('past')}
        >
          <Ionicons
            name="checkmark-done"
            size={18}
            color={viewType === 'past' ? '#ffffff' : '#64748b'}
          />
          <Text
            style={[
              styles.selectorText,
              viewType === 'past' && styles.selectorTextActive,
            ]}
          >
            Past ({pastTours.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {displayTours.length === 0 ? (
          <EmptyState
            icon={viewType === 'upcoming' ? 'calendar-outline' : 'checkmark-done-circle-outline'}
            title={viewType === 'upcoming' ? 'No Upcoming Gigs' : 'No Past Gigs'}
            message={
              viewType === 'upcoming'
                ? 'You have no upcoming performances scheduled. Create a new gig or wait for booking requests from venues!'
                : 'Your completed gigs will appear here once you finish performances.'
            }
            actionLabel={viewType === 'upcoming' ? 'Add Gig' : undefined}
            onAction={viewType === 'upcoming' ? handleAddGig : undefined}
          />
        ) : (
          displayTours.map((tour) => renderTourCard(tour))
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Add Button */}
      {viewType === 'upcoming' && (
        <TouchableOpacity style={styles.addButton} onPress={handleAddGig}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  selectorContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  selectorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectorButtonActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  selectorText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  selectorTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  tourCard: {
    marginBottom: 16,
  },
  tourHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dateContainer: {
    width: 60,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    marginRight: 12,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  dateYear: {
    fontSize: 10,
    color: '#c7d2fe',
    marginTop: 2,
  },
  tourInfo: {
    flex: 1,
  },
  tourTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  venueName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginRight: 8,
  },
  tourMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tourLocation: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 6,
  },
  tourTime: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 6,
  },
  bandName: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 6,
  },
  paymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
    marginLeft: 8,
    flex: 1,
  },
  paymentBadge: {
    marginLeft: 'auto',
  },
  tourNotes: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 6,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
    marginLeft: 4,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomPadding: {
    height: 80,
  },
});
