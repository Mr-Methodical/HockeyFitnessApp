import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../utils/AuthContext';
import { useTheme } from '../utils/ThemeContext';
import { getUserConversations, updateTeam, getUnreadGroupMessageCount, getUnreadMessageCount } from '../services/team';
import { getBasicTeamMembers, getBasicTeam } from '../services/basicFirestore';

const MessagesScreen = ({ navigation }) => {
  const { user, userProfile, isGroupMember } = useAuth();
  const { currentTheme } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [unreadGroupCount, setUnreadGroupCount] = useState(0);
  const [memberUnreadCounts, setMemberUnreadCounts] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  // Refresh data when screen comes into focus (to update unread counts)
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Messages screen focused - refreshing conversations');
      loadData();
    }, [user, userProfile?.teamId])
  );

  const loadData = async () => {
    if (!user || !userProfile?.teamId) return;

    try {
      setLoading(true);
      
      console.log('📱 MessagesScreen loadData - user info:', {
        userId: user.uid,
        userRole: userProfile?.role,
        isGroupMember: isGroupMember,
        teamId: userProfile?.teamId
      });
      
      if (isGroupMember) {
        console.log('📱 Using group member messaging flow');
        // For group members, load team info and all team members
        const [teamData, membersData] = await Promise.all([
          getBasicTeam(userProfile.teamId),
          getBasicTeamMembers(userProfile.teamId)
        ]);
        setTeam(teamData);
        const filteredMembers = membersData.filter(member => member.id !== user.uid); // Exclude self
        setTeamMembers(filteredMembers);
        setNewGroupName(teamData.groupChatName || teamData.name || 'Group Chat');
        
        // Load unread group message count
        const unreadCount = await getUnreadGroupMessageCount(userProfile.teamId, user.uid);
        setUnreadGroupCount(unreadCount);
        console.log('🔵 Group message unread count:', unreadCount);
        
        // Load unread counts for each team member
        const unreadCounts = {};
        await Promise.all(
          filteredMembers.map(async (member) => {
            const memberUnreadCount = await getUnreadMessageCount(user.uid, member.id);
            unreadCounts[member.id] = memberUnreadCount;
          })
        );
        setMemberUnreadCounts(unreadCounts);
        console.log('📬 Member unread counts:', unreadCounts);
      } else {
        console.log('📱 Using regular player/coach messaging flow');
        // For coaches/players, use original conversation system
        const conversationsData = await getUserConversations(user.uid);
        console.log('💬 Loaded conversations:', conversationsData.map(c => ({ 
          partner: c.partnerName, 
          unreadCount: c.unreadCount 
        })));
        setConversations(conversationsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleGroupNameEdit = async () => {
    if (!newGroupName.trim() || !team) return;
    
    try {
      await updateTeam(team.id, { groupChatName: newGroupName.trim() });
      setTeam({ ...team, groupChatName: newGroupName.trim() });
      setEditingGroupName(false);
      Alert.alert('Success', 'Group chat name updated!');
    } catch (error) {
      console.error('Error updating group name:', error);
      Alert.alert('Error', 'Failed to update group chat name');
    }
  };

  const renderGroupChat = () => (
    <TouchableOpacity
      style={[styles.groupChatItem, { backgroundColor: currentTheme.secondary, borderBottomColor: currentTheme.primary + '20' }]}
      onPress={() => navigation.navigate('ChatScreen', {
        isGroupChat: true,
        teamId: userProfile.teamId,
        groupName: team?.groupChatName || team?.name || 'Group Chat'
      })}
    >
      <View style={[styles.groupChatIcon, { backgroundColor: currentTheme.primary }]}>
        <MaterialIcons name="group" size={24} color={currentTheme.secondary} />
        {unreadGroupCount > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: '#FF6B6B' }]}>
            <Text style={styles.unreadCount}>
              {unreadGroupCount > 99 ? '99+' : unreadGroupCount}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.groupChatContent}>
        {editingGroupName ? (
          <View style={styles.editNameContainer}>
            <TextInput
              style={[styles.editNameInput, { color: currentTheme.primary, borderColor: currentTheme.primary }]}
              value={newGroupName}
              onChangeText={setNewGroupName}
              onBlur={handleGroupNameEdit}
              onSubmitEditing={handleGroupNameEdit}
              autoFocus
              placeholder="Group chat name"
              placeholderTextColor={currentTheme.primary + '80'}
            />
          </View>
        ) : (
          <View style={styles.groupChatHeader}>
            <Text style={[styles.groupChatName, { color: currentTheme.primary }]}>
              {team?.groupChatName || team?.name || 'Group Chat'}
            </Text>
            <TouchableOpacity onPress={() => setEditingGroupName(true)}>
              <MaterialIcons name="edit" size={16} color={currentTheme.accent} />
            </TouchableOpacity>
          </View>
        )}
        <Text style={[styles.groupChatSubtitle, { color: currentTheme.primary + '80' }]}>
          {teamMembers.length + 1} members • Group conversation
        </Text>
      </View>
      <View style={styles.conversationMeta}>
        {unreadGroupCount > 0 && (
          <View style={[styles.unreadDot, { backgroundColor: '#FF6B6B' }]} />
        )}
        <MaterialIcons name="chevron-right" size={24} color={currentTheme.primary + '60'} />
      </View>
    </TouchableOpacity>
  );

  const renderTeamMember = ({ item }) => {
    const unreadCount = memberUnreadCounts[item.id] || 0;
    
    return (
      <TouchableOpacity
        style={[styles.memberItem, { backgroundColor: currentTheme.secondary, borderBottomColor: currentTheme.primary + '20' }]}
        onPress={() => navigation.navigate('ChatScreen', {
          partnerId: item.id,
          partnerName: item.name,
          partnerRole: item.role
        })}
      >
        <View style={[styles.memberAvatar, { backgroundColor: currentTheme.accent }]}>
          <Text style={[styles.memberInitial, { color: currentTheme.secondary }]}>
            {item.name?.charAt(0).toUpperCase() || '?'}
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: '#FF6B6B' }]}>
              <Text style={styles.unreadCount}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.memberContent}>
          <Text style={[styles.memberName, { color: currentTheme.primary }]}>{item.name}</Text>
          <Text style={[styles.memberRole, { color: currentTheme.accent }]}>
            {item.role === 'group_member' ? '👥 Group Member' : 
             item.role === 'coach' ? '👨‍💼 Coach' : '🏒 Player'}
          </Text>
        </View>
        <View style={styles.conversationMeta}>
          {unreadCount > 0 && (
            <View style={[styles.unreadDot, { backgroundColor: '#FF6B6B' }]} />
          )}
          <MaterialIcons name="chevron-right" size={24} color={currentTheme.primary + '60'} />
        </View>
      </TouchableOpacity>
    );
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return '';
    }
  };

  const renderConversationItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.conversationItem, { backgroundColor: currentTheme.secondary, borderBottomColor: currentTheme.primary + '20' }]}
      onPress={() => navigation.navigate('ChatScreen', {
        partnerId: item.partnerId,
        partnerName: item.partnerName,
        partnerRole: item.partnerRole
      })}
    >
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.partnerName, { color: currentTheme.primary }]}>{item.partnerName}</Text>
          <Text style={[styles.partnerRole, { color: currentTheme.accent }]}>
            {item.partnerRole === 'coach' ? '👨‍💼 Coach' : '🏒 Player'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={[styles.unreadDot, { backgroundColor: '#FF6B6B' }]} />
          )}
        </View>
        <Text style={[styles.lastMessage, { color: currentTheme.primary + 'AA' }]} numberOfLines={2}>
          {item.lastMessage?.text || 'No messages yet'}
        </Text>
        <Text style={[styles.timestamp, { color: currentTheme.primary + '80' }]}>
          {formatTimestamp(item.lastMessage?.timestamp)}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={currentTheme.primary + '60'} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.secondary }]}>
      <View style={[styles.header, { backgroundColor: currentTheme.secondary, borderBottomColor: currentTheme.primary + '20' }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color={currentTheme.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: currentTheme.primary }]}>Messages</Text>
        </View>
        {userProfile?.role === 'coach' && !isGroupMember && (
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.massMessageButton}
              onPress={() => navigation.navigate('MassMessage')}
            >
              <MaterialIcons name="group" size={20} color={currentTheme.accent} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.newMessageButton}
              onPress={() => navigation.navigate('NewMessage')}
            >
              <MaterialIcons name="edit" size={20} color={currentTheme.accent} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {isGroupMember ? (
        // Group member view: Group chat + team members
        <View style={styles.groupMessagesContainer}>
          {/* Group Chat at the top */}
          {renderGroupChat()}
          
          {/* Section divider */}
          <View style={[styles.sectionDivider, { backgroundColor: currentTheme.primary + '10' }]}>
            <Text style={[styles.sectionTitle, { color: currentTheme.primary + 'AA' }]}>Team Members</Text>
          </View>
          
          {/* Team Members List */}
          {teamMembers.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="people-outline" size={64} color={currentTheme.primary + '40'} />
              <Text style={[styles.emptyTitle, { color: currentTheme.primary }]}>No Team Members</Text>
              <Text style={[styles.emptySubtitle, { color: currentTheme.primary + 'AA' }]}>
                Invite others to join your group to start chatting!
              </Text>
            </View>
          ) : (
            <FlatList
              data={teamMembers}
              renderItem={renderTeamMember}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh}
                  tintColor={currentTheme.primary}
                  colors={[currentTheme.primary]}
                />
              }
              style={styles.membersList}
            />
          )}
        </View>
      ) : (
        // Coach/Player view: Original conversations
        <>
          {conversations.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="chat-bubble-outline" size={64} color={currentTheme.primary + '40'} />
              <Text style={[styles.emptyTitle, { color: currentTheme.primary }]}>No Messages</Text>
              <Text style={[styles.emptySubtitle, { color: currentTheme.primary + 'AA' }]}>
                {userProfile?.role === 'coach' 
                  ? 'Start a conversation with your players'
                  : 'Your coach will be able to message you here'
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={conversations}
              renderItem={renderConversationItem}
              keyExtractor={(item) => item.partnerId}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh}
                  tintColor={currentTheme.primary}
                  colors={[currentTheme.primary]}
                />
              }
              style={styles.conversationsList}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  massMessageButton: {
    padding: 8,
    marginRight: 8,
  },
  newMessageButton: {
    padding: 8,
  },
  
  // Group messaging styles
  groupMessagesContainer: {
    flex: 1,
  },
  groupChatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
  },
  groupChatIcon: {
    position: 'relative',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  groupChatContent: {
    flex: 1,
  },
  groupChatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupChatName: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  groupChatSubtitle: {
    fontSize: 14,
  },
  editNameContainer: {
    marginBottom: 4,
  },
  editNameInput: {
    fontSize: 18,
    fontWeight: '600',
    borderBottomWidth: 1,
    paddingVertical: 2,
  },
  
  sectionDivider: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  membersList: {
    flex: 1,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberAvatar: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInitial: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberContent: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 13,
  },
  
  // Original conversation styles (updated for theming)
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  partnerRole: {
    fontSize: 12,
    marginRight: 8,
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  lastMessage: {
    fontSize: 14,
    marginBottom: 3,
  },
  timestamp: {
    fontSize: 12,
  },
});

export default MessagesScreen;
