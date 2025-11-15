import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import { bandService } from '../services';
import {
  Card,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
  StatusBadge,
  Button,
} from '../components/common';
import { Band, BandMember, TourDate, MediaFile } from '../types';

interface BandDetailsScreenProps {
  route: {
    params: {
      bandId: string;
    };
  };
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
}

export default function BandDetailsScreen({ route, navigation }: BandDetailsScreenProps) {
  const { user } = useAuth();
  const { bandId } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [band, setBand] = useState<Band | null>(null);
  const [members, setMembers] = useState<BandMember[]>([]);
  const [upcomingTours, setUpcomingTours] = useState<TourDate[]>([]);
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    loadBandDetails();
  }, [bandId]);

  const loadBandDetails = async () => {
    try {
      setError(null);
      const [bandData, membersData, toursData, mediaData] = await Promise.all([
        bandService.getBandDetails(bandId),
        bandService.getBandMembers(bandId),
        bandService.getBandTours(bandId),
        bandService.getBandMedia(bandId),
      ]);

      setBand(bandData);
      setMembers(membersData);
      setUpcomingTours(toursData.filter((t: TourDate) => t.is_upcoming).slice(0, 5));
      setMedia(mediaData.slice(0, 6));
      setIsOwner(bandData.user_id === user?.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load band details';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBandDetails();
  }, [bandId]);

  const handleShareJoinCode = async () => {
    if (!band?.join_code) {
      Alert.alert('No Join Code', 'This band does not have a join code.');
      return;
    }

    try {
      await Share.share({
        message: `Join my band "${band.band_name}" on Artist Space! Use join code: ${band.join_code}`,
        title: 'Join My Band',
      });
    } catch (err) {
      // Share cancelled or failed - this is expected behavior, no action needed
    }
  };

  const handleOpenWebsite = () => {
    if (band?.website) {
      Linking.openURL(band.website);
    }
  };

  const handleOpenSocial = (platform: string, username: string) => {
    const urls: Record<string, string> = {
      instagram: `https://instagram.com/${username}`,
      facebook: `https://facebook.com/${username}`,
      twitter: `https://twitter.com/${username}`,
      spotify: username.startsWith('http') ? username : `https://open.spotify.com/artist/${username}`,
    };

    if (urls[platform]) {
      Linking.openURL(urls[platform]);
    }
  };

  const handleEditBand = () => {
    navigation.navigate('EditBand', { bandId: band?.id });
  };

  const handleManageMembers = () => {
    navigation.navigate('ManageMembers', { bandId: band?.id, bandName: band?.band_name });
  };

  const handleViewAllTours = () => {
    navigation.navigate('BandTours', { bandId: band?.id, bandName: band?.band_name });
  };

  const handleViewAllMedia = () => {
    navigation.navigate('BandMedia', { bandId: band?.id, bandName: band?.band_name });
  };

  const handleLeaveBand = () => {
    Alert.alert(
      'Leave Band',
      `Are you sure you want to leave "${band?.band_name}"? You'll need to be re-invited to join again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await bandService.leaveBand(bandId);
              Alert.alert('Left Band', `You've left ${band?.band_name}`, [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Failed to leave band';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleDeleteBand = () => {
    Alert.alert(
      'Delete Band',
      `Are you sure you want to delete "${band?.band_name}"? This action cannot be undone. All band data, members, and tours will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await bandService.deleteBand(bandId);
              Alert.alert('Band Deleted', `${band?.band_name} has been deleted`, [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Failed to delete band';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return <LoadingSpinner message="Loading band details..." fullScreen />;
  }

  if (error && !band) {
    return (
      <ErrorMessage
        title="Couldn't Load Band"
        message={error}
        onRetry={loadBandDetails}
        fullScreen
      />
    );
  }

  if (!band) {
    return null;
  }

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
          <View style={styles.bandIcon}>
            <Ionicons name="people" size={40} color="#6366f1" />
          </View>
          <StatusBadge status={band.status} type="user" />
        </View>

        <Text style={styles.bandName}>{band.band_name}</Text>

        {band.genre && (
          <View style={styles.genreBadge}>
            <Ionicons name="radio" size={14} color="#6366f1" />
            <Text style={styles.genreText}>{band.genre}</Text>
          </View>
        )}

        {band.description && (
          <Text style={styles.description}>{band.description}</Text>
        )}

        {/* Social Links */}
        {(band.website || band.instagram || band.facebook || band.twitter || band.spotify) && (
          <View style={styles.socialLinks}>
            {band.website && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={handleOpenWebsite}
              >
                <Ionicons name="globe" size={20} color="#6366f1" />
              </TouchableOpacity>
            )}
            {band.instagram && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleOpenSocial('instagram', band.instagram!)}
              >
                <Ionicons name="logo-instagram" size={20} color="#6366f1" />
              </TouchableOpacity>
            )}
            {band.facebook && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleOpenSocial('facebook', band.facebook!)}
              >
                <Ionicons name="logo-facebook" size={20} color="#6366f1" />
              </TouchableOpacity>
            )}
            {band.twitter && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleOpenSocial('twitter', band.twitter!)}
              >
                <Ionicons name="logo-twitter" size={20} color="#6366f1" />
              </TouchableOpacity>
            )}
            {band.spotify && (
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleOpenSocial('spotify', band.spotify!)}
              >
                <Ionicons name="musical-note" size={20} color="#6366f1" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Join Code */}
        {isOwner && band.join_code && (
          <Card style={styles.joinCodeCard}>
            <View style={styles.joinCodeContent}>
              <View style={styles.joinCodeInfo}>
                <Text style={styles.joinCodeLabel}>Join Code</Text>
                <Text style={styles.joinCode}>{band.join_code}</Text>
              </View>
              <TouchableOpacity onPress={handleShareJoinCode}>
                <Ionicons name="share-outline" size={24} color="#6366f1" />
              </TouchableOpacity>
            </View>
          </Card>
        )}
      </View>

      {/* Members Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>👥 Members ({members.length})</Text>
          {isOwner && (
            <TouchableOpacity onPress={handleManageMembers}>
              <Text style={styles.seeAll}>Manage</Text>
            </TouchableOpacity>
          )}
        </View>

        {members.length === 0 ? (
          <EmptyState
            icon="person-add"
            title="No Members Yet"
            message="Invite musicians to join your band!"
            actionLabel={isOwner ? "Invite Members" : undefined}
            onAction={isOwner ? handleManageMembers : undefined}
          />
        ) : (
          members.slice(0, 5).map((member) => (
            <Card key={member.id} style={styles.memberCard}>
              <View style={styles.memberRow}>
                <View style={styles.memberIcon}>
                  <Ionicons
                    name={member.user_id === band.user_id ? 'crown' : 'person'}
                    size={20}
                    color={member.user_id === band.user_id ? '#f59e0b' : '#6366f1'}
                  />
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.user_name}</Text>
                  <Text style={styles.memberRole}>
                    {member.user_id === band.user_id ? 'Band Owner' : 'Member'}
                  </Text>
                </View>
                <StatusBadge status={member.status} type="user" showIcon={false} />
              </View>
            </Card>
          ))
        )}

        {members.length > 5 && (
          <TouchableOpacity onPress={handleManageMembers}>
            <Text style={styles.viewMore}>View all {members.length} members</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Upcoming Gigs */}
      {upcomingTours.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎤 Upcoming Gigs</Text>
            <TouchableOpacity onPress={handleViewAllTours}>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>

          {upcomingTours.map((tour) => (
            <Card
              key={tour.id}
              onPress={() => navigation.navigate('TourDetails', { tourId: tour.id })}
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
                </View>
                <StatusBadge status={tour.status} type="tour" />
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* Media */}
      {media.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📸 Media ({media.length})</Text>
            <TouchableOpacity onPress={handleViewAllMedia}>
              <Text style={styles.seeAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mediaGrid}>
            {media.slice(0, 6).map((item) => (
              <View key={item.id} style={styles.mediaItem}>
                <Ionicons
                  name={item.file_type.startsWith('image') ? 'image' : 'videocam'}
                  size={32}
                  color="#94a3b8"
                />
                <Text style={styles.mediaLabel} numberOfLines={1}>
                  {item.file_name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Manager Info */}
      {band.booking_manager_name && (
        <Card style={styles.managerCard}>
          <View style={styles.managerRow}>
            <View style={styles.managerIcon}>
              <Ionicons name="briefcase" size={24} color="#6366f1" />
            </View>
            <View style={styles.managerInfo}>
              <Text style={styles.managerLabel}>Booking Manager</Text>
              <Text style={styles.managerName}>{band.booking_manager_name}</Text>
              {band.band_email && (
                <Text style={styles.managerEmail}>{band.band_email}</Text>
              )}
            </View>
          </View>
        </Card>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {isOwner && (
          <>
            <Button
              title="Edit Band Info"
              onPress={handleEditBand}
              variant="primary"
              icon="create-outline"
              fullWidth
              style={styles.actionButton}
            />
            <Button
              title="Manage Members"
              onPress={handleManageMembers}
              variant="outline"
              icon="people-outline"
              fullWidth
              style={styles.actionButton}
            />
            <Button
              title="Delete Band"
              onPress={handleDeleteBand}
              variant="danger"
              icon="trash-outline"
              fullWidth
              style={styles.actionButton}
            />
          </>
        )}

        {!isOwner && (
          <Button
            title="Leave Band"
            onPress={handleLeaveBand}
            variant="danger"
            icon="exit-outline"
            fullWidth
            style={styles.actionButton}
          />
        )}
      </View>

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
  bandIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bandName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  genreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#eef2ff',
    borderRadius: 16,
    marginBottom: 12,
  },
  genreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
    marginLeft: 6,
  },
  description: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    marginBottom: 16,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinCodeCard: {
    backgroundColor: '#fffbeb',
    borderColor: '#fef3c7',
    borderWidth: 1,
  },
  joinCodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  joinCodeInfo: {
    flex: 1,
  },
  joinCodeLabel: {
    fontSize: 12,
    color: '#92400e',
    marginBottom: 4,
  },
  joinCode: {
    fontSize: 24,
    fontWeight: '700',
    color: '#78350f',
    letterSpacing: 2,
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
  memberCard: {
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 13,
    color: '#64748b',
  },
  viewMore: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  tourCard: {
    marginBottom: 12,
  },
  tourHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  tourLocation: {
    fontSize: 13,
    color: '#64748b',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaItem: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  mediaLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  managerCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
  },
  managerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  managerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  managerInfo: {
    flex: 1,
  },
  managerLabel: {
    fontSize: 12,
    color: '#166534',
    marginBottom: 2,
  },
  managerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  managerEmail: {
    fontSize: 13,
    color: '#64748b',
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    marginBottom: 0,
  },
  bottomPadding: {
    height: 40,
  },
});
