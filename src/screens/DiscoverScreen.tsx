import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserType } from '../types';
import { createShadow } from '../theme';

// Mock data - will be replaced with real API calls
const MOCK_USERS = [
  {
    id: '1',
    username: 'The Jazz Collective',
    userType: 'band' as UserType,
    location: 'New York, NY',
    genres: ['Jazz', 'Blues'],
    profileImage: null,
  },
  {
    id: '2',
    username: 'Sarah Mitchell',
    userType: 'artist' as UserType,
    location: 'Los Angeles, CA',
    genres: ['Pop', 'R&B'],
    profileImage: null,
  },
  {
    id: '3',
    username: 'Sound Factory Studios',
    userType: 'studio' as UserType,
    location: 'Nashville, TN',
    hourlyRate: 150,
    profileImage: null,
  },
  {
    id: '4',
    username: 'The Blue Note',
    userType: 'venue' as UserType,
    location: 'Chicago, IL',
    capacity: 500,
    profileImage: null,
  },
];

export default function DiscoverScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<UserType | 'all'>('all');
  const [loading, setLoading] = useState(false);

  const userTypeFilters: Array<{ key: UserType | 'all'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'artist', label: 'Artists' },
    { key: 'band', label: 'Bands' },
    { key: 'studio', label: 'Studios' },
    { key: 'venue', label: 'Venues' },
    { key: 'booking_agent', label: 'Agents' },
  ];

  const filteredUsers =
    selectedFilter === 'all'
      ? MOCK_USERS
      : MOCK_USERS.filter((user) => user.userType === selectedFilter);

  const getUserTypeIcon = (userType: UserType) => {
    switch (userType) {
      case 'artist':
        return 'mic-outline';
      case 'band':
        return 'people-outline';
      case 'studio':
        return 'recording-outline';
      case 'venue':
        return 'location-outline';
      case 'booking_agent':
        return 'briefcase-outline';
      default:
        return 'person-outline';
    }
  };

  const renderUserCard = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.userCard}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          {item.profileImage ? (
            <Image source={{ uri: item.profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons
                name={getUserTypeIcon(item.userType)}
                size={30}
                color="#007AFF"
              />
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.userType}>
            {item.userType.charAt(0).toUpperCase() + item.userType.slice(1)}
          </Text>
          {item.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.location}>{item.location}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.cardBody}>
        {item.genres && (
          <View style={styles.genreContainer}>
            {item.genres.map((genre: string) => (
              <View key={genre} style={styles.genrePill}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
        )}
        {item.hourlyRate && (
          <Text style={styles.rate}>${item.hourlyRate}/hour</Text>
        )}
        {item.capacity && (
          <Text style={styles.capacity}>Capacity: {item.capacity}</Text>
        )}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="eye-outline" size={20} color="#007AFF" />
          <Text style={styles.actionText}>View Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color="#007AFF" />
          <Text style={styles.actionText}>Message</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search artists, bands, studios, venues..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={userTypeFilters}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterPill,
                selectedFilter === item.key && styles.filterPillActive,
              ]}
              onPress={() => setSelectedFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === item.key && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No results found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your filters or search terms
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterPillActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterText: {
    fontSize: 14,
    color: '#333',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...createShadow({ width: 0, height: 2 }, 4, 0.1),
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userType: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  cardBody: {
    marginBottom: 12,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  genrePill: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  genreText: {
    fontSize: 12,
    color: '#666',
  },
  rate: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  capacity: {
    fontSize: 14,
    color: '#666',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: 4,
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
});
