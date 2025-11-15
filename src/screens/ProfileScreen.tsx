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
import theme from '../theme';

export default function ProfileScreen({ navigation }: any) {
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
      action: () => navigation.navigate('Help'),
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
                color={theme.colors.primary[500]}
              />
            </View>
          )}
          <TouchableOpacity
            style={styles.editAvatarButton}
            accessibilityLabel="Change profile picture"
            accessibilityRole="button"
            accessibilityHint="Opens camera or photo library to change your profile picture"
          >
            <Ionicons name="camera" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>{user?.username || 'User'}</Text>
        <View style={styles.userTypeBadge}>
          <Ionicons
            name={getUserTypeIcon(user?.userType || '')}
            size={14}
            color={theme.colors.primary[500]}
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
            accessibilityLabel={item.title}
            accessibilityRole="button"
            accessibilityHint={item.subtitle}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name={item.icon as any} size={24} color={theme.colors.primary[500]} />
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
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        accessibilityLabel="Logout"
        accessibilityRole="button"
        accessibilityHint="Sign out of your account"
      >
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
    backgroundColor: theme.colors.background.secondary,
  },
  header: {
    backgroundColor: theme.colors.background.primary,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
    ...theme.shadows.sm,
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
    backgroundColor: theme.colors.gray[100],
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
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...theme.shadows.md,
  },
  userName: {
    fontSize: theme.typography.sizes['2xl'],
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  userTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
    marginBottom: 12,
  },
  userTypeText: {
    marginLeft: 6,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.primary[500],
    fontWeight: theme.typography.fontWeights.semibold,
  },
  bio: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
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
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary,
  },
  statLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.gray[200],
    marginHorizontal: 16,
  },
  menuContainer: {
    backgroundColor: theme.colors.background.primary,
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text.secondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background.primary,
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: theme.borderRadius.base,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  logoutText: {
    marginLeft: 8,
    fontSize: theme.typography.sizes.base,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.error,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  appInfoText: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.gray[400],
    marginBottom: 4,
  },
});
