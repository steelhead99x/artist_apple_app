import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bandService } from '../services';
import { Input, Button, Card, LoadingSpinner, EmptyState, StatusBadge } from '../components/common';
import { Band } from '../types';

interface JoinBandScreenProps {
  navigation: {
    goBack: () => void;
  };
}

export default function JoinBandScreen({ navigation }: JoinBandScreenProps) {
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState(false);

  const [searchMode, setSearchMode] = useState<'code' | 'name'>('code');
  const [joinCode, setJoinCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Band[]>([]);
  const [selectedBand, setSelectedBand] = useState<Band | null>(null);

  const handleSearchByCode = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Join Code Required', 'Please enter a band join code');
      return;
    }

    try {
      setSearching(true);
      const band = await bandService.getBandByJoinCode(joinCode.trim().toUpperCase());
      setSelectedBand(band);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'No band found with that join code. Please check the code and try again.';
      Alert.alert('Band Not Found', errorMessage);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchByName = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Search Required', 'Please enter a band name to search');
      return;
    }

    try {
      setSearching(true);
      const results = await bandService.searchBands(searchQuery.trim());
      setSearchResults(results);

      if (results.length === 0) {
        Alert.alert(
          'No Results',
          'No bands found matching your search. Try a different name or ask the band owner for their join code.'
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'There was a problem searching for bands. Please try again.';
      Alert.alert('Search Failed', errorMessage);
    } finally {
      setSearching(false);
    }
  };

  const handleJoinBand = async (band: Band) => {
    Alert.alert(
      'Join Band',
      `Do you want to join "${band.band_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: async () => {
            try {
              setJoining(true);
              const result = await bandService.joinBand(band.id);

              if (result.success) {
                Alert.alert(
                  'Success!',
                  result.requiresApproval
                    ? `Your request to join "${band.band_name}" has been sent. You'll be notified when the band owner approves your request.`
                    : `You've successfully joined "${band.band_name}"!`,
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.goBack(),
                    },
                  ]
                );
              }
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'There was a problem joining the band. Please try again.';
              Alert.alert('Failed to Join Band', errorMessage);
            } finally {
              setJoining(false);
            }
          },
        },
      ]
    );
  };

  const renderBandCard = (band: Band) => (
    <Card key={band.id} style={styles.bandCard}>
      <View style={styles.bandHeader}>
        <View style={styles.bandIcon}>
          <Ionicons name="people" size={24} color="#6366f1" />
        </View>
        <View style={styles.bandInfo}>
          <Text style={styles.bandName}>{band.band_name}</Text>
          {band.genre && (
            <Text style={styles.bandGenre}>🎵 {band.genre}</Text>
          )}
        </View>
        <StatusBadge status={band.status} type="user" />
      </View>

      {band.description && (
        <Text style={styles.bandDescription} numberOfLines={3}>
          {band.description}
        </Text>
      )}

      <View style={styles.bandFooter}>
        {band.booking_manager_name && (
          <View style={styles.metaBadge}>
            <Ionicons name="briefcase-outline" size={14} color="#64748b" />
            <Text style={styles.metaText}>Manager: {band.booking_manager_name}</Text>
          </View>
        )}

        {band.website && (
          <View style={styles.metaBadge}>
            <Ionicons name="globe-outline" size={14} color="#64748b" />
            <Text style={styles.metaText}>{band.website}</Text>
          </View>
        )}
      </View>

      <Button
        title="Join This Band"
        onPress={() => handleJoinBand(band)}
        variant="primary"
        icon="person-add-outline"
        fullWidth
        loading={joining}
        disabled={joining}
        style={styles.joinButton}
      />
    </Card>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="person-add" size={48} color="#6366f1" />
          <Text style={styles.headerTitle}>Join a Band</Text>
          <Text style={styles.headerSubtitle}>
            Enter a join code or search for bands to join and start collaborating
          </Text>
        </View>

        {/* Search Mode Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              searchMode === 'code' && styles.toggleButtonActive,
            ]}
            onPress={() => {
              setSearchMode('code');
              setSearchResults([]);
              setSelectedBand(null);
            }}
          >
            <Ionicons
              name="key"
              size={20}
              color={searchMode === 'code' ? '#ffffff' : '#64748b'}
            />
            <Text
              style={[
                styles.toggleText,
                searchMode === 'code' && styles.toggleTextActive,
              ]}
            >
              Join Code
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleButton,
              searchMode === 'name' && styles.toggleButtonActive,
            ]}
            onPress={() => {
              setSearchMode('name');
              setSelectedBand(null);
            }}
          >
            <Ionicons
              name="search"
              size={20}
              color={searchMode === 'name' ? '#ffffff' : '#64748b'}
            />
            <Text
              style={[
                styles.toggleText,
                searchMode === 'name' && styles.toggleTextActive,
              ]}
            >
              Search by Name
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Join by Code */}
          {searchMode === 'code' && (
            <>
              <Card style={styles.infoCard}>
                <View style={styles.infoContent}>
                  <Ionicons name="information-circle" size={24} color="#6366f1" />
                  <Text style={styles.infoText}>
                    Ask your band owner for the 6-character join code. You can find this code in
                    the band settings.
                  </Text>
                </View>
              </Card>

              <Input
                label="Join Code"
                placeholder="ABC123"
                value={joinCode}
                onChangeText={(text) => setJoinCode(text.toUpperCase())}
                icon="key-outline"
                autoCapitalize="characters"
                maxLength={6}
                hint="Enter the 6-character code provided by your band"
              />

              <Button
                title="Find Band"
                onPress={handleSearchByCode}
                variant="primary"
                size="large"
                loading={searching}
                disabled={searching || !joinCode.trim()}
                icon="search-outline"
                fullWidth
                style={styles.searchButton}
              />

              {selectedBand && renderBandCard(selectedBand)}
            </>
          )}

          {/* Search by Name */}
          {searchMode === 'name' && (
            <>
              <Card style={styles.infoCard}>
                <View style={styles.infoContent}>
                  <Ionicons name="information-circle" size={24} color="#6366f1" />
                  <Text style={styles.infoText}>
                    Search for bands by name. Note that some bands may be private and require a
                    join code.
                  </Text>
                </View>
              </Card>

              <Input
                label="Band Name"
                placeholder="Search for a band..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                icon="search-outline"
                autoCapitalize="words"
                hint="Enter all or part of the band name"
              />

              <Button
                title="Search"
                onPress={handleSearchByName}
                variant="primary"
                size="large"
                loading={searching}
                disabled={searching || !searchQuery.trim()}
                icon="search-outline"
                fullWidth
                style={styles.searchButton}
              />

              {searching && <LoadingSpinner message="Searching for bands..." />}

              {!searching && searchResults.length === 0 && searchQuery.trim() !== '' && (
                <EmptyState
                  icon="musical-notes-outline"
                  title="No Bands Found"
                  message="Try searching with a different name or ask the band owner for their join code."
                />
              )}

              {searchResults.map((band) => renderBandCard(band))}
            </>
          )}

          {/* Help Section */}
          <Card style={styles.helpCard}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <View style={styles.helpItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.helpText}>
                Ask your band owner or manager for the join code
              </Text>
            </View>
            <View style={styles.helpItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.helpText}>
                Some bands require approval before you can join
              </Text>
            </View>
            <View style={styles.helpItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.helpText}>
                You'll receive a notification when your request is approved
              </Text>
            </View>
          </Card>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ffffff',
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  toggleContainer: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#6366f1',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 8,
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  content: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    borderWidth: 1,
    marginBottom: 20,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginLeft: 12,
  },
  searchButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  bandCard: {
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  bandGenre: {
    fontSize: 14,
    color: '#64748b',
  },
  bandDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 16,
  },
  bandFooter: {
    gap: 8,
    marginBottom: 16,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 6,
  },
  joinButton: {
    marginTop: 8,
  },
  helpCard: {
    marginTop: 24,
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    marginLeft: 8,
    lineHeight: 18,
  },
  bottomPadding: {
    height: 40,
  },
});
