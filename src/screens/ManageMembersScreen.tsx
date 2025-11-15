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
import {
  Card,
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
  StatusBadge,
  Button,
  Input,
} from '../components/common';
import { BandMember } from '../types';

type TabType = 'active' | 'pending';

interface ManageMembersScreenProps {
  route: {
    params: {
      bandId: string;
      bandName: string;
    };
  };
  navigation: {
    goBack: () => void;
  };
}

export default function ManageMembersScreen({ route, navigation }: ManageMembersScreenProps) {
  const { bandId, bandName } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('active');

  const [members, setMembers] = useState<BandMember[]>([]);
  const [pendingRequests, setPendingRequests] = useState<BandMember[]>([]);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [bandId]);

  const loadMembers = async () => {
    try {
      setError(null);
      const [allMembers, pending] = await Promise.all([
        bandService.getBandMembers(bandId),
        bandService.getPendingMemberRequests(bandId),
      ]);

      setMembers(allMembers.filter((m: BandMember) => m.status === 'approved' || m.status === 'active'));
      setPendingRequests(pending);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load members';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMembers();
  }, [bandId]);

  const handleApproveMember = async (memberId: string, userName: string) => {
    Alert.alert(
      'Approve Member',
      `Approve ${userName} to join the band?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await bandService.approveMember(bandId, memberId);
              Alert.alert('Success', `${userName} has been approved!`);
              loadMembers();
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Failed to approve member';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleRejectMember = async (memberId: string, userName: string) => {
    Alert.alert(
      'Reject Request',
      `Reject ${userName}'s request to join the band?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await bandService.rejectMember(bandId, memberId);
              Alert.alert('Rejected', `${userName}'s request has been rejected`);
              loadMembers();
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Failed to reject member';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = async (memberId: string, userName: string) => {
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${userName} from the band? They can rejoin if invited again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await bandService.removeMember(bandId, memberId);
              Alert.alert('Removed', `${userName} has been removed from the band`);
              loadMembers();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to remove member');
            }
          },
        },
      ]
    );
  };

  const handleInviteMember = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    try {
      setInviting(true);
      await bandService.inviteMember(bandId, inviteEmail.trim().toLowerCase());
      Alert.alert(
        'Invitation Sent',
        `An invitation has been sent to ${inviteEmail}. They'll be notified to join your band.`
      );
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  if (loading && !refreshing) {
    return <LoadingSpinner message="Loading members..." fullScreen />;
  }

  if (error && !members.length) {
    return (
      <ErrorMessage
        title="Couldn't Load Members"
        message={error}
        onRetry={loadMembers}
        fullScreen
      />
    );
  }

  const activeMembers = members;
  const pending = pendingRequests;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{bandName}</Text>
        <Text style={styles.headerSubtitle}>Manage Members</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active ({activeMembers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending ({pending.length})
          </Text>
          {pending.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pending.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {/* Active Members Tab */}
        {activeTab === 'active' && (
          <>
            {/* Invite Button */}
            {!showInviteForm && (
              <Button
                title="Invite Member by Email"
                onPress={() => setShowInviteForm(true)}
                variant="primary"
                icon="person-add-outline"
                fullWidth
                style={styles.inviteButton}
              />
            )}

            {/* Invite Form */}
            {showInviteForm && (
              <Card style={styles.inviteCard}>
                <Text style={styles.inviteTitle}>Invite New Member</Text>
                <Input
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon="mail-outline"
                />
                <View style={styles.inviteActions}>
                  <Button
                    title="Send Invite"
                    onPress={handleInviteMember}
                    variant="primary"
                    loading={inviting}
                    disabled={inviting || !inviteEmail.trim()}
                    style={styles.inviteActionButton}
                  />
                  <Button
                    title="Cancel"
                    onPress={() => {
                      setShowInviteForm(false);
                      setInviteEmail('');
                    }}
                    variant="outline"
                    disabled={inviting}
                    style={styles.inviteActionButton}
                  />
                </View>
              </Card>
            )}

            {/* Info Card */}
            <Card style={styles.infoCard}>
              <View style={styles.infoContent}>
                <Ionicons name="information-circle" size={20} color="#6366f1" />
                <Text style={styles.infoText}>
                  Members can view band info, upcoming gigs, and collaborate with the team.
                  Only you (the owner) can manage members and band settings.
                </Text>
              </View>
            </Card>

            {/* Members List */}
            {activeMembers.length === 0 ? (
              <EmptyState
                icon="people"
                title="No Members Yet"
                message="Invite musicians to join your band and start collaborating!"
                actionLabel="Invite Member"
                onAction={() => setShowInviteForm(true)}
              />
            ) : (
              activeMembers.map((member) => (
                <Card key={member.id} style={styles.memberCard}>
                  <View style={styles.memberRow}>
                    <View style={styles.memberIcon}>
                      <Ionicons
                        name={member.is_owner ? 'crown' : 'person'}
                        size={24}
                        color={member.is_owner ? '#f59e0b' : '#6366f1'}
                      />
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.user_name}</Text>
                      <Text style={styles.memberRole}>
                        {member.is_owner ? 'Band Owner' : 'Member'}
                      </Text>
                      {member.user_email && (
                        <Text style={styles.memberEmail}>{member.user_email}</Text>
                      )}
                    </View>
                    <View style={styles.memberActions}>
                      <StatusBadge status={member.status} type="user" showIcon={false} />
                      {!member.is_owner && (
                        <TouchableOpacity
                          onPress={() => handleRemoveMember(member.id, member.user_name)}
                          style={styles.removeButton}
                        >
                          <Ionicons name="close-circle" size={24} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </Card>
              ))
            )}
          </>
        )}

        {/* Pending Requests Tab */}
        {activeTab === 'pending' && (
          <>
            <Card style={styles.infoCard}>
              <View style={styles.infoContent}>
                <Ionicons name="information-circle" size={20} color="#6366f1" />
                <Text style={styles.infoText}>
                  Review and approve or reject requests from musicians who want to join your band.
                </Text>
              </View>
            </Card>

            {pending.length === 0 ? (
              <EmptyState
                icon="checkmark-done"
                title="No Pending Requests"
                message="All caught up! You'll see new join requests here when musicians request to join your band."
              />
            ) : (
              pending.map((request) => (
                <Card key={request.id} style={styles.memberCard}>
                  <View style={styles.memberRow}>
                    <View style={styles.memberIcon}>
                      <Ionicons name="person-outline" size={24} color="#f59e0b" />
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{request.user_name}</Text>
                      <Text style={styles.memberRole}>Pending Approval</Text>
                      {request.user_email && (
                        <Text style={styles.memberEmail}>{request.user_email}</Text>
                      )}
                      {request.created_at && (
                        <Text style={styles.requestDate}>
                          Requested {new Date(request.created_at).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.requestActions}>
                    <Button
                      title="Approve"
                      onPress={() => handleApproveMember(request.id, request.user_name)}
                      variant="success"
                      icon="checkmark-outline"
                      style={styles.requestButton}
                    />
                    <Button
                      title="Reject"
                      onPress={() => handleRejectMember(request.id, request.user_name)}
                      variant="danger"
                      icon="close-outline"
                      style={styles.requestButton}
                    />
                  </View>
                </Card>
              ))
            )}
          </>
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#6366f1',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  inviteButton: {
    marginBottom: 16,
  },
  inviteCard: {
    marginBottom: 16,
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    borderWidth: 1,
  },
  inviteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  inviteActionButton: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    marginBottom: 16,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
    marginLeft: 12,
  },
  memberCard: {
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  memberIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  memberRole: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: '#94a3b8',
  },
  requestDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  memberActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  removeButton: {
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  requestButton: {
    flex: 1,
  },
  bottomPadding: {
    height: 40,
  },
});
