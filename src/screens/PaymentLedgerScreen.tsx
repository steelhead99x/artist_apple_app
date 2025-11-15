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
import { paymentService } from '../services';
import {
  Card,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
  StatusBadge,
} from '../components/common';
import { TourPayment } from '../types';

type FilterType = 'all' | 'pending' | 'paid' | 'failed';

export default function PaymentLedgerScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [payments, setPayments] = useState<TourPayment[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setError(null);
      const data = await paymentService.getMyPayments();
      setPayments(data.sort((a, b) =>
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      ));
    } catch (err: any) {
      console.error('Load payments error:', err);
      setError(err.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPayments();
  }, []);

  const handlePaymentPress = (payment: TourPayment) => {
    if (payment.tour_id) {
      navigation.navigate('TourDetails', { tourId: payment.tour_id });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredPayments = payments.filter((payment) => {
    if (filter === 'all') return true;
    return payment.status === filter;
  });

  const totalEarnings = payments
    .filter((p) => p.status === 'paid' || p.status === 'succeeded')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingAmount = payments
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  if (loading && !refreshing) {
    return <LoadingSpinner message="Loading payment history..." fullScreen />;
  }

  if (error && !payments.length) {
    return (
      <ErrorMessage
        title="Couldn't Load Payments"
        message={error}
        onRetry={loadPayments}
        fullScreen
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payment Ledger</Text>
        <Text style={styles.headerSubtitle}>Track your earnings and payments</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="cash" size={24} color="#10b981" />
          </View>
          <Text style={styles.statValue}>${totalEarnings.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total Earned</Text>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="time" size={24} color="#f59e0b" />
          </View>
          <Text style={styles.statValue}>${pendingAmount.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </Card>

        <Card style={styles.statCard}>
          <View style={styles.statIcon}>
            <Ionicons name="receipt" size={24} color="#6366f1" />
          </View>
          <Text style={styles.statValue}>{payments.length}</Text>
          <Text style={styles.statLabel}>Transactions</Text>
        </Card>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All ({payments.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filter === 'paid' && styles.filterTabActive]}
            onPress={() => setFilter('paid')}
          >
            <Text style={[styles.filterText, filter === 'paid' && styles.filterTextActive]}>
              Paid ({payments.filter((p) => p.status === 'paid' || p.status === 'succeeded').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
            onPress={() => setFilter('pending')}
          >
            <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
              Pending ({payments.filter((p) => p.status === 'pending').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filter === 'failed' && styles.filterTabActive]}
            onPress={() => setFilter('failed')}
          >
            <Text style={[styles.filterText, filter === 'failed' && styles.filterTextActive]}>
              Failed ({payments.filter((p) => p.status === 'failed').length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Payments List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {filteredPayments.length === 0 ? (
          <EmptyState
            icon={filter === 'all' ? 'cash-outline' : 'filter-outline'}
            title={filter === 'all' ? 'No Payments Yet' : `No ${filter} Payments`}
            message={
              filter === 'all'
                ? 'Your payment history will appear here once you start receiving payments for your gigs.'
                : `You don't have any ${filter} payments at the moment.`
            }
          />
        ) : (
          filteredPayments.map((payment) => (
            <Card
              key={payment.id}
              onPress={() => handlePaymentPress(payment)}
              variant="elevated"
              style={styles.paymentCard}
            >
              <View style={styles.paymentHeader}>
                {/* Payment Icon */}
                <View
                  style={[
                    styles.paymentIcon,
                    payment.status === 'paid' || payment.status === 'succeeded'
                      ? styles.paymentIconPaid
                      : payment.status === 'pending'
                      ? styles.paymentIconPending
                      : styles.paymentIconFailed,
                  ]}
                >
                  <Ionicons
                    name={
                      payment.status === 'paid' || payment.status === 'succeeded'
                        ? 'checkmark'
                        : payment.status === 'pending'
                        ? 'time'
                        : 'close'
                    }
                    size={24}
                    color="#ffffff"
                  />
                </View>

                {/* Payment Info */}
                <View style={styles.paymentInfo}>
                  <View style={styles.paymentTitleRow}>
                    <Text style={styles.paymentAmount}>${payment.amount?.toFixed(2)}</Text>
                    <StatusBadge status={payment.status} type="payment" />
                  </View>

                  {payment.tour_venue_name && (
                    <Text style={styles.paymentVenue}>{payment.tour_venue_name}</Text>
                  )}

                  {payment.tour_date && (
                    <View style={styles.paymentMetaRow}>
                      <Ionicons name="calendar-outline" size={12} color="#94a3b8" />
                      <Text style={styles.paymentDate}>
                        Gig: {formatDate(payment.tour_date)}
                      </Text>
                    </View>
                  )}

                  {payment.created_at && (
                    <View style={styles.paymentMetaRow}>
                      <Ionicons name="time-outline" size={12} color="#94a3b8" />
                      <Text style={styles.paymentDate}>
                        Payment: {formatDate(payment.created_at)}
                      </Text>
                    </View>
                  )}

                  {payment.band_name && (
                    <View style={styles.paymentMetaRow}>
                      <Ionicons name="musical-notes" size={12} color="#94a3b8" />
                      <Text style={styles.paymentBand}>{payment.band_name}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Payment Description/Notes */}
              {payment.description && (
                <Text style={styles.paymentDescription} numberOfLines={2}>
                  {payment.description}
                </Text>
              )}

              {/* Payout Info */}
              {payment.stripe_payout_id && (
                <View style={styles.payoutInfo}>
                  <Ionicons name="card-outline" size={14} color="#64748b" />
                  <Text style={styles.payoutText}>
                    Payout ID: {payment.stripe_payout_id.substring(0, 20)}...
                  </Text>
                </View>
              )}
            </Card>
          ))
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  filterTabActive: {
    backgroundColor: '#6366f1',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  paymentCard: {
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentIconPaid: {
    backgroundColor: '#10b981',
  },
  paymentIconPending: {
    backgroundColor: '#f59e0b',
  },
  paymentIconFailed: {
    backgroundColor: '#ef4444',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paymentAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  paymentVenue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
  },
  paymentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  paymentDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 6,
  },
  paymentBand: {
    fontSize: 12,
    color: '#94a3b8',
    marginLeft: 6,
  },
  paymentDescription: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  payoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  payoutText: {
    fontSize: 11,
    color: '#64748b',
    marginLeft: 6,
    fontFamily: 'monospace',
  },
  bottomPadding: {
    height: 40,
  },
});
