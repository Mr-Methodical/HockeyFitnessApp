import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Image
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { useTheme } from '../utils/ThemeContext';
import { signOut } from '../services/auth';
import { createTeam } from '../services/team';
import { getBasicTeam, getBasicTeamMembers, getBasicTeamWorkouts } from '../services/basicFirestore';
import TeamSettingsModal from '../components/TeamSettingsModal';
import WorkoutCard from '../components/WorkoutCard';
import ThemeSelector from '../components/ThemeSelector';
import DarkModeToggle from '../components/DarkModeToggle';
import TeamMotivationStats from '../components/TeamMotivationStats';
import { calculateCurrentStreak, getUserBadges } from '../services/badges';

const CoachDashboard = ({ navigation }) => {
  const { user, userProfile, refetchProfile } = useAuth();
  const { currentTheme, isDarkMode } = useTheme();
  const [team, setTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [themeModalVisible, setThemeModalVisible] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [userProfile]);

  const loadDashboardData = async () => {
    if (!userProfile) {
      console.log('⚠️ No userProfile available');
      setLoading(false);
      return;
    }

    console.log('🔍 Loading CoachDashboard data for team:', userProfile.teamId);

    try {
      if (userProfile.teamId) {
        // Load team data using basic functions that return null/empty arrays on error
        console.log('🔍 Step 1: Loading team data...');
        const teamData = await getBasicTeam(userProfile.teamId);
        if (teamData) {
          setTeam(teamData);
          console.log('✅ Team data loaded');
        } else {
          console.log('⚠️ No team data found');
        }
        
        console.log('🔍 Step 2: Loading team members...');
        const members = await getBasicTeamMembers(userProfile.teamId);
        setTeamMembers(members);
        console.log(`✅ Loaded ${members.length} team members`);
        
        console.log('🔍 Step 3: Loading recent workouts...');
        const workouts = await getBasicTeamWorkouts(userProfile.teamId, 10);
        setRecentWorkouts(workouts);
        console.log(`✅ Loaded ${workouts.length} recent workouts`);
        
        console.log('🎉 CoachDashboard data loaded successfully');
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleCreateTeam = () => {
    Alert.prompt(
      'Create Team',
      'Enter your team name:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async (teamName) => {
            if (!teamName) return;
            
            try {
              setLoading(true);
              const result = await createTeam({ name: teamName }, user.uid);
              
              // Refresh user profile to get the updated teamId
              await refetchProfile();
              
              // Auto-reload dashboard data to show the new team
              await loadDashboardData();
              
              Alert.alert(
                'Team Created! 🏒',
                `Team Code: ${result.code}\n\nShare this code with your players so they can join your team.`,
                [{ text: 'Got it!', style: 'default' }]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to create team');
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

  const getWorkoutStats = () => {
    console.log('📊 Calculating workout stats...');
    console.log('📊 Recent workouts count:', recentWorkouts.length);
    console.log('📊 Team members count:', teamMembers.length);
    
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Debug: Check workout structure
    if (recentWorkouts.length > 0) {
      console.log('📊 Sample workout structure:', {
        timestamp: recentWorkouts[0].timestamp,
        timestampType: typeof recentWorkouts[0].timestamp,
        date: recentWorkouts[0].date,
        dateType: typeof recentWorkouts[0].date
      });
    }
    
    const thisWeekWorkouts = recentWorkouts.filter(workout => {
      try {
        // Handle different timestamp formats
        let workoutDate;
        if (workout.timestamp) {
          // Firestore timestamp
          workoutDate = workout.timestamp.toDate ? workout.timestamp.toDate() : new Date(workout.timestamp);
        } else if (workout.date) {
          // Regular date
          workoutDate = workout.date.toDate ? workout.date.toDate() : new Date(workout.date);
        } else if (workout.createdAt) {
          // Alternative timestamp field
          workoutDate = workout.createdAt.toDate ? workout.createdAt.toDate() : new Date(workout.createdAt);
        } else {
          console.warn('📊 Workout missing date field:', workout.id);
          return false;
        }
        
        return workoutDate > weekAgo;
      } catch (error) {
        console.error('📊 Error processing workout date:', error, workout.id);
        return false;
      }
    });
    
    const activeMembers = teamMembers.filter(member => 
      member.role === 'player' || member.role === 'group_member'
    ).length;
    
    const stats = {
      totalWorkouts: recentWorkouts.length || 0,
      thisWeekWorkouts: thisWeekWorkouts.length || 0,
      activeMembers: activeMembers || 0
    };
    
    console.log('📊 Calculated stats:', stats);
    return stats;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const stats = getWorkoutStats();

  // Debug: Log all current data
  console.log('📊 CoachDashboard render data:');
  console.log('📊 - recentWorkouts length:', recentWorkouts.length);
  console.log('📊 - teamMembers length:', teamMembers.length);
  console.log('📊 - team data:', team ? 'loaded' : 'not loaded');
  console.log('📊 - stats:', stats);

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background || '#f5f5f5' }]}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: currentTheme.primary }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.welcomeText, { color: currentTheme.secondary }]}>Welcome back,</Text>
          <Text style={[styles.nameText, { color: currentTheme.accent }]}>{userProfile?.name}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => setThemeModalVisible(true)} 
            style={[styles.themeButton, { backgroundColor: currentTheme.secondary }]}
          >
            <MaterialIcons name="palette" size={20} color={currentTheme.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut} style={[styles.signOutButton, { backgroundColor: currentTheme.secondary }]}>
            <MaterialIcons name="logout" size={24} color={currentTheme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Team Section */}
      {!team ? (
        <View style={styles.noTeamContainer}>
          <MaterialIcons name="group-add" size={64} color="#ccc" />
          <Text style={styles.noTeamTitle}>No Team Yet</Text>
          <Text style={styles.noTeamSubtitle}>
            Create a team to start tracking your players' workouts
          </Text>
          <TouchableOpacity style={[styles.createTeamButton, { backgroundColor: currentTheme.secondary }]} onPress={handleCreateTeam}>
            <Text style={[styles.createTeamButtonText, { color: currentTheme.primary }]}>Create Team</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Team Info */}
          <View style={[styles.teamCard, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.teamHeader}>
              <View style={styles.teamInfo}>
                <Text style={[styles.teamName, { color: currentTheme.text }]}>{team.name}</Text>
                <Text style={[styles.teamCode, { color: currentTheme.textSecondary }]}>Team Code: {team.code}</Text>
              </View>
              <TouchableOpacity 
                style={styles.settingsButton}
                onPress={() => navigation.navigate('TeamSettings')}
              >
                <MaterialIcons name="settings" size={24} color={currentTheme.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: currentTheme.surface }]}>
              <Text style={[styles.statNumber, { color: currentTheme.primary }]}>{stats.activeMembers}</Text>
              <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>Players</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: currentTheme.surface }]}>
              <Text style={[styles.statNumber, { color: currentTheme.primary }]}>{stats.thisWeekWorkouts}</Text>
              <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>This Week</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: currentTheme.surface }]}>
              <Text style={[styles.statNumber, { color: currentTheme.primary }]}>{stats.totalWorkouts}</Text>
              <Text style={[styles.statLabel, { color: currentTheme.textSecondary }]}>Total Workouts</Text>
            </View>
          </View>

          {/* Team Motivation Stats */}
          <TeamMotivationStats teamMembers={teamMembers} navigation={navigation} />

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, { 
                backgroundColor: currentTheme.surface, 
                borderColor: currentTheme.primary
              }]}
              onPress={() => navigation.navigate('Messages')}
            >
              <MaterialIcons name="message" size={24} color={currentTheme.primary} />
              <Text style={[styles.actionButtonText, { color: currentTheme.primary }]}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { 
                backgroundColor: currentTheme.surface, 
                borderColor: currentTheme.primary
              }]}
              onPress={() => navigation.navigate('Leaderboard')}
            >
              <MaterialIcons name="leaderboard" size={24} color={currentTheme.primary} />
              <Text style={[styles.actionButtonText, { color: currentTheme.primary }]}>Leaders</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { 
                backgroundColor: currentTheme.surface, 
                borderColor: currentTheme.primary
              }]}
              onPress={() => navigation.navigate('WorkoutHistory')}
            >
              <MaterialIcons name="history" size={24} color={currentTheme.primary} />
              <Text style={[styles.actionButtonText, { color: currentTheme.primary }]}>History</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Activity */}
          <View style={[styles.sectionContainer, { backgroundColor: currentTheme.surface }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: currentTheme.secondary }]}>Recent Workouts</Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('WorkoutHistory')}
                style={styles.viewAllButton}
              >
                <Text style={[styles.viewAllText, { color: currentTheme.secondary }]}>View All</Text>
                <MaterialIcons name="arrow-forward" size={16} color={currentTheme.secondary} />
              </TouchableOpacity>
            </View>
            {recentWorkouts.length === 0 ? (
              <Text style={styles.emptyText}>No workouts logged yet</Text>
            ) : (
              recentWorkouts.slice(0, 3).map((workout, index) => {
                const member = teamMembers.find(m => m.id === workout.userId);
                const workoutWithUser = {
                  ...workout,
                  userName: member?.name || 'Unknown'
                };
                
                return (
                  <WorkoutCard
                    key={workout.id || index}
                    workout={workoutWithUser}
                    showPlayerName={true}
                    onPress={() => navigation.navigate('WorkoutDetail', { workout: workoutWithUser })}
                    style={styles.dashboardWorkoutCard}
                    showDeleteButton={true} // Coach can delete any workout
                    onLikeUpdate={(workoutId, newLikeCount, userLiked) => {
                      // Update the local workouts array
                      setRecentWorkouts(prevWorkouts => 
                        prevWorkouts.map(w => 
                          w.id === workoutId 
                            ? { ...w, likeCount: newLikeCount, likes: userLiked ? [...(w.likes || []), user.uid] : (w.likes || []).filter(id => id !== user.uid) }
                            : w
                        )
                      );
                    }}
                    onDelete={(workoutId) => {
                      // Remove the deleted workout from the local array
                      setRecentWorkouts(prevWorkouts => 
                        prevWorkouts.filter(w => w.id !== workoutId)
                      );
                      Alert.alert('Success', 'Workout deleted successfully');
                    }}
                  />
                );
              })
            )}
          </View>

          {/* Dark Mode Toggle */}
          <DarkModeToggle />
        </>
      )}
      </ScrollView>

      {/* Team Settings Modal */}
      <TeamSettingsModal
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
        team={team}
        onTeamUpdate={(updatedTeam) => {
          setTeam(updatedTeam);
        }}
      />

      {/* Theme Selector Modal */}
      <ThemeSelector
        visible={themeModalVisible}
        onClose={() => setThemeModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
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
    backgroundColor: '#007AFF', // Will be overridden by theme
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  headerLeft: {
    flex: 1,
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
    color: '#FFFFFF', // Will be overridden by theme
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF', // Will be overridden by theme
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
  createTeamButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createTeamButtonText: {
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
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamInfo: {
    flex: 1,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  teamName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  teamCode: {
    fontSize: 16,
    color: '#007AFF',
    marginTop: 4,
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
  sectionContainer: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  workoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  workoutContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutInfo: {
    flex: 1,
  },
  workoutImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginLeft: 12,
  },
  workoutUser: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  workoutType: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  workoutTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  workoutDuration: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  dashboardWorkoutCard: {
    marginHorizontal: 0,
    marginVertical: 4,
  },
});

export default CoachDashboard;
