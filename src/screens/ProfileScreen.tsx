import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const menuItems = [
    {
      id: 'edit-profile',
      icon: 'person-outline',
      title: 'Edit Profile',
      subtitle: 'Update your information',
      action: () => console.log('Edit profile'),
    },
    {
      id: 'media-gallery',
      icon: 'images-outline',
      title: 'Media Gallery',
      subtitle: 'Manage photos, audio, and videos',
      action: () => console.log('Media gallery'),
    },
    {
      id: 'availability',
      icon: 'calendar-outline',
      title: 'Availability',
      subtitle: 'Set your available dates',
      action: () => console.log('Availability'),
    },
    {
      id: 'notifications',
      icon: 'notifications-outline',
      title: 'Notifications',
      subtitle: 'Manage notification settings',
      action: () => console.log('Notifications'),
    },
    {
      id: 'privacy',
      icon: 'shield-outline',
      title: 'Privacy & Security',
      subtitle: 'Control your privacy settings',
      action: () => console.log('Privacy'),
    },
    {
      id: 'help',
      icon: 'help-circle-outline',
      title: 'Help & Support',
      subtitle: 'Get help or contact us',
      action: () => console.log('Help'),
    },
  ];

  const getUserTypeLabel = (userType: string) => {
    const labels: { [key: string]: string } = {
      artist: 'Artist',
      band: 'Band',
      studio: 'Recording Studio',
      venue: 'Venue',
      booking_agent: 'Booking Agent',
      manager: 'Manager',
    };
    return labels[userType] || userType;
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'artist':
        return 'mic';
      case 'band':
        return 'people';
      case 'studio':
        return 'recording';
      case 'venue':
        return 'location';
      case 'booking_agent':
        return 'briefcase';
      case 'manager':
        return 'business';
      default:
        return 'person';
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user?.profileImage ? (
            <Image
              source={{ uri: user.profileImage }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons
                name={getUserTypeIcon(user?.userType || 'person')}
                size={48}
                color="#007AFF"
              />
            </View>
          )}
          <TouchableOpacity style={styles.editAvatarButton}>
            <Ionicons name="camera" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>{user?.username || 'User'}</Text>
        <View style={styles.userTypeBadge}>
          <Ionicons
            name={getUserTypeIcon(user?.userType || '')}
            size={14}
            color="#007AFF"
          />
          <Text style={styles.userTypeText}>
            {getUserTypeLabel(user?.userType || '')}
          </Text>
        </View>
        {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>45</Text>
            <Text style={styles.statLabel}>Connections</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>8</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={item.action}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name={item.icon as any} size={24} color="#007AFF" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#F44336" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>Artist Space Mobile v1.0.0</Text>
        <Text style={styles.appInfoText}>© 2025 Artist Space</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  userTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  userTypeText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  bio: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 20,
    paddingHorizontal: 40,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#F44336',
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  appInfoText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
});
