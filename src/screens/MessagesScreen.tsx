import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Conversation } from '../types';
import { formatRelativeTime } from '../utils/dateFormatters';

// Mock conversations
const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    participants: ['user1', 'user2'],
    lastMessage: {
      id: 'm1',
      conversationId: '1',
      senderId: 'user2',
      content: 'Hey, are you available for a show on the 15th?',
      read: false,
      createdAt: '2025-11-13T10:30:00Z',
    },
    unreadCount: 2,
    updatedAt: '2025-11-13T10:30:00Z',
  },
  {
    id: '2',
    participants: ['user1', 'user3'],
    lastMessage: {
      id: 'm2',
      conversationId: '2',
      senderId: 'user1',
      content: 'Thanks for the info! Looking forward to working with you.',
      read: true,
      createdAt: '2025-11-12T14:20:00Z',
    },
    unreadCount: 0,
    updatedAt: '2025-11-12T14:20:00Z',
  },
  {
    id: '3',
    participants: ['user1', 'user4'],
    lastMessage: {
      id: 'm3',
      conversationId: '3',
      senderId: 'user4',
      content: 'Studio rates are $150/hour. Does that work?',
      read: false,
      createdAt: '2025-11-11T09:15:00Z',
    },
    unreadCount: 1,
    updatedAt: '2025-11-11T09:15:00Z',
  },
];

// Mock user data for conversation display
const MOCK_USER_DATA: { [key: string]: { name: string; userType: string } } = {
  user2: { name: 'The Blue Note Venue', userType: 'venue' },
  user3: { name: 'Marcus Johnson', userType: 'artist' },
  user4: { name: 'Sound Factory Studios', userType: 'studio' },
};

export default function MessagesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);

  const filteredConversations = conversations.filter((conv) => {
    const otherUserId = conv.participants.find((p) => p !== 'user1') || '';
    const userData = MOCK_USER_DATA[otherUserId];
    return userData?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherUserId = item.participants.find((p) => p !== 'user1') || '';
    const userData = MOCK_USER_DATA[otherUserId] || {
      name: 'Unknown User',
      userType: 'user',
    };
    const isUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity style={styles.conversationCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-outline" size={24} color="#007AFF" />
          </View>
          {isUnread && <View style={styles.unreadBadge} />}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.userName, isUnread && styles.unreadText]}>
              {userData.name}
            </Text>
            <Text style={styles.timestamp}>
              {formatRelativeTime(item.lastMessage?.createdAt || item.updatedAt)}
            </Text>
          </View>

          <View style={styles.messageRow}>
            <Text
              style={[
                styles.lastMessage,
                isUnread && styles.unreadText,
              ]}
              numberOfLines={1}
            >
              {item.lastMessage?.content || 'No messages yet'}
            </Text>
            {isUnread && (
              <View style={styles.unreadCountBadge}>
                <Text style={styles.unreadCountText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>

          <Text style={styles.userType}>{userData.userType}</Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </TouchableOpacity>
    );
  };

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
          placeholder="Search conversations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Conversations List */}
      <FlatList
        data={filteredConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Start a conversation from the Discover tab
            </Text>
          </View>
        }
      />

      {/* Compose Button */}
      <TouchableOpacity style={styles.composeButton}>
        <Ionicons name="create-outline" size={24} color="#fff" />
      </TouchableOpacity>
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
  listContainer: {
    paddingBottom: 80,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    color: '#333',
  },
  unreadText: {
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  unreadCountBadge: {
    backgroundColor: '#007AFF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  unreadCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  userType: {
    fontSize: 12,
    color: '#999',
    textTransform: 'capitalize',
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
    textAlign: 'center',
  },
  composeButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
