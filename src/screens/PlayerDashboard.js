import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Image,
  SafeAreaView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { useTheme } from '../utils/ThemeContext';
import { signOut } from '../services/auth';
import { joinTeamByCode, createGroup, joinGroupByCode } from '../services/team';
import { getBasicTeam, getBasicTeamMembers, getBasicUserWorkouts, getBasicTeamWorkouts } from '../services/basicFirestore';
import WorkoutCard from '../components/WorkoutCard';
import DarkModeToggle from '../components/DarkModeToggle';
import BadgeNotification from '../components/BadgeNotification';
import PersonalThemeSelector from '../components/PersonalThemeSelector';
import RankingWidget from '../components/RankingWidget';
import { checkAndAwardBadges } from '../services/badges';

const PlayerDashboard = ({ navigation }) => {
  const { user, userProfile, refetchProfile, isGroupMember } = useAuth();
  const { currentTheme, isDarkMode } = useTheme();
  const [team, setTeam] = useState(null);
  const [myWorkouts, setMyWorkouts] = useState([]);
  const [teamWorkouts, setTeamWorkouts] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [newBadgeNotification, setNewBadgeNotification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [personalThemeModalVisible, setPersonalThemeModalVisible] = useState(false);

  useEffect(() => {
    console.log('🎯 PlayerDashboard useEffect triggered, userProfile:', userProfile ? 'exists' : 'null');
    loadDashboardData();
  }, [userProfile]);

  // Refresh data when screen comes into focus (e.g., returning from LogWorkout)
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎯 PlayerDashboard useFocusEffect triggered, teamId:', userProfile?.teamId);
      if (userProfile?.teamId) {
        loadDashboardData();
      }
    }, [userProfile?.teamId])
  );

  const loadDashboardData = async () => {
    console.log('🚀 PlayerDashboard loadDashboardData called!');
    console.log('🚀 userProfile:', userProfile ? 'exists' : 'null');
    console.log('🚀 userProfile.teamId:', userProfile?.teamId);
    
    if (!userProfile) {
      console.log('⚠️ No userProfile available');
      setLoading(false);
      return;
    }

    console.log('🔍 Loading PlayerDashboard data for team:', userProfile.teamId);

    try {
      if (userProfile.teamId) {
        // DEBUG: Let's manually test if workouts exist
        console.log('🧪 Testing direct workout query...');
        try {
          const testWorkouts = await getBasicTeamWorkouts(userProfile.teamId, 50);
          console.log('🧪 Direct test found workouts:', testWorkouts.length);
          if (testWorkouts.length > 0) {
            console.log('🧪 Sample workout:', testWorkouts[0]);
          }
        } catch (testError) {
          console.error('🧪 Direct test failed:', testError);
        }

        // Load team data using basic functions that return null/empty arrays on error
        console.log('🔍 Step 1: Loading team data...');
        const teamData = await getBasicTeam(userProfile.teamId);
        if (teamData) {
          setTeam(teamData);
          console.log('✅ Team data loaded');
        } else {
          console.log('⚠️ No team data found');
        }
        
        console.log('🔍 Step 2: Loading user workouts...');
        const myWorkoutData = await getBasicUserWorkouts(user.uid);
        
        // Sort workouts by most recent first
        const sortedWorkouts = myWorkoutData.sort((a, b) => {
          const aTime = a.timestamp || a.createdAt || a.date;
          const bTime = b.timestamp || b.createdAt || b.date;
          
          // Convert to comparable timestamps
          const aTimestamp = aTime?.seconds ? aTime.seconds * 1000 : (aTime?.getTime ? aTime.getTime() : 0);
          const bTimestamp = bTime?.seconds ? bTime.seconds * 1000 : (bTime?.getTime ? bTime.getTime() : 0);
          
          return bTimestamp - aTimestamp; // Most recent first
        });
        
        setMyWorkouts(sortedWorkouts);
        console.log(`✅ Loaded ${myWorkoutData.length} user workouts (sorted by most recent)`);
        
        console.log('🔍 Step 3: Loading team workouts...');
        const teamWorkoutData = await getBasicTeamWorkouts(userProfile.teamId, 1000); // Increase limit for accurate leaderboard
        setTeamWorkouts(teamWorkoutData);
        console.log(`✅ Loaded ${teamWorkoutData.length} team workouts`);
        
        // Debug: Cross-check user workout count
        const userWorkoutsInTeamData = teamWorkoutData.filter(w => w.userId === user.uid);
        console.log(`🔍 Cross-check: Found ${userWorkoutsInTeamData.length} workouts for current user in team data vs ${myWorkoutData.length} in user data`);
        
        console.log('🔍 Step 4: Loading team members...');
        const membersData = await getBasicTeamMembers(userProfile.teamId);
        setTeamMembers(membersData);
        console.log(`✅ Loaded ${membersData.length} team members`);

        console.log('🎉 PlayerDashboard data loaded successfully');

        // Check for new badges (but don't show notification on initial load)
        if (!loading) {
          try {
            checkForNewBadges();
          } catch (badgeError) {
            console.log('⚠️ Badge check failed, but continuing...', badgeError.message);
          }
        }
      } else {
        console.log('⚠️ No teamId in userProfile');
      }
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      
      // Don't show error alert for basic connectivity issues
      if (!error.message?.includes('offline') && !error.message?.includes('network')) {
        Alert.alert('Error', 'Failed to load dashboard data. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkForNewBadges = async () => {
    try {
      const newBadges = await checkAndAwardBadges(user.uid);
      if (newBadges.length > 0) {
        // Show notification for the first new badge
        setNewBadgeNotification(newBadges[0]);
      }
    } catch (error) {
      console.error('Error checking badges:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleJoinTeam = () => {
    Alert.prompt(
      'Join Team',
      'Enter your team code:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: async (teamCode) => {
            if (!teamCode) return;
            
            try {
              setLoading(true);
              await joinTeamByCode(teamCode, user.uid);
              
              // Refresh user profile to get the updated teamId
              await refetchProfile();
              
              // Auto-reload dashboard data to show the new team
              await loadDashboardData();
              
              Alert.alert(
                'Success!',
                'Welcome to your team! 🏒',
                [{ text: 'Awesome!', style: 'default' }]
              );
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to join team');
            } finally {
              setLoading(false);
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const handleCreateGroup = () => {
    Alert.prompt(
      'Create Group',
      'Enter your group name:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async (groupName) => {
            if (!groupName?.trim()) return;
            
            try {
              setLoading(true);
              console.log('Creating group with name:', groupName.trim());
              console.log('User UID:', user.uid);
              console.log('User object:', user);
              
              const result = await createGroup({ name: groupName.trim() }, user.uid);
              
              // Refresh user profile to get the updated teamId
              await refetchProfile();
              
              // Auto-reload dashboard data to show the new group
              await loadDashboardData();
              
              Alert.alert(
                'Group Created! 🎉',
                `Group Code: ${result.code}\n\nShare this code with others so they can join your group.`,
                [{ text: 'Got it!', style: 'default' }]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to create group');
            } finally {
              setLoading(false);
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const handleJoinGroup = () => {
    Alert.prompt(
      'Join Group',
      'Enter your group code:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: async (groupCode) => {
            if (!groupCode) return;
            
            try {
              setLoading(true);
              await joinGroupByCode(groupCode, user.uid);
              
              // Refresh user profile to get the updated teamId
              await refetchProfile();
              
              // Auto-reload dashboard data to show the new group
              await loadDashboardData();
              
              Alert.alert(
                'Success!',
                'Welcome to your group! 🙌',
                [{ text: 'Awesome!', style: 'default' }]
              );
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to join group');
            } finally {
              setLoading(false);
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const getMyStats = () => {
    try {
      console.log('📊 === STARTING getMyStats() ===');
      console.log('📊 UserProfile:', userProfile);
      console.log('📊 UserProfile role:', userProfile?.role);
      console.log('📊 TeamWorkouts:', teamWorkouts);
      console.log('📊 TeamWorkouts length:', teamWorkouts?.length);
      
      // SIMPLE VERSION - Just return basic stats
      if (userProfile?.role === 'group_member') {
        console.log('📊 Group member detected - calculating team stats');
        
        if (!teamWorkouts || !Array.isArray(teamWorkouts)) {
          console.log('📊 No team workouts available, returning zeros');
          return {
            totalWorkouts: 0,
            thisWeekWorkouts: 0,
            totalMinutes: 0
          };
        }
        
        console.log('📊 Team workouts available:', teamWorkouts.length);
        
        // Simple calculation - just count all workouts for now
        const result = {
          totalWorkouts: teamWorkouts.length,
          thisWeekWorkouts: teamWorkouts.length, // For now, assume all are this week
          totalMinutes: teamWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0)
        };
        
        console.log('📊 Team stats result:', result);
        return result;
      }
      
      // For regular players
      console.log('📊 Regular player - calculating personal stats');
      console.log('📊 MyWorkouts:', myWorkouts);
      console.log('📊 MyWorkouts length:', myWorkouts?.length);
      
      if (!myWorkouts || !Array.isArray(myWorkouts)) {
        console.log('📊 No personal workouts available, returning zeros');
        return {
          totalWorkouts: 0,
          thisWeekWorkouts: 0,
          totalMinutes: 0
        };
      }
      
      const result = {
        totalWorkouts: myWorkouts.length,
        thisWeekWorkouts: myWorkouts.length, // For now, assume all are this week
        totalMinutes: myWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0)
      };
      
      console.log('📊 Personal stats result:', result);
      return result;
      
    } catch (error) {
      console.error('📊 ERROR in getMyStats:', error);
      return {
        totalWorkouts: 0,
        thisWeekWorkouts: 0,
        totalMinutes: 0
      };
    }
  };

  const getLeaderboardPreview = () => {
    console.log('📊 Calculating leaderboard preview...');
    console.log('📊 Team workouts for preview:', teamWorkouts.length);
    console.log('📊 Team members for preview:', teamMembers.length);
    
    const workoutCounts = {};
    teamWorkouts.forEach(workout => {
      workoutCounts[workout.userId] = (workoutCounts[workout.userId] || 0) + 1;
    });
    
    console.log('📊 Workout counts by user:', workoutCounts);
    
    const leaderboard = teamMembers
      .filter(member => member.role === 'player' || member.role === 'group_member') // Include group members
      .map(member => ({
        ...member,
        workoutCount: workoutCounts[member.id] || 0
      }))
      .sort((a, b) => b.workoutCount - a.workoutCount)
      .slice(0, 3);
    
    console.log('📊 Leaderboard preview result:', leaderboard.map(p => ({ 
      name: p.name, 
      workouts: p.workoutCount,
      userId: p.id 
    })));
    return leaderboard;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  const stats = getMyStats();
  console.log('📊 PlayerDashboard: stats calculated =', stats);
  console.log('📊 PlayerDashboard: typeof stats =', typeof stats);
  console.log('📊 PlayerDashboard: stats is null?', stats === null);
  console.log('📊 PlayerDashboard: stats is undefined?', stats === undefined);
  
  const leaderboard = getLeaderboardPreview();

  // Debug: Log all current data
  console.log('📊 PlayerDashboard render data:');
  console.log('📊 - myWorkouts length:', myWorkouts?.length || 0);
  console.log('📊 - teamWorkouts length:', teamWorkouts?.length || 0);
  console.log('📊 - teamMembers length:', teamMembers?.length || 0);
  console.log('📊 - team data:', team ? 'loaded' : 'not loaded');
  console.log('📊 - loading state:', loading);
  console.log('📊 - userProfile role:', userProfile?.role);
  console.log('📊 - stats:', stats);
  console.log('📊 - stats calculated from teamWorkouts:', teamWorkouts?.length || 0, 'workouts');
  console.log('📊 - leaderboard length:', leaderboard?.length || 0);

  // Debug logging
  console.log('🔍 PlayerDashboard Debug:');
  console.log('🔍 isGroupMember:', isGroupMember);
  console.log('🔍 userProfile?.role:', userProfile?.role);
  console.log('🔍 userProfile:', userProfile);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <BadgeNotification 
        badge={newBadgeNotification}
        visible={!!newBadgeNotification}
        onHide={() => setNewBadgeNotification(null)}
      />
      
      <ScrollView 
        style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#F5F5F5' }]}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentTheme.primary }]}>
        <View>
          <Text style={[styles.welcomeText, { color: currentTheme.secondary }]}>Welcome back,</Text>
          <Text style={[styles.nameText, { color: currentTheme.accent }]}>{userProfile?.name}</Text>
        </View>
        <View style={styles.headerActions}>
          {/* Personal Theme Button (Group Members Only) */}
          {isGroupMember && (
            <TouchableOpacity 
              onPress={() => {
                console.log('🎨 Theme button pressed!');
                console.log('🎨 isGroupMember:', isGroupMember);
                console.log('🎨 userProfile?.role:', userProfile?.role);
                setPersonalThemeModalVisible(true);
              }} 
              style={[styles.themeButton, { backgroundColor: currentTheme.secondary }]}
            >
              <MaterialIcons name="palette" size={20} color={currentTheme.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleSignOut} style={[styles.signOutButton, { backgroundColor: currentTheme.secondary }]}>
            <MaterialIcons name="logout" size={24} color={currentTheme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Team Section */}
      {!team ? (
        <View style={styles.noTeamContainer}>
          <MaterialIcons name="group" size={64} color="#ccc" />
          {isGroupMember ? (
            <>
              <Text style={styles.noTeamTitle}>No Group Yet</Text>
              <Text style={styles.noTeamSubtitle}>
                Create a new group or join an existing one to start working out together
              </Text>
              <View style={styles.groupButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.groupButton, { backgroundColor: currentTheme.secondary }]} 
                  onPress={handleCreateGroup}
                >
                  <Text style={[styles.groupButtonText, { color: currentTheme.primary }]}>Create Group</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.groupButton, { backgroundColor: currentTheme.secondary }]} 
                  onPress={handleJoinGroup}
                >
                  <Text style={[styles.groupButtonText, { color: currentTheme.primary }]}>Join Group</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.noTeamTitle}>No Team Yet</Text>
              <Text style={styles.noTeamSubtitle}>
                Join a team to start logging workouts and competing with teammates
              </Text>
              <TouchableOpacity style={[styles.joinTeamButton, { backgroundColor: currentTheme.secondary }]} onPress={handleJoinTeam}>
                <Text style={[styles.joinTeamButtonText, { color: currentTheme.primary }]}>Join Team</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <>
          {/* Team/Group Info */}
          <View style={[styles.teamCard, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' }]}>
            <Text style={[styles.teamName, { color: isDarkMode ? '#FFF' : '#000000' }]}>{team.name}</Text>
            <Text style={[styles.teamInfo, { color: isDarkMode ? '#CCC' : '#666666' }]}>
              {isGroupMember ? 
                `${teamMembers.filter(m => m.role === 'group_member').length} group members` :
                `${teamMembers.filter(m => m.role === 'player').length} players`
              }
            </Text>
            {isGroupMember && team.code && (
              <Text style={[styles.groupCode, { color: isDarkMode ? '#CCC' : '#666666' }]}>
                Group Code: {team.code}
              </Text>
            )}
          </View>

          {/* Smart Ranking Widget - Only for players */}
          {!isGroupMember && (
            <RankingWidget navigation={navigation} />
          )}

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.logWorkoutButton, { backgroundColor: currentTheme.secondary }]}
              onPress={() => navigation.navigate('LogWorkout')}
            >
              <MaterialIcons name="add-circle" size={24} color={currentTheme.primary} />
              <Text style={[styles.logWorkoutButtonText, { color: currentTheme.primary }]}>Log Workout</Text>
            </TouchableOpacity>
            
            {/* Only show Messages button for coaches and players, not group members */}
            {!isGroupMember && (
              <TouchableOpacity 
                style={[styles.messagesButton, { borderColor: currentTheme.secondary }]}
                onPress={() => navigation.navigate('Messages')}
              >
                <MaterialIcons name="message" size={24} color={currentTheme.secondary} />
                <Text style={[styles.messagesButtonText, { 
                  color: currentTheme.secondary,
                  fontSize: 16,
                  fontWeight: '600'
                }]}>Group Chat</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={onRefresh}
              disabled={refreshing}
            >
              <MaterialIcons name="refresh" size={24} color="#007AFF" />
              <Text style={styles.refreshButtonText}>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Leaderboard Preview */}
          <View style={[styles.sectionContainer, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFF' : '#333' }]}>Top Performers</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')}>
                <Text style={[styles.viewAllText, { color: currentTheme.primary }]}>View All</Text>
              </TouchableOpacity>
            </View>
            {leaderboard.length === 0 ? (
              <Text style={styles.emptyText}>No workouts logged yet</Text>
            ) : (
              leaderboard.map((player, index) => (
                <View key={player.id} style={styles.leaderboardItem}>
                  <View style={styles.rankContainer}>
                    <Text style={styles.rank}>#{index + 1}</Text>
                  </View>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <Text style={styles.playerWorkouts}>
                      {player.workoutCount} workouts
                    </Text>
                  </View>
                  {player.id === user.uid && (
                    <View style={styles.youBadge}>
                      <Text style={styles.youText}>YOU</Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>

          {/* Recent Workouts */}
          <View style={[styles.sectionContainer, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: isDarkMode ? '#FFF' : '#333' }]}>My Recent Workouts</Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('WorkoutHistory')}
                style={styles.viewAllButton}
              >
                <Text style={[styles.viewAllText, { color: currentTheme.primary }]}>View All</Text>
                <MaterialIcons name="arrow-forward" size={16} color={currentTheme.primary} />
              </TouchableOpacity>
            </View>
            {myWorkouts.length === 0 ? (
              <Text style={styles.emptyText}>No workouts logged yet</Text>
            ) : (
              myWorkouts.slice(0, 3).map((workout, index) => (
                <WorkoutCard
                  key={workout.id || index}
                  workout={workout}
                  showPlayerName={false}
                  onPress={() => {
                    if (workout.isAIGenerated) {
                      navigation.navigate('AIWorkoutDetail', { workout });
                    } else {
                      navigation.navigate('WorkoutDetail', { workout });
                    }
                  }}
                  style={styles.dashboardWorkoutCard}
                  showDeleteButton={true} // Player can delete their own workouts
                  onLikeUpdate={(workoutId, newLikeCount, userLiked) => {
                    // Update the local workouts array
                    setMyWorkouts(prevWorkouts => 
                      prevWorkouts.map(w => 
                        w.id === workoutId 
                          ? { ...w, likeCount: newLikeCount, likes: userLiked ? [...(w.likes || []), user.uid] : (w.likes || []).filter(id => id !== user.uid) }
                          : w
                      )
                    );
                  }}
                  onDelete={(workoutId) => {
                    // Remove the deleted workout from the local array
                    setMyWorkouts(prevWorkouts => 
                      prevWorkouts.filter(w => w.id !== workoutId)
                    );
                  }}
                />
              ))
            )}
          </View>

          {/* Dark Mode Toggle */}
          <DarkModeToggle />
        </>
      )}
      </ScrollView>

      {/* Personal Theme Selector Modal (Group Members Only) */}
      {isGroupMember && (
        <PersonalThemeSelector
          visible={personalThemeModalVisible}
          onClose={() => setPersonalThemeModalVisible(false)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#5856D6', // Will be overridden by theme
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  signOutButton: {
    padding: 8,
  },
  noTeamContainer: {
    alignItems: 'center',
    padding: 40,
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  noTeamTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#333',
  },
  noTeamSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  joinTeamButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  joinTeamButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  groupButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'space-between',
  },
  groupButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  groupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  teamCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
  },
  teamName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  teamInfo: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  groupCode: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actionsContainer: {
    padding: 20,
    gap: 12,
  },
  logWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
  },
  logWorkoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  messagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderColor: '#007AFF',
    borderWidth: 2,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  messagesButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderColor: '#007AFF',
    borderWidth: 2,
    padding: 12,
    borderRadius: 12,
  },
  refreshButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionContainer: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginRight: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  playerWorkouts: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  youBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  youText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  workoutItem: {
    backgroundColor: 'white',
    marginBottom: 12,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  workoutContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  workoutTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  workoutNotes: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  workoutDuration: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  workoutImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
  },
  dashboardWorkoutCard: {
    marginHorizontal: 0,
    marginVertical: 4,
  },
});

export default PlayerDashboard;
