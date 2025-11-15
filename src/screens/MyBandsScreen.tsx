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
import { bandService } from '../services';
import { Card, LoadingSpinner, ErrorMessage, EmptyState, StatusBadge, Button } from '../components/common';
import { Band, BandLimits } from '../types';

export default function MyBandsScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bands, setBands] = useState<Band[]>([]);
  const [limits, setLimits] = useState<BandLimits | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [bandsData, limitsData] = await Promise.all([
        bandService.getMyBands(),
        bandService.getBandLimits(),
      ]);
      setBands(bandsData);
      setLimits(limitsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load bands');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, []);

  const handleBandPress = (band: Band) => {
    navigation.navigate('BandDetails', { bandId: band.id });
  };

  const handleCreateBand = () => {
    if (limits && !limits.canCreateMore) {
      Alert.alert(
        'Band Limit Reached',
        `You've reached your limit of ${limits.maxBands} band${limits.maxBands === 1 ? '' : 's'} on your ${limits.planName} plan.\n\n${
          limits.isCustomLimit
            ? 'Contact your booking agent for a higher limit.'
            : 'Upgrade to Premium or Streaming Pro to create more bands!'
        }`,
        [
          { text: 'OK', style: 'cancel' },
          ...(!limits.isCustomLimit
            ? [{ text: 'View Plans', onPress: () => navigation.navigate('Subscriptions') }]
            : []),
        ]
      );
      return;
    }
    navigation.navigate('CreateBand');
  };

  const handleJoinBand = () => {
    if (limits && !limits.canCreateMore) {
      Alert.alert(
        'Band Limit Reached',
        `You've reached your limit of ${limits.maxBands} band${limits.maxBands === 1 ? '' : 's'} on your ${limits.planName} plan.\n\nPlease upgrade to join more bands.`,
        [
          { text: 'OK', style: 'cancel' },
          { text: 'View Plans', onPress: () => navigation.navigate('Subscriptions') },
        ]
      );
      return;
    }
    navigation.navigate('JoinBand');
  };

  if (loading && !refreshing) {
    return <LoadingSpinner message="Loading your bands..." fullScreen />;
  }

  if (error && !bands.length) {
    return (
      <ErrorMessage
        title="Couldn't Load Bands"
        message={error}
        onRetry={loadData}
        fullScreen
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Limits */}
      {limits && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Bands</Text>
          <View style={styles.limitsContainer}>
            <Text style={styles.limitsText}>
              {limits.currentCount} of {limits.maxBands} bands
            </Text>
            <View
              style={[
                styles.limitsDot,
                limits.canCreateMore ? styles.limitsGood : styles.limitsMax,
              ]}
            />
          </View>
          <Text style={styles.planText}>{limits.planName} Plan</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {/* Empty State */}
        {bands.length === 0 && (
          <EmptyState
            icon="musical-notes"
            title="No Bands Yet"
            message="Create your first band or join an existing one to start booking gigs and collaborating with other musicians!"
            actionLabel="Create Band"
            onAction={handleCreateBand}
          />
        )}

        {/* Bands List */}
        {bands.map((band) => (
          <Card
            key={band.id}
            onPress={() => handleBandPress(band)}
            variant="elevated"
            style={styles.bandCard}
          >
            <View style={styles.bandHeader}>
              <View style={styles.bandIcon}>
                <Ionicons
                  name={band.role === 'owner' ? 'crown' : 'person'}
                  size={24}
                  color="#6366f1"
                />
              </View>
              <View style={styles.bandInfo}>
                <Text style={styles.bandName}>{band.band_name}</Text>
                <View style={styles.bandMeta}>
                  <Text style={styles.bandRole}>
                    {band.role === 'owner' ? '👑 Owner' : '🎸 Member'}
                  </Text>
                  {band.genre && (
                    <Text style={styles.bandGenre}> • {band.genre}</Text>
                  )}
                </View>
              </View>
              <StatusBadge status={band.status} type="user" />
            </View>

            {band.description && (
              <Text style={styles.bandDescription} numberOfLines={2}>
                {band.description}
              </Text>
            )}

            <View style={styles.bandFooter}>
              {band.booking_manager_name && (
                <View style={styles.managerBadge}>
                  <Ionicons name="briefcase-outline" size={14} color="#64748b" />
                  <Text style={styles.managerText}>{band.booking_manager_name}</Text>
                </View>
              )}

              {band.band_email && (
                <View style={styles.emailBadge}>
                  <Ionicons name="mail-outline" size={14} color="#64748b" />
                  <Text style={styles.emailText}>{band.band_email}</Text>
                </View>
              )}
            </View>
          </Card>
        ))}

        {/* Create/Join Buttons */}
        {bands.length > 0 && (
          <View style={styles.actionButtons}>
            <Button
              title="Create New Band"
              onPress={handleCreateBand}
              variant="primary"
              icon="add-circle-outline"
              fullWidth
              style={styles.actionButton}
            />
            <Button
              title="Join Existing Band"
              onPress={handleJoinBand}
              variant="outline"
              icon="person-add-outline"
              fullWidth
              style={styles.actionButton}
            />
          </View>
        )}

        {/* Upgrade Prompt */}
        {limits && !limits.canCreateMore && !limits.isCustomLimit && (
          <Card style={styles.upgradeCard}>
            <View style={styles.upgradeContent}>
              <Ionicons name="trophy" size={32} color="#f59e0b" />
              <Text style={styles.upgradeTitle}>
                Reached Your Band Limit
              </Text>
              <Text style={styles.upgradeMessage}>
                Upgrade to Premium or Streaming Pro to create more bands and unlock additional features!
              </Text>
              <Button
                title="View Plans"
                onPress={() => navigation.navigate('Subscriptions')}
                variant="primary"
                icon="arrow-forward"
                style={styles.upgradeButton}
              />
            </View>
          </Card>
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
    marginBottom: 12,
  },
  limitsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  limitsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginRight: 8,
  },
  limitsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  limitsGood: {
    backgroundColor: '#10b981',
  },
  limitsMax: {
    backgroundColor: '#f59e0b',
  },
  planText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  content: {
    flex: 1,
    padding: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  bandRole: {
    fontSize: 14,
    color: '#64748b',
  },
  bandGenre: {
    fontSize: 14,
    color: '#94a3b8',
  },
  bandDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  bandFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  managerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  managerText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emailText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    marginBottom: 0,
  },
  upgradeCard: {
    marginTop: 16,
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
  },
  upgradeContent: {
    alignItems: 'center',
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  upgradeMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradeButton: {
    minWidth: 150,
  },
  bottomPadding: {
    height: 40,
  },
});
