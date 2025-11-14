import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import { BookingRequest, Event } from '../types';

// Mock booking data
const MOCK_BOOKINGS: BookingRequest[] = [
  {
    id: '1',
    requesterId: 'venue1',
    targetId: 'user1',
    type: 'performance',
    eventDate: '2025-11-20T20:00:00Z',
    status: 'pending',
    details: 'Jazz night at The Blue Note. 2-hour set.',
    offer: {
      amount: 1500,
      currency: 'USD',
      terms: 'Payment on completion',
    },
    createdAt: '2025-11-10T10:00:00Z',
    updatedAt: '2025-11-10T10:00:00Z',
  },
  {
    id: '2',
    requesterId: 'user1',
    targetId: 'studio1',
    type: 'recording',
    eventDate: '2025-11-25T14:00:00Z',
    endDate: '2025-11-25T18:00:00Z',
    status: 'accepted',
    details: 'Recording session for new album',
    offer: {
      amount: 600,
      currency: 'USD',
      terms: '4 hours studio time',
    },
    createdAt: '2025-11-08T15:30:00Z',
    updatedAt: '2025-11-09T09:00:00Z',
  },
];

const MOCK_EVENTS: Event[] = [
  {
    id: 'e1',
    title: 'Summer Jazz Festival',
    date: '2025-12-05T19:00:00Z',
    venueId: 'venue2',
    artistIds: ['user1', 'artist2'],
    description: 'Annual jazz festival featuring local artists',
    status: 'upcoming',
    createdAt: '2025-10-15T10:00:00Z',
  },
];

type ViewType = 'bookings' | 'events';

export default function CalendarScreen() {
  const { user } = useAuth();
  const [viewType, setViewType] = useState<ViewType>('bookings');
  const [bookings] = useState(MOCK_BOOKINGS);
  const [events] = useState(MOCK_EVENTS);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'accepted':
        return '#4CAF50';
      case 'rejected':
        return '#F44336';
      case 'cancelled':
        return '#999';
      case 'completed':
        return '#2196F3';
      default:
        return '#666';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time-outline';
      case 'accepted':
        return 'checkmark-circle-outline';
      case 'rejected':
        return 'close-circle-outline';
      case 'cancelled':
        return 'ban-outline';
      case 'completed':
        return 'checkmark-done-outline';
      default:
        return 'help-outline';
    }
  };

  const renderBookingCard = ({ item }: { item: BookingRequest }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.dateContainer}>
          <Text style={styles.dateDay}>
            {new Date(item.eventDate).getDate()}
          </Text>
          <Text style={styles.dateMonth}>
            {new Date(item.eventDate).toLocaleDateString('en-US', {
              month: 'short',
            })}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.statusRow}>
            <Ionicons
              name={getStatusIcon(item.status)}
              size={16}
              color={getStatusColor(item.status)}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.cardTitle}>{item.type.replace('_', ' ')}</Text>
          <Text style={styles.cardTime}>
            {formatTime(item.eventDate)}
            {item.endDate && ` - ${formatTime(item.endDate)}`}
          </Text>
        </View>
      </View>

      <Text style={styles.cardDetails}>{item.details}</Text>

      {item.offer && (
        <View style={styles.offerContainer}>
          <Ionicons name="cash-outline" size={16} color="#4CAF50" />
          <Text style={styles.offerText}>
            ${item.offer.amount} {item.offer.currency}
          </Text>
          <Text style={styles.offerTerms}>• {item.offer.terms}</Text>
        </View>
      )}

      {item.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.acceptButton}>
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.acceptButtonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectButton}>
            <Ionicons name="close" size={20} color="#F44336" />
            <Text style={styles.rejectButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'accepted' && (
        <TouchableOpacity style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View Details</Text>
          <Ionicons name="chevron-forward" size={16} color="#007AFF" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEventCard = ({ item }: { item: Event }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.dateContainer}>
          <Text style={styles.dateDay}>{new Date(item.date).getDate()}</Text>
          <Text style={styles.dateMonth}>
            {new Date(item.date).toLocaleDateString('en-US', { month: 'short' })}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardTime}>{formatTime(item.date)}</Text>
        </View>
      </View>

      <Text style={styles.cardDetails}>{item.description}</Text>

      {item.ticketUrl && (
        <TouchableOpacity style={styles.ticketButton}>
          <Ionicons name="ticket-outline" size={16} color="#007AFF" />
          <Text style={styles.ticketButtonText}>Get Tickets</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* View Type Selector */}
      <View style={styles.selectorContainer}>
        <TouchableOpacity
          style={[
            styles.selectorButton,
            viewType === 'bookings' && styles.selectorButtonActive,
          ]}
          onPress={() => setViewType('bookings')}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={viewType === 'bookings' ? '#fff' : '#007AFF'}
          />
          <Text
            style={[
              styles.selectorText,
              viewType === 'bookings' && styles.selectorTextActive,
            ]}
          >
            Bookings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.selectorButton,
            viewType === 'events' && styles.selectorButtonActive,
          ]}
          onPress={() => setViewType('events')}
        >
          <Ionicons
            name="musical-notes-outline"
            size={20}
            color={viewType === 'events' ? '#fff' : '#007AFF'}
          />
          <Text
            style={[
              styles.selectorText,
              viewType === 'events' && styles.selectorTextActive,
            ]}
          >
            Events
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {viewType === 'bookings' ? (
        <FlatList
          data={bookings}
          renderItem={renderBookingCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No bookings yet</Text>
              <Text style={styles.emptySubtext}>
                Your upcoming bookings will appear here
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={events}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="musical-notes-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No events scheduled</Text>
              <Text style={styles.emptySubtext}>
                Your events will appear here
              </Text>
            </View>
          }
        />
      )}

      {/* Add Button */}
      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  selectorContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    marginHorizontal: 4,
  },
  selectorButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  selectorText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  selectorTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dateContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    marginRight: 12,
    padding: 8,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  dateMonth: {
    fontSize: 12,
    color: '#fff',
    textTransform: 'uppercase',
  },
  cardInfo: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  cardTime: {
    fontSize: 14,
    color: '#666',
  },
  cardDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  offerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  offerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  offerTerms: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  rejectButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  viewButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  ticketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f8ff',
    paddingVertical: 12,
    borderRadius: 8,
  },
  ticketButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
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
  addButton: {
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
