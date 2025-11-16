import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import { tourService } from '../services';
import { LoadingSpinner, ErrorMessage, StatusBadge, Button } from '../components/common';
import { TourDate } from '../types';
import { formatLongDate, formatTime } from '../utils/dateFormatters';
import theme from '../theme';

interface TourDetailsProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
  route: {
    params: {
      tourId: string;
    };
  };
}

export default function TourDetails({ navigation, route }: TourDetailsProps) {
  const { tourId } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tour, setTour] = useState<TourDate | null>(null);

  useEffect(() => {
    loadTourDetails();
  }, [tourId]);

  const loadTourDetails = async () => {
    try {
      setError(null);
      const tours = await tourService.getTours();
      const tourData = tours.find((t) => t.id === tourId);
      if (!tourData) {
        setError('Tour not found');
        return;
      }
      setTour(tourData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tour details';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleContact = () => {
    if (tour?.venue_contact_email) {
      Linking.openURL(`mailto:${tour.venue_contact_email}`).catch((err) => {
        console.error('Failed to open email:', err);
        Alert.alert('Error', 'Unable to open email client');
      });
    } else {
      Alert.alert(
        'No Contact Info',
        'Contact information is not available for this venue. Please reach out through your booking agent or check the venue details.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleGetDirections = () => {
    if (!tour) return;

    const address = tour.address
      ? `${tour.address}, ${tour.city}, ${tour.state}`
      : `${tour.city}, ${tour.state}`;

    const url = Platform.OS === 'ios'
      ? `maps://app?daddr=${encodeURIComponent(address)}`
      : `geo:0,0?q=${encodeURIComponent(address)}`;

    Linking.openURL(url).catch((err) => {
      console.error('Failed to open maps:', err);
      Alert.alert('Error', 'Unable to open maps application');
    });
  };

  const handleCancelTour = () => {
    Alert.alert(
      'Cancel Gig',
      'Are you sure you want to cancel this gig? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await tourService.cancelTour(tourId);
              Alert.alert('Success', 'Gig cancelled successfully', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err) {
              Alert.alert('Error', 'Failed to cancel gig');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading tour details..." fullScreen />;
  }

  if (error || !tour) {
    return (
      <ErrorMessage
        title="Failed to Load"
        message={error || 'Tour not found'}
        onRetry={loadTourDetails}
        fullScreen
      />
    );
  }

  const isPast = new Date(tour.date) < new Date();
  const canCancel = !isPast && tour.status !== 'cancelled' && tour.status !== 'completed';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gig Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.dateBox}>
              <Text style={styles.dateDay}>{new Date(tour.date).getDate()}</Text>
              <Text style={styles.dateMonth}>
                {new Date(tour.date).toLocaleDateString('en-US', { month: 'short' })}
              </Text>
            </View>
            <View style={styles.cardHeaderInfo}>
              <Text style={styles.venueName}>{tour.venue_name}</Text>
              <StatusBadge status={tour.status} type="tour" />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Band Info */}
          {tour.band_name && (
            <View style={styles.infoRow}>
              <Ionicons name="musical-notes" size={20} color={theme.colors.primary[600]} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Band</Text>
                <Text style={styles.infoValue}>{tour.band_name}</Text>
              </View>
            </View>
          )}

          {/* Date & Time */}
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={20} color={theme.colors.primary[600]} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Date & Time</Text>
              <Text style={styles.infoValue}>
                {formatLongDate(tour.date)}
              </Text>
              {tour.start_time && (
                <Text style={styles.infoSubvalue}>
                  {formatTime(tour.start_time)}
                  {tour.end_time && ` - ${formatTime(tour.end_time)}`}
                </Text>
              )}
            </View>
          </View>

          {/* Location */}
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color={theme.colors.primary[600]} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Location</Text>
              {tour.address && <Text style={styles.infoValue}>{tour.address}</Text>}
              <Text style={styles.infoSubvalue}>
                {tour.city}, {tour.state}
              </Text>
            </View>
            {tour.address && (
              <TouchableOpacity onPress={handleGetDirections} style={styles.actionIcon}>
                <Ionicons name="navigate" size={20} color={theme.colors.primary[600]} />
              </TouchableOpacity>
            )}
          </View>

          {/* Payment Info */}
          {tour.payment_amount && (
            <View style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <Ionicons name="cash" size={24} color={theme.colors.accent.green} />
                <Text style={styles.paymentLabel}>Payment</Text>
              </View>
              <Text style={styles.paymentAmount}>
                ${tour.payment_amount.toFixed(2)} {tour.payment_currency || 'USD'}
              </Text>
              {tour.payment_status && (
                <StatusBadge status={tour.payment_status} type="payment" />
              )}
            </View>
          )}

          {/* Notes */}
          {tour.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{tour.notes}</Text>
            </View>
          )}
        </View>

        {/* Performance Metrics (for completed gigs) */}
        {(tour.status === 'completed' && (tour.attendance || tour.bar_sales)) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Performance Metrics</Text>
            <View style={styles.metricsRow}>
              {tour.attendance && (
                <View style={styles.metricBox}>
                  <Ionicons name="people" size={24} color={theme.colors.primary[600]} />
                  <Text style={styles.metricValue}>{tour.attendance}</Text>
                  <Text style={styles.metricLabel}>Attendance</Text>
                </View>
              )}
              {tour.bar_sales && (
                <View style={styles.metricBox}>
                  <Ionicons name="cash" size={24} color={theme.colors.accent.green} />
                  <Text style={styles.metricValue}>${tour.bar_sales}</Text>
                  <Text style={styles.metricLabel}>Bar Sales</Text>
                </View>
              )}
              {tour.new_customers && (
                <View style={styles.metricBox}>
                  <Ionicons name="person-add" size={24} color={theme.colors.accent.blue} />
                  <Text style={styles.metricValue}>{tour.new_customers}</Text>
                  <Text style={styles.metricLabel}>New Customers</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        {tour.venue_contact_email ? (
          <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
            <Ionicons name="mail" size={20} color="white" />
            <Text style={styles.contactButtonText}>Contact Venue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.contactButton, styles.contactButtonDisabled]}
            onPress={handleContact}
          >
            <Ionicons name="mail-outline" size={20} color="white" />
            <Text style={styles.contactButtonText}>No Contact Info</Text>
          </TouchableOpacity>
        )}
        {canCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelTour}>
            <Ionicons name="close-circle" size={20} color={theme.colors.error} />
            <Text style={styles.cancelButtonText}>Cancel Gig</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingTop: 60,
    paddingBottom: theme.spacing.base,
    backgroundColor: theme.colors.primary[600],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: 'white',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: theme.spacing.base,
  },
  card: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.base,
    ...theme.shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  dateBox: {
    width: 70,
    height: 70,
    backgroundColor: theme.colors.primary[600],
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  dateDay: {
    fontSize: 28,
    fontWeight: theme.typography.fontWeights.bold,
    color: 'white',
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: theme.typography.fontWeights.semibold,
    color: 'white',
    textTransform: 'uppercase',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.gray[200],
    marginVertical: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  infoContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  infoLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text.primary,
  },
  infoSubvalue: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentCard: {
    backgroundColor: theme.colors.accent.greenLight,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  paymentLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.accent.green,
    marginLeft: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  paymentAmount: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.accent.green,
  },
  notesSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  notesLabel: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  notesText: {
    fontSize: theme.typography.sizes.base,
    color: theme.colors.text.primary,
    lineHeight: 22,
  },
  cardTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricBox: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.sm,
  },
  metricLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.base,
    backgroundColor: theme.colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
    gap: theme.spacing.md,
    ...(Platform.OS === 'ios' && {
      paddingBottom: Math.max(theme.spacing.base, 20),
    }),
    ...(Platform.OS === 'web' && {
      position: 'sticky' as any,
      bottom: 0,
      zIndex: 100,
      boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
    }),
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary[600],
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  contactButtonDisabled: {
    backgroundColor: theme.colors.gray[400],
    opacity: 0.7,
  },
  contactButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.fontWeights.semibold,
    color: 'white',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 1,
    borderColor: theme.colors.error,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  cancelButtonText: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.error,
  },
  bottomPadding: {
    height: 20,
  },
});
